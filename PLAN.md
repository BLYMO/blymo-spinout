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

## Phase 3: Marketing & Frontend UX - [COMPLETED]

**Goal:** Create a high-converting front door that targets B2B/agencies and accurately prices the underlying AWS isolation.

- [x] **7. Brand & Strategy Setup**
  - [x] Confirmed premium positioning strategy. Focus heavily on Fargate container isolation and dedicated DB schemas vs. "shared hosting" alternatives.
- [x] **8. Build the Landing Page**
  - [x] Created React + Vite single-page app in `nexscale-web/`.
  - [x] Styled deep dark glassmorphism modern UI.
  - [x] Implemented dual-mode visualizer (Quick Launch GUI simulator and API Control CLI demo).
- [x] **9. Go-To-Market Pricing Strategy**
  - [x] Implemented a **"Trust Ramp"** strategy based on PLG economics.
  - [x] 7-Day Free Trials with countdown timer urgency.
  - [x] Starter ($19/mo), Pro ($79/mo), Business & Agency ($149+/mo).

## Phase 4: Security & Monetization - [COMPLETED]

**Goal:** Shield the provisioning API from abuse and set up the Stripe billing flow.

- [x] **10. Authentication & Security (The Shield)**
  - [x] Initialized Supabase client for frontend auth tracking.
  - [x] Built Login/Signup views in `nexscale-web/src/views/Auth.jsx`.
  - [x] Added a **JWT Authorizer** to the AWS API Gateway (`apigateway.tf`), restricting `/provision` exclusively to Supabase-authenticated users.
- [x] **11. Web App Structure**
  - [x] Disconnected monolithic App.jsx into logical routes (`/`, `/auth`, `/dashboard`) using `react-router-dom`.
  - [x] Built a clean, authenticated Dashboard view to list instances and show status.
- [x] **12. Billing Automation (Stripe)**
  - [x] Built Stripe redirect helper (`billing.js`) for Stripe Checkout links.
  - [x] Implemented delayed-charge mechanics via `trial_period_days: 14`, capturing cards upfront but deferring the actual charge.

## Phase 5: Go-Live Checklist (Next Steps)

- [x] **13. Final Configurations**
  - [x] Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` to the `.env.local` file.
  - [x] Update `apigateway.tf` with the live Supabase Project Reference.
  - [x] Drop the live Stripe Checkout URLs into `billing.js`.
- [x] **14. Launch**
  - [x] Wire the frontend `fetch` call to actually trigger the AWS API Gateway from the Dashboard.
  - [ ] Deploy the static site (Vercel/Netlify).
