# webjakodukaz

**Nástroj pro zajištění webových stránek jako elektronických důkazů.**

Projekt se zaměřuje na technické a procesní zajištění webového obsahu tak, aby mohl být použit jako elektronický důkaz (např. v právním, analytickém nebo akademickém kontextu).  
Důraz je kladen na reprodukovatelnost, integritu dat a transparentnost postupu.

> Projekt je vyvíjen jako otevřený (open-source) a slouží primárně k výzkumným, vzdělávacím a publikačním účelům.

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

### Funkcionalita
- ✅ REST API s validací vstupů (URL, poznámky)
- ✅ Server-side zachycení webové stránky pomocí Playwright
- ✅ Uložení výsledných artefaktů (screenshoty) do S3
- ✅ Generování časově omezených pre-signed URL pro stažení
- ✅ **Ukládání metadat důkazů do databáze** (SQLite pro development)
- ✅ **Hash integrity** - každý soubor má vlastní hash, evidence má agregovaný hash
- ✅ **Hierarchická struktura artifactů** - podpora pro více souborů na jeden důkaz
- ✅ **Transakční ukládání** - zajištění konzistence dat

### Databázové schéma
- **Evidence** - hlavní záznam důkazu (URL, timestamp, hash, status)
- **EvidenceArtifact** - jednotlivé soubory/artefakty s hierarchickou strukturou

Cílem této fáze je ověřit **technickou proveditelnost** end-to-end toku:

HTTP request → capture → uložení do DB + S3 → download artefaktu

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
  Ukládání surových i finálních artefaktů (screenshoty, externí média).
- **Database (SQLite/PostgreSQL)**  
  Ukládání metadat důkazů, hashů a struktury artifactů.
- **Web UI (Next.js)**  
  Uživatelské rozhraní (zatím neimplementováno).

---

## Použitý stack

### Backend
- **Node.js**
- **NestJS**
- **TypeScript**
- **Prisma ORM** (SQLite pro development, PostgreSQL pro produkci)

### Capture
- **Playwright** (Chromium)

### Storage
- **Amazon S3** (nebo S3-kompatibilní storage)
- Pre-signed URLs

### Database
- **SQLite** (development)
- **PostgreSQL** (produkce - připraveno)

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
│  │  └─ prisma/
│  │     └─ schema.prisma # Databázové schéma
│  └─ web/            # Next.js UI (zatím prázdné)
├─ workers/
│  └─ capture/        # Playwright capture logic
├─ packages/
│  └─ shared/         # Sdílené typy a konstanty
└─ docs/              # Dokumentace a návrhové poznámky
```

---

## Rychlý start

### Požadavky
- Node.js 18+
- pnpm 10+
- S3 kompatibilní storage (nebo AWS S3)
- SQLite (pro development) nebo PostgreSQL (pro produkci)

### Instalace

```bash
# Instalace závislostí
pnpm install

# Nastavení environment proměnných
cp .env.example .env
# Uprav .env soubor s tvými S3 credentials

# Spuštění databázových migrací
cd apps/api
pnpm prisma:migrate

# Spuštění API serveru
pnpm dev:api
```

### API použití

```bash
# Vytvoření nového důkazu
curl -X POST http://localhost:3001/v1/capture \
  -H "Content-Type: application/json" \
  -d '{"url": "https://example.com", "note": "Test evidence"}'

# Seznam důkazů
curl http://localhost:3001/v1/evidence?skip=0&take=20

# Detail důkazu
curl http://localhost:3001/v1/evidence/ev_<evidence-id>
```

---

## Roadmap (orientační)

Plánované další kroky vývoje:

- **Metadata capture** - ukládání metadat (HTTP headers, timestamp, user-agent)
- **Důkazní balíček** - export jako ZIP s manifestem
- **Hashování a kontrola integrity** - rozšíření současného hash systému
- **Message queue** - oddělení workerů pomocí RabbitMQ
- **Frontend** - Next.js webové rozhraní
- **Chrome extension** - client-side capture možnost
- **Podpis a časové razítko** - RFC 3161 časové razítko

> **Poznámka:** Roadmapa není závazná a může se měnit v průběhu vývoje.

---

## Bezpečnostní poznámky

Repozitář je veřejný a neobsahuje žádná tajemství (credentials, klíče).  
Všechny citlivé hodnoty jsou načítány z prostředí (`.env`, IAM role).

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

### Functionality
- ✅ REST API with input validation (URL, notes)
- ✅ Server-side web page capture using Playwright
- ✅ Storage of resulting artifacts (screenshots) to S3
- ✅ Generation of time-limited pre-signed URLs for download
- ✅ **Evidence metadata storage in database** (SQLite for development)
- ✅ **Hash integrity** - each file has its own hash, evidence has aggregated hash
- ✅ **Hierarchical artifact structure** - support for multiple files per evidence
- ✅ **Transactional storage** - ensures data consistency

### Database Schema
- **Evidence** - main evidence record (URL, timestamp, hash, status)
- **EvidenceArtifact** - individual files/artifacts with hierarchical structure

The goal of this phase is to verify **technical feasibility** of the end-to-end flow:

HTTP request → capture → storage to DB + S3 → download artifact

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
  Storage of raw and final artifacts (screenshots, external media).
- **Database (SQLite/PostgreSQL)**  
  Storage of evidence metadata, hashes, and artifact structure.
- **Web UI (Next.js)**  
  User interface (not yet implemented).

---

## Technology Stack

### Backend
- **Node.js**
- **NestJS**
- **TypeScript**
- **Prisma ORM** (SQLite for development, PostgreSQL for production)

### Capture
- **Playwright** (Chromium)

### Storage
- **Amazon S3** (or S3-compatible storage)
- Pre-signed URLs

### Database
- **SQLite** (development)
- **PostgreSQL** (production - ready)

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
│  │  └─ prisma/
│  │     └─ schema.prisma # Database schema
│  └─ web/            # Next.js UI (empty for now)
├─ workers/
│  └─ capture/        # Playwright capture logic
├─ packages/
│  └─ shared/         # Shared types and constants
└─ docs/              # Documentation and design notes
```

---

## Quick Start

### Requirements
- Node.js 18+
- pnpm 10+
- S3 compatible storage (or AWS S3)
- SQLite (for development) or PostgreSQL (for production)

### Installation

```bash
# Install dependencies
pnpm install

# Setup environment variables
cp .env.example .env
# Edit .env file with your S3 credentials

# Run database migrations
cd apps/api
pnpm prisma:migrate

# Start API server
pnpm dev:api
```

### API Usage

```bash
# Create new evidence
curl -X POST http://localhost:3001/v1/capture \
  -H "Content-Type: application/json" \
  -d '{"url": "https://example.com", "note": "Test evidence"}'

# List evidence
curl http://localhost:3001/v1/evidence?skip=0&take=20

# Get evidence details
curl http://localhost:3001/v1/evidence/ev_<evidence-id>
```

---

## Roadmap (indicative)

Planned next development steps:

- **Metadata capture** - storing metadata (HTTP headers, timestamp, user-agent)
- **Evidence package** - export as ZIP with manifest
- **Hashing and integrity verification** - extension of current hash system
- **Message queue** - separation of workers using RabbitMQ
- **Frontend** - Next.js web interface
- **Chrome extension** - client-side capture option
- **Signature and timestamp** - RFC 3161 timestamping

> **Note:** The roadmap is not binding and may change during development.

---

## Security Notes

The repository is public and contains no secrets (credentials, keys).  
All sensitive values are loaded from environment (`.env`, IAM roles).

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
