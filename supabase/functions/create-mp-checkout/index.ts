import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { corsHeaders } from "../_shared/cors.ts";

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const mpAccessToken = Deno.env.get("MP_ACCESS_TOKEN") ?? "";
    const proPrice = Number(Deno.env.get("MP_PRO_PRICE") ?? "29.90");
    const planTitle =
      Deno.env.get("MP_PLAN_TITLE") ?? "Paula Lanches — Plano PRO (Mensal)";

    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error("Variáveis SUPABASE_URL / SUPABASE_ANON_KEY ausentes.");
    }
    if (!mpAccessToken) {
      throw new Error("Variável MP_ACCESS_TOKEN não configurada.");
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Não autenticado." }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Usuário inválido." }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: tenant, error: tenantError } = await supabase
      .from("tenants")
      .select("id, nome_loja, plano")
      .eq("owner_id", user.id)
      .single();

    if (tenantError || !tenant) {
      return new Response(
        JSON.stringify({ error: "Cantina não encontrada para este usuário." }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    let requestOrigin = Deno.env.get("APP_URL") ?? "http://localhost:5173";
    try {
      const body = (await req.json()) as { origin?: string };
      if (body?.origin) {
        requestOrigin = body.origin.replace(/\/+$/, "");
      }
    } catch {
      // body opcional
    }

    const notificationUrl = `${supabaseUrl}/functions/v1/mp-webhook`;
    const isHttpsOrigin = requestOrigin.startsWith("https://");

    const mpPayload: Record<string, unknown> = {
      items: [
        {
          id: "plano-pro-mensal",
          title: planTitle,
          description: `Assinatura PRO para ${tenant.nome_loja}`,
          quantity: 1,
          currency_id: "BRL",
          unit_price: proPrice,
        },
      ],
      payer: {
        email: user.email,
      },
      external_reference: tenant.id,
      notification_url: notificationUrl,
      back_urls: {
        success: `${requestOrigin}/configuracoes?assinatura=sucesso`,
        pending: `${requestOrigin}/configuracoes?assinatura=pendente`,
        failure: `${requestOrigin}/configuracoes?assinatura=erro`,
      },
      statement_descriptor: "PAULALANCHES",
    };

    if (isHttpsOrigin) {
      mpPayload.auto_return = "approved";
    }

    const mpResponse = await fetch(
      "https://api.mercadopago.com/checkout/preferences",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${mpAccessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(mpPayload),
      }
    );

    const mpData = (await mpResponse.json()) as {
      id?: string;
      init_point?: string;
      sandbox_init_point?: string;
      message?: string;
    };

    if (!mpResponse.ok || !mpData.init_point) {
      throw new Error(
        mpData.message || "Falha ao criar preferência no Mercado Pago."
      );
    }

    return new Response(
      JSON.stringify({
        preference_id: mpData.id,
        checkout_url: mpData.init_point,
        sandbox_url: mpData.sandbox_init_point,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro interno.";
    return new Response(JSON.stringify({ error: message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
