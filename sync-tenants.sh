#!/bin/bash

# Configuration
BUCKET="n8n-hosting-saas-tfstate"
LOCAL_DIR="./terraform"

echo "🔄 Syncing tenant configurations from S3..."

# Ensure we are in the right directory
if [ ! -d "$LOCAL_DIR" ]; then
    echo "❌ Error: Could not find terraform directory. Run this from the project root."
    exit 1
fi

# Sync from S3 to local
aws s3 sync "s3://$BUCKET/tenants/" "$LOCAL_DIR" --exclude "*" --include "tenant_*.tf"

echo "✅ Sync complete. Your local terraform folder is now up to date with the cloud fleet."
