-- ============================================================================
-- CAMPUSCONNECT V2.0 UPGRADE MIGRATION
-- Enhancements: Facility parking category, event approval workflow, password resets
-- ============================================================================

-- 1. Modify buildings table category to support parking facilities
ALTER TABLE buildings 
MODIFY COLUMN category ENUM('academic', 'administrative', 'library', 'cooperation_center', 'lab', 'sports', 'canteen', 'parking', 'other') NOT NULL DEFAULT 'academic';

-- 2. Add event approval workflow for university administrator review
ALTER TABLE events 
ADD COLUMN approval_status ENUM('pending', 'approved', 'rejected') NOT NULL DEFAULT 'approved' AFTER status;

-- 3. Create password_resets table for secure password recovery tokens
CREATE TABLE IF NOT EXISTS password_resets (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    token VARCHAR(100) NOT NULL UNIQUE,
    expires_at DATETIME NOT NULL,
    used BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_reset_token (token),
    INDEX idx_reset_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
