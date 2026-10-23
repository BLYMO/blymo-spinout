-- Add workload_type column to support multi-workload deployments (n8n, Dify, Langflow)
ALTER TABLE workspaces ADD COLUMN IF NOT EXISTS workload_type VARCHAR(50) DEFAULT 'n8n';
