.PHONY: all control-plane infra destroy sync clean help

help:
	@echo "TryBase CLI Commands:"
	@echo "  make control-plane  Deploy Supabase migrations & Edge Functions (Command 1/2)"
	@echo "  make infra          Deploy AWS Fleet with Terraform (Command 2/2)"
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

all: control-plane infra

sync:
	@./sync-tenants.sh

clean:
	@./cleanup-enis.sh
