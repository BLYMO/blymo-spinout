#!/bin/bash
set -e

# ==============================================================================
# TryBase: Deploy Control Plane (Command 1 of 2)
# Applies Supabase database migrations, deploys Edge Functions, and prepares config.
# ==============================================================================

BOLD="\033[1m"
GREEN="\033[0;32m"
CYAN="\033[0;36m"
YELLOW="\033[1;33m"
RED="\033[0;31m"
RESET="\033[0m"

echo -e "\n${BOLD}${CYAN}🚀 [1/2] Deploying TryBase Control Plane (Supabase)...${RESET}\n"

# 1. Check for Supabase CLI
if command -v supabase &> /dev/null; then
    SUPABASE_CMD="supabase"
else
    echo -e "${YELLOW}ℹ️  Local supabase CLI not found. Falling back to npx...${RESET}"
    SUPABASE_CMD="npx -y supabase"
fi

# 2. Check Project Linking
echo -e "${BOLD}Checking Supabase project connection...${RESET}"
if [ ! -f "supabase/.temp/project-ref" ]; then
    echo -e "${YELLOW}Your local workspace is not linked to a Supabase project yet.${RESET}"
    echo -e "You can find your Project Reference in your Supabase dashboard URL:"
    echo -e "e.g. https://supabase.com/dashboard/project/${BOLD}<PROJECT_REF>${RESET}\n"
    read -p "Enter your Supabase Project Ref: " PROJECT_REF

    if [ -z "$PROJECT_REF" ]; then
        echo -e "${RED}❌ Error: Project Reference is required to link Supabase.${RESET}"
        exit 1
    fi

    echo -e "\nLinking to project ${CYAN}$PROJECT_REF${RESET}..."
    $SUPABASE_CMD link --project-ref "$PROJECT_REF"
else
    PROJECT_REF=$(cat supabase/.temp/project-ref 2>/dev/null || echo "")
    echo -e "✅ Found linked project: ${CYAN}${PROJECT_REF}${RESET}"
fi

# 3. Apply Database Migrations (Workspaces table, RLS policies)
echo -e "\n${BOLD}Applying database migrations to Supabase...${RESET}"
$SUPABASE_CMD db push
echo -e "${GREEN}✅ Database migrations applied successfully.${RESET}"

# 4. Deploy Edge Functions
echo -e "\n${BOLD}Deploying Supabase Edge Functions...${RESET}"

echo -e "  → Deploying on-provision-success..."
$SUPABASE_CMD functions deploy on-provision-success --no-verify-jwt

echo -e "  → Deploying verify-checkout..."
$SUPABASE_CMD functions deploy verify-checkout --no-verify-jwt

echo -e "  → Deploying create-portal-session..."
$SUPABASE_CMD functions deploy create-portal-session

echo -e "${GREEN}✅ All Edge Functions deployed successfully.${RESET}"

# 5. Check / Set Environment Secrets
echo -e "\n${BOLD}Checking Edge Function secrets...${RESET}"
echo -e "Tip: You can set Stripe & Resend keys anytime with:"
echo -e "  ${CYAN}supabase secrets set STRIPE_SECRET_KEY=sk_... RESEND_API_KEY=re_...${RESET}"

# 6. Synchronize configuration to terraform.tfvars
TFVARS="terraform/terraform.tfvars"
if [ ! -f "$TFVARS" ]; then
    echo -e "\nCreating ${CYAN}$TFVARS${RESET} from example template..."
    cp terraform/terraform.tfvars.example "$TFVARS"
fi

if [ -n "$PROJECT_REF" ]; then
    SUPA_URL="https://${PROJECT_REF}.supabase.co"
    # Update supabase_url in terraform.tfvars if present
    if grep -q "supabase_url" "$TFVARS"; then
        sed -i.bak "s|supabase_url.*=.*|supabase_url   = \"$SUPA_URL\"|g" "$TFVARS" && rm -f "${TFVARS}.bak"
    else
        echo -e "\nsupabase_url   = \"$SUPA_URL\"" >> "$TFVARS"
    fi
    echo -e "✅ Updated ${CYAN}$TFVARS${RESET} with supabase_url = ${CYAN}$SUPA_URL${RESET}"
fi

echo -e "\n=================================================================="
echo -e "${BOLD}${GREEN}🎉 Step 1 Complete: Control Plane is Live!${RESET}"
echo -e "=================================================================="
echo -e "Next step: Deploy your AWS fleet infrastructure with:"
echo -e "\n  ${BOLD}${CYAN}./deploy-infra.sh${RESET}\n"
