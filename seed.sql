-- Données initiales pour CoachFit
-- Ce fichier contient les données de test et d'exemple

-- Utilisateurs de test
INSERT OR IGNORE INTO users (id, email, password_hash, name, role, phone, bio, status) VALUES 
(1, 'admin@coachfit.com', '$2a$10$example_hash', 'Administrateur CoachFit', 'admin', '+33123456789', 'Administrateur de la plateforme CoachFit', 'active'),
(2, 'coach.thomas@coachfit.com', '$2a$10$example_hash', 'Thomas Durand', 'coach', '+33612345678', 'Coach sportif certifié, spécialisé en musculation et perte de poids', 'active'),
(3, 'coach.sophie@coachfit.com', '$2a$10$example_hash', 'Sophie Martin', 'coach', '+33687654321', 'Nutritionniste et coach wellness, experte en rééquilibrage alimentaire', 'active'),
(4, 'marie.client@example.com', '$2a$10$example_hash', 'Marie Dubois', 'client', '+33634567890', 'Objectif : perdre du poids et retrouver la forme', 'active'),
(5, 'julie.client@example.com', '$2a$10$example_hash', 'Julie Moreau', 'client', '+33645678901', 'Passionnée de fitness, objectif prise de masse musculaire', 'active'),
(6, 'paul.client@example.com', '$2a$10$example_hash', 'Paul Lefebvre', 'client', '+33656789012', 'Débutant en sport, recherche un programme adapté', 'active');

-- Assignation des clients aux coaches
UPDATE users SET coach_id = 2 WHERE id IN (4, 5); -- Marie et Julie avec Coach Thomas
UPDATE users SET coach_id = 3 WHERE id = 6; -- Paul avec Coach Sophie

-- Profils physiques des clients
INSERT OR IGNORE INTO user_profiles (user_id, height, weight, body_fat_percentage, fitness_level, goals) VALUES 
(4, 165, 68.5, 25.0, 'beginner', 'Perte de poids, amélioration de la condition physique'),
(5, 170, 62.0, 18.0, 'intermediate', 'Prise de masse musculaire, performance sportive'),
(6, 180, 85.0, 22.0, 'beginner', 'Remise en forme générale, amélioration de la santé');

-- Exercices de base
INSERT OR IGNORE INTO exercises (name, description, category, muscle_groups, equipment, instructions, difficulty, is_public) VALUES 
-- Exercices de force
('Squats', 'Exercice fondamental pour les jambes et fessiers', 'strength', '["quadriceps", "glutes", "hamstrings"]', 'aucun', '1. Pieds écartés largeur d''épaules\n2. Descendez en fléchissant les genoux\n3. Remontez en poussant sur les talons', 'beginner', TRUE),
('Pompes', 'Exercice pour le haut du corps', 'strength', '["pectorals", "triceps", "shoulders"]', 'aucun', '1. Position planche\n2. Descendez en fléchissant les bras\n3. Remontez en poussant', 'beginner', TRUE),
('Planche', 'Exercice de gainage pour le core', 'strength', '["core", "shoulders"]', 'aucun', '1. Position planche sur les avant-bras\n2. Gardez le corps droit\n3. Maintenez la position', 'beginner', TRUE),
('Développé couché', 'Exercice pour les pectoraux', 'strength', '["pectorals", "triceps", "shoulders"]', 'haltères', '1. Allongé sur banc\n2. Descendez la barre vers la poitrine\n3. Remontez en poussant', 'intermediate', TRUE),
('Tractions', 'Exercice pour le dos et biceps', 'strength', '["lats", "biceps", "rhomboids"]', 'barre de traction', '1. Suspendez-vous à la barre\n2. Tirez jusqu''à amener le menton au-dessus\n3. Redescendez contrôlé', 'intermediate', TRUE),

-- Exercices cardio
('Course à pied', 'Course d''endurance', 'cardio', '["legs", "cardiovascular"]', 'aucun', '1. Échauffement 5 minutes\n2. Course à rythme modéré\n3. Retour au calme', 'beginner', TRUE),
('Vélo d''appartement', 'Cardio sur vélo stationnaire', 'cardio', '["legs", "cardiovascular"]', 'vélo', '1. Réglez la selle\n2. Pédalez à rythme soutenu\n3. Variez l''intensité', 'beginner', TRUE),
('Burpees', 'Exercice cardio intense', 'cardio', '["full_body", "cardiovascular"]', 'aucun', '1. Position debout\n2. Descendez en squat puis planche\n3. Pompe puis saut', 'advanced', TRUE),

