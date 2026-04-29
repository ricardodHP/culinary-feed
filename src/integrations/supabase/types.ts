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
      categories: {
        Row: {
          created_at: string
          emoji: string | null
          id: string
          image_url: string | null
          name: string
          position: number
          restaurant_id: string
        }
        Insert: {
          created_at?: string
          emoji?: string | null
          id?: string
          image_url?: string | null
          name: string
          position?: number
          restaurant_id: string
        }
        Update: {
          created_at?: string
          emoji?: string | null
          id?: string
          image_url?: string | null
          name?: string
          position?: number
          restaurant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "categories_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      dish_events: {
        Row: {
          category_id: string | null
          created_at: string
          dish_id: string | null
          event_type: Database["public"]["Enums"]["dish_event_type"]
          id: string
          restaurant_id: string
        }
        Insert: {
          category_id?: string | null
          created_at?: string
          dish_id?: string | null
          event_type: Database["public"]["Enums"]["dish_event_type"]
          id?: string
          restaurant_id: string
        }
        Update: {
          category_id?: string | null
          created_at?: string
          dish_id?: string | null
          event_type?: Database["public"]["Enums"]["dish_event_type"]
          id?: string
          restaurant_id?: string
        }
        Relationships: []
      }
      dishes: {
        Row: {
          category_id: string | null
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          is_active: boolean
          is_featured: boolean
          likes_count: number
          name: string
          position: number
          price: number
          rating: number
          restaurant_id: string
          show_rating: boolean
          tags: string[]
          updated_at: string
        }
        Insert: {
          category_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          is_featured?: boolean
          likes_count?: number
          name: string
          position?: number
          price?: number
          rating?: number
          restaurant_id: string
          show_rating?: boolean
          tags?: string[]
          updated_at?: string
        }
        Update: {
          category_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          is_featured?: boolean
          likes_count?: number
          name?: string
          position?: number
          price?: number
          rating?: number
          restaurant_id?: string
          show_rating?: boolean
          tags?: string[]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "dishes_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dishes_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      restaurants: {
        Row: {
          address: string | null
          bio: string | null
          created_at: string
          cuisine_template: Database["public"]["Enums"]["cuisine_template"]
          hours: string | null
          id: string
          instagram_link: string | null
          logo_url: string | null
          name: string
          owner_id: string | null
          phone: string | null
          show_by_rating: boolean
          show_rating: boolean
          slug: string
          status: Database["public"]["Enums"]["restaurant_status"]
          updated_at: string
          whatsapp_link: string | null
        }
        Insert: {
          address?: string | null
          bio?: string | null
          created_at?: string
          cuisine_template?: Database["public"]["Enums"]["cuisine_template"]
          hours?: string | null
          id?: string
          instagram_link?: string | null
          logo_url?: string | null
          name: string
          owner_id?: string | null
          phone?: string | null
          show_by_rating?: boolean
          show_rating?: boolean
          slug: string
          status?: Database["public"]["Enums"]["restaurant_status"]
          updated_at?: string
          whatsapp_link?: string | null
        }
        Update: {
          address?: string | null
          bio?: string | null
          created_at?: string
          cuisine_template?: Database["public"]["Enums"]["cuisine_template"]
          hours?: string | null
          id?: string
          instagram_link?: string | null
          logo_url?: string | null
          name?: string
          owner_id?: string | null
          phone?: string | null
          show_by_rating?: boolean
          show_rating?: boolean
          slug?: string
          status?: Database["public"]["Enums"]["restaurant_status"]
          updated_at?: string
          whatsapp_link?: string | null
        }
        Relationships: []
      }
      reviews: {
        Row: {
          author_name: string | null
          comment: string | null
          created_at: string
          dish_id: string | null
          id: string
          rating: number
          restaurant_id: string
          user_id: string | null
        }
        Insert: {
          author_name?: string | null
          comment?: string | null
          created_at?: string
          dish_id?: string | null
          id?: string
          rating: number
          restaurant_id: string
          user_id?: string | null
        }
        Update: {
          author_name?: string | null
          comment?: string | null
          created_at?: string
          dish_id?: string | null
          id?: string
          rating?: number
          restaurant_id?: string
          user_id?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_id_by_email: { Args: { _email: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      list_users_with_roles: {
        Args: never
        Returns: {
          created_at: string
          display_name: string
          email: string
          id: string
          roles: Database["public"]["Enums"]["app_role"][]
        }[]
      }
      recalc_dish_rating: { Args: { _dish_id: string }; Returns: undefined }
    }
    Enums: {
      app_role: "admin" | "owner" | "customer"
      cuisine_template:
        | "mexican"
        | "italian"
        | "chinese"
        | "japanese"
        | "generic"
      dish_event_type: "view" | "cart_add" | "category_view"
      restaurant_status: "draft" | "published"
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
      app_role: ["admin", "owner", "customer"],
      cuisine_template: [
        "mexican",
        "italian",
        "chinese",
        "japanese",
        "generic",
      ],
      dish_event_type: ["view", "cart_add", "category_view"],
      restaurant_status: ["draft", "published"],
    },
  },
} as const
