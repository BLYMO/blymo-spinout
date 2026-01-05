# --- vpc.tf ---

# Data source to get the list of available Availability Zones in the current region
# This makes our code more portable and resilient to region-specific changes.
data "aws_availability_zones" "available" {
  state = "available"
}

# Using the official Terraform AWS module to create a best-practice VPC.
# This module handles creating the VPC, subnets, route tables, Internet Gateway,
# and NAT Gateway for us.
module "vpc" {
  source  = "terraform-aws-modules/vpc/aws"
  version = "~> 5.0"

  name = "n8n-hosting-shared-vpc"
  cidr = "10.0.0.0/16"

  # We'll create subnets in the first two available Availability Zones.
  azs             = slice(data.aws_availability_zones.available.names, 0, 2)
  private_subnets = ["10.0.1.0/24", "10.0.2.0/24"]
  public_subnets  = ["10.0.101.0/24", "10.0.102.0/24"]

  # Create a NAT Gateway to allow outbound internet access for private subnets.
  # This is crucial for ECS tasks to pull Docker images from public repositories.
  enable_nat_gateway = true
  single_nat_gateway = true # For cost savings in dev/staging. Set to false for production HA.

  # Apply our project tags to all resources created by this module.
  tags = {
    Name = "n8n-hosting-shared-vpc"
  }
}

# ------------------------------------------------------------------------------
# VPC Endpoints (Manual Definition)
# ------------------------------------------------------------------------------

# Security group to be used by all interface endpoints
resource "aws_security_group" "vpc_endpoints" {
  name   = "n8n-hosting-vpc-endpoints-sg"
  vpc_id = module.vpc.vpc_id

  ingress {
    protocol    = "tcp"
    from_port   = 443
    to_port     = 443
    cidr_blocks = [module.vpc.vpc_cidr_block] # Allow HTTPS traffic from within the VPC
  }
}

# Gateway endpoint for S3
resource "aws_vpc_endpoint" "s3" {
  vpc_id            = module.vpc.vpc_id
  service_name      = "com.amazonaws.eu-west-2.s3"
  vpc_endpoint_type = "Gateway"
  route_table_ids   = module.vpc.private_route_table_ids
}

# Interface endpoints for ECS, ECR, and SSM
resource "aws_vpc_endpoint" "ecr_api" {
  vpc_id              = module.vpc.vpc_id
  service_name        = "com.amazonaws.eu-west-2.ecr.api"
  vpc_endpoint_type   = "Interface"
  private_dns_enabled = true
  subnet_ids          = module.vpc.private_subnets
  security_group_ids  = [aws_security_group.vpc_endpoints.id]
}

resource "aws_vpc_endpoint" "ecr_dkr" {
  vpc_id              = module.vpc.vpc_id
  service_name        = "com.amazonaws.eu-west-2.ecr.dkr"
  vpc_endpoint_type   = "Interface"
  private_dns_enabled = true
  subnet_ids          = module.vpc.private_subnets
  security_group_ids  = [aws_security_group.vpc_endpoints.id]
}

resource "aws_vpc_endpoint" "ssm" {
  vpc_id              = module.vpc.vpc_id
  service_name        = "com.amazonaws.eu-west-2.ssm"
  vpc_endpoint_type   = "Interface"
  private_dns_enabled = true
  subnet_ids          = module.vpc.private_subnets
  security_group_ids  = [aws_security_group.vpc_endpoints.id]
}

resource "aws_vpc_endpoint" "ssmmessages" {
  vpc_id              = module.vpc.vpc_id
  service_name        = "com.amazonaws.eu-west-2.ssmmessages"
  vpc_endpoint_type   = "Interface"
  private_dns_enabled = true
  subnet_ids          = module.vpc.private_subnets
  security_group_ids  = [aws_security_group.vpc_endpoints.id]
}

resource "aws_vpc_endpoint" "ec2messages" {
  vpc_id              = module.vpc.vpc_id
  service_name        = "com.amazonaws.eu-west-2.ec2messages"
  vpc_endpoint_type   = "Interface"
  private_dns_enabled = true
  subnet_ids          = module.vpc.private_subnets
  security_group_ids  = [aws_security_group.vpc_endpoints.id]
}
