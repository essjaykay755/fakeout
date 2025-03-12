export interface User {
  id: string
  username: string
  email: string
  points: number
  seen_articles: string[]
}

export interface Article {
  article_id: string
  title: string
  content: string
  image_url?: string
  is_real: boolean
  reason?: string
  category: string
}

export interface GameSession {
  session_id: string
  user_id: string
  article_id: string
  user_answer: boolean
  selected_reason?: string
  created_at: string
}

// Mock functions that would be implemented with actual Supabase calls
export const supabase = {
  auth: {
    signUp: async ({ email, password }: { email: string; password: string }) => {
      console.log("Sign up:", { email, password })
      return { data: { user: { id: "123" } }, error: null }
    },
    signIn: async ({ email, password }: { email: string; password: string }) => {
      console.log("Sign in:", { email, password })
      return { data: { user: { id: "123" } }, error: null }
    },
    signOut: async () => {
      console.log("Sign out")
      return { error: null }
    },
  },
  from: (table: string) => ({
    select: () => ({
      eq: (field: string, value: any) => ({
        data: [],
        error: null,
      }),
      order: (field: string, { ascending }: { ascending: boolean }) => ({
        limit: (limit: number) => ({
          data: [],
          error: null,
        }),
      }),
    }),
    insert: (data: any) => ({
      data: { id: "123" },
      error: null,
    }),
    update: (data: any) => ({
      eq: (field: string, value: any) => ({
        data: { id: "123" },
        error: null,
      }),
    }),
  }),
}

