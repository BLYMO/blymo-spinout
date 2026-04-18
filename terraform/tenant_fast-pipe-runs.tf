resource "random_password" "key_fast-pipe-runs" {
  length = 32
  special = false
}

resource "aws_secretsmanager_secret" "key_fast-pipe-runs" {
  name = "n8n-hosting/tenant/fast-pipe-runs/encryption-key"
  recovery_window_in_days = 0
}

resource "aws_secretsmanager_secret_version" "key_fast-pipe-runs" {
  secret_id = aws_secretsmanager_secret.key_fast-pipe-runs.id
  secret_string = random_password.key_fast-pipe-runs.result
}

module "fast-pipe-runs" {
  source = "./modules/tenant"

  tenant_id = "fast-pipe-runs"
  subdomain = "fast-pipe-runs"
  db_schema = "fast-pipe-runs"

  vpc_id                         = module.vpc.vpc_id
  private_subnet_ids             = module.vpc.private_subnets
  ecs_cluster_name               = aws_ecs_cluster.main.name
  alb_listener_arn               = aws_lb_listener.https.arn
  alb_security_group_id          = aws_security_group.alb.id
  db_host                        = aws_db_instance.main.address
  db_port                        = aws_db_instance.main.port
  db_credentials_secret_arn      = aws_secretsmanager_secret.db_credentials.arn
  vpc_endpoint_security_group_id = aws_security_group.vpc_endpoints.id
  alb_listener_rule_priority     = 48898

  n8n_encryption_key_secret_arn = aws_secretsmanager_secret_version.key_fast-pipe-runs.arn
  smtp_api_key_secret_arn       = aws_secretsmanager_secret.smtp_api_key.arn
}
