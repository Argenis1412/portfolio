# 🎯 Portfolio Backend API

> **Live API Docs:** [Swagger UI →](https://selected-fionna-argenis1412-58caae17.koyeb.app/docs)

REST API built with **FastAPI** and **Clean Architecture** — engineered with a **language-agnostic core** so that the system remains portable, testable, and framework-independent.

## 📝 Description

Professional backend for a developer portfolio, implementing:
- ✅ **Clean Architecture** (Controllers → Use Cases → Entities → Adapters)
- ✅ **Versioned API** (/api/v1/*)
- ✅ **SQL Database** with **SQLModel** (SQLAlchemy + Pydantic)
- ✅ **Database Migrations** with **Alembic**
- ✅ **Global Error Handling** with custom exceptions
- ✅ **Middleware** with request_id, logging, and performance measurement
- ✅ **Professional Health Check** with database connectivity and uptime
- ✅ **Clear separation** of responsibilities
- ✅ **Automatic validation** with Pydantic V2
- ✅ **Interactive Documentation** with OpenAPI/Swagger
- ✅ **Automated Tests** with pytest
- ✅ **Quality Gate**: GitHub Actions enforces a **80% minimum coverage** threshold and verified Docker builds on every push.
- ✅ **Layered contact protection**: Includes a honeypot, spam scoring, and a **30-minute persistent deduplication** (database-backed) to prevent duplicate submissions across server restarts.
- ✅ **Rate Limiting**: 10 messages/day per email address via custom identity extraction middleware.
- ✅ **API Observability**: Full integration with OpenTelemetry and Prometheus (v1.2.0)

---

## 🏗️ Architecture

### Simplified Clean Architecture
```mermaid
graph TD
    subgraph Interface Layer
        C[Controllers / HTTP Layer]
        C -.- note1[Receives requests<br>Validates input<br>Returns HTTP responses]
    end
    
    subgraph Use Case Layer
        UC[Use Cases / Business Logic]
        UC -.- note2[Orchestrates business logic<br>NO framework dependencies<br>Testable in isolation]
    end
    
    subgraph Domain Layer
        E[Entities / Domain Models]
        E -.- note3[Immutable domain models<br>Pure business logic<br>Python Dataclasses]
    end
    
    subgraph External Layer
        A[Adapters / External Services]
        A -.- note4[Email Formspree<br>SQL Database / SQLite<br>Logging]
    end

    C -->|Calls| UC
    UC -->|Uses| E
    UC -->|Interfaces with| A
```

### Request Flow

1. HTTP Request
2. **Middleware**: Assigns `X-Request-ID`, logs entry.
3. **Controller**: Pydantic validation.
4. **Use Case**: Executes business logic.
5. **Adapter**: Interacts with **SQL Database** via **SQLModel**.
6. Returns Response.
7. **Middleware**: Logs exit, adds `X-Request-ID` and `X-Response-Time` headers.

---

## 🚀 How to Run

### 1. Installation
```bash
git clone https://github.com/Argenis1412/portfolio.git
cd portfolio/backend

# Create virtual environment
# Windows:
py -3.12 -m venv .venv
# Linux/macOS:
python -m venv .venv

# Activate virtual environment
# Windows:
.\.venv\Scripts\activate
# Linux/macOS:
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt
```

### 2. Database Setup (New)
```bash
# 1. Apply schema migrations
python -m alembic upgrade head

# 2. Seed data from JSON to SQL
python ./scripts/migrar_dados.py
```

### 3. Execution
```bash
# Start the server
python -m uvicorn app.principal:app --reload --port 8000
```
- **Local Docs**: `http://localhost:8000/docs`
- **Production Docs**: `https://selected-fionna-argenis1412-58caae17.koyeb.app/docs`

---

## 📡 Endpoints

### 🔍 Health Check & Observability
`GET /saude`
*(Note: Named `/saude` instead of `/health` to match the Portuguese base domain language of the original project structure, but standard `health` checks apply)*  
Returns status for:
- API connectivity
- **Database connection**
- **External service config (Email)**
- **Uptime** and versioning.

### 📁 Portfolio Data
- `GET /api/v1/sobre`: Internationalized "About Me" data.
- `GET /api/v1/projetos`: Projects with tags and links.
- `GET /api/v1/stack`: Tech stack by categories.
- `GET /api/v1/experiencias`: Professional timeline.
- `GET /api/v1/formacao`: Education history.

---

## 🧪 Tests
```bash
# Run all tests
pytest

# With coverage
pytest --cov=app --cov-report=html

# CI/CD Quality Gate (Local simulation)
pytest --cov=app --cov-fail-under=80
```

---

## 🎓 Technical Decisions

### Why SQL Database (SQLModel)?
- **Professionalism**: Real-world apps use SQL for relationships and performance.
- **Robustness**: Typing consistency between database models and Pydantic schemas.
- **Evolution**: **Alembic** allows managed schema changes.
- **Scalability**: Easy migration from SQLite to PostgreSQL by changing the `DATABASE_URL`.

### Future-Ready & Language Agnostic
The **Domain Logic (Use Cases)** is strictly isolated from the framework (FastAPI) and external libraries. This means:
- **Portability**: The business rules could be migrated to another Python framework (like Starlette or Litestar) or even serve as a blueprint for a rewrite in a high-performance language (like Go or Rust) with minimal logic re-engineering.
- **Stability**: Changes in infrastructure (DB, Email, Cloud Provider) only require new **Adapters**, leaving the core logic untouched.

---

## 🗺️ Future Roadmap

This backend is designed to evolve into a full-scale enterprise system:
- **🚀 Transactional Ledger**: Robust financial logic with ACID compliance.
- **🔐 Advanced Authentication**: Migration to OAuth2/OpenID Connect.

### Why Manual JSON Serialization (SQLite Compatibility)?
- SQLite doesn't always have native JSON support in all environments.
- Implemented an adapter layer in `modelos_sql.py` and `RepositorioSQL` to handle internationalization (dicts/lists) as TEXT, ensuring extreme reliability across all platforms.
