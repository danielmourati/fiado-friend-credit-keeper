export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      customers: {
        Row: {
          created_at: string
          guardian_id: string | null
          id: string
          limite_credito: number | null
          nome: string
          public_token: string
          saldo_atual: number
          tenant_id: string
          turma_ou_apelido: string | null
          ultima_movimentacao_em: string | null
          whatsapp: string | null
        }
        Insert: {
          created_at?: string
          guardian_id?: string | null
          id?: string
          limite_credito?: number | null
          nome: string
          public_token?: string
          saldo_atual?: number
          tenant_id: string
          turma_ou_apelido?: string | null
          ultima_movimentacao_em?: string | null
          whatsapp?: string | null
        }
        Update: {
          created_at?: string
          guardian_id?: string | null
          id?: string
          limite_credito?: number | null
          nome?: string
          public_token?: string
          saldo_atual?: number
          tenant_id?: string
          turma_ou_apelido?: string | null
          ultima_movimentacao_em?: string | null
          whatsapp?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customers_guardian_id_fkey"
            columns: ["guardian_id"]
            isOneToOne: false
            referencedRelation: "guardians"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customers_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      guardians: {
        Row: {
          created_at: string
          id: string
          nome: string
          observacao: string | null
          tenant_id: string
          whatsapp: string
        }
        Insert: {
          created_at?: string
          id?: string
          nome: string
          observacao?: string | null
          tenant_id: string
          whatsapp: string
        }
        Update: {
          created_at?: string
          id?: string
          nome?: string
          observacao?: string | null
          tenant_id?: string
          whatsapp?: string
        }
        Relationships: [
          {
            foreignKeyName: "guardians_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      reminders: {
        Row: {
          concluido: boolean
          created_at: string
          customer_id: string
          data_lembrete: string
          id: string
          tenant_id: string
        }
        Insert: {
          concluido?: boolean
          created_at?: string
          customer_id: string
          data_lembrete: string
          id?: string
          tenant_id: string
        }
        Update: {
          concluido?: boolean
          created_at?: string
          customer_id?: string
          data_lembrete?: string
          id?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reminders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reminders_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenants: {
        Row: {
          atalhos_rapidos: Json
          created_at: string
          id: string
          logo_url: string | null
          mensagem_padrao_whatsapp: string
          mp_subscription_id: string | null
          nome_loja: string
          owner_id: string
          pix_chave: string | null
          pix_cidade: string | null
          pix_nome_recebedor: string | null
          pix_tipo: string | null
          plano: string
          plano_expira_em: string | null
        }
        Insert: {
          atalhos_rapidos?: Json
          created_at?: string
          id?: string
          logo_url?: string | null
          mensagem_padrao_whatsapp?: string
          mp_subscription_id?: string | null
          nome_loja: string
          owner_id: string
          pix_chave?: string | null
          pix_cidade?: string | null
          pix_nome_recebedor?: string | null
          pix_tipo?: string | null
          plano?: string
          plano_expira_em?: string | null
        }
        Update: {
          atalhos_rapidos?: Json
          created_at?: string
          id?: string
          logo_url?: string | null
          mensagem_padrao_whatsapp?: string
          mp_subscription_id?: string | null
          nome_loja?: string
          owner_id?: string
          pix_chave?: string | null
          pix_cidade?: string | null
          pix_nome_recebedor?: string | null
          pix_tipo?: string | null
          plano?: string
          plano_expira_em?: string | null
        }
        Relationships: []
      }
      transactions: {
        Row: {
          created_at: string
          customer_id: string
          data_lancamento: string
          descricao: string | null
          id: string
          tenant_id: string
          tipo: string
          valor: number
        }
        Insert: {
          created_at?: string
          customer_id: string
          data_lancamento?: string
          descricao?: string | null
          id?: string
          tenant_id: string
          tipo: string
          valor: number
        }
        Update: {
          created_at?: string
          customer_id?: string
          data_lancamento?: string
          descricao?: string | null
          id?: string
          tenant_id?: string
          tipo?: string
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "transactions_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_public_customer_statement: {
        Args: { p_token: string }
        Returns: Json
      }
      get_public_guardian_statement: {
        Args: { p_guardian_id: string }
        Returns: Json
      }
      is_tenant_owner: { Args: { p_tenant_id: string }; Returns: boolean }
      recalculate_customer_balance_for_id: {
        Args: { p_customer_id: string }
        Returns: undefined
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
