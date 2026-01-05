# Project Plan: Multi-Tenant n8n Hosting SaaS

This document tracks the development plan and our current progress.

## Phase 1: Minimum Viable Product (MVP)

**Goal:** Create a functioning system that can automatically provision and de-provision a dedicated n8n instance for a new tenant.

### Key Steps

- [x] **1. Initial Design & Scoping**
  - [x] Define high-level architecture (Shared VPC, ECS Fargate per tenant).
  - [x] Choose technology stack (Terraform, AWS Step Functions, Lambda).
  - [x] Define MVP scope (automated provisioning, no UI/billing).

- [x] **2. Project & Terraform Setup**
  - [x] Create project directory structure (`terraform/modules/tenant`).
  - [x] Configure main Terraform provider with default tags.
  - [x] Configure S3 backend for remote state management.

- [x] **3. Bootstrap Terraform Backend**
  - [x] Create a separate Terraform configuration for backend resources (`terraform/setup-backend`).
  - [x] Run `terraform init` and `terraform apply` to create the S3 bucket and DynamoDB table for state locking.

- [x] **4. Develop Shared AWS Infrastructure**
  - [x] Initialize the main Terraform configuration (`/terraform`).
  - [x] Define the shared VPC, subnets, and NAT Gateway.
  - [x] Define the shared ECS Cluster.
  - [x] Define the shared Application Load Balancer (ALB).
  - [x] Define the shared RDS Postgres instance.

- [x] **5. Develop the Reusable Tenant Module**
  - [x] Define the input variables for the tenant module (`variables.tf`).
  - [x] Define the per-tenant ECS Service and Task Definition.
  - [x] Define the per-tenant IAM roles for security isolation.
  - [x] Define the per-tenant ALB Target Group and Listener Rule.

- [x] **6. Orchestration & End-to-End Testing**
  - [x] Provision a test tenant using the new module.
  - [x] Manually create the database schema via a bastion host.
  - [x] Successfully access the tenant's n8n instance via the ALB, proving the end-to-end flow.

## Phase 2: Automation & Production Hardening (Next Steps)

- [ ] **7. Automate Tenant Provisioning**
  - [ ] Design the AWS Step Function state machine for tenant creation.
  - [ ] Create a Lambda function to replace the manual "CREATE SCHEMA" step.
  - [ ] Create a CodeBuild project to run `terraform apply` for the tenant module, triggered by the Step Function.
  - [ ] Create a simple API Gateway endpoint to trigger the Step Function.

- [ ] **8. Harden Security & Monitoring**
  - [ ] Implement per-tenant database credentials.
  - [ ] Add robust monitoring and alarms for shared resources (RDS, ALB).
  - [ ] Refine IAM permissions to be as restrictive as possible.


- [ ] **7. Create API Endpoint**
  - [ ] Develop a simple `/signup` API endpoint (e.g., using API Gateway and Lambda).
  - [ ] Wire the endpoint to trigger the Step Function execution.

- [ ] **8. End-to-End Testing**
  - [ ] Test the full flow: API call -> Step Function -> Tenant Provisioned -> n8n accessible.
  - [ ] Test tenant teardown and resource destruction.
