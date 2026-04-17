#!/bin/bash

# ------------------------------------------------------------------------------
# MANUAL STEPS FOR BOOTSTRAPPING A TENANT
# This script contains the manual commands needed after `terraform apply`
# to bring a new tenant's n8n instance online.
# This process will be automated in Phase 2.
# ------------------------------------------------------------------------------

echo "--- Step 1: Get Database Credentials ---"
echo "Run the following command and copy the 'password' value:"
echo "aws secretsmanager get-secret-value --secret-id \"arn:aws:secretsmanager:eu-west-2:656876168893:secret:n8n-hosting/rds-master-credentials-iRrfu7\" --query SecretString --output text"
echo ""
read -p "Press enter to continue after you have the password..."
echo ""

echo "--- Step 2: Connect to the Bastion Host ---"
echo "NOTE: This assumes your 'opschimp.pem' key is in your ~/Downloads folder."
echo "The bastion IP is output by 'terraform apply'. Example:"
echo "ssh -i \"~/Downloads/opschimp.pem\" ec2-user@<BASTION_IP>"
echo ""
echo "Once connected to the bastion, run the commands in Step 3."
echo ""

# --- Commands to run ON the bastion host ---

# echo "--- Step 3: Inside the Bastion Host ---"
# echo "1. Install the correct postgresql 14+ client:"
# echo "sudo amazon-linux-extras enable postgresql14"
# echo "sudo yum clean metadata"
# echo "sudo yum install -y postgresql"
# echo ""
# echo "2. Connect to the database:"
# echo "Note: JSON secrets often escape '&' as '\u0026'. Ensure you decode it when pasting!"
# echo "PGPASSWORD='<YOUR_DECODED_PASSWORD>' PGSSLMODE=require psql -h <DB_HOSTNAME> -U n8nmaster -d postgres"
# echo ""
# echo "3. Once connected to psql, you can view or create schemas:"
# echo "\dn"
# echo "CREATE SCHEMA \"cloud-data-flows\";"
# echo ""
# echo "4. Exit psql (\q) and the bastion (exit)."