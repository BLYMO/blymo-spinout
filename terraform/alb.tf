# --- alb.tf ---

# Security Group for the ALB
# Allows inbound traffic on HTTP (80) and HTTPS (443) from anywhere.
# Allows all outbound traffic.
resource "aws_security_group" "alb" {
  name        = "n8n-hosting-alb-sg"
  description = "Security group for the shared Application Load Balancer"
  vpc_id      = module.vpc.vpc_id

  ingress {
    protocol    = "tcp"
    from_port   = 80
    to_port     = 80
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    protocol    = "tcp"
    from_port   = 443
    to_port     = 443
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    protocol    = "-1"
    from_port   = 0
    to_port     = 0
    cidr_blocks = ["0.0.0.0/0"]
  }
}

# The Application Load Balancer
resource "aws_lb" "main" {
  name               = "n8n-hosting-shared-alb"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [aws_security_group.alb.id]
  subnets            = module.vpc.public_subnets

  enable_deletion_protection = false
}

# A default Target Group for the ALB to use when no tenant rule matches.
# This will return a fixed 404 response.
resource "aws_lb_target_group" "default" {
  name        = "n8n-hosting-default-tg"
  port        = 80
  protocol    = "HTTP"
  vpc_id      = module.vpc.vpc_id
  target_type = "ip"
}

# Listener for HTTP traffic on port 80
# It's configured to immediately redirect all traffic to HTTPS for security.
resource "aws_lb_listener" "http" {
  load_balancer_arn = aws_lb.main.arn
  port              = 80
  protocol          = "HTTP"

  default_action {
    type = "redirect"

    redirect {
      port        = "443"
      protocol    = "HTTPS"
      status_code = "HTTP_301"
    }
  }
}

# Listener for HTTPS traffic on port 443
resource "aws_lb_listener" "https" {
  load_balancer_arn = aws_lb.main.arn
  port              = 443
  protocol          = "HTTPS"
  ssl_policy        = "ELBSecurityPolicy-2016-08"

  # IMPORTANT: You must create a certificate in AWS Certificate Manager (ACM)
  # for your domain and paste the ARN here.
  # For example: "arn:aws:acm:eu-west-2:123456789012:certificate/your-cert-id"
  certificate_arn = "arn:aws:acm:eu-west-2:656876168893:certificate/49a652d8-dc22-4689-a151-4da7261ca94c" # <--- REAL ARN NOW INJECTED

  # Default action for requests that don't match any tenant-specific rules.
  # We'll forward them to the default target group which will return a 404.
  default_action {
    type = "fixed-response"

    fixed_response {
      content_type = "text/plain"
      message_body = "Not Found"
      status_code  = "404"
    }
  }
}
