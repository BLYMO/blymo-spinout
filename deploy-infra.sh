#!/bin/bash
set -e

# ==============================================================================
# TryBase: Deploy AWS Fleet Infrastructure (Command 2 of 2)
# Initializes Terraform and deploys the VPC, RDS, ALB, Step Functions, & ECS fleet.
# ==============================================================================

BOLD="\033[1m"
GREEN="\033[0;32m"
CYAN="\033[0;36m"
YELLOW="\033[1;33m"
RED="\033[0;31m"
RESET="\033[0m"

echo -e "\n${BOLD}${CYAN}🚀 [2/2] Deploying TryBase Fleet on AWS...${RESET}\n"

# 1. Check AWS CLI Authentication
echo -e "${BOLD}Checking AWS credentials...${RESET}"
if ! command -v aws &> /dev/null; then
    echo -e "${RED}❌ AWS CLI is not installed. Please install it: https://aws.amazon.com/cli/${RESET}"
    exit 1
fi

CALLER_IDENTITY=$(aws sts get-caller-identity --output text 2>/dev/null || echo "")
if [ -z "$CALLER_IDENTITY" ]; then
    echo -e "${RED}❌ AWS CLI is not authenticated. Please run 'aws configure' first.${RESET}"
    exit 1
fi

ACCOUNT_ID=$(echo "$CALLER_IDENTITY" | awk '{print $1}')
echo -e "✅ Connected to AWS Account: ${CYAN}${ACCOUNT_ID}${RESET}"

# 2. Check Terraform Installation
if ! command -v terraform &> /dev/null; then
    echo -e "${RED}❌ Terraform is not installed. Please install it: https://developer.hashicorp.com/terraform/downloads${RESET}"
    exit 1
fi
echo -e "✅ Terraform found: ${CYAN}$(terraform version | head -n 1)${RESET}"

# 3. Check Docker daemon (Required for Lambda image build and n8n mirroring)
echo -e "${BOLD}Checking Docker daemon...${RESET}"
if ! docker info >/dev/null 2>&1; then
    echo -e "${RED}❌ Docker is not running or not installed.${RESET}"
    echo -e "Docker is required to automatically build the create-schema Lambda container image."
    echo -e "Please start Docker Desktop and run this script again.\n"
    exit 1
fi
echo -e "✅ Docker is running."

# 4. Ensure terraform.tfvars exists
TFVARS="terraform/terraform.tfvars"
if [ ! -f "$TFVARS" ]; then
    echo -e "\n${YELLOW}⚠️  No terraform.tfvars found. Creating from template...${RESET}"
    cp terraform/terraform.tfvars.example "$TFVARS"
    echo -e "Please review ${CYAN}$TFVARS${RESET} with your domain and ACM certificate ARN."
fi

# Auto-sanitize placeholder bastion key if enable_bastion is true
if grep -q "your-ec2-keypair-name" "$TFVARS" 2>/dev/null && grep -q 'enable_bastion[[:space:]]*=[[:space:]]*true' "$TFVARS" 2>/dev/null; then
    echo -e "${YELLOW}⚠️  Disabling placeholder bastion in $TFVARS (set to true only with a real AWS EC2 key pair).${RESET}"
    sed -i.bak 's/enable_bastion[[:space:]]*=[[:space:]]*true/enable_bastion = false/g' "$TFVARS" && rm -f "$TFVARS.bak"
fi

# Check for placeholder certificate ARN
if grep -q "xxxxxxxx-xxxx" "$TFVARS" 2>/dev/null; then
    echo -e "\n${YELLOW}⚠️  Notice: acm_certificate_arn in $TFVARS appears to contain a placeholder.${RESET}"
    echo -e "Make sure to request a wildcard certificate (*.yourdomain.com) in AWS ACM"
    echo -e "and paste the real ARN into $TFVARS before running in production.\n"
    read -p "Press Enter to proceed with deployment, or Ctrl+C to edit $TFVARS first... "
fi

# 4. Initialize and Apply Terraform
echo -e "\n${BOLD}Initializing Terraform...${RESET}"
cd terraform
terraform init

echo -e "\n${BOLD}Applying infrastructure deployment...${RESET}"
terraform apply -auto-approve

# 5. Extract Outputs
ALB_DNS=$(terraform output -raw alb_dns_name 2>/dev/null || echo "Pending")
API_URL=$(terraform output -raw api_gateway_invoke_url 2>/dev/null || echo "Pending")
SFN_ARN=$(terraform output -raw step_functions_state_machine_arn 2>/dev/null || echo "Pending")

echo -e "\n=================================================================="
echo -e "${BOLD}${GREEN}🎉 TryBase Fleet Successfully Deployed to AWS!${RESET}"
echo -e "=================================================================="
echo -e "${BOLD}• Control Plane API:${RESET}   ${CYAN}${API_URL}/provision${RESET}"
echo -e "${BOLD}• ALB Host Endpoint:${RESET}  ${CYAN}${ALB_DNS}${RESET}"
echo -e "${BOLD}• Orchestrator SFN:${RESET}   ${CYAN}${SFN_ARN}${RESET}"
echo -e "=================================================================="

echo -e "\n${BOLD}📌 Final Step: Point your Wildcard DNS${RESET}"
echo -e "In your domain registrar (Hostinger, Cloudflare, GoDaddy, etc.), add this record:"
echo -e "  • ${BOLD}Record Type:${RESET} CNAME"
echo -e "  • ${BOLD}Host / Name:${RESET} *.n8n  (or * if routing all traffic)"
echo -e "  • ${BOLD}Target / Points:${RESET} ${CYAN}${ALB_DNS}${RESET}"

echo -e "\n${BOLD}🧪 Provision your first test tenant via API:${RESET}"
echo -e "  curl -X POST \"${API_URL}/provision\" \\"
echo -e "    -H \"Authorization: Bearer <SUPABASE_JWT>\" \\"
echo -e "    -H \"Content-Type: application/json\" \\"
echo -e "    -d '{\"tenant_id\": \"acme-corp\", \"subdomain\": \"acme\", \"rule_priority\": 100}'\n"
