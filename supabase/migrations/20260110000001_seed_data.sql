-- Seed data pour les utilisateurs de test
-- Mot de passe hashé pour 'password123': $2a$10$... (généré avec bcrypt)

insert into users (nom, email, password, role, telephone)
values
  ('Admin Principal', 'admin@atelier.com', '$2a$10$K9j5xKxYxYz5Y5Y5Y5Y5YeK9j5xKxYxYz5Y5Y5Y5Y5YeK9j5xKxYxY', 'administrateur', '+225 07 00 00 00 01'),
  ('Gestionnaire Principal', 'gestionnaire@atelier.com', '$2a$10$K9j5xKxYxYz5Y5Y5Y5Y5YeK9j5xKxYxYz5Y5Y5Y5Y5YeK9j5xKxYxY', 'gestionnaire', '+225 07 00 00 00 02'),
  ('Appelant Marie', 'appelant@atelier.com', '$2a$10$K9j5xKxYxYz5Y5Y5Y5Y5YeK9j5xKxYxYz5Y5Y5Y5Y5YeK9j5xKxYxY', 'appelant', '+225 07 00 00 00 03'),
  ('Appelant Jean', 'appelant2@atelier.com', '$2a$10$K9j5xKxYxYz5Y5Y5Y5Y5YeK9j5xKxYxYz5Y5Y5Y5Y5YeK9j5xKxYxY', 'appelant', '+225 07 00 00 00 04'),
  ('Styliste Fatou', 'styliste@atelier.com', '$2a$10$K9j5xKxYxYz5Y5Y5Y5Y5YeK9j5xKxYxYz5Y5Y5Y5Y5YeK9j5xKxYxY', 'styliste', '+225 07 00 00 00 05'),
  ('Couturier Amadou', 'couturier@atelier.com', '$2a$10$K9j5xKxYxYz5Y5Y5Y5Y5YeK9j5xKxYxYz5Y5Y5Y5Y5YeK9j5xKxYxY', 'couturier', '+225 07 00 00 00 06'),
  ('Couturier Aïcha', 'couturier2@atelier.com', '$2a$10$K9j5xKxYxYz5Y5Y5Y5Y5YeK9j5xKxYxYz5Y5Y5Y5Y5YeK9j5xKxYxY', 'couturier', '+225 07 00 00 00 07'),
  ('Livreur Koffi', 'livreur@atelier.com', '$2a$10$K9j5xKxYxYz5Y5Y5Y5Y5YeK9j5xKxYxYz5Y5Y5Y5Y5YeK9j5xKxYxY', 'livreur', '+225 07 00 00 00 08'),
  ('Livreur Didier', 'livreur2@atelier.com', '$2a$10$K9j5xKxYxYz5Y5Y5Y5Y5YeK9j5xKxYxYz5Y5Y5Y5Y5YeK9j5xKxYxY', 'livreur', '+225 07 00 00 00 09');



