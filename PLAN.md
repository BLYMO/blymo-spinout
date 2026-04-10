# Project Plan: Multi-Tenant n8n Hosting SaaS

This document tracks the development plan, our current progress, and the strategic positioning for the business.

## Phase 1: Minimum Viable Product (MVP) - [COMPLETED]

**Goal:** Create a functioning system that can automatically provision and de-provision a dedicated n8n instance for a new tenant.

### Key Steps
- [x] **1. Initial Design & Scoping:** Architecture decided (Shared VPC, Fargate per tenant).
- [x] **2. Project & Terraform Setup:** Modules created, remote state locked in S3.
- [x] **3. Develop Shared Infrastructure:** VPC, ALB, and RDS Postgres online.
- [x] **4. Develop Tenant Module:** ECS Service, IAM roles, and target groups.

## Phase 2: Automation & Production Hardening - [COMPLETED]

**Goal:** Remove humans from the loop. A tenant must be provisioned instantly via an API call.

- [x] **5. Automate Tenant Provisioning Pipeline**
  - [x] Designed AWS Step Functions orchestrator.
  - [x] Created `create-schema` Lambda (fixed arm64 architecture for Apple Silicon).
  - [x] Created CodeBuild pipeline to dynamically inject `tenant_id` into Terraform.
  - [x] Exposed `POST /provision` via API Gateway.
- [x] **6. End-to-End Verification**
  - [x] Successfully dispatched `curl` command. 
  - [x] Step Function completed organically; DNS routed `alice` tenant correctly despite HTTPS redirects.

## Phase 3: Marketing & Frontend UX - [CURRENT PHASE]

**Goal:** Create a high-converting front door that targets B2B/agencies and accurately prices the underlying AWS isolation.

- [x] **7. Brand & Strategy Setup**
  - [x] Confirmed premium positioning strategy. Focus heavily on Fargate container isolation and dedicated DB schemas vs. "shared hosting" alternatives.
- [x] **8. Build the Landing Page**
  - [x] Created React + Vite single-page app in `/website`.
  - [x] Styled deep dark glassmorphism modern UI.
  - [x] Added hero terminal animation to demo the pipeline speed.
- [x] **9. Go-To-Market Pricing Strategy**
  - [x] Implemented a **"Trust Ramp"** strategy based on PLG economics.
  - [x] Starter ($19/mo) - Impulse buy for agencies; starts the trust relationship.
  - [x] Pro ($79/mo) - 🚀 The core scaling tier featuring **Automated Backups**.
  - [x] Business & Agency ($149+/mo) - Fully dedicated environment and resources.

## Phase 4: Integrations & Live Handover (Next Steps)

- [ ] **10. Wire Up the Frontend**
  - [ ] Connect the "Deploy/Start" buttons in `App.jsx` to actually hit the `POST /provision` API Gateway endpoint using JS `fetch`.
- [ ] **11. Billing Automation (Stripe)**
  - [ ] Connect Stripe Checkout so a user can't provision a tenant until a card is charged.
- [ ] **12. Analytics & User Board**
  - [ ] Simple dashboard allowing users to see their instance URL and tear it down if needed.
