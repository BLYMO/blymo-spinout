# Deprovisioning Tenants (Manual Process)

As of Launch Phase 1, the infrastructure destruction process is **manual**. The automated Step Functions and CodeBuild pipelines are currently optimized for **provisioning only** to ensure maximum safety and prevent accidental deletion of production workloads.

## Why it is manual
- **Safety**: Automated destruction pipelines carry the risk of accidental triggers.
- **Data Retention**: Manual deprovisioning ensures you have a chance to back up or verify data before the final "purge".
- **RDS Schema**: The current `provision_tenant` logic creates a specific Postgres schema; destroying the infrastructure via Terraform preserves the shared RDS but requires a manual `DROP SCHEMA` to fully clean up.

## Step-by-Step Deprovisioning

### 1. Destroy Infrastructure (Terraform)
Navigate to the terraform directory on a machine with AWS access and target the specific tenant module.

```bash
cd terraform
# Replace <TENANT_ID> with the actual slug (e.g., cloud-sam-beans)
terraform destroy -target="module.<TENANT_ID>"
```

### 2. Cleanup Database Schema
Since we use a shared RDS instance, Terraform will not automatically drop the Postgres schema. You must connect to the RDS instance (via the Bastion host) and run:

```sql
DROP SCHEMA "<TENANT_ID>" CASCADE;
```

### 3. Archive Configuration
Once destruction is confirmed, manually delete the auto-generated `.tf` file to keep the directory clean:

```bash
rm terraform/tenant_<TENANT_ID>.tf
```

---

> [!IMPORTANT]
> **Phase 2 Roadmap**: We plan to implement a `deprovision-tenant` Step Function that automates these steps after a 30-day "Suspended" grace period.
