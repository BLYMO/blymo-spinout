-- Add provisioning_started_at to track deployment duration
ALTER TABLE workspaces ADD COLUMN provisioning_started_at TIMESTAMP WITH TIME ZONE;

-- (Optional) Update existing provisioning records to now() so they don't immediately timeout
UPDATE workspaces SET provisioning_started_at = now() WHERE status = 'provisioning';
