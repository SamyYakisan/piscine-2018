-- Schéma initial pour CoachFit
-- Tables principales pour la gestion des utilisateurs, programmes, nutrition, etc.

-- Table des utilisateurs (clients et coaches)
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    name TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('client', 'coach', 'admin')) DEFAULT 'client',
    phone TEXT,
    date_of_birth DATE,
    gender TEXT CHECK (gender IN ('M', 'F', 'other')),
    profile_image_url TEXT,
    bio TEXT,
    coach_id INTEGER REFERENCES users(id), -- Pour les clients
    status TEXT NOT NULL CHECK (status IN ('active', 'inactive', 'pending')) DEFAULT 'pending',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Table des profils physiques (mesures corporelles)
CREATE TABLE IF NOT EXISTS user_profiles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    height INTEGER, -- en cm
    weight REAL, -- en kg
    body_fat_percentage REAL,
    muscle_mass REAL,
    bmi REAL,
    fitness_level TEXT CHECK (fitness_level IN ('beginner', 'intermediate', 'advanced')),
    goals TEXT, -- JSON ou texte libre
    medical_conditions TEXT,
    preferences TEXT, -- JSON pour préférences alimentaires, etc.
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Table des programmes d'entraînement
CREATE TABLE IF NOT EXISTS programs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    coach_id INTEGER NOT NULL REFERENCES users(id),
    client_id INTEGER REFERENCES users(id), -- NULL si programme template
    type TEXT NOT NULL CHECK (type IN ('strength', 'cardio', 'flexibility', 'mixed')),
    difficulty TEXT CHECK (difficulty IN ('beginner', 'intermediate', 'advanced')),
    duration_weeks INTEGER,
    sessions_per_week INTEGER,
    status TEXT NOT NULL CHECK (status IN ('draft', 'active', 'completed', 'paused')) DEFAULT 'draft',
    start_date DATE,
    end_date DATE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Table des séances d'entraînement
CREATE TABLE IF NOT EXISTS workouts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    program_id INTEGER REFERENCES programs(id) ON DELETE CASCADE,
    client_id INTEGER NOT NULL REFERENCES users(id),
    name TEXT NOT NULL,
    description TEXT,
    scheduled_date DATE NOT NULL,
    duration_minutes INTEGER,
    status TEXT NOT NULL CHECK (status IN ('scheduled', 'in_progress', 'completed', 'skipped')) DEFAULT 'scheduled',
    notes TEXT,
    completion_rating INTEGER CHECK (completion_rating BETWEEN 1 AND 5),
    calories_burned INTEGER,
    completed_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Table des exercices
