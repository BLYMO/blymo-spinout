# --- tenants.tf ---
# Shared platform secrets used by tenant instances

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
  secret_string = "re_YOUR_RESEND_API_KEY_HERE" # ← Replace with your real Resend key
}

# ------------------------------------------------------------------------------
# Dynamic Tenant Provisioning Note:
# In automated mode, tenants are provisioned dynamically via AWS Step Functions
# and CodeBuild, which generates and applies individual `tenant_<id>.tf` files.
#
# To manually declare a static tenant via GitOps, see `tenant_example.tf.example`.
# ------------------------------------------------------------------------------
