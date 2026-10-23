#!/bin/bash
set -e

# ==============================================================================
# TryBase: Tear Down AWS Fleet Infrastructure
# Safely destroys the VPC, RDS, ALB, Step Functions, Lambdas, and ECS fleet.
# ==============================================================================

BOLD="\033[1m"
GREEN="\033[0;32m"
CYAN="\033[0;36m"
YELLOW="\033[1;33m"
RED="\033[0;31m"
RESET="\033[0m"

echo -e "\n${BOLD}${RED}🧨 TryBase Fleet Infrastructure Teardown${RESET}\n"

# 1. Check AWS CLI Authentication
if ! command -v aws &> /dev/null; then
    echo -e "${RED}❌ AWS CLI is not installed.${RESET}"
    exit 1
fi

CALLER_IDENTITY=$(aws sts get-caller-identity --output text 2>/dev/null || echo "")
if [ -z "$CALLER_IDENTITY" ]; then
    echo -e "${RED}❌ AWS CLI is not authenticated. Please run 'aws configure' first.${RESET}"
    exit 1
fi

ACCOUNT_ID=$(echo "$CALLER_IDENTITY" | awk '{print $1}')
echo -e "Connected to AWS Account: ${CYAN}${ACCOUNT_ID}${RESET}"

# 2. Confirmation Prompt
if [ "$1" != "-y" ] && [ "$1" != "--force" ]; then
    echo -e "\n${YELLOW}${BOLD}⚠️  WARNING:${RESET} This will destroy all AWS resources created by TryBase,"
    echo -e "including the PostgreSQL RDS instance, ALB, Step Functions, and ECS containers."
    echo -e "(Your remote Terraform state S3 bucket will be preserved).\n"
    read -p "Are you sure you want to destroy this infrastructure? (y/N): " CONFIRM
    if [[ ! "$CONFIRM" =~ ^[Yy]$ ]]; then
        echo -e "\n${CYAN}Teardown cancelled.${RESET}\n"
        exit 0
    fi
fi

# 3. Destroy Terraform Resources
echo -e "\n${BOLD}Running terraform destroy...${RESET}"
cd terraform

if ! terraform destroy -auto-approve; then
    echo -e "\n${YELLOW}⚠️ Terraform destroy hit a dependency pause. Checking for orphaned Lambda ENIs...${RESET}"
    cd ..
    ./cleanup-enis.sh
    cd terraform
    echo -e "\n${BOLD}Retrying terraform destroy...${RESET}"
    terraform destroy -auto-approve
fi

cd ..

# 4. Clean stale DynamoDB lock item if present
REGION=$(aws configure get region 2>/dev/null || echo "eu-west-2")
echo -e "\n${BOLD}Cleaning up state lock table...${RESET}"
aws dynamodb delete-item \
  --table-name n8n-hosting-saas-tf-locks \
  --key '{"LockID": {"S": "n8n-hosting-saas-tfstate/shared/terraform.tfstate-md5"}}' \
  --region "$REGION" 2>/dev/null || true

echo -e "\n=================================================================="
echo -e "${BOLD}${GREEN}✅ TryBase AWS Infrastructure Successfully Destroyed!${RESET}"
echo -e "=================================================================="
echo -e "All compute, database, and network resources have been torn down."
echo -e "No recurring AWS charges are active for this deployment."
echo -e "\nWhen you are ready to provision again tomorrow, just run:"
echo -e "  ${CYAN}make infra${RESET}  or  ${CYAN}./deploy-infra.sh${RESET}\n"
