# Operational Housekeeping

This document outlines manual maintenance tasks required for the NexScale platform during the early launch phase.

## Manual Cleanup (Failed/Stuck Deployments)

If a user hits the "Reset & Retry" button on a stuck provisioning state, or if a deployment fails halfway through, some orphaned resources may remain in AWS. These should be cleaned up periodically to save costs and reduce clutter.

### 1. ECS Cluster (High Priority)
Check for "zombie" services that are trying to run without associated workspace records.
- **Service**: Delete any ECS services in the `n8n-main` cluster that don't match an `active` tenant.
- **Task Definitions**: Clean up old versions to keep the list tidy.

### 2. Networking
- **ALB Listener Rules**: Check the HTTPS listener (Port 443). Delete rules that route to non-existent target groups.
- **ALB Target Groups**: Delete target groups that are not associated with an active ECS service.

### 3. Database
- **Postgres Schemas**: Connect to the shared RDS instance and run:
  ```sql
  DROP SCHEMA IF EXISTS tenant_name_slug CASCADE;
  ```

### 4. Storage & Secrets
- **Secrets Manager**: Delete secrets for abandoned tenants (e.g., `n8n-db-password-slug`).
- **CloudWatch Logs**: Delete log groups for deleted tenants to save on storage (e.g., `/aws/ecs/n8n-slug`).

---

## Weekly Maintenance Checklist
- [ ] Review AWS Billing for unexpected cost spikes in Secrets Manager or ECS.
- [ ] Audit Supabase `workspaces` table for any records stuck in `provisioning` status for > 24 hours.
- [ ] Verify Resend email delivery rates and check for bounces.


Stuck ENIs: Lambda VPC ENIs can get orphaned during an interrupted destroy. Find them in EC2 → Network Interfaces and delete manually, then re-run terraform destroy.