-- Exercices de flexibilité
('Étirements quadriceps', 'Étirement des muscles avant de la cuisse', 'flexibility', '["quadriceps"]', 'aucun', '1. Debout, pliez une jambe vers l''arrière\n2. Tenez le pied avec la main\n3. Maintenez 30 secondes', 'beginner', TRUE),
('Étirements dos', 'Étirement du dos et des épaules', 'flexibility', '["back", "shoulders"]', 'aucun', '1. Bras tendus vers l''avant\n2. Arrondissez le dos\n3. Maintenez 30 secondes', 'beginner', TRUE);

-- Programmes d'exemple
INSERT OR IGNORE INTO programs (name, description, coach_id, client_id, type, difficulty, duration_weeks, sessions_per_week, status, start_date) VALUES 
('Programme Perte de Poids - Marie', 'Programme personnalisé pour la perte de poids avec cardio et renforcement', 2, 4, 'mixed', 'beginner', 12, 3, 'active', '2024-01-15'),
('Programme Musculation - Julie', 'Programme de prise de masse musculaire avec exercices de force', 2, 5, 'strength', 'intermediate', 16, 4, 'active', '2024-01-08'),
('Programme Remise en Forme - Paul', 'Programme découverte pour débutant', 3, 6, 'mixed', 'beginner', 8, 2, 'active', '2024-01-10');

-- Séances d'entraînement
INSERT OR IGNORE INTO workouts (program_id, client_id, name, description, scheduled_date, duration_minutes, status, notes) VALUES 
-- Séances pour Marie (Programme 1)
(1, 4, 'Séance Cardio & Renforcement', 'Combinaison cardio et exercices de base', '2024-01-15', 45, 'completed', 'Très bon travail, progression visible'),
(1, 4, 'Séance Full Body', 'Entraînement complet du corps', '2024-01-17', 50, 'completed', 'Difficulté sur les pompes, à améliorer'),
(1, 4, 'Séance Cardio Intensif', 'Focus sur le cardio training', '2024-01-19', 35, 'scheduled', ''),

-- Séances pour Julie (Programme 2)
(2, 5, 'Séance Haut du Corps', 'Focus pectoraux, dos, épaules', '2024-01-08', 60, 'completed', 'Excellent travail, charges augmentées'),
(2, 5, 'Séance Jambes', 'Entraînement intensif des jambes', '2024-01-10', 55, 'completed', 'Progression sur les squats'),
(2, 5, 'Séance Push/Pull', 'Alternance poussée/tirage', '2024-01-12', 65, 'in_progress', ''),

-- Séances pour Paul (Programme 3)
(3, 6, 'Découverte Fitness', 'Première séance d''initiation', '2024-01-10', 30, 'completed', 'Bon début, motivé'),
(3, 6, 'Cardio Doux', 'Séance cardio adaptée débutant', '2024-01-12', 25, 'scheduled', '');

-- Exercices dans les séances
INSERT OR IGNORE INTO workout_exercises (workout_id, exercise_id, sets, reps, duration_seconds, order_index, completed) VALUES 
-- Séance 1 de Marie
(1, 1, 3, 12, NULL, 1, TRUE), -- Squats
(1, 2, 2, 8, NULL, 2, TRUE),  -- Pompes
(1, 6, 1, NULL, 1200, 3, TRUE), -- Course 20 min

-- Séance 2 de Marie
(2, 1, 3, 15, NULL, 1, TRUE), -- Squats
(2, 2, 3, 10, NULL, 2, FALSE), -- Pompes (pas terminé)
(2, 3, 2, NULL, 30, 3, TRUE), -- Planche

-- Séance 1 de Julie
(3, 4, 4, 10, NULL, 1, TRUE), -- Développé couché
(3, 5, 3, 6, NULL, 2, TRUE),  -- Tractions
(3, 2, 3, 15, NULL, 3, TRUE); -- Pompes

