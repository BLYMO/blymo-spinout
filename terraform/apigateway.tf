# --- apigateway.tf ---
#
# A minimal HTTP API Gateway that exposes a single endpoint:
#   POST /provision
#
# The body must be JSON: { "tenant_id": "alice", "alb_listener_rule_priority": 101 }
#
# It starts the Step Function execution and immediately returns the execution ARN
# so the caller can poll for status if needed.

# ------------------------------------------------------------------------------
# IAM Role — allows API Gateway to start Step Function executions
# ------------------------------------------------------------------------------

resource "aws_iam_role" "apigw_sfn" {
  name = "n8n-apigw-sfn-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "apigateway.amazonaws.com" }
      Action    = "sts:AssumeRole"
    }]
  })
}

resource "aws_iam_role_policy" "apigw_sfn" {
  name = "n8n-apigw-sfn-policy"
  role = aws_iam_role.apigw_sfn.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect   = "Allow"
      Action   = ["states:StartExecution"]
      Resource = aws_sfn_state_machine.provision_tenant.arn
    }]
  })
}

# ------------------------------------------------------------------------------
# HTTP API (API Gateway v2)
# ------------------------------------------------------------------------------

resource "aws_apigatewayv2_api" "main" {
  name          = "n8n-hosting-api"
  protocol_type = "HTTP"
  description   = "Control plane API for n8n tenant provisioning"

cors_configuration {
  allow_origins     = ["http://localhost:5173", "https://trybase.io"]
  allow_methods     = ["POST", "OPTIONS"]
  allow_headers     = ["content-type", "authorization"]
  allow_credentials = true
  max_age           = 300
}
}

resource "aws_apigatewayv2_stage" "default" {
  api_id      = aws_apigatewayv2_api.main.id
  name        = "$default"
  auto_deploy = true



  access_log_settings {
    destination_arn = aws_cloudwatch_log_group.apigw.arn
    format          = jsonencode({
      requestId      = "$context.requestId"
      sourceIp       = "$context.identity.sourceIp"
      requestTime    = "$context.requestTime"
      protocol       = "$context.protocol"
      httpMethod     = "$context.httpMethod"
      resourcePath   = "$context.resourcePath"
      routeKey       = "$context.routeKey"
      status         = "$context.status"
      responseLength = "$context.responseLength"
    })
  }
}

resource "aws_cloudwatch_log_group" "apigw" {
  name              = "/aws/apigateway/n8n-hosting-api"
  retention_in_days = 14
}



# ------------------------------------------------------------------------------
# POST /provision  →  Start Step Function execution
# ------------------------------------------------------------------------------

resource "aws_apigatewayv2_integration" "provision" {
  api_id             = aws_apigatewayv2_api.main.id
  integration_type   = "AWS_PROXY"
  integration_subtype = "StepFunctions-StartExecution"
  credentials_arn    = aws_iam_role.apigw_sfn.arn

  # Map the incoming JSON body directly as the Step Function input
  request_parameters = {
    StateMachineArn = aws_sfn_state_machine.provision_tenant.arn
    Input           = "$request.body"
  }

  payload_format_version = "1.0"
}

resource "aws_apigatewayv2_route" "provision" {
  api_id    = aws_apigatewayv2_api.main.id
  route_key = "POST /provision"
  target    = "integrations/${aws_apigatewayv2_integration.provision.id}"
  
  authorization_type = "CUSTOM"
  authorizer_id      = aws_apigatewayv2_authorizer.supabase_custom.id
}

# ------------------------------------------------------------------------------
# Outputs
# ------------------------------------------------------------------------------

output "api_endpoint" {
  description = "The base URL of the control plane API"
  value       = aws_apigatewayv2_stage.default.invoke_url
}
