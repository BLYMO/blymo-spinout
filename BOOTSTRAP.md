# Bootstrapping & Infrastructure Gotchas

This document tracks the manual steps and "Chicken and Egg" problems encountered when setting up the NexScale/Blymo infrastructure from scratch.

## 1. The ECR / Lambda "Chicken and Egg"
**Problem**: The `create_schema` Lambda function is defined as a container-based Lambda. AWS requires the Docker image to exist in ECR *before* the Lambda resource can be created. However, Terraform creates the ECR repository and the Lambda in the same `apply` cycle.

**The Fix**: 
1. Run `terraform apply` until it fails at the Lambda creation step (the ECR repo will have been created by then).
2. Manually build and push the base image once:
   ```bash
   # Login
   aws ecr get-login-password --region eu-west-2 | docker login --username AWS --password-stdin <ACCOUNT_ID>.dkr.ecr.eu-west-2.amazonaws.com
   
   # Build
   docker build -t n8n-hosting/create-schema-lambda ./lambda/create-schema
   
   # Tag & Push
   docker tag n8n-hosting/create-schema-lambda:latest <ACCOUNT_ID>.dkr.ecr.eu-west-2.amazonaws.com/n8n-hosting/create-schema-lambda:latest
   docker push <ACCOUNT_ID>.dkr.ecr.eu-west-2.amazonaws.com/n8n-hosting/create-schema-lambda:latest
   ```
3. Re-run `terraform apply`.

## 2. Inconsistent Dependency Locks
**Problem**: When adding new Terraform providers (like the `archive` provider used for zipping Lambda code), the `terraform.lock.hcl` file becomes inconsistent.

**The Fix**:
Run the following to update your local providers and the lock file:
```bash
terraform init -upgrade
```

## 3. Step Function Callback
**Problem**: For the dashboard to know a workspace is ready, the Step Function must "ping" Supabase at the very end. This requires the `supabase_url` and `on-provision-success` Edge Function to be live before the Step Function is invoked.

**The Fix**:
Always deploy your Supabase Edge Functions *before* running the first provisioning task through the API.

---

> [!NOTE]
> These steps are only required during the **initial bootstrap** of a new AWS environment. Once the "Notify Success" Lambda and "Create Schema" image are in place, future updates are fully automated.
