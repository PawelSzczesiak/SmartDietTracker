export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          user_id: string;
          age: number | null;
          sex: "male" | "female" | "other" | "prefer_not_to_say" | null;
          current_weight: number | null;
          height: number | null;
          target_weight: number | null;
          target_pace: "slow" | "normal" | "fast" | null;
          manual_daily_calorie_limit: number | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          age?: number | null;
          sex?: "male" | "female" | "other" | "prefer_not_to_say" | null;
          current_weight?: number | null;
          height?: number | null;
          target_weight?: number | null;
          target_pace?: "slow" | "normal" | "fast" | null;
          manual_daily_calorie_limit?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          user_id?: string;
          age?: number | null;
          sex?: "male" | "female" | "other" | "prefer_not_to_say" | null;
          current_weight?: number | null;
          height?: number | null;
          target_weight?: number | null;
          target_pace?: "slow" | "normal" | "fast" | null;
          manual_daily_calorie_limit?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      meals: {
        Row: {
          id: string;
          user_id: string;
          meal_text: string;
          consumed_at: string;
          calories: number | null;
          protein: number | null;
          carbs: number | null;
          fat: number | null;
          parser_status: "failed" | "skipped" | "success";
          parser_error: string | null;
          parser_attempted_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          meal_text: string;
          consumed_at?: string;
          calories?: number | null;
          protein?: number | null;
          carbs?: number | null;
          fat?: number | null;
          parser_status?: "failed" | "skipped" | "success";
          parser_error?: string | null;
          parser_attempted_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          meal_text?: string;
          consumed_at?: string;
          calories?: number | null;
          protein?: number | null;
          carbs?: number | null;
          fat?: number | null;
          parser_status?: "failed" | "skipped" | "success";
          parser_error?: string | null;
          parser_attempted_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
    };
  };
}
