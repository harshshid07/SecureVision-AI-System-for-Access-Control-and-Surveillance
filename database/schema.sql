-- SecureVision Database Schema for Supabase PostgreSQL
-- Run this in Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users Table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    face_embedding JSONB NOT NULL,  -- Store 128-d FaceNet embedding as JSON array
    is_blocked BOOLEAN DEFAULT FALSE,
    last_login TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Admins Table
CREATE TABLE admins (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,  -- bcrypt hash
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Login Logs Table
CREATE TABLE login_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    status TEXT NOT NULL CHECK (status IN ('success', 'fail', 'spoofing_attempt', 'multiple_faces')),
    similarity_score FLOAT,
    is_real BOOLEAN,  -- Anti-spoofing result
    face_count INTEGER,  -- Number of faces detected
    ip_address TEXT,
    error_message TEXT
);

-- Indexes for performance
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_blocked ON users(is_blocked);
CREATE INDEX idx_login_logs_user_id ON login_logs(user_id);
CREATE INDEX idx_login_logs_timestamp ON login_logs(timestamp DESC);

-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE login_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for Users
-- Users can only read their own data
CREATE POLICY "Users can view own profile"
    ON users FOR SELECT
    USING (auth.uid() = id);

-- Admins can view all users (you'll need to implement admin role in Supabase Auth)
CREATE POLICY "Admins can view all users"
    ON users FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM admins 
            WHERE admins.email = auth.email()
        )
    );

-- Admins can update user block status
CREATE POLICY "Admins can update users"
    ON users FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM admins 
            WHERE admins.email = auth.email()
        )
    );

-- RLS Policies for Login Logs
CREATE POLICY "Users can view own login logs"
    ON login_logs FOR SELECT
    USING (user_id = auth.uid());

CREATE POLICY "Admins can view all login logs"
    ON login_logs FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM admins 
            WHERE admins.email = auth.email()
        )
    );

-- Enable Realtime for users table (for real-time blocking)
-- Run in Supabase Dashboard: Database > Replication
-- Or use the SQL below:
ALTER PUBLICATION supabase_realtime ADD TABLE users;

-- Sample Admin Insert (replace with your actual credentials)
-- Password: 'SecureAdmin123' hashed with bcrypt
-- You should hash this properly in your application
INSERT INTO admins (email, password_hash) 
VALUES ('admin@securevision.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY3vJVzZ1ZUn5Xm');

-- Note: The above is a sample hash. Generate a proper bcrypt hash for production!
