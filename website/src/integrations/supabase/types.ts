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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      analytics_events: {
        Row: {
          created_at: string
          event_type: string
          id: string
          properties: Json
          user_id: string | null
          wallet_id: string | null
        }
        Insert: {
          created_at?: string
          event_type: string
          id?: string
          properties?: Json
          user_id?: string | null
          wallet_id?: string | null
        }
        Update: {
          created_at?: string
          event_type?: string
          id?: string
          properties?: Json
          user_id?: string | null
          wallet_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "analytics_events_wallet_id_fkey"
            columns: ["wallet_id"]
            isOneToOne: false
            referencedRelation: "wallets"
            referencedColumns: ["id"]
          },
        ]
      }
      api_keys: {
        Row: {
          created_at: string
          id: string
          key_hash: string
          last_used_at: string | null
          name: string
          prefix: string
          revoked_at: string | null
          scopes: string[]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          key_hash: string
          last_used_at?: string | null
          name: string
          prefix: string
          revoked_at?: string | null
          scopes?: string[]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          key_hash?: string
          last_used_at?: string | null
          name?: string
          prefix?: string
          revoked_at?: string | null
          scopes?: string[]
          user_id?: string
        }
        Relationships: []
      }
      blog_posts: {
        Row: {
          author_id: string | null
          content: string
          cover_url: string | null
          created_at: string
          excerpt: string | null
          id: string
          published: boolean
          published_at: string | null
          slug: string
          tags: string[]
          title: string
          updated_at: string
        }
        Insert: {
          author_id?: string | null
          content?: string
          cover_url?: string | null
          created_at?: string
          excerpt?: string | null
          id?: string
          published?: boolean
          published_at?: string | null
          slug: string
          tags?: string[]
          title: string
          updated_at?: string
        }
        Update: {
          author_id?: string | null
          content?: string
          cover_url?: string | null
          created_at?: string
          excerpt?: string | null
          id?: string
          published?: boolean
          published_at?: string | null
          slug?: string
          tags?: string[]
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      billing_history: {
        Row: {
          amount_cents: number
          chain_id: number | null
          created_at: string
          currency: string
          description: string | null
          id: string
          invoice_url: string | null
          metadata: Json
          payment_method: string
          payment_provider_id: string | null
          status: string
          subscription_id: string | null
          user_id: string
        }
        Insert: {
          amount_cents: number
          chain_id?: number | null
          created_at?: string
          currency?: string
          description?: string | null
          id?: string
          invoice_url?: string | null
          metadata?: Json
          payment_method: string
          payment_provider_id?: string | null
          status?: string
          subscription_id?: string | null
          user_id: string
        }
        Update: {
          amount_cents?: number
          chain_id?: number | null
          created_at?: string
          currency?: string
          description?: string | null
          id?: string
          invoice_url?: string | null
          metadata?: Json
          payment_method?: string
          payment_provider_id?: string | null
          status?: string
          subscription_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "billing_history_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      changelog_entries: {
        Row: {
          cover_url: string | null
          created_at: string
          date: string
          details: string
          headline: string
          highlights: string[]
          id: string
          kind: string
          published: boolean
          published_at: string | null
          updated_at: string
          upgrade: string | null
          version: string
        }
        Insert: {
          cover_url?: string | null
          created_at?: string
          date?: string
          details?: string
          headline: string
          highlights?: string[]
          id?: string
          kind?: string
          published?: boolean
          published_at?: string | null
          updated_at?: string
          upgrade?: string | null
          version: string
        }
        Update: {
          cover_url?: string | null
          created_at?: string
          date?: string
          details?: string
          headline?: string
          highlights?: string[]
          id?: string
          kind?: string
          published?: boolean
          published_at?: string | null
          updated_at?: string
          upgrade?: string | null
          version?: string
        }
        Relationships: []
      }
      integrations: {
        Row: {
          id: string
          user_id: string
          project_id: string | null
          type: string
          config: Json
          status: string
          token_encrypted: string | null
          connected_at: string | null
          last_sync_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          project_id?: string | null
          type: string
          config?: Json
          status?: string
          token_encrypted?: string | null
          connected_at?: string | null
          last_sync_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          project_id?: string | null
          type?: string
          config?: Json
          status?: string
          token_encrypted?: string | null
          connected_at?: string | null
          last_sync_at?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "integrations_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      nonces: {
        Row: {
          address: string
          chain_id: number
          consumed_at: string | null
          expires_at: string
          id: string
          issued_at: string
          nonce: string
        }
        Insert: {
          address: string
          chain_id?: number
          consumed_at?: string | null
          expires_at?: string
          id?: string
          issued_at?: string
          nonce: string
        }
        Update: {
          address?: string
          chain_id?: number
          consumed_at?: string | null
          expires_at?: string
          id?: string
          issued_at?: string
          nonce?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          full_name: string
          id: string
          job_title: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string
          id?: string
          job_title?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string
          id?: string
          job_title?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      project_events: {
        Row: {
          created_at: string
          id: string
          level: string
          message: string
          metadata: Json
          project_id: string | null
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          level?: string
          message: string
          metadata?: Json
          project_id?: string | null
          type: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          level?: string
          message?: string
          metadata?: Json
          project_id?: string | null
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_events_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          created_at: string
          description: string | null
          environment: string
          id: string
          name: string
          slug: string
          updated_at: string
          user_id: string
          website: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          environment?: string
          id?: string
          name: string
          slug: string
          updated_at?: string
          user_id: string
          website?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          environment?: string
          id?: string
          name?: string
          slug?: string
          updated_at?: string
          user_id?: string
          website?: string | null
        }
        Relationships: []
      }
      rpc_logs: {
        Row: {
          chain_id: number
          created_at: string
          error_message: string | null
          id: string
          latency_ms: number
          method: string
          provider: string
          status: string
          user_id: string | null
        }
        Insert: {
          chain_id?: number
          created_at?: string
          error_message?: string | null
          id?: string
          latency_ms?: number
          method: string
          provider: string
          status?: string
          user_id?: string | null
        }
        Update: {
          chain_id?: number
          created_at?: string
          error_message?: string | null
          id?: string
          latency_ms?: number
          method?: string
          provider?: string
          status?: string
          user_id?: string | null
        }
        Relationships: []
      }
      sessions: {
        Row: {
          expires_at: string
          id: string
          ip_address: string | null
          issued_at: string
          last_seen_at: string
          revoked_at: string | null
          token_hash: string
          user_agent: string | null
          user_id: string
          wallet_id: string | null
        }
        Insert: {
          expires_at: string
          id?: string
          ip_address?: string | null
          issued_at?: string
          last_seen_at?: string
          revoked_at?: string | null
          token_hash: string
          user_agent?: string | null
          user_id: string
          wallet_id?: string | null
        }
        Update: {
          expires_at?: string
          id?: string
          ip_address?: string | null
          issued_at?: string
          last_seen_at?: string
          revoked_at?: string | null
          token_hash?: string
          user_agent?: string | null
          user_id?: string
          wallet_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sessions_wallet_id_fkey"
            columns: ["wallet_id"]
            isOneToOne: false
            referencedRelation: "wallets"
            referencedColumns: ["id"]
          },
        ]
      }
      site_settings: {
        Row: {
          key: string
          updated_at: string
          updated_by: string | null
          value: Json
        }
        Insert: {
          key: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Update: {
          key?: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          id: string
          user_id: string
          tier: string
          status: string
          billing_period: string
          seats: number
          amount_cents: number
          currency: string
          payment_method: string
          payment_provider_id: string | null
          chain_id: number | null
          current_period_start: string
          current_period_end: string | null
          cancel_at_period_end: boolean
          metadata: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          tier: string
          status?: string
          billing_period?: string
          seats?: number
          amount_cents?: number
          currency?: string
          payment_method: string
          payment_provider_id?: string | null
          chain_id?: number | null
          current_period_start?: string
          current_period_end?: string | null
          cancel_at_period_end?: boolean
          metadata?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          tier?: string
          status?: string
          billing_period?: string
          seats?: number
          amount_cents?: number
          currency?: string
          payment_method?: string
          payment_provider_id?: string | null
          chain_id?: number | null
          current_period_start?: string
          current_period_end?: string | null
          cancel_at_period_end?: boolean
          metadata?: Json
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      usage_metrics: {
        Row: {
          id: string
          user_id: string
          project_id: string | null
          chain_id: number
          method: string
          status: string
          duration_ms: number
          timestamp: string
        }
        Insert: {
          id?: string
          user_id: string
          project_id?: string | null
          chain_id: number
          method: string
          status?: string
          duration_ms?: number
          timestamp?: string
        }
        Update: {
          id?: string
          user_id?: string
          project_id?: string | null
          chain_id?: number
          method?: string
          status?: string
          duration_ms?: number
          timestamp?: string
        }
        Relationships: [
          {
            foreignKeyName: "usage_metrics_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      wallets: {
        Row: {
          address: string
          chain_id: number
          created_at: string
          id: string
          is_primary: boolean
          label: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          address: string
          chain_id?: number
          created_at?: string
          id?: string
          is_primary?: boolean
          label?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          address?: string
          chain_id?: number
          created_at?: string
          id?: string
          is_primary?: boolean
          label?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      webhooks: {
        Row: {
          created_at: string
          enabled: boolean
          events: string[]
          id: string
          last_delivered_at: string | null
          last_status: number | null
          project_id: string | null
          secret: string
          url: string
          user_id: string
        }
        Insert: {
          created_at?: string
          enabled?: boolean
          events?: string[]
          id?: string
          last_delivered_at?: string | null
          last_status?: number | null
          project_id?: string | null
          secret?: string
          url: string
          user_id: string
        }
        Update: {
          created_at?: string
          enabled?: boolean
          events?: string[]
          id?: string
          last_delivered_at?: string | null
          last_status?: number | null
          project_id?: string | null
          secret?: string
          url?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "webhooks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      workspace_settings: {
        Row: {
          id: string
          user_id: string
          default_chain: number
          notifications: Json
          theme: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          default_chain?: number
          notifications?: Json
          theme?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          default_chain?: number
          notifications?: Json
          theme?: string
          updated_at?: string
        }
        Relationships: []
      }
      step_progress: {
        Row: {
          id: string
          user_id: string
          tier: string
          step_number: number
          step_data: Json
          is_completed: boolean
          time_spent: number | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          tier: string
          step_number: number
          step_data?: Json
          is_completed?: boolean
          time_spent?: number | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          tier?: string
          step_number?: number
          step_data?: Json
          is_completed?: boolean
          time_spent?: number | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      payment_transactions: {
        Row: {
          id: string
          user_id: string | null
          transaction_id: string
          tier: string
          payment_method: string
          amount_cents: number
          currency: string
          billing_email: string
          organization_name: string | null
          technical_contact: string | null
          expected_volume: string | null
          status: string
          provider_metadata: Json | null
          subscription_id: string | null
          error_message: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id?: string | null
          transaction_id: string
          tier: string
          payment_method: string
          amount_cents: number
          currency: string
          billing_email: string
          organization_name?: string | null
          technical_contact?: string | null
          expected_volume?: string | null
          status?: string
          provider_metadata?: Json | null
          subscription_id?: string | null
          error_message?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string | null
          transaction_id?: string
          tier?: string
          payment_method?: string
          amount_cents?: number
          currency?: string
          billing_email?: string
          organization_name?: string | null
          technical_contact?: string | null
          expected_volume?: string | null
          status?: string
          provider_metadata?: Json | null
          subscription_id?: string | null
          error_message?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      team_invites: {
        Row: {
          accepted_at: string | null
          created_at: string
          email: string
          expires_at: string
          id: string
          invited_by: string
          project_id: string
          role: string
          token: string
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string
          email: string
          expires_at?: string
          id?: string
          invited_by: string
          project_id: string
          role?: string
          token?: string
        }
        Update: {
          accepted_at?: string | null
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          invited_by?: string
          project_id?: string
          role?: string
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_invites_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_invites_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "auth.users"
            referencedColumns: ["id"]
          },
        ]
      }
      project_members: {
        Row: {
          id: string
          invited_by: string | null
          joined_at: string
          project_id: string
          role: string
          user_id: string
        }
        Insert: {
          id?: string
          invited_by?: string | null
          joined_at?: string
          project_id: string
          role?: string
          user_id: string
        }
        Update: {
          id?: string
          invited_by?: string | null
          joined_at?: string
          project_id?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_members_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          href: string | null
          id: string
          kind: string
          read_at: string | null
          title: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          href?: string | null
          id?: string
          kind: string
          read_at?: string | null
          title: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          href?: string | null
          id?: string
          kind?: string
          read_at?: string | null
          title?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      accept_team_invite: {
        Args: { _token: string }
        Returns: Json
      }
      consume_nonce: {
        Args: { _address: string; _nonce: string }
        Returns: boolean
      }
      create_team_invite: {
        Args: {
          _email: string
          _project_id: string
          _role?: string
        }
        Returns: Json
      }
      get_invite_by_token: {
        Args: { _token: string }
        Returns: {
          accepted: boolean
          email: string
          expired: boolean
          expires_at: string
          inviter_avatar: string
          inviter_email: string
          inviter_name: string
          project_id: string
          project_name: string
          role: string
        }[]
      }
      get_my_projects: {
        Args: never
        Returns: {
          created_at: string
          description: string | null
          environment: string
          id: string
          name: string
          slug: string
          updated_at: string
          user_id: string
          website: string | null
        }[]
      }
      get_pending_invites: {
        Args: never
        Returns: {
          created_at: string
          email: string
          expires_at: string
          id: string
          invited_by_name: string
          project_id: string
          project_name: string
          role: string
          token: string
        }[]
      }
      get_project_team: {
        Args: { _project_id: string }
        Returns: {
          avatar_url: string
          full_name: string
          invited_by: string
          invited_by_name: string
          job_title: string
          joined_at: string
          role: string
          user_id: string
        }[]
      }
      get_team_members: {
        Args: never
        Returns: {
          avatar_url: string
          full_name: string
          job_title: string
          role: string
          user_id: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      revoke_team_invite: {
        Args: { _invite_id: string }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
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
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "moderator", "user"],
    },
  },
} as const
