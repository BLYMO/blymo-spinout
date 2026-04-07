# --- stepfunctions.tf ---
#
# Defines the Step Function state machine that orchestrates tenant provisioning:
#
#   1. Start CodeBuild (terraform apply for tenant module)
#   2. Poll until CodeBuild succeeds or fails
#   3. Invoke the create-schema Lambda
#   4. Done — tenant is live

# ------------------------------------------------------------------------------
# IAM Role for Step Functions
# ------------------------------------------------------------------------------

resource "aws_iam_role" "step_functions" {
  name = "n8n-step-functions-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "states.amazonaws.com" }
      Action    = "sts:AssumeRole"
    }]
  })
}

# Allow Step Functions to start and poll CodeBuild
resource "aws_iam_role_policy" "sfn_codebuild" {
  name = "n8n-sfn-codebuild-policy"
  role = aws_iam_role.step_functions.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Action = [
        "codebuild:StartBuild",
        "codebuild:BatchGetBuilds",
        "codebuild:StopBuild"
      ]
      Resource = aws_codebuild_project.provision_tenant.arn
    }]
  })
}

# Allow Step Functions to invoke the create-schema Lambda
resource "aws_iam_role_policy" "sfn_lambda" {
  name = "n8n-sfn-lambda-policy"
  role = aws_iam_role.step_functions.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect   = "Allow"
      Action   = ["lambda:InvokeFunction"]
      Resource = aws_lambda_function.create_schema.arn
    }]
  })
}

# Allow Step Functions to emit CloudWatch logs
resource "aws_iam_role_policy" "sfn_logs" {
  name = "n8n-sfn-logs-policy"
  role = aws_iam_role.step_functions.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Action = [
        "logs:CreateLogDelivery",
        "logs:GetLogDelivery",
        "logs:UpdateLogDelivery",
        "logs:DeleteLogDelivery",
        "logs:ListLogDeliveries",
        "logs:PutResourcePolicy",
        "logs:DescribeResourcePolicies",
        "logs:DescribeLogGroups"
      ]
      Resource = "*"
    }]
  })
}

# ------------------------------------------------------------------------------
# CloudWatch Log Group for Step Functions
# ------------------------------------------------------------------------------

resource "aws_cloudwatch_log_group" "step_functions" {
  name              = "/aws/states/n8n-provision-tenant"
  retention_in_days = 14
}

# ------------------------------------------------------------------------------
# State Machine Definition
# ------------------------------------------------------------------------------

resource "aws_sfn_state_machine" "provision_tenant" {
  name     = "n8n-provision-tenant"
  role_arn = aws_iam_role.step_functions.arn

  # Uses the optimised integration pattern for CodeBuild (.sync:2)
  # which automatically polls until the build is complete.
  definition = jsonencode({
    Comment = "Provision a new n8n tenant: run Terraform, then create DB schema"
    StartAt = "ProvisionInfrastructure"

    States = {
      ProvisionInfrastructure = {
        Type     = "Task"
        Resource = "arn:aws:states:::codebuild:startBuild.sync:2"
        Parameters = {
          ProjectName = aws_codebuild_project.provision_tenant.name
          EnvironmentVariablesOverride = [
            {
              Name      = "TENANT_ID"
              "Value.$" = "$.tenant_id"
              Type      = "PLAINTEXT"
            },
            {
              Name      = "ALB_LISTENER_RULE_PRIORITY"
              "Value.$" = "States.Format('{}', $.alb_listener_rule_priority)"
              Type      = "PLAINTEXT"
            }
          ]
        }
        ResultPath = "$.codebuild_result"
        Next       = "CreateDatabaseSchema"
        Catch = [{
          ErrorEquals = ["States.ALL"]
          Next        = "ProvisioningFailed"
          ResultPath  = "$.error"
        }]
      }

      CreateDatabaseSchema = {
        Type     = "Task"
        Resource = "arn:aws:states:::lambda:invoke"
        Parameters = {
          FunctionName = aws_lambda_function.create_schema.arn
          Payload = {
            "tenant_id.$" = "$.tenant_id"
          }
        }
        ResultPath = "$.schema_result"
        Next       = "ProvisioningComplete"
        Retry = [{
          ErrorEquals     = ["Lambda.ServiceException", "Lambda.AWSLambdaException"]
          IntervalSeconds = 5
          MaxAttempts     = 3
          BackoffRate     = 2
        }]
        Catch = [{
          ErrorEquals = ["States.ALL"]
          Next        = "ProvisioningFailed"
          ResultPath  = "$.error"
        }]
      }

      ProvisioningComplete = {
        Type = "Succeed"
      }

      ProvisioningFailed = {
        Type  = "Fail"
        Error = "ProvisioningError"
        Cause = "Tenant provisioning failed. Check CodeBuild and Lambda logs."
      }
    }
  })

  logging_configuration {
    log_destination        = "${aws_cloudwatch_log_group.step_functions.arn}:*"
    include_execution_data = true
    level                  = "ERROR"
  }
}

# ------------------------------------------------------------------------------
# Outputs
# ------------------------------------------------------------------------------

output "step_function_arn" {
  description = "ARN of the tenant provisioning Step Function"
  value       = aws_sfn_state_machine.provision_tenant.arn
}
