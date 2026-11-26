import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { corsHeaders } from "../_shared/cors.ts";

async function verifyMercadoPagoSignature(
  req: Request,
  dataId: string,
  secret: string
): Promise<boolean> {
  const xSignature = req.headers.get("x-signature");
  const xRequestId = req.headers.get("x-request-id");
  if (!xSignature || !xRequestId) return false;

  let ts = "";
  let v1 = "";
  for (const part of xSignature.split(",")) {
    const [key, value] = part.split("=").map((s) => s.trim());
    if (key === "ts") ts = value;
    if (key === "v1") v1 = value;
  }
  if (!ts || !v1) return false;

  const manifest = `id:${dataId};request-id:${xRequestId};ts:${ts};`;
  const encoder = new TextEncoder();
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sigBuffer = await crypto.subtle.sign(
    "HMAC",
    cryptoKey,
    encoder.encode(manifest)
  );
  const expectedHex = Array.from(new Uint8Array(sigBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  return expectedHex.toLowerCase() === v1.toLowerCase();
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const mpAccessToken = Deno.env.get("MP_ACCESS_TOKEN") ?? "";
    const mpWebhookSecret = Deno.env.get("MP_WEBHOOK_SECRET") ?? "";

    if (!supabaseUrl || !serviceRoleKey || !mpAccessToken) {
      throw new Error("Variáveis de ambiente do webhook incompletas.");
    }

    const url = new URL(req.url);
    let body: Record<string, unknown> = {};
    try {
      body = (await req.json()) as Record<string, unknown>;
    } catch {
      body = {};
    }

    const topic = String(
      body.type ?? body.topic ?? url.searchParams.get("topic") ?? ""
    );
    const dataObj = body.data as { id?: string | number } | undefined;
    const resourceId = String(
      dataObj?.id ?? url.searchParams.get("data.id") ?? url.searchParams.get("id") ?? ""
    );

    if (!resourceId) {
      return new Response(JSON.stringify({ ignored: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (mpWebhookSecret) {
      const valid = await verifyMercadoPagoSignature(
        req,
        resourceId,
        mpWebhookSecret
      );
      if (!valid) {
        return new Response(JSON.stringify({ error: "Assinatura inválida." }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const isPreapproval = topic.includes("preapproval");
    const mpEndpoint = isPreapproval
      ? `https://api.mercadopago.com/preapproval/${resourceId}`
      : `https://api.mercadopago.com/v1/payments/${resourceId}`;

    const mpResp = await fetch(mpEndpoint, {
      headers: { Authorization: `Bearer ${mpAccessToken}` },
    });

    if (!mpResp.ok) {
      return new Response(
        JSON.stringify({ error: "Falha ao consultar recurso no Mercado Pago." }),
        {
          status: 502,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const mpData = (await mpResp.json()) as {
      id?: string | number;
      status?: string;
      external_reference?: string;
    };

    const tenantId = mpData.external_reference;
    if (!tenantId) {
      return new Response(JSON.stringify({ ignored: "sem external_reference" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);
    const status = (mpData.status ?? "").toLowerCase();

    if (status === "approved" || status === "authorized") {
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 35);

      const { error: updateErr } = await supabaseAdmin
        .from("tenants")
        .update({
          plano: "PRO",
          mp_subscription_id: String(mpData.id ?? resourceId),
          plano_expira_em: expiresAt.toISOString(),
        })
        .eq("id", tenantId);

      if (updateErr) throw new Error(updateErr.message);
    } else if (
      status === "cancelled" ||
      status === "refunded" ||
      status === "charged_back"
    ) {
      const { error: downgradeErr } = await supabaseAdmin
        .from("tenants")
        .update({
          plano: "FREE",
        })
        .eq("id", tenantId);

      if (downgradeErr) throw new Error(downgradeErr.message);
    }

    return new Response(JSON.stringify({ ok: true, status, tenantId }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro interno.";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