CREATE TABLE IF NOT EXISTS exercises (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    category TEXT NOT NULL CHECK (category IN ('strength', 'cardio', 'flexibility', 'balance')),
    muscle_groups TEXT, -- JSON array des groupes musculaires
    equipment TEXT, -- équipement nécessaire
    instructions TEXT,
    image_url TEXT,
    video_url TEXT,
    difficulty TEXT CHECK (difficulty IN ('beginner', 'intermediate', 'advanced')),
    created_by INTEGER REFERENCES users(id),
    is_public BOOLEAN DEFAULT FALSE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Table de liaison entre séances et exercices
CREATE TABLE IF NOT EXISTS workout_exercises (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    workout_id INTEGER NOT NULL REFERENCES workouts(id) ON DELETE CASCADE,
    exercise_id INTEGER NOT NULL REFERENCES exercises(id),
    sets INTEGER,
    reps INTEGER,
    weight REAL,
    duration_seconds INTEGER,
    distance_meters REAL,
    rest_seconds INTEGER,
    order_index INTEGER NOT NULL,
    notes TEXT,
    completed BOOLEAN DEFAULT FALSE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Table des repas et nutrition
CREATE TABLE IF NOT EXISTS meals (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    client_id INTEGER NOT NULL REFERENCES users(id),
    date DATE NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('breakfast', 'lunch', 'dinner', 'snack')),
    name TEXT NOT NULL,
    description TEXT,
    calories REAL,
    proteins REAL, -- en grammes
    carbs REAL, -- en grammes
    fats REAL, -- en grammes
    fiber REAL, -- en grammes
    sugar REAL, -- en grammes
    sodium REAL, -- en mg
    notes TEXT,
    image_url TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Table des objectifs nutritionnels
CREATE TABLE IF NOT EXISTS nutrition_goals (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    client_id INTEGER NOT NULL REFERENCES users(id),
    daily_calories INTEGER,
    daily_proteins REAL,
    daily_carbs REAL,
    daily_fats REAL,
    daily_fiber REAL,
    daily_water_ml INTEGER,
    is_active BOOLEAN DEFAULT TRUE,
    created_by INTEGER REFERENCES users(id), -- coach qui a créé l'objectif
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Table des rendez-vous
CREATE TABLE IF NOT EXISTS appointments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    coach_id INTEGER NOT NULL REFERENCES users(id),
    client_id INTEGER NOT NULL REFERENCES users(id),
    title TEXT NOT NULL,
    description TEXT,
    type TEXT CHECK (type IN ('consultation', 'training', 'nutrition', 'assessment')),
    scheduled_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('scheduled', 'confirmed', 'completed', 'cancelled', 'no_show')) DEFAULT 'scheduled',
    location TEXT,
    meeting_url TEXT, -- pour les RDV virtuels
    notes TEXT,
    price REAL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Table des messages
CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sender_id INTEGER NOT NULL REFERENCES users(id),
    recipient_id INTEGER NOT NULL REFERENCES users(id),
    subject TEXT,
    content TEXT NOT NULL,
    message_type TEXT CHECK (message_type IN ('text', 'image', 'file', 'system')) DEFAULT 'text',
    attachment_url TEXT,
    is_read BOOLEAN DEFAULT FALSE,
    parent_message_id INTEGER REFERENCES messages(id), -- pour les réponses
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    read_at DATETIME
);

-- Table des paiements
CREATE TABLE IF NOT EXISTS payments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    client_id INTEGER NOT NULL REFERENCES users(id),
    coach_id INTEGER NOT NULL REFERENCES users(id),
    amount REAL NOT NULL,
    currency TEXT NOT NULL DEFAULT 'EUR',
    description TEXT,
    status TEXT NOT NULL CHECK (status IN ('pending', 'completed', 'failed', 'refunded')) DEFAULT 'pending',
    payment_method TEXT,
    transaction_id TEXT,
    appointment_id INTEGER REFERENCES appointments(id),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Table des notifications
CREATE TABLE IF NOT EXISTS notifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id),
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('appointment', 'workout', 'message', 'payment', 'system')),
    is_read BOOLEAN DEFAULT FALSE,
    action_url TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    read_at DATETIME
);

-- Indexes pour optimiser les requêtes
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_coach_id ON users(coach_id);
CREATE INDEX IF NOT EXISTS idx_programs_coach_id ON programs(coach_id);
CREATE INDEX IF NOT EXISTS idx_programs_client_id ON programs(client_id);
CREATE INDEX IF NOT EXISTS idx_workouts_client_id ON workouts(client_id);
CREATE INDEX IF NOT EXISTS idx_workouts_scheduled_date ON workouts(scheduled_date);
CREATE INDEX IF NOT EXISTS idx_meals_client_id ON meals(client_id);
CREATE INDEX IF NOT EXISTS idx_meals_date ON meals(date);
CREATE INDEX IF NOT EXISTS idx_appointments_coach_id ON appointments(coach_id);
CREATE INDEX IF NOT EXISTS idx_appointments_client_id ON appointments(client_id);
CREATE INDEX IF NOT EXISTS idx_appointments_date ON appointments(scheduled_date);
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_recipient_id ON messages(recipient_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);