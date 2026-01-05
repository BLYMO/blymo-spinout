# --- bastion.tf ---
# TEMPORARY BASTION HOST
# This file defines a temporary EC2 instance that acts as a secure jump box
# to access resources in our private subnets.

# Find the latest Amazon Linux 2 AMI in the current region
data "aws_ami" "amazon_linux_2" {
  most_recent = true
  owners      = ["amazon"]

  filter {
    name   = "name"
    values = ["amzn2-ami-hvm-*-x86_64-gp2"]
  }
}

# Security group for the bastion host
resource "aws_security_group" "bastion" {
  name        = "n8n-hosting-bastion-sg"
  description = "Allow SSH access from a specific IP"
  vpc_id      = module.vpc.vpc_id

  ingress {
    description = "Allow SSH from user IP"
    protocol    = "tcp"
    from_port   = 22
    to_port     = 22
    cidr_blocks = ["5.71.146.123/32"]
  }

  egress {
    protocol    = "-1"
    from_port   = 0
    to_port     = 0
    cidr_blocks = ["0.0.0.0/0"]
  }
}

# EC2 instance for the bastion host
resource "aws_instance" "bastion" {
  ami           = data.aws_ami.amazon_linux_2.id
  instance_type = "t2.nano"
  key_name      = "opschimp"

  vpc_security_group_ids = [aws_security_group.bastion.id]
  subnet_id              = module.vpc.public_subnets[0]
  associate_public_ip_address = true

  # User data script to install the postgresql client on boot
  user_data = <<-EOF
              #!/bin/bash
              yum update -y
              yum install -y postgresql
              EOF

  tags = {
    Name = "n8n-hosting-bastion"
  }
}

