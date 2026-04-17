# --- tenants.tf ---

# This file is where we would define all of our tenants.
# In a real system, this would be managed by an orchestration engine (like a Step Function)
# that calls `terraform apply` with different variables for each tenant.
# For now, we are defining one tenant manually for testing.

# ------------------------------------------------------------------------------
# Shared Secrets (one per platform, used by all tenants)
# ------------------------------------------------------------------------------

# Resend SMTP API key — used by all n8n instances for outbound email
resource "aws_secretsmanager_secret" "smtp_api_key" {
  name                    = "n8n-hosting/resend-smtp-api-key"
  description             = "Resend SMTP API key for n8n tenant instances"
  recovery_window_in_days = 0 # Allow immediate deletion for dev
}

resource "aws_secretsmanager_secret_version" "smtp_api_key" {
  secret_id     = aws_secretsmanager_secret.smtp_api_key.id
  secret_string = "re_YOUR_RESEND_API_KEY_HERE" # ← Replace with your real key
}

# ------------------------------------------------------------------------------
# Per-Tenant Secrets
# ------------------------------------------------------------------------------

# Each tenant gets a unique 32-char encryption key for n8n credential storage
resource "random_password" "acme_encryption_key" {
  length  = 32
  special = false
}

resource "aws_secretsmanager_secret" "acme_encryption_key" {
  name                    = "n8n-hosting/tenant/acme/encryption-key"
  description             = "N8N_ENCRYPTION_KEY for tenant: acme"
  recovery_window_in_days = 0
}

resource "aws_secretsmanager_secret_version" "acme_encryption_key" {
  secret_id     = aws_secretsmanager_secret.acme_encryption_key.id
  secret_string = random_password.acme_encryption_key.result
}

# ------------------------------------------------------------------------------
# Tenant Modules
# ------------------------------------------------------------------------------

module "acme" {
  source = "./modules/tenant"

  # Tenant-specific details
  tenant_id = "acme"
  subdomain = "acme"
  db_schema = "acme"

  # Shared infrastructure
  vpc_id                         = module.vpc.vpc_id
  private_subnet_ids             = module.vpc.private_subnets
  ecs_cluster_name               = aws_ecs_cluster.main.name
  alb_listener_arn               = aws_lb_listener.https.arn
  alb_security_group_id          = aws_security_group.alb.id
  db_host                        = aws_db_instance.main.address
  db_port                        = aws_db_instance.main.port
  db_credentials_secret_arn      = aws_secretsmanager_secret.db_credentials.arn
  vpc_endpoint_security_group_id = aws_security_group.vpc_endpoints.id

  # Security & Email
  n8n_encryption_key_secret_arn = aws_secretsmanager_secret_version.acme_encryption_key.arn
  smtp_api_key_secret_arn       = aws_secretsmanager_secret.smtp_api_key.arn

  # Assign a unique priority for the ALB listener rule
  alb_listener_rule_priority = 100
}
