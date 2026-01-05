terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    random = {
      source  = "hashicorp/random"
      version = "3.6.2"
    }
  }

  backend "s3" {
    bucket         = "n8n-hosting-saas-tfstate" # This bucket must exist
    key            = "shared/terraform.tfstate"
    region         = "eu-west-2"
    dynamodb_table = "n8n-hosting-saas-tf-locks" # This table must exist
    encrypt        = true
  }
}

provider "aws" {
  region = "eu-west-2" # You can change this to your preferred region

  default_tags {
    tags = {
      Project     = "n8n-hosting-saas"
      ManagedBy   = "Terraform"
      Environment = "dev"
    }
  }
}

# ------------------------------------------------------------------------------
# SHARED INFRASTRUCTURE
# All resources that are shared across all tenants will be defined here.
# (VPC, ECS Cluster, ALB, RDS, etc.)
# ------------------------------------------------------------------------------
