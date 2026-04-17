# ECR repository to store the container image for our create-schema Lambda
resource "aws_ecr_repository" "create_schema_lambda" {
  name                 = "n8n-hosting/create-schema-lambda"
  image_tag_mutability = "MUTABLE"
  force_delete         = true

  image_scanning_configuration {
    scan_on_push = true
  }
}

# ECR repository to mirror the n8n base image (bye-bye Docker Hub rate limits!)
resource "aws_ecr_repository" "n8n_base" {
  name                 = "n8n-hosting/n8n-base"
  image_tag_mutability = "MUTABLE"
  force_delete         = true

  image_scanning_configuration {
    scan_on_push = true
  }
}

# Automatically Mirror the n8n image during Terraform Apply
resource "null_resource" "mirror_n8n" {
  triggers = {
    # This will re-run if we change the desired n8n version
    image_version = "latest"
  }

  provisioner "local-exec" {
    command = <<EOF
      aws ecr get-login-password --region eu-west-2 | docker login --username AWS --password-stdin 656876168893.dkr.ecr.eu-west-2.amazonaws.com
      docker pull --platform linux/arm64 n8nio/n8n:latest
      docker tag n8nio/n8n:latest ${aws_ecr_repository.n8n_base.repository_url}:latest
      docker push ${aws_ecr_repository.n8n_base.repository_url}:latest
EOF
  }

  depends_on = [aws_ecr_repository.n8n_base]
}
