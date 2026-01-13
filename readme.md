# webjakodukaz

**Nástroj pro zajištění webových stránek jako elektronických důkazů.**

Projekt se zaměřuje na technické a procesní zajištění webového obsahu tak, aby mohl být použit jako elektronický důkaz (např. v právním, analytickém nebo akademickém kontextu).  
Důraz je kladen na reprodukovatelnost, integritu dat a transparentnost postupu.

> Projekt je vyvíjen jako otevřený (open-source) a slouží primárně k výzkumným, vzdělávacím a publikačním účelům.

> **English version:** See [English section](#webjakodukaz-1) below.

---

## Obsah

- [Cíle projektu](#cíle-projektu)
- [Aktuální stav (fáze 1)](#aktuální-stav-fáze-1)
  - [API Endpointy](#api-endpointy)
  - [Funkcionalita](#funkcionalita)
  - [Databázové schéma](#databázové-schéma)
- [Scope (rozsah)](#scope-rozsah)
- [Architektura (high-level)](#architektura-high-level)
- [Použitý stack](#použitý-stack)
- [Struktura repozitáře](#struktura-repozitáře)
- [Rychlý start](#rychlí-start)
  - [Požadavky](#požadavky)
  - [Instalace](#instalace)
- [Roadmap (orientační)](#roadmap-orientační)
- [Bezpečnostní poznámky](#bezpečnostní-poznámky)
- [Licence](#licence)
- [Autor](#autor)

---

## Cíle projektu

Hlavní cíle projektu jsou:

- umožnit **zachycení webové stránky** (obsah + metadata) deterministickým způsobem,
- vytvořit **důkazní balíček**, který lze archivovat a dále ověřovat,
- oddělit **uživatelské rozhraní, backendovou logiku a výpočetní část** (capture),
- navrhnout architekturu, která je:
  - auditovatelná,
  - rozšiřitelná,
  - a nevyžaduje důvěru v „tajnost kódu".

Projekt **není** zamýšlen jako komerční služba ani právní náhrada kvalifikovaných forenzních nástrojů.

---

## Aktuální stav (fáze 1)

Aktuálně projekt implementuje:

### API Endpointy
- `POST /v1/capture` - Vytvoření nového důkazu (zachycení webové stránky)
- `GET /v1/evidence` - Seznam všech důkazů s paginací (`?skip=0&take=20`)
- `GET /v1/evidence/:evidenceId` - Detail konkrétního důkazu včetně všech artifactů

API server běží na `http://localhost:3001` (nebo portu specifikovaném v `PORT` environment proměnné).

### Funkcionalita
- REST API s validací vstupů
- Server-side zachycení webové stránky pomocí Playwright
- **Důkazní balíček jako ZIP** - vytvoření a uložení ZIP souboru na S3 (source of truth)
- Generování časově omezených pre-signed URL pro stažení ZIP balíčku
- **Ukládání metadat důkazů do databáze** (PostgreSQL)
- **Hash integrity** - každý soubor má vlastní hash, ZIP má hash pro ověření integrity
- **Manifest souborů** - manifest.json obsahuje seznam všech souborů v ZIPu s hashy
- **Metadata capture** - ukládání metadat o capture (URL, timestamp, user-agent, viewport, title)
- **Transakční ukládání** - zajištění konzistence dat

### Struktura důkazního balíčku (ZIP)
ZIP soubor obsahuje:
- `screenshot-full.png` - full-page screenshot stránky
- `page.html` - HTML kód zachycené stránky
- `metadata.json` - metadata o capture procesu (URL, timestamp, user-agent, viewport, title, finalUrl)
- `manifest.json` - seznam všech souborů v balíčku včetně jejich hashů, velikostí a MIME typů

ZIP je **source of truth** - všechny soubory jsou uloženy pouze v ZIPu na S3. Jednotlivé soubory jsou evidovány v databázi jako artifacty pro referenci, ale fyzicky existují pouze v ZIP balíčku.

### Databázové schéma
- **Evidence** - hlavní záznam důkazu (URL, timestamp, zipS3Key, zipHash, zipSize, status)
- **EvidenceArtifact** - jednotlivé soubory/artefakty v ZIPu (path, hash, size, mimeType)

Cílem této fáze je ověřit **technickou proveditelnost** end-to-end toku:

HTTP request → capture → vytvoření ZIP → uložení ZIP na S3 + metadata do DB → download ZIP balíčku

---

## Scope (rozsah)

### Co projekt řeší
- technický proces zajištění webového obsahu,
- strukturu důkazního balíčku,
- backendovou orchestraci kroků,
- bezpečné ukládání a zpřístupnění artefaktů,
- integritu dat pomocí hashů,
- archivaci a dotazování na důkazy.

### Co projekt neřeší
- právní posouzení důkazní váhy v konkrétní jurisdikci,
- kvalifikované elektronické podpisy dle eIDAS (zatím),
- anonymizaci nebo právní odpovědnost za obsah,
- komerční SLA nebo dostupnost.

---

## Architektura (high-level)

Projekt je navržen jako **modulární monorepo**:

- **API (NestJS)**  
  Autoritativní backend, který řídí proces zajištění důkazu, ukládá metadata do databáze a spravuje artefakty.
- **Capture worker (Playwright)**  
  Izolovaná výpočetní část pro zachycení webového obsahu (aktuálně jako knihovna, plánováno jako standalone worker).
- **Storage (S3)**  
  Ukládání důkazních balíčků jako ZIP souborů. ZIP je source of truth a obsahuje všechny artefakty (screenshot, HTML, metadata.json, manifest.json).
- **Database (PostgreSQL)**  
  Ukládání metadat důkazů, ZIP hashů a struktury artifactů v balíčku.
- **Web UI (Next.js)**  
  Uživatelské rozhraní (zatím neimplementováno).

---

## Použitý stack

### Backend
- **Node.js**
- **NestJS**
- **TypeScript**
- **Prisma ORM** (PostgreSQL)

### Capture
- **Playwright** (Chromium)

### Storage
- **Amazon S3** (nebo S3-kompatibilní storage)
- Pre-signed URLs

### Database
- **PostgreSQL**

### Projektová struktura
- **pnpm workspaces** (monorepo)

---

## Struktura repozitáře

```txt
webjakodukaz/
├─ apps/
│  ├─ api/            # NestJS REST API
│  │  ├─ src/
│  │  │  ├─ evidence/     # Evidence modul (controller, service, DTOs)
│  │  │  ├─ prisma/       # Prisma service a modul
│  │  │  ├─ storage/      # S3 storage service
│  │  │  └─ common/        # Sdílené služby (hash)
│  │  ├─ prisma/
│  │  │  └─ schema.prisma # Databázové schéma
│  │  ├─ .env.example    # Template pro API .env (S3 a DATABASE_URL)
│  │  └─ .env            # API environment proměnné (není v gitu)
│  └─ web/            # Next.js UI (zatím prázdné)
├─ workers/
│  └─ capture/        # Playwright capture logic
├─ packages/
│  └─ shared/         # Sdílené typy a konstanty
├─ docs/              # Dokumentace a návrhové poznámky
├─ docker-compose.yml # Docker Compose konfigurace pro PostgreSQL
├─ .env.example       # Template pro root .env (PostgreSQL pro Docker)
└─ .env               # Root environment proměnné (není v gitu)
```

---

## Rychlý start

### Požadavky
- Node.js 18+
- pnpm 10+
- Docker a Docker Compose (pro lokální databázi)
- S3 kompatibilní storage (nebo AWS S3)
- PostgreSQL (lze spustit pomocí Docker Compose)

### Instalace

```bash
# Instalace závislostí
pnpm install

# Nastavení environment proměnných
# 1. Root .env (pro Docker Compose - PostgreSQL credentials)
cp .env.example .env
# Uprav .env v rootu s PostgreSQL údaji pro Docker:
# - POSTGRES_USER
# - POSTGRES_PASSWORD
# - POSTGRES_DB
# - POSTGRES_PORT

# 2. API .env (pro NestJS aplikaci - S3 a DATABASE_URL)
cp apps/api/.env.example apps/api/.env
# Uprav apps/api/.env s údaji pro aplikaci:
# - DATABASE_URL (connection string, např. postgresql://postgres:postgres@localhost:8001/webjakodukaz)
# - S3_REGION, S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY, S3_BUCKET, S3_RAW_PREFIX, S3_PRESIGN_EXPIRES_SECONDS
# - PORT (volitelné, default: 3001)

# Spuštění PostgreSQL databáze pomocí Docker Compose
docker-compose up -d db

# Spuštění databázových migrací
cd apps/api
pnpm prisma:migrate

# Spuštění API serveru (běží na http://localhost:3001)
pnpm dev:api
```

---

## Roadmap (orientační)

Plánované další kroky vývoje:

- **Message queue** - oddělení workerů pomocí RabbitMQ
- **Frontend** - Next.js webové rozhraní
- **Chrome extension** - client-side capture možnost
- **Podpis a časové razítko** - RFC 3161 časové razítko
- **Rozšíření metadat** - HTTP headers, network requests, další technické detaily

> **Poznámka:** Roadmapa není závazná a může se měnit v průběhu vývoje.

---

## Bezpečnostní poznámky

Repozitář je veřejný a neobsahuje žádná tajemství (credentials, klíče).  
Všechny citlivé hodnoty jsou načítány z prostředí (`.env` soubory, IAM role).  
Template soubory `.env.example` jsou veřejné a obsahují pouze příklady bez skutečných credentials.

Bezpečnost projektu nespoléhá na utajení kódu, ale na:

- **kryptografické hashování** - zajištění integrity dat,
- **oddělení rolí komponent** - izolace zodpovědností,
- **auditovatelný proces** - transparentní workflow.

---

## Licence

Projekt je publikován jako open-source.  
Konkrétní licence bude doplněna (pravděpodobně MIT nebo Apache 2.0).

---

## Autor

**Ing. Jan Rezek**  
VUT FEKT Brno, obor Informační bezpečnost

Projekt vzniká jako součást výzkumné a publikační činnosti.  
Slouží k experimentování s návrhem nástrojů pro zajištění digitálních důkazů.


---

---

# webjakodukaz

**Tool for capturing web pages as electronic evidence.**

> **Česká verze:** Viz [česká sekce](#webjakodukaz) výše.

---

The project focuses on technical and procedural capture of web content so it can be used as electronic evidence (e.g., in legal, analytical, or academic contexts).  
Emphasis is placed on reproducibility, data integrity, and process transparency.

> The project is developed as open-source and serves primarily research, educational, and publishing purposes.

---

## Project Goals

The main project goals are:

- enable **web page capture** (content + metadata) in a deterministic way,
- create an **evidence package** that can be archived and verified,
- separate **user interface, backend logic, and computational part** (capture),
- design an architecture that is:
  - auditable,
  - extensible,
  - and does not require trust in "code secrecy".

The project is **not** intended as a commercial service or legal replacement for qualified forensic tools.

---

## Current Status (Phase 1)

The project currently implements:

### API Endpoints
- `POST /v1/capture` - Create new evidence (capture web page)
- `GET /v1/evidence` - List all evidence with pagination (`?skip=0&take=20`)
- `GET /v1/evidence/:evidenceId` - Get specific evidence details including all artifacts

API server runs on `http://localhost:3001` (or port specified in `PORT` environment variable).

### Functionality
- REST API with input validation (URL)
- Server-side web page capture using Playwright
- **Evidence package as ZIP** - creation and storage of ZIP file on S3 (source of truth)
- Generation of time-limited pre-signed URLs for downloading ZIP package
- **Evidence metadata storage in database** (PostgreSQL)
- **Hash integrity** - each file has its own hash, ZIP has hash for integrity verification
- **File manifest** - manifest.json contains list of all files in ZIP with hashes
- **Metadata capture** - storing capture metadata (URL, timestamp, user-agent, viewport, title)
- **Transactional storage** - ensures data consistency

### Evidence Package Structure (ZIP)
ZIP file contains:
- `screenshot-full.png` - full-page screenshot of the page
- `page.html` - HTML code of captured page
- `metadata.json` - metadata about capture process (URL, timestamp, user-agent, viewport, title, finalUrl)
- `manifest.json` - list of all files in package including their hashes, sizes and MIME types

ZIP is **source of truth** - all files are stored only in ZIP on S3. Individual files are recorded in database as artifacts for reference, but physically exist only in ZIP package.

### Database Schema
- **Evidence** - main evidence record (URL, timestamp, zipS3Key, zipHash, zipSize, status)
- **EvidenceArtifact** - individual files/artifacts in ZIP (path, hash, size, mimeType)

The goal of this phase is to verify **technical feasibility** of the end-to-end flow:

HTTP request → capture → ZIP creation → ZIP storage to S3 + metadata to DB → download ZIP package

---

## Scope

### What the project addresses
- technical process of web content capture,
- evidence package structure,
- backend orchestration of steps,
- secure storage and access to artifacts,
- data integrity using hashes,
- evidence archiving and querying.

### What the project does not address
- legal assessment of evidentiary weight in specific jurisdiction,
- qualified electronic signatures per eIDAS (yet),
- anonymization or legal liability for content,
- commercial SLA or availability.

---

## Architecture (high-level)

The project is designed as a **modular monorepo**:

- **API (NestJS)**  
  Authoritative backend that manages the evidence capture process, stores metadata in database, and manages artifacts.
- **Capture worker (Playwright)**  
  Isolated computational part for web content capture (currently as library, planned as standalone worker).
- **Storage (S3)**  
  Storage of evidence packages as ZIP files. ZIP is source of truth and contains all artifacts (screenshot, HTML, metadata.json, manifest.json).
- **Database (PostgreSQL)**  
  Storage of evidence metadata, ZIP hashes, and artifact structure in package.
- **Web UI (Next.js)**  
  User interface (not yet implemented).

---

## Technology Stack

### Backend
- **Node.js**
- **NestJS**
- **TypeScript**
- **Prisma ORM** (PostgreSQL)

### Capture
- **Playwright** (Chromium)

### Storage
- **Amazon S3** (or S3-compatible storage)
- Pre-signed URLs

### Database
- **PostgreSQL**

### Project Structure
- **pnpm workspaces** (monorepo)

---

## Repository Structure

```txt
webjakodukaz/
├─ apps/
│  ├─ api/            # NestJS REST API
│  │  ├─ src/
│  │  │  ├─ evidence/     # Evidence module (controller, service, DTOs)
│  │  │  ├─ prisma/       # Prisma service and module
│  │  │  ├─ storage/      # S3 storage service
│  │  │  └─ common/        # Shared services (hash)
│  │  ├─ prisma/
│  │  │  └─ schema.prisma # Database schema
│  │  ├─ .env.example    # Template for API .env (S3 and DATABASE_URL)
│  │  └─ .env            # API environment variables (not in git)
│  └─ web/            # Next.js UI (empty for now)
├─ workers/
│  └─ capture/        # Playwright capture logic
├─ packages/
│  └─ shared/         # Shared types and constants
├─ docs/              # Documentation and design notes
├─ docker-compose.yml # Docker Compose configuration for PostgreSQL
├─ .env.example       # Template for root .env (PostgreSQL for Docker)
└─ .env               # Root environment variables (not in git)
```

---

## Quick Start

### Requirements
- Node.js 18+
- pnpm 10+
- Docker and Docker Compose (for local database)
- S3 compatible storage (or AWS S3)
- PostgreSQL (can be run using Docker Compose)

### Installation

```bash
# Install dependencies
pnpm install

# Setup environment variables
# 1. Root .env (for Docker Compose - PostgreSQL credentials)
cp .env.example .env
# Edit root .env with PostgreSQL credentials for Docker:
# - POSTGRES_USER
# - POSTGRES_PASSWORD
# - POSTGRES_DB
# - POSTGRES_PORT

# 2. API .env (for NestJS application - S3 and DATABASE_URL)
cp apps/api/.env.example apps/api/.env
# Edit apps/api/.env with application credentials:
# - DATABASE_URL (connection string, e.g. postgresql://postgres:postgres@localhost:8001/webjakodukaz)
# - S3_REGION, S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY, S3_BUCKET, S3_RAW_PREFIX, S3_PRESIGN_EXPIRES_SECONDS
# - PORT (optional, default: 3001)

# Start PostgreSQL database using Docker Compose
docker-compose up -d db

# Run database migrations
cd apps/api
pnpm prisma:migrate

# Start API server (runs on http://localhost:3001)
pnpm dev:api
```

---

## Roadmap (indicative)

Planned next development steps:

- **Message queue** - separation of workers using RabbitMQ
- **Frontend** - Next.js web interface
- **Chrome extension** - client-side capture option
- **Signature and timestamp** - RFC 3161 timestamping
- **Extended metadata** - HTTP headers, network requests, additional technical details

> **Note:** The roadmap is not binding and may change during development.

---

## Security Notes

The repository is public and contains no secrets (credentials, keys).  
All sensitive values are loaded from environment (`.env` files, IAM roles).  
Template files `.env.example` are public and contain only examples without actual credentials.

Project security does not rely on code secrecy, but on:

- **cryptographic hashing** - ensuring data integrity,
- **component role separation** - isolation of responsibilities,
- **auditable process** - transparent workflow.

---

## License

The project is published as open-source.  
A specific license will be added (likely MIT or Apache 2.0).

---

## Author

**Ing. Jan Rezek**  
VUT FEKT Brno, Information Security

The project is created as part of research and publishing activities.  
It serves to experiment with the design of tools for digital evidence capture.
