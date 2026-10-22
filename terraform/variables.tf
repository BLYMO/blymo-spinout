# --- variables.tf ---
# TryBase Infrastructure Configuration Variables

variable "aws_region" {
  description = "AWS Region to deploy resources into"
  type        = string
  default     = "eu-west-2"
}

variable "project_name" {
  description = "Project identifier prefix for resource names and tags"
  type        = string
  default     = "trybase"
}

variable "environment" {
  description = "Deployment environment (e.g. dev, staging, prod)"
  type        = string
  default     = "prod"
}

variable "base_domain" {
  description = "Wildcard root domain for tenant routing (e.g. n8n.trybase.io or n8n.yourdomain.com)"
  type        = string
  default     = "n8n.trybase.io"
}

variable "acm_certificate_arn" {
  description = "ARN of the AWS ACM SSL certificate for *.n8n.yourdomain.com (required for HTTPS ALB listener)"
  type        = string
  default     = "arn:aws:acm:eu-west-2:656876168893:certificate/cccdf28e-f81f-46cd-bff4-d17f9916fe5f"
}

variable "state_bucket_name" {
  description = "S3 bucket used for Terraform remote state and tenant registry"
  type        = string
  default     = "n8n-hosting-saas-tfstate"
}

# --- Supabase Control Plane Integration ---

variable "supabase_url" {
  description = "The URL of the Supabase project control plane"
  type        = string
  default     = "https://yfnnxtzkbylezkufppgm.supabase.co"
}

variable "supabase_jwk_x" {
  description = "JWK coordinate X for ES256 Supabase JWT verification"
  type        = string
  default     = "jRwuD1S2cDatOVdbi3sileVxuwh_ZlIKqSl1vlgvCd8"
}

variable "supabase_jwk_y" {
  description = "JWK coordinate Y for ES256 Supabase JWT verification"
  type        = string
  default     = "qXpO7uPc1x-tuYUoF-DGddIi7gEOCc6IOa0l8ec_0TU"
}

variable "cors_allowed_origins" {
  description = "Allowed origins for API Gateway CORS"
  type        = list(string)
  default     = ["http://localhost:5173", "https://trybase.io"]
}

variable "github_repo_url" {
  description = "GitHub repository URL used by CodeBuild to clone for tenant provisioning"
  type        = string
  default     = "https://github.com/trybase/trybase.git"
}

# --- Bastion Host Options ---

variable "enable_bastion" {
  description = "Whether to create the EC2 Bastion host for private RDS debugging"
  type        = bool
  default     = true
}

variable "bastion_key_name" {
  description = "Name of the EC2 Key Pair used to SSH into the Bastion jump host"
  type        = string
  default     = "opschimp"
}

variable "bastion_allowed_cidr" {
  description = "CIDR block permitted to connect to the Bastion host via SSH (port 22)"
  type        = string
  default     = "5.71.146.123/32"
}
