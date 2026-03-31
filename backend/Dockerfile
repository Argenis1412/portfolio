# ============================================
# DOCKERFILE - BACKEND FASTAPI
# ============================================
#
# Build: docker build -t portafolio-api .
# Run:   docker run -p 8000:8000 portafolio-api
# ============================================

# ===========================
# STAGE 1: Builder
# ===========================
FROM python:3.12-slim as builder

# Variáveis de build
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

WORKDIR /build

# Instalar dependências do sistema
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Copiar e instalar dependências Python
COPY requirements.txt .
RUN pip install --user -r requirements.txt

# ===========================
# STAGE 2: Runtime
# ===========================
FROM python:3.12-slim

# Metadados
LABEL maintainer="seuemail@exemplo.com"
LABEL description="API FastAPI para Portfólio Profissional"
LABEL version="1.0.0"

# Variáveis de ambiente
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    AMBIENTE=producao \
    API_HOST=0.0.0.0 \
    API_PORT=8000

# Criar usuário não-root para segurança
RUN useradd -m -u 1000 appuser && \
    mkdir -p /app && \
    chown -R appuser:appuser /app

WORKDIR /app

# Copiar dependências do stage builder
COPY --from=builder --chown=appuser:appuser /root/.local /home/appuser/.local

# Adicionar local bin ao PATH
ENV PATH=/home/appuser/.local/bin:$PATH

# Copiar código da aplicação
COPY --chown=appuser:appuser app/ ./app/
COPY --chown=appuser:appuser dados/ ./dados/
COPY --chown=appuser:appuser alembic/ ./alembic/
COPY --chown=appuser:appuser alembic.ini .

# Mudar para usuário não-root
USER appuser

# Expor porta
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8000/saude')"

# Comando de inicialización: Migrar y luego Arrancar
CMD python -m alembic upgrade head && uvicorn app.principal:app --host 0.0.0.0 --port 8000 --workers 2
