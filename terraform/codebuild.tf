# --- codebuild.tf ---
#
# Defines the AWS CodeBuild project that is invoked by the Step Function
# to run `terraform apply` for a new tenant.
#
# The build runs in the terraform/ directory, writes a new tenant .tf file,
# and applies it — all using the shared S3 backend for state.

# ------------------------------------------------------------------------------
# IAM Role for CodeBuild
# ------------------------------------------------------------------------------

resource "aws_iam_role" "codebuild_terraform" {
  name = "n8n-codebuild-terraform-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "codebuild.amazonaws.com" }
      Action    = "sts:AssumeRole"
    }]
  })
}

# Allow CodeBuild to write logs to CloudWatch
resource "aws_iam_role_policy" "codebuild_logs" {
  name = "n8n-codebuild-logs-policy"
  role = aws_iam_role.codebuild_terraform.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Action = [
        "logs:CreateLogGroup",
        "logs:CreateLogStream",
        "logs:PutLogEvents"
      ]
      Resource = "*"
    }]
  })
}

# Allow CodeBuild to read/write the Terraform state S3 bucket
resource "aws_iam_role_policy" "codebuild_tfstate" {
  name = "n8n-codebuild-tfstate-policy"
  role = aws_iam_role.codebuild_terraform.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "s3:GetObject",
          "s3:PutObject",
          "s3:DeleteObject",
          "s3:ListBucket"
        ]
        Resource = [
          "arn:aws:s3:::n8n-hosting-saas-tfstate",
          "arn:aws:s3:::n8n-hosting-saas-tfstate/*"
        ]
      }
    ]
  })
}

# Allow CodeBuild to use the DynamoDB state lock table
resource "aws_iam_role_policy" "codebuild_tflock" {
  name = "n8n-codebuild-tflock-policy"
  role = aws_iam_role.codebuild_terraform.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Action = [
        "dynamodb:GetItem",
        "dynamodb:PutItem",
        "dynamodb:DeleteItem"
      ]
      Resource = "arn:aws:dynamodb:eu-west-2:*:table/n8n-hosting-saas-tf-locks"
    }]
  })
}

# Allow CodeBuild to create/manage all AWS resources that the tenant module needs.
# This is intentionally broad — it's acting as a Terraform operator.
resource "aws_iam_role_policy" "codebuild_terraform_permissions" {
  name = "n8n-codebuild-terraform-permissions"
  role = aws_iam_role.codebuild_terraform.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          # ECS
          "ecs:CreateService",
          "ecs:UpdateService",
          "ecs:DeleteService",
          "ecs:DescribeServices",
          "ecs:RegisterTaskDefinition",
          "ecs:DeregisterTaskDefinition",
          "ecs:DescribeTaskDefinition",
          "ecs:ListTaskDefinitions",
          # IAM
          "iam:CreateRole",
          "iam:DeleteRole",
          "iam:GetRole",
          "iam:PutRolePolicy",
          "iam:DeleteRolePolicy",
          "iam:AttachRolePolicy",
          "iam:DetachRolePolicy",
          "iam:CreatePolicy",
          "iam:DeletePolicy",
          "iam:GetPolicy",
          "iam:GetPolicyVersion",
          "iam:ListPolicyVersions",
          "iam:ListAttachedRolePolicies",
          "iam:ListRolePolicies",
          "iam:PassRole",
          "iam:TagRole",
          "iam:TagPolicy",
          "iam:UntagRole",
          # EC2 / Networking
          "ec2:CreateSecurityGroup",
          "ec2:DeleteSecurityGroup",
          "ec2:DescribeSecurityGroups",
          "ec2:AuthorizeSecurityGroupIngress",
          "ec2:AuthorizeSecurityGroupEgress",
          "ec2:RevokeSecurityGroupIngress",
          "ec2:RevokeSecurityGroupEgress",
          "ec2:DescribeVpcs",
          "ec2:DescribeSubnets",
          "ec2:CreateTags",
          "ec2:DescribeTags",
          # ALB
          "elasticloadbalancing:CreateTargetGroup",
          "elasticloadbalancing:DeleteTargetGroup",
          "elasticloadbalancing:DescribeTargetGroups",
          "elasticloadbalancing:ModifyTargetGroup",
          "elasticloadbalancing:ModifyTargetGroupAttributes",
          "elasticloadbalancing:DescribeTargetGroupAttributes",
          "elasticloadbalancing:CreateRule",
          "elasticloadbalancing:DeleteRule",
          "elasticloadbalancing:DescribeRules",
          "elasticloadbalancing:ModifyRule",
          "elasticloadbalancing:AddTags",
          "elasticloadbalancing:DescribeTags",
          # Secrets Manager (read-only — secrets are pre-created)
          "secretsmanager:GetSecretValue",
          "secretsmanager:DescribeSecret"
        ]
        Resource = "*"
      }
    ]
  })
}

# ------------------------------------------------------------------------------
# CodeBuild Project
# ------------------------------------------------------------------------------

resource "aws_codebuild_project" "provision_tenant" {
  name          = "n8n-provision-tenant"
  description   = "Runs terraform apply to provision a new n8n tenant"
  service_role  = aws_iam_role.codebuild_terraform.arn
  build_timeout = 20 # minutes

  artifacts {
    type = "NO_ARTIFACTS"
  }

  environment {
    compute_type                = "BUILD_GENERAL1_SMALL"
    image                       = "public.ecr.aws/hashicorp/terraform:1.8"
    type                        = "LINUX_CONTAINER"
    image_pull_credentials_type = "CODEBUILD"

    # These are overridden at runtime by the Step Function
    environment_variable {
      name  = "TENANT_ID"
      value = "PLACEHOLDER"
    }

    environment_variable {
      name  = "ALB_LISTENER_RULE_PRIORITY"
      value = "PLACEHOLDER"
    }
  }

  source {
    type      = "NO_SOURCE"
    buildspec = <<-BUILDSPEC
      version: 0.2
      phases:
        install:
          commands:
            - echo "Terraform version:"
            - terraform version
        pre_build:
          commands:
            - echo "Provisioning tenant $TENANT_ID"
            - mkdir -p /build && cd /build
            # Write the tenant Terraform config dynamically
            - |
              cat > tenant_override.tf <<EOF
              module "${TENANT_ID}" {
                source = "./modules/tenant"

                tenant_id = "${TENANT_ID}"
                subdomain = "${TENANT_ID}"
                db_schema = "${TENANT_ID}"

                vpc_id                          = module.vpc.vpc_id
                private_subnet_ids              = module.vpc.private_subnets
                ecs_cluster_name                = aws_ecs_cluster.main.name
                alb_listener_arn                = aws_lb_listener.https.arn
                alb_security_group_id           = aws_security_group.alb.id
                db_host                         = aws_db_instance.main.address
                db_port                         = aws_db_instance.main.port
                db_credentials_secret_arn       = aws_secretsmanager_secret.db_credentials.arn
                vpc_endpoint_security_group_id  = aws_security_group.vpc_endpoints.id
                alb_listener_rule_priority      = ${ALB_LISTENER_RULE_PRIORITY}
              }
              EOF
            - terraform init -reconfigure
        build:
          commands:
            - terraform apply -auto-approve -target="module.${TENANT_ID}"
      BUILDSPEC
  }

  logs_config {
    cloudwatch_logs {
      group_name  = "/aws/codebuild/n8n-provision-tenant"
      stream_name = "build"
    }
  }
}
