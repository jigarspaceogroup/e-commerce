.PHONY: up down reset-db seed logs dev

up:
	docker compose up -d

down:
	docker compose down

reset-db:
	docker compose down -v
	docker compose up -d postgres
	sleep 3
	pnpm --filter @repo/api exec prisma migrate reset --force

seed:
	pnpm --filter @repo/api exec prisma db seed

logs:
	docker compose logs -f

dev:
	docker compose up -d
	pnpm run dev
