# --- outputs.tf ---

output "bastion_public_ip" {
  description = "The public IP address of the bastion host."
  value       = aws_instance.bastion.public_ip
}

output "db_hostname" {
  description = "The hostname of the RDS instance."
  value       = aws_db_instance.main.address
}

output "db_credentials_secret_arn" {
  description = "The ARN of the secret containing the master database credentials."
  value       = aws_secretsmanager_secret.db_credentials.arn
}

output "alb_dns_name" {
  description = "The DNS name of the Application Load Balancer."
  value       = aws_lb.main.dns_name
}

output "ecr_repository_url" {
  description = "The URL of the ECR repository for the create-schema Lambda."
  value       = aws_ecr_repository.create_schema_lambda.repository_url
}
