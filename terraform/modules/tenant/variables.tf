# --- /modules/tenant/variables.tf ---

variable "tenant_id" {
  description = "A unique identifier for the tenant (e.g., 'acme')."
  type        = string
}

variable "subdomain" {
  description = "The subdomain for the tenant (e.g., 'acme' for acme.n8n.yourdomain.com)."
  type        = string
}

variable "vpc_id" {
  description = "The ID of the shared VPC where the tenant resources will be deployed."
  type        = string
}

variable "ecs_cluster_name" {
  description = "The name of the shared ECS cluster."
  type        = string
}

variable "alb_listener_arn" {
  description = "The ARN of the ALB's HTTPS listener to attach the tenant's rule to."
  type        = string
}

variable "n8n_image" {
  description = "The n8n Docker image to deploy."
  type        = string
  default     = "n8nio/n8n:latest"
}

variable "cpu" {
  description = "The number of CPU units to allocate to the n8n container."
  type        = number
  default     = 512 # 0.5 vCPU
}

variable "memory" {
  description = "The amount of memory (in MiB) to allocate to the n8n container."
  type        = number
  default     = 1024 # 1 GB
}

variable "alb_listener_rule_priority" {
  description = "A unique priority for the ALB listener rule (1-50000)."
  type        = number
}

variable "private_subnet_ids" {
  description = "A list of private subnet IDs where the ECS tasks will run."
  type        = list(string)
}

variable "alb_security_group_id" {
  description = "The ID of the ALB's security group, to allow traffic from the ALB to the container."
  type        = string
}

variable "db_credentials_secret_arn" {
  description = "The ARN of the Secrets Manager secret containing the database credentials."
  type        = string
  sensitive   = true
}

variable "db_host" {
  description = "The hostname of the RDS database."
  type        = string
}

variable "db_port" {
  description = "The port of the RDS database."
  type        = number
}

variable "db_schema" {
  description = "The name of the database schema to be used by the tenant."
  type        = string
}

variable "vpc_endpoint_security_group_id" {
  description = "The ID of the security group for the VPC endpoints."
  type        = string
}

variable "n8n_encryption_key_secret_arn" {
  description = "ARN of the Secrets Manager secret holding this tenant's unique N8N_ENCRYPTION_KEY."
  type        = string
  sensitive   = true
}

variable "smtp_api_key_secret_arn" {
  description = "ARN of the Secrets Manager secret holding the Resend SMTP API key."
  type        = string
  sensitive   = true
}
