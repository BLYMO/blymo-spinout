# --- /modules/tenant/main.tf ---

# ------------------------------------------------------------------------------
# Security Group
# ------------------------------------------------------------------------------

resource "aws_security_group" "n8n" {
  name        = "n8n-service-${var.tenant_id}"
  description = "Security group for the n8n tenant service"
  vpc_id      = var.vpc_id

  ingress {
    description     = "Allow traffic from the ALB"
    protocol        = "tcp"
    from_port       = 5678
    to_port         = 5678
    security_groups = [var.alb_security_group_id]
  }

  ingress {
    description     = "Allow traffic from the VPC endpoints for ECS Exec"
    protocol        = "tcp"
    from_port       = 0
    to_port         = 65535
    security_groups = [var.vpc_endpoint_security_group_id]
  }

  egress {
    protocol    = "-1"
    from_port   = 0
    to_port     = 0
    cidr_blocks = ["0.0.0.0/0"]
  }
}

# ------------------------------------------------------------------------------
# ECS Task and Service
# ------------------------------------------------------------------------------

resource "aws_ecs_task_definition" "n8n" {
  family                   = "n8n-${var.tenant_id}"
  requires_compatibilities = ["FARGATE"]
  network_mode             = "awsvpc"
  cpu                      = var.cpu
  memory                   = var.memory

  execution_role_arn = aws_iam_role.ecs_execution_role.arn
  task_role_arn      = aws_iam_role.ecs_task_role.arn

  container_definitions = jsonencode([
    {
      name      = "n8n"
      image     = var.n8n_image
      cpu       = var.cpu
      memory    = var.memory
      essential = true
      portMappings = [{
        containerPort = 5678
        protocol      = "tcp"
      }]
      environment = [
        { name = "DB_TYPE", value = "postgres" },
        { name = "DB_HOST", value = var.db_host },
        { name = "DB_PORT", value = tostring(var.db_port) },
        { name = "DB_DATABASE", value = var.db_schema },
        { name = "N8N_HOST", value = "${var.subdomain}.n8n.blymo.co.uk" },
        # Add any other n8n-specific environment variables here
      ]
      secrets = [
        {
          name      = "DB_USER"
          valueFrom = "${var.db_credentials_secret_arn}:username::"
        },
        {
          name      = "DB_PASSWORD"
          valueFrom = "${var.db_credentials_secret_arn}:password::"
        }
      ]
    }
  ])
}

resource "aws_ecs_service" "n8n" {
  name            = "n8n-${var.tenant_id}"
  cluster         = var.ecs_cluster_name
  task_definition = aws_ecs_task_definition.n8n.arn
  desired_count   = 1 # This can be exposed as a variable for tiered plans
  launch_type     = "FARGATE"
  enable_execute_command = true

  network_configuration {
    security_groups = [aws_security_group.n8n.id]
    subnets         = var.private_subnet_ids
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.n8n.arn
    container_name   = "n8n"
    container_port   = 5678
  }

  # Ensure the service doesn't try to start until the ALB listener rule is created
  depends_on = [aws_lb_listener_rule.n8n]
}

# ------------------------------------------------------------------------------
# Networking (ALB Target Group & Listener Rule)
# ------------------------------------------------------------------------------

resource "aws_lb_target_group" "n8n" {
  name        = "n8n-${var.tenant_id}"
  port        = 5678
  protocol    = "HTTP"
  vpc_id      = var.vpc_id
  target_type = "ip"

  health_check {
    path                = "/healthz"
    protocol            = "HTTP"
    matcher             = "200"
    interval            = 30
    timeout             = 5
    healthy_threshold   = 2
    unhealthy_threshold = 2
  }
}

resource "aws_lb_listener_rule" "n8n" {
  listener_arn = var.alb_listener_arn
  priority     = var.alb_listener_rule_priority

  action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.n8n.arn
  }

  condition {
    host_header {
      values = ["${var.subdomain}.n8n.blymo.co.uk"] # This should match your domain
    }
  }
}

# ------------------------------------------------------------------------------
# IAM (Task Role & Execution Role)
# ------------------------------------------------------------------------------

# Standard role for ECS to be able to manage the container
resource "aws_iam_role" "ecs_execution_role" {
  name = "n8n-execution-role-${var.tenant_id}"
  assume_role_policy = jsonencode({
    Version   = "2012-10-17"
    Statement = [{
      Action    = "sts:AssumeRole"
      Effect    = "Allow"
      Principal = {
        Service = "ecs-tasks.amazonaws.com"
      }
    }]
  })
}

resource "aws_iam_role_policy_attachment" "ecs_execution_role_policy" {
  role       = aws_iam_role.ecs_execution_role.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}

# Role for the n8n container itself, granting it permissions.
resource "aws_iam_role" "ecs_task_role" {
  name = "n8n-task-role-${var.tenant_id}"
  assume_role_policy = jsonencode({
    Version   = "2012-10-17"
    Statement = [{
      Action    = "sts:AssumeRole"
      Effect    = "Allow"
      Principal = {
        Service = "ecs-tasks.amazonaws.com"
      }
    }]
  })
}

# Policy to allow the task to read the specific database credentials secret.
resource "aws_iam_policy" "read_db_secret" {
  name   = "n8n-read-db-secret-policy-${var.tenant_id}"
  policy = jsonencode({
    Version   = "2012-10-17"
    Statement = [{
      Action   = "secretsmanager:GetSecretValue"
      Effect   = "Allow"
      Resource = var.db_credentials_secret_arn
    }]
  })
}

resource "aws_iam_role_policy_attachment" "read_db_secret_attachment" {
  role       = aws_iam_role.ecs_task_role.name
  policy_arn = aws_iam_policy.read_db_secret.arn
}

# Policy to allow the task to communicate with the SSM agent for ECS Exec
resource "aws_iam_policy" "ssm_exec_policy" {
  name   = "n8n-ssm-exec-policy-${var.tenant_id}"
  policy = jsonencode({
    Version   = "2012-10-17"
    Statement = [{
      Effect   = "Allow"
      Action = [
        "ssmmessages:CreateControlChannel",
        "ssmmessages:CreateDataChannel",
        "ssmmessages:OpenControlChannel",
        "ssmmessages:OpenDataChannel"
      ]
      Resource = "*"
    }]
  })
}

resource "aws_iam_role_policy_attachment" "ssm_exec_attachment" {
  role       = aws_iam_role.ecs_task_role.name
  policy_arn = aws_iam_policy.ssm_exec_policy.arn
}

resource "aws_iam_role_policy_attachment" "execution_read_db_secret_attachment" {
  role       = aws_iam_role.ecs_execution_role.name
  policy_arn = aws_iam_policy.read_db_secret.arn
}
