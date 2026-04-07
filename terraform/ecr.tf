# --- ecr.tf ---

# ECR repository to store the container image for our create-schema Lambda
resource "aws_ecr_repository" "create_schema_lambda" {
  name                 = "n8n-hosting/create-schema-lambda"
  image_tag_mutability = "MUTABLE"

  image_scanning_configuration {
    scan_on_push = true
  }
}
