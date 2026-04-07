-- Users and Workspaces
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255),
    role VARCHAR(50) DEFAULT 'user',
    tier VARCHAR(50) DEFAULT 'free', -- 'free', 'startup', 'enterprise'
    token_quota BIGINT DEFAULT 100000, -- Monthly token limit
    tokens_used BIGINT DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE workspaces (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    owner_id UUID REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE workspace_users (
    workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(50) DEFAULT 'member',
    PRIMARY KEY (workspace_id, user_id)
);

-- Social Account Integrations
CREATE TABLE social_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
    platform VARCHAR(50) NOT NULL, -- 'Twitter', 'LinkedIn', 'Instagram', 'Facebook', 'TikTok'
    account_id VARCHAR(255) NOT NULL,
    account_name VARCHAR(255),
    access_token TEXT NOT NULL,
    refresh_token TEXT,
    token_expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(platform, account_id)
);

-- Campaigns
CREATE TABLE campaigns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    niche VARCHAR(255),
    target_audience TEXT,
    tone VARCHAR(100),
    goals TEXT,
    status VARCHAR(50) DEFAULT 'draft', -- 'draft', 'active', 'paused', 'completed'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Content and Posts
CREATE TABLE posts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE,
    content_text TEXT,
    media_urls JSONB, -- Array of media URLs
    published_url TEXT, -- Permalink to the live published post
    ab_test_group VARCHAR(10), -- A/B testing tag
    status VARCHAR(50) DEFAULT 'generated', -- 'generated', 'approved', 'scheduled', 'publishing', 'published', 'failed'
    scheduled_time TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE post_publications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
    social_account_id UUID REFERENCES social_accounts(id) ON DELETE CASCADE,
    platform_post_id VARCHAR(255),
    retry_count INT DEFAULT 0, -- For queue-based retry logic
    status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'success', 'failed', 'retrying'
    error_message TEXT,
    published_at TIMESTAMP WITH TIME ZONE
);

-- Cost Tracking Layer
CREATE TABLE llm_usage_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
    campaign_id UUID REFERENCES campaigns(id),
    agent_name VARCHAR(100),
    model_used VARCHAR(100),
    tokens_prompt INT,
    tokens_completion INT,
    estimated_cost_usd DECIMAL(10, 6),
    executed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Analytics (To be synced to ClickHouse for large scale time-series aggregation)
CREATE TABLE post_analytics_ingest (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_publication_id UUID REFERENCES post_publications(id) ON DELETE CASCADE,
    impressions INT DEFAULT 0,
    likes INT DEFAULT 0,
    shares INT DEFAULT 0,
    comments INT DEFAULT 0,
    clicks INT DEFAULT 0,
    performance_tag VARCHAR(50), -- e.g., 'high_performing', 'low_CTR'
    recorded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Brand Voice Profiles
CREATE TABLE brand_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL DEFAULT 'Default',
    tone VARCHAR(100), -- 'Professional', 'Casual', 'Bold', etc.
    vocabulary JSONB, -- { "preferred": [...], "avoid": [...] }
    style_rules TEXT, -- Freeform style guidelines
    sample_content TEXT, -- Example content for AI to learn from
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Post Approvals (Team Workflow)
CREATE TABLE post_approvals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
    reviewer_id UUID REFERENCES users(id),
    status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'approved', 'rejected', 'changes_requested'
    comment TEXT,
    reviewed_at TIMESTAMP WITH TIME ZONE
);

-- Video Generation Tasks
CREATE TABLE video_projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE,
    workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    script TEXT,
    storyboard JSONB, -- Array of scenes: { scene_number, narration, visual_prompt, duration }
    style VARCHAR(100), -- 'cinematic', 'minimal', 'product-demo', 'testimonial'
    aspect_ratio VARCHAR(20) DEFAULT '16:9',
    status VARCHAR(50) DEFAULT 'draft', -- 'draft', 'generating', 'completed', 'failed'
    output_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
