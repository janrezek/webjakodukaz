# Prisma + SQLite Setup

## Instalace a konfigurace

### 1. Nastavení SQLite databáze

SQLite je souborová databáze - žádný server není potřeba! 

Přidej do `.env` souboru (volitelné, default je `file:./dev.db`):

```env
DATABASE_URL="file:./dev.db"
```

Nebo pro jiný soubor:

```env
DATABASE_URL="file:./data/webjakodukaz.db"
```

### 2. Spuštění migrací

```bash
cd apps/api
pnpm prisma:migrate
```

Tím se vytvoří databázové schéma podle `prisma/schema.prisma`.

### 3. Generování Prisma klienta

Prisma klient se automaticky generuje při migraci, ale můžeš ho vygenerovat ručně:

```bash
pnpm prisma:generate
```

### 4. Prisma Studio (volitelné)

Pro vizualizaci a správu dat:

```bash
pnpm prisma:studio
```

## Databázové schéma

### Evidence
- Hlavní záznam důkazu
- Obsahuje metadata: URL, timestamp, hash, status
- Jeden důkaz může mít více artifactů

### EvidenceArtifact
- Jednotlivé soubory/artefakty důkazu
- Podporuje hierarchickou strukturu (parent_id)
- Každý artifact má vlastní hash a S3 key

## SQLite poznámky

- Databáze je uložena jako soubor (např. `dev.db`)
- Pro development je to ideální - žádný server není potřeba
- Pro produkci můžeš snadno přejít na PostgreSQL změnou provideru v `schema.prisma`

## API Endpointy

### POST /v1/capture
Vytvoří nový důkaz a uloží do databáze.

### GET /v1/evidence
Seznam všech důkazů s paginací:
- `?skip=0` - offset
- `?take=20` - limit

### GET /v1/evidence/:evidenceId
Detail konkrétního důkazu včetně všech artifactů.

## Produkční migrace

Pro produkci použij:

```bash
pnpm prisma:migrate:deploy
```

Tento příkaz aplikuje migrace bez vytváření nových.
