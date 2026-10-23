.PHONY: all control-plane infra destroy cost sync clean help

help:
	@echo "TryBase CLI Commands:"
	@echo "  make control-plane  Deploy Supabase migrations & Edge Functions (Command 1/2)"
	@echo "  make infra          Deploy AWS Fleet with Terraform (Command 2/2)"
	@echo "  make cost           Forecast cloud infrastructure costs with Infracost"
	@echo "  make destroy        Tear down AWS Fleet infrastructure cleanly"
	@echo "  make all            Deploy both Control Plane and AWS Fleet"
	@echo "  make sync           Sync remote tenant state from S3 to local Git"
	@echo "  make clean          Clean orphaned AWS Lambda ENIs"

control-plane:
	@./deploy-control-plane.sh

infra:
	@./deploy-infra.sh

destroy:
	@./destroy-infra.sh

cost:
	@if command -v infracost >/dev/null 2>&1; then \
		infracost breakdown --path terraform/; \
	else \
		echo "\n\033[1;33m⚠️  Infracost is not installed.\033[0m"; \
		echo "Install Infracost (Apache 2.0) to forecast exact cloud costs:"; \
		echo "  brew install infracost   (macOS)"; \
		echo "  curl -fsSL https://raw.githubusercontent.com/infracost/infracost/master/scripts/install.sh | sh  (Linux)"; \
		echo "Then run: 'infracost auth login' and retry 'make cost'.\n"; \
	fi

all: control-plane infra

sync:
	@./sync-tenants.sh

clean:
	@./cleanup-enis.sh
