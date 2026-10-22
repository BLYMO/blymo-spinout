-- Create the workspaces table
CREATE TABLE workspaces (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    tenant_id VARCHAR(255) UNIQUE DEFAULT NULL, -- Nullable initially until user provisions the unique 3-word slug
    stripe_customer_id VARCHAR(255),
    session_id VARCHAR(255) UNIQUE, -- Track checkout session to prevent duplicate processing
    plan_tier VARCHAR(50),
    status VARCHAR(50) DEFAULT 'unprovisioned', -- 'unprovisioned', 'provisioning', 'active', 'suspended'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Protect the table with Row Level Security (RLS)
ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;

-- Allow users to naturally select/view only their own workspaces in the React application
CREATE POLICY "Users can only view their own workspaces"
  ON workspaces FOR SELECT
  USING (auth.uid() = user_id);

-- Depending on your Edge Function implementation, you may not need an INSERT 
-- policy here if your Edge Function acts using the 'Service Role' (which bypasses RLS).
-- If users are authorized to update their own tenant_id later, you can add an UPDATE policy:
CREATE POLICY "Users can claim unprovisioned tenant_ids"
  ON workspaces FOR UPDATE
  USING (auth.uid() = user_id AND status = 'unprovisioned')
  WITH CHECK (auth.uid() = user_id);


