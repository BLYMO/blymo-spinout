# --- ecs.tf ---

# Defines the shared ECS Cluster.
# This is a logical grouping for the services and tasks that we will run.
# It does not provision any compute resources itself; Fargate will do that on-demand.
resource "aws_ecs_cluster" "main" {
  name = "n8n-hosting-shared-cluster"
}
