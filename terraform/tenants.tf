# --- tenants.tf ---

# This file is where we would define all of our tenants.
# In a real system, this would be managed by an orchestration engine (like a Step Function)
# that calls `terraform apply` with different variables for each tenant.
# For now, we are defining one tenant manually for testing.

module "acme" {
  source = "./modules/tenant"

  # Tenant-specific details
  tenant_id = "acme"
  subdomain = "acme"
  db_schema = "acme" # The tenant's database schema name

  # Pass in details from our shared infrastructure
  vpc_id                  = module.vpc.vpc_id
  private_subnet_ids      = module.vpc.private_subnets
  ecs_cluster_name        = aws_ecs_cluster.main.name
  alb_listener_arn        = aws_lb_listener.https.arn
  alb_security_group_id   = aws_security_group.alb.id
  db_host                 = aws_db_instance.main.address
  db_port                 = aws_db_instance.main.port
  db_credentials_secret_arn = aws_secretsmanager_secret.db_credentials.arn
  vpc_endpoint_security_group_id = aws_security_group.vpc_endpoints.id

  # Assign a unique priority for the ALB listener rule
  alb_listener_rule_priority = 100
}
