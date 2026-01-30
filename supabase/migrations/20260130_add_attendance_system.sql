-- ============================================================================
-- MIGRATION : SYSTÈME DE POINTAGE PAR GÉOLOCALISATION
-- Date : 30 Janvier 2026
-- Description : Système de présence/absence/retard avec GPS
-- ============================================================================

-- ============================================================================
-- TABLE 1 : ATTENDANCES (Pointages des employés)
-- ============================================================================

CREATE TABLE IF NOT EXISTS attendances (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    
    -- Date et heures
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    heure_arrivee TIMESTAMP NOT NULL DEFAULT NOW(),
    heure_depart TIMESTAMP,
    
    -- Géolocalisation arrivée
    latitude_arrivee DECIMAL(10, 8) NOT NULL,
    longitude_arrivee DECIMAL(11, 8) NOT NULL,
    distance_arrivee DECIMAL(10, 2) NOT NULL, -- en mètres
    
    -- Géolocalisation départ
    latitude_depart DECIMAL(10, 8),
    longitude_depart DECIMAL(11, 8),
    distance_depart DECIMAL(10, 2),
    
    -- Validation
    validee BOOLEAN DEFAULT true,
    validation VARCHAR(20) CHECK (validation IN ('VALIDE', 'HORS_ZONE', 'RETARD')),
    
    -- Métadonnées
    note TEXT,
    ip_address VARCHAR(50),
    device_info TEXT,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    -- Contrainte : Un seul pointage par jour et par utilisateur
    CONSTRAINT unique_user_date UNIQUE(user_id, date),
    
    -- Relation avec users
    CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Index pour performances
CREATE INDEX IF NOT EXISTS idx_attendances_user_id ON attendances(user_id);
CREATE INDEX IF NOT EXISTS idx_attendances_date ON attendances(date);
CREATE INDEX IF NOT EXISTS idx_attendances_validee ON attendances(validee);
CREATE INDEX IF NOT EXISTS idx_attendances_validation ON attendances(validation);
CREATE INDEX IF NOT EXISTS idx_attendances_user_date ON attendances(user_id, date);

-- Trigger pour mettre à jour updated_at
CREATE OR REPLACE FUNCTION update_attendances_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_attendances_updated_at
    BEFORE UPDATE ON attendances
    FOR EACH ROW
    EXECUTE FUNCTION update_attendances_updated_at();

-- ============================================================================
-- TABLE 2 : STORE_CONFIG (Configuration de l'atelier)
-- ============================================================================

CREATE TABLE IF NOT EXISTS store_config (
    id SERIAL PRIMARY KEY,
    nom VARCHAR(255) DEFAULT 'Atelier de Confection',
    adresse TEXT,
    
    -- Coordonnées GPS de l'atelier
    latitude DECIMAL(10, 8) NOT NULL,
    longitude DECIMAL(11, 8) NOT NULL,
    
    -- Rayon de tolérance en mètres (par défaut 50m)
    rayon_tolerance INTEGER DEFAULT 50,
    
    -- Horaires de travail
    heure_ouverture TIME DEFAULT '08:00',
    heure_fermeture TIME DEFAULT '18:00',
    
    -- Tolérance de retard en minutes (par défaut 15 min)
    tolerance_retard INTEGER DEFAULT 15,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Trigger pour mettre à jour updated_at
CREATE OR REPLACE FUNCTION update_store_config_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_store_config_updated_at
    BEFORE UPDATE ON store_config
    FOR EACH ROW
    EXECUTE FUNCTION update_store_config_updated_at();

-- ============================================================================
-- DONNÉES INITIALES
-- ============================================================================

-- Insérer une configuration par défaut (À MODIFIER avec vos coordonnées GPS)
INSERT INTO store_config (
    nom,
    adresse,
    latitude,
    longitude,
    rayon_tolerance,
    heure_ouverture,
    heure_fermeture,
    tolerance_retard
) VALUES (
    'Atelier de Confection Principal',
    'À configurer - Utilisez le script setup-attendance.js',
    5.353021,  -- ⚠️ EXEMPLE : Coordonnées Abidjan - À MODIFIER
    -3.870182, -- ⚠️ EXEMPLE : Coordonnées Abidjan - À MODIFIER
    50,        -- 50 mètres de rayon
    '08:00',   -- Ouverture à 8h
    '18:00',   -- Fermeture à 18h
    15         -- 15 minutes de tolérance pour les retards
)
ON CONFLICT DO NOTHING;

-- ============================================================================
-- FONCTIONS SQL UTILITAIRES
-- ============================================================================

-- Fonction pour calculer la distance entre deux coordonnées GPS (Haversine)
CREATE OR REPLACE FUNCTION calculate_distance(
    lat1 DECIMAL,
    lon1 DECIMAL,
    lat2 DECIMAL,
    lon2 DECIMAL
)
RETURNS DECIMAL AS $$
DECLARE
    R CONSTANT DECIMAL := 6371000; -- Rayon de la Terre en mètres
    phi1 DECIMAL;
    phi2 DECIMAL;
    delta_phi DECIMAL;
    delta_lambda DECIMAL;
    a DECIMAL;
    c DECIMAL;
BEGIN
    phi1 := RADIANS(lat1);
    phi2 := RADIANS(lat2);
    delta_phi := RADIANS(lat2 - lat1);
    delta_lambda := RADIANS(lon2 - lon1);
    
    a := SIN(delta_phi / 2) * SIN(delta_phi / 2) +
         COS(phi1) * COS(phi2) *
         SIN(delta_lambda / 2) * SIN(delta_lambda / 2);
    
    c := 2 * ATAN2(SQRT(a), SQRT(1 - a));
    
    RETURN R * c; -- Distance en mètres
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ============================================================================
-- VUES UTILES
-- ============================================================================

-- Vue : Présences d'aujourd'hui avec informations utilisateur
CREATE OR REPLACE VIEW v_attendances_today AS
SELECT 
    a.id,
    a.user_id,
    u.prenom,
    u.nom,
    u.role,
    a.date,
    a.heure_arrivee,
    a.heure_depart,
    a.distance_arrivee,
    a.distance_depart,
    a.validee,
    a.validation,
    a.note,
    CASE 
        WHEN a.heure_depart IS NOT NULL THEN 'PARTI'
        WHEN a.validation = 'RETARD' THEN 'RETARD'
        WHEN a.validee = true THEN 'PRÉSENT'
        ELSE 'ABSENT'
    END AS statut,
    a.created_at
FROM attendances a
INNER JOIN users u ON a.user_id = u.id
WHERE a.date = CURRENT_DATE
ORDER BY a.heure_arrivee DESC;

-- Vue : Statistiques de présence par utilisateur (30 derniers jours)
CREATE OR REPLACE VIEW v_attendance_stats AS
SELECT 
    u.id AS user_id,
    u.prenom,
    u.nom,
    u.role,
    COUNT(a.id) AS total_presences,
    COUNT(CASE WHEN a.validation = 'VALIDE' THEN 1 END) AS presences_valides,
    COUNT(CASE WHEN a.validation = 'RETARD' THEN 1 END) AS retards,
    COUNT(CASE WHEN a.heure_depart IS NOT NULL THEN 1 END) AS departs_enregistres,
    ROUND(AVG(a.distance_arrivee), 2) AS distance_moyenne,
    MIN(a.heure_arrivee::TIME) AS heure_arrivee_min,
    MAX(a.heure_arrivee::TIME) AS heure_arrivee_max,
    ROUND(
        (COUNT(CASE WHEN a.validation = 'VALIDE' THEN 1 END)::DECIMAL / 
         NULLIF(COUNT(a.id), 0) * 100), 
        2
    ) AS taux_ponctualite
FROM users u
LEFT JOIN attendances a ON u.id = a.user_id 
    AND a.date >= CURRENT_DATE - INTERVAL '30 days'
WHERE u.role IN ('gestionnaire', 'appelant', 'styliste', 'couturier')
GROUP BY u.id, u.prenom, u.nom, u.role
ORDER BY u.nom, u.prenom;

-- ============================================================================
-- PERMISSIONS RLS (Row Level Security)
-- ============================================================================

-- Activer RLS sur attendances
ALTER TABLE attendances ENABLE ROW LEVEL SECURITY;

-- Politique : Les utilisateurs peuvent voir leurs propres pointages
CREATE POLICY "Users can view own attendances"
    ON attendances FOR SELECT
    USING (auth.uid()::text = user_id::text);

-- Politique : Les admins et gestionnaires peuvent tout voir
CREATE POLICY "Admins and managers can view all attendances"
    ON attendances FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE id = auth.uid()::integer
            AND role IN ('admin', 'gestionnaire')
        )
    );

-- Politique : Les utilisateurs peuvent créer leurs propres pointages
CREATE POLICY "Users can create own attendances"
    ON attendances FOR INSERT
    WITH CHECK (auth.uid()::text = user_id::text);

-- Politique : Les utilisateurs peuvent modifier leurs propres pointages
CREATE POLICY "Users can update own attendances"
    ON attendances FOR UPDATE
    USING (auth.uid()::text = user_id::text);

-- Activer RLS sur store_config
ALTER TABLE store_config ENABLE ROW LEVEL SECURITY;

-- Politique : Tout le monde peut lire la config
CREATE POLICY "Everyone can view store config"
    ON store_config FOR SELECT
    USING (true);

-- Politique : Seuls les admins peuvent modifier la config
CREATE POLICY "Only admins can update store config"
    ON store_config FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE id = auth.uid()::integer
            AND role = 'admin'
        )
    );

-- ============================================================================
-- COMMENTAIRES
-- ============================================================================

COMMENT ON TABLE attendances IS 'Table des pointages (présence/absence) avec géolocalisation GPS';
COMMENT ON TABLE store_config IS 'Configuration de l''atelier (coordonnées GPS, horaires, tolérances)';
COMMENT ON FUNCTION calculate_distance IS 'Calcule la distance en mètres entre deux coordonnées GPS (formule de Haversine)';
COMMENT ON VIEW v_attendances_today IS 'Vue des présences du jour avec statuts';
COMMENT ON VIEW v_attendance_stats IS 'Statistiques de présence sur 30 jours par utilisateur';

-- ============================================================================
-- SUCCÈS !
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '✅ Migration terminée avec succès !';
    RAISE NOTICE '📍 Système de pointage GPS créé';
    RAISE NOTICE '⚠️  N''oubliez pas de configurer vos coordonnées GPS avec le script setup-attendance.js';
END $$;

