// Types TypeScript pour CoachFit

export interface User {
  id: number
  email: string
  password_hash: string
  name: string
  role: 'client' | 'coach' | 'admin'
  phone?: string
  date_of_birth?: string
  gender?: 'M' | 'F' | 'other'
  profile_image_url?: string
  bio?: string
  coach_id?: number
  status: 'active' | 'inactive' | 'pending'
  created_at: string
  updated_at: string
}

export interface UserProfile {
  id: number
  user_id: number
  height?: number // cm
  weight?: number // kg
  body_fat_percentage?: number
  muscle_mass?: number
  bmi?: number
  fitness_level?: 'beginner' | 'intermediate' | 'advanced'
  goals?: string
  medical_conditions?: string
  preferences?: string // JSON
  created_at: string
  updated_at: string
}

export interface Program {
  id: number
  name: string
  description?: string
  coach_id: number
  client_id?: number
  type: 'strength' | 'cardio' | 'flexibility' | 'mixed'
  difficulty?: 'beginner' | 'intermediate' | 'advanced'
  duration_weeks?: number
  sessions_per_week?: number
  status: 'draft' | 'active' | 'completed' | 'paused'
  start_date?: string
  end_date?: string
  created_at: string
  updated_at: string
}

export interface Workout {
  id: number
  program_id?: number
  client_id: number
  name: string
  description?: string
  scheduled_date: string
  duration_minutes?: number
  status: 'scheduled' | 'in_progress' | 'completed' | 'skipped'
  notes?: string
  completion_rating?: number
  calories_burned?: number
  completed_at?: string
  created_at: string
  updated_at: string
}

export interface Exercise {
  id: number
  name: string
  description?: string
  category: 'strength' | 'cardio' | 'flexibility' | 'balance'
  muscle_groups?: string // JSON
  equipment?: string
  instructions?: string
  image_url?: string
  video_url?: string
  difficulty?: 'beginner' | 'intermediate' | 'advanced'
  created_by?: number
  is_public: boolean
  created_at: string
  updated_at: string
}

export interface WorkoutExercise {
  id: number
  workout_id: number
  exercise_id: number
  sets?: number
  reps?: number
  weight?: number
  duration_seconds?: number
  distance_meters?: number
  rest_seconds?: number
  order_index: number
  notes?: string
  completed: boolean
  created_at: string
}

export interface Meal {
  id: number
  client_id: number
  date: string
  type: 'breakfast' | 'lunch' | 'dinner' | 'snack'
  name: string
  description?: string
  calories?: number
  proteins?: number // g
  carbs?: number // g
  fats?: number // g
  fiber?: number // g
  sugar?: number // g
  sodium?: number // mg
  notes?: string
  image_url?: string
  created_at: string
  updated_at: string
}

export interface NutritionGoal {
  id: number
  client_id: number
  daily_calories?: number
  daily_proteins?: number
  daily_carbs?: number
  daily_fats?: number
  daily_fiber?: number
  daily_water_ml?: number
  is_active: boolean
  created_by?: number
  created_at: string
  updated_at: string
}

export interface Appointment {
  id: number
  coach_id: number
  client_id: number
  title: string
  description?: string
  type?: 'consultation' | 'training' | 'nutrition' | 'assessment'
  scheduled_date: string
  start_time: string
  end_time: string
  status: 'scheduled' | 'confirmed' | 'completed' | 'cancelled' | 'no_show'
  location?: string
  meeting_url?: string
  notes?: string
  price?: number
  created_at: string
  updated_at: string
}

export interface Message {
  id: number
  sender_id: number
  recipient_id: number
  subject?: string
  content: string
  message_type: 'text' | 'image' | 'file' | 'system'
  attachment_url?: string
  is_read: boolean
  parent_message_id?: number
  created_at: string
  read_at?: string
}

export interface Payment {
  id: number
  client_id: number
  coach_id: number
  amount: number
  currency: string
  description?: string
  status: 'pending' | 'completed' | 'failed' | 'refunded'
  payment_method?: string
  transaction_id?: string
  appointment_id?: number
  created_at: string
  updated_at: string
}

export interface Notification {
  id: number
  user_id: number
  title: string
  message: string
  type: 'appointment' | 'workout' | 'message' | 'payment' | 'system'
  is_read: boolean
  action_url?: string
  created_at: string
  read_at?: string
}

// Types pour l'authentification
export interface JWTPayload {
  userId: number
  email: string
  role: 'client' | 'coach' | 'admin'
  exp: number
}

export interface LoginRequest {
  email: string
  password: string
}

export interface RegisterRequest {
  email: string
  password: string
  name: string
  role: 'client' | 'coach'
  phone?: string
}

export interface AuthResponse {
  success: boolean
  token?: string
  user?: Omit<User, 'password_hash'>
  message?: string
}

// Types pour les bindings Cloudflare
export interface Bindings {
  DB: D1Database
  JWT_SECRET?: string
}

// Types pour les requêtes API
export interface APIResponse<T = any> {
  success: boolean
  data?: T
  message?: string
  error?: string
}

export interface PaginationParams {
  page?: number
  limit?: number
  sort?: string
  order?: 'ASC' | 'DESC'
}

export interface PaginatedResponse<T> extends APIResponse<T[]> {
  pagination?: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}