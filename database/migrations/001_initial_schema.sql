-- ============================================================================
-- CAMPUSCONNECT MULTI-UNIVERSITY PLATFORM - DATABASE SCHEMA
-- Target Database: MySQL 8.0+
-- Charset: utf8mb4 | Collation: utf8mb4_unicode_ci
-- ============================================================================

SET FOREIGN_KEY_CHECKS = 0;

DROP TABLE IF EXISTS audit_logs;
DROP TABLE IF EXISTS notifications;
DROP TABLE IF EXISTS event_favorites;
DROP TABLE IF EXISTS event_registrations;
DROP TABLE IF EXISTS events;
DROP TABLE IF EXISTS buildings;
DROP TABLE IF EXISTS university_memberships;
DROP TABLE IF EXISTS campuses;
DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS universities;

SET FOREIGN_KEY_CHECKS = 1;

-- 1. UNIVERSITIES TABLE
CREATE TABLE universities (
    id INT AUTO_INCREMENT PRIMARY KEY,
    slug VARCHAR(100) NOT NULL UNIQUE,
    name_en VARCHAR(255) NOT NULL,
    name_km VARCHAR(255) NOT NULL,
    acronym VARCHAR(50) NOT NULL,
    official_website VARCHAR(255) NOT NULL,
    logo_url VARCHAR(255) NULL,
    description_en TEXT NULL,
    description_km TEXT NULL,
    address_en VARCHAR(255) NULL,
    address_km VARCHAR(255) NULL,
    phone VARCHAR(100) NULL,
    email VARCHAR(100) NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    
    -- Source-of-truth & Verification Workflow
    source_url VARCHAR(255) NOT NULL,
    source_type ENUM('official_website', 'ministry_registry', 'authorized_entry', 'public_directory') NOT NULL DEFAULT 'official_website',
    verification_status ENUM('verified', 'unverified', 'pending_review') NOT NULL DEFAULT 'verified',
    data_classification ENUM('verified_public', 'unverified', 'demonstration') NOT NULL DEFAULT 'verified_public',
    verified_at TIMESTAMP NULL,
    
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_universities_slug (slug),
    INDEX idx_universities_status (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. USERS TABLE
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(191) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(191) NOT NULL,
    full_name_km VARCHAR(191) NULL,
    role ENUM('platform_admin', 'university_admin', 'organizer', 'student') NOT NULL DEFAULT 'student',
    university_id INT NULL,
    phone VARCHAR(50) NULL,
    avatar_url VARCHAR(255) NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (university_id) REFERENCES universities(id) ON DELETE SET NULL,
    INDEX idx_users_role (role),
    INDEX idx_users_university (university_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. CAMPUSES TABLE
CREATE TABLE campuses (
    id INT AUTO_INCREMENT PRIMARY KEY,
    university_id INT NOT NULL,
    slug VARCHAR(100) NOT NULL,
    name_en VARCHAR(255) NOT NULL,
    name_km VARCHAR(255) NOT NULL,
    address_en VARCHAR(255) NOT NULL,
    address_km VARCHAR(255) NOT NULL,
    latitude DECIMAL(10, 8) NOT NULL,
    longitude DECIMAL(11, 8) NOT NULL,
    is_main BOOLEAN NOT NULL DEFAULT FALSE,
    
    -- Source verification
    source_url VARCHAR(255) NULL,
    source_type VARCHAR(100) NOT NULL DEFAULT 'openstreetmap',
    verification_status ENUM('verified', 'unverified') NOT NULL DEFAULT 'verified',
    verified_at TIMESTAMP NULL,
    
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (university_id) REFERENCES universities(id) ON DELETE CASCADE,
    UNIQUE KEY uq_campus_slug (university_id, slug),
    INDEX idx_campuses_uni (university_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. UNIVERSITY MEMBERSHIPS TABLE
CREATE TABLE university_memberships (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    university_id INT NOT NULL,
    role ENUM('university_admin', 'organizer', 'student') NOT NULL,
    status ENUM('active', 'inactive', 'pending') NOT NULL DEFAULT 'active',
    student_id_number VARCHAR(100) NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (university_id) REFERENCES universities(id) ON DELETE CASCADE,
    UNIQUE KEY uq_user_university (user_id, university_id),
    INDEX idx_membership_role (role)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. BUILDINGS TABLE
CREATE TABLE buildings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    campus_id INT NOT NULL,
    code VARCHAR(50) NULL,
    name_en VARCHAR(255) NOT NULL,
    name_km VARCHAR(255) NOT NULL,
    category ENUM('academic', 'administrative', 'library', 'cooperation_center', 'lab', 'sports', 'canteen', 'other') NOT NULL DEFAULT 'academic',
    description_en TEXT NULL,
    description_km TEXT NULL,
    latitude DECIMAL(10, 8) NOT NULL,
    longitude DECIMAL(11, 8) NOT NULL,
    floors INT NOT NULL DEFAULT 1,
    is_accessible BOOLEAN NOT NULL DEFAULT TRUE,
    
    -- Source-of-truth & Location Verification
    source_url VARCHAR(255) NOT NULL,
    source_type VARCHAR(100) NOT NULL DEFAULT 'openstreetmap',
    verification_status ENUM('verified', 'unverified', 'pending_review') NOT NULL DEFAULT 'verified',
    data_classification ENUM('verified_public', 'unverified', 'demonstration') NOT NULL DEFAULT 'verified_public',
    verified_at TIMESTAMP NULL,
    last_verified_by INT NULL,
    
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (campus_id) REFERENCES campuses(id) ON DELETE CASCADE,
    FOREIGN KEY (last_verified_by) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_buildings_campus (campus_id),
    INDEX idx_buildings_verification (verification_status),
    INDEX idx_buildings_category (category)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. EVENTS TABLE
CREATE TABLE events (
    id INT AUTO_INCREMENT PRIMARY KEY,
    university_id INT NOT NULL,
    campus_id INT NOT NULL,
    building_id INT NULL,
    organizer_id INT NOT NULL,
    slug VARCHAR(150) NOT NULL UNIQUE,
    title_en VARCHAR(255) NOT NULL,
    title_km VARCHAR(255) NOT NULL,
    category ENUM('academic', 'career_fair', 'cultural', 'technology', 'sports', 'workshop', 'orientation', 'other') NOT NULL DEFAULT 'academic',
    description_en TEXT NOT NULL,
    description_km TEXT NOT NULL,
    room_or_venue_details VARCHAR(255) NULL,
    start_time DATETIME NOT NULL,
    end_time DATETIME NOT NULL,
    registration_deadline DATETIME NULL,
    capacity INT NOT NULL DEFAULT 50,
    registered_count INT NOT NULL DEFAULT 0,
    status ENUM('draft', 'published', 'cancelled', 'completed') NOT NULL DEFAULT 'published',
    
    -- Classification & Source Verification
    event_verification ENUM('confirmed', 'unverified', 'draft', 'expired', 'demonstration') NOT NULL DEFAULT 'confirmed',
    data_classification ENUM('verified_public', 'unverified', 'demonstration') NOT NULL DEFAULT 'verified_public',
    source_url VARCHAR(255) NULL,
    source_type VARCHAR(100) NULL,
    last_verified_at TIMESTAMP NULL,
    banner_image_url VARCHAR(255) NULL,
    
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (university_id) REFERENCES universities(id) ON DELETE CASCADE,
    FOREIGN KEY (campus_id) REFERENCES campuses(id) ON DELETE CASCADE,
    FOREIGN KEY (building_id) REFERENCES buildings(id) ON DELETE SET NULL,
    FOREIGN KEY (organizer_id) REFERENCES users(id) ON DELETE RESTRICT,
    INDEX idx_events_lookup (university_id, campus_id, status),
    INDEX idx_events_time (start_time),
    INDEX idx_events_verification (event_verification)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 7. EVENT REGISTRATIONS TABLE
CREATE TABLE event_registrations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    event_id INT NOT NULL,
    user_id INT NOT NULL,
    status ENUM('confirmed', 'cancelled', 'attended') NOT NULL DEFAULT 'confirmed',
    registered_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    cancelled_at TIMESTAMP NULL,
    notes VARCHAR(255) NULL,
    FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY uq_event_user_active (event_id, user_id),
    INDEX idx_registrations_user (user_id),
    INDEX idx_registrations_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 8. EVENT FAVORITES TABLE
CREATE TABLE event_favorites (
    id INT AUTO_INCREMENT PRIMARY KEY,
    event_id INT NOT NULL,
    user_id INT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY uq_event_favorite (event_id, user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 9. NOTIFICATIONS TABLE
CREATE TABLE notifications (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    title_en VARCHAR(255) NOT NULL,
    title_km VARCHAR(255) NOT NULL,
    message_en TEXT NOT NULL,
    message_km TEXT NOT NULL,
    type ENUM('event_registered', 'event_cancelled', 'event_reminder', 'system') NOT NULL,
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_notifications_user_read (user_id, is_read)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 10. AUDIT LOGS TABLE
CREATE TABLE audit_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NULL,
    university_id INT NULL,
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    entity_id INT NULL,
    details JSON NULL,
    ip_address VARCHAR(50) NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (university_id) REFERENCES universities(id) ON DELETE SET NULL,
    INDEX idx_audit_uni (university_id),
    INDEX idx_audit_action (action),
    INDEX idx_audit_entity (entity_type, entity_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