-- Repas exemples
INSERT OR IGNORE INTO meals (client_id, date, type, name, description, calories, proteins, carbs, fats) VALUES 
-- Repas de Marie
(4, '2024-01-15', 'breakfast', 'Petit-déjeuner équilibré', 'Flocons d''avoine avec fruits et yaourt', 350, 15, 55, 8),
(4, '2024-01-15', 'lunch', 'Salade de quinoa', 'Salade complète avec quinoa, légumes et poulet', 450, 25, 40, 18),
(4, '2024-01-15', 'dinner', 'Saumon grillé', 'Saumon avec légumes vapeur et riz complet', 520, 35, 45, 15),
(4, '2024-01-15', 'snack', 'Collation fruits', 'Pomme et amandes', 180, 6, 25, 8),

-- Repas de Julie
(5, '2024-01-15', 'breakfast', 'Petit-déjeuner protéiné', 'Œufs brouillés avec avocat et pain complet', 420, 28, 35, 22),
(5, '2024-01-15', 'lunch', 'Bowl de riz au poulet', 'Riz, poulet, légumes et sauce tahini', 580, 40, 55, 18),
(5, '2024-01-15', 'dinner', 'Bœuf aux légumes', 'Bœuf sauté avec quinoa et brocolis', 650, 45, 48, 25);

-- Objectifs nutritionnels
INSERT OR IGNORE INTO nutrition_goals (client_id, daily_calories, daily_proteins, daily_carbs, daily_fats, daily_water_ml, created_by) VALUES 
(4, 1800, 100, 180, 60, 2500, 2), -- Marie : objectif perte de poids
(5, 2200, 140, 220, 80, 3000, 2), -- Julie : objectif prise de masse
(6, 2000, 120, 200, 70, 2500, 3); -- Paul : objectif maintien

-- Rendez-vous
INSERT OR IGNORE INTO appointments (coach_id, client_id, title, description, type, scheduled_date, start_time, end_time, status) VALUES 
(2, 4, 'Bilan Initial', 'Premier rendez-vous pour évaluation et objectifs', 'assessment', '2024-01-15', '10:00', '11:00', 'completed'),
(2, 4, 'Séance de coaching', 'Séance d''entraînement personnalisée', 'training', '2024-01-20', '10:00', '11:00', 'confirmed'),
(2, 5, 'Suivi programme', 'Point sur l''évolution du programme', 'consultation', '2024-01-18', '14:00', '14:30', 'scheduled'),
(3, 6, 'Consultation nutrition', 'Conseils nutritionnels personnalisés', 'nutrition', '2024-01-22', '16:00', '17:00', 'scheduled');

-- Messages
INSERT OR IGNORE INTO messages (sender_id, recipient_id, subject, content, message_type, is_read) VALUES 
(2, 4, 'Félicitations !', 'Bravo pour ta première séance, tu as très bien travaillé ! Continue comme ça 💪', 'text', TRUE),
(4, 2, 'Question exercices', 'Salut Thomas, j''ai une question sur la technique des pompes, peux-tu m''expliquer ?', 'text', TRUE),
(2, 4, 'RE: Question exercices', 'Bien sûr ! Pour les pompes, assure-toi de garder le corps bien droit et de descendre jusqu''à ce que tes coudes soient à 90°. On en reparle à la prochaine séance !', 'text', FALSE),
(3, 6, 'Bienvenue !', 'Bienvenue dans ton parcours fitness Paul ! N''hésite pas si tu as des questions 😊', 'text', FALSE);

-- Notifications
INSERT OR IGNORE INTO notifications (user_id, title, message, type, is_read) VALUES 
(4, 'Séance programmée', 'Tu as une séance prévue demain à 10h avec Thomas', 'appointment', FALSE),
(4, 'Nouveau message', 'Thomas t''a envoyé un message', 'message', TRUE),
(5, 'Objectif atteint !', 'Félicitations ! Tu as atteint ton objectif de séances cette semaine', 'workout', FALSE),
(6, 'RDV nutrition', 'N''oublie pas ton rendez-vous nutrition demain à 16h', 'appointment', FALSE);

-- Quelques paiements d'exemple
INSERT OR IGNORE INTO payments (client_id, coach_id, amount, currency, description, status, appointment_id) VALUES 
(4, 2, 60.00, 'EUR', 'Séance de coaching individuel', 'completed', 2),
(5, 2, 200.00, 'EUR', 'Programme mensuel musculation', 'completed', NULL),
(6, 3, 45.00, 'EUR', 'Consultation nutritionnelle', 'pending', 4);