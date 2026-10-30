-- ============================================================================
-- CAMPUSCONNECT RBAC, SESSION AUTHENTICATION & ADMIN DASHBOARD MIGRATION
-- Enhancements: rejection_reason in events, last_login_at in users, user_sessions table
-- ============================================================================

-- 1. Add rejection_reason to events table for moderation feedback
ALTER TABLE events 
ADD COLUMN rejection_reason TEXT NULL AFTER approval_status;

-- 2. Add last_login_at to users table for active user tracking in admin dashboard
ALTER TABLE users 
ADD COLUMN last_login_at DATETIME NULL AFTER is_active;

-- 3. Create user_sessions table for database-backed session invalidation & security
CREATE TABLE IF NOT EXISTS user_sessions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    session_token VARCHAR(500) NOT NULL UNIQUE,
    ip_address VARCHAR(45) NULL,
    user_agent TEXT NULL,
    is_valid BOOLEAN NOT NULL DEFAULT TRUE,
    expires_at DATETIME NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_session_token (session_token),
    INDEX idx_session_user (user_id),
    INDEX idx_session_status (is_valid, expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
