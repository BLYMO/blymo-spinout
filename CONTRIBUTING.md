# Contributing to TryBase

Thank you for your interest in contributing to **TryBase**! We welcome community contributions, bug reports, and feature proposals.

---

## 🛠️ Development Workflow

### 1. Prerequisites
- **Terraform** >= 1.8.0
- **AWS CLI v2** configured with administrative credentials
- **Docker** (for local image builds / testing Lambda containers)
- **Node.js** >= 18 (for Lambda authorizer tests)

### 2. Local Setup
1. Fork and clone the repository:
   ```bash
   git clone https://github.com/your-username/trybase.git
   cd trybase
   ```
2. Navigate to the Terraform directory and configure your variables:
   ```bash
   cd terraform
   cp terraform.tfvars.example terraform.tfvars
   ```
3. Initialize Terraform:
   ```bash
   terraform init
   ```
4. Validate configurations and syntax:
   ```bash
   terraform validate
   terraform fmt -check
   ```

---

## 📜 Coding Guidelines

- **Never Commit Secrets or AWS Account IDs**:
  Always use Terraform variables (`var.*`), AWS SSM/Secrets Manager, or dynamic data sources (`data.aws_caller_identity.current`, `data.aws_region.current`).
- **Dynamic Tenants**:
  Individual tenant files are generated dynamically by CodeBuild (`tenant_<tenant_id>.tf`) and persisted in S3. Never commit individual tenant `.tf` files to Git; they are excluded via `.gitignore`.
- **Formatting**:
  Run `terraform fmt -recursive` before submitting pull requests.

---

## 🐛 Submitting Issues & Pull Requests

1. **Bug Reports**:
   Please provide reproduction steps, Terraform version, AWS region, and sanitized log output.
2. **Feature Requests**:
   Open an issue first to discuss the architecture proposal before writing large changes.
3. **Pull Requests**:
   - Create a feature branch (`git checkout -b feat/my-improvement`).
   - Commit with descriptive messages.
   - Open a PR against `main`.

---

## ⚖️ License
By contributing to TryBase, you agree that your contributions will be licensed under the [Apache License 2.0](LICENSE).
