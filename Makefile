.PHONY: help build up down logs squid-logs poller-logs db-shell squid-codegen squid-migrate

# Default target
help:
	@echo "Yield Indexer - Available Commands"
	@echo "==================================="
	@echo ""
	@echo "Docker Stack:"
	@echo "  make build        - Build all containers"
	@echo "  make up           - Start all services"
	@echo "  make down         - Stop all services"
	@echo "  make logs         - View all logs"
	@echo "  make squid-logs   - View squid processor logs"
	@echo "  make poller-logs  - View poller logs"
	@echo ""
	@echo "Development:"
	@echo "  make db-shell     - Open PostgreSQL shell"
	@echo "  make squid-codegen - Generate squid models from schema"
	@echo "  make squid-migrate - Run squid migrations"
	@echo ""
	@echo "Individual Services:"
	@echo "  make up-db        - Start only database"
	@echo "  make up-squid     - Start squid processor + API"
	@echo "  make up-poller    - Start poller service"

# Build all containers
build:
	docker compose build

# Start all services
up:
	docker compose up -d

# Stop all services
down:
	docker compose down

# View all logs
logs:
	docker compose logs -f

# View squid processor logs
squid-logs:
	docker compose logs -f squid-processor

# View poller logs
poller-logs:
	docker compose logs -f poller

# Open PostgreSQL shell
db-shell:
	docker compose exec db psql -U postgres -d yield_indexer

# Generate squid models from schema.graphql
squid-codegen:
	cd squid && npm run codegen

# Run squid migrations
squid-migrate:
	cd squid && npm run migration:apply

# Start only database
up-db:
	docker compose up -d db

# Start squid services
up-squid:
	docker compose up -d db squid-processor squid-api

# Start poller service
up-poller:
	docker compose up -d db poller

# Reset everything
reset:
	docker compose down -v
	docker compose up -d

