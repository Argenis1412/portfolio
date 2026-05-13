# Backend Security & Resilience Audit (FastAPI)

Date: 2026-05-12
Scope: `backend/app`, `backend/tests`, `backend/alembic`

## Hallazgos

| Categoría | Descripción del Hallazgo | Severidad | Recomendación de Mejora (con ejemplo) |
|---|---|---|---|
| Seguridad (OWASP A05: Security Misconfiguration) | **`TRUSTED_PROXY_DEPTH` por defecto = 1** y `get_client_ip()` confía en `X-Forwarded-For`/`X-Real-IP` sin validación criptográfica ni allowlist de proxy. Un atacante que llegue directo al backend podría falsificar IP para evadir rate limits. | Alta | En producción, confiar headers solo si `REMOTE_ADDR` pertenece a reverse proxies conocidos (Nginx/LB), o usar middleware de trusted hosts/proxies. Añadir validación: `if peer_ip not in TRUSTED_PROXIES: ignore x-forwarded-for`. |
| Seguridad / Disponibilidad | Rate limit y deduplicación hacen **fail-open** cuando Redis falla (`check_rate_limit` y `SpamDedupStore.reserve`). Durante caída de Redis, se desactiva protección anti-abuso y anti-duplicados. | Alta | Cambiar a estrategia híbrida: fail-closed para rutas sensibles (`/contact`) con umbral de emergencia por proceso. Ejemplo: si Redis falla en `/contact`, responder 503 o limitar en memoria con límite más estricto y alertar. |
| Seguridad (OWASP A07) | `ContactRequest.email` es `str` con min/max length, pero **sin validación de formato robusta** (`EmailStr` no usado). Esto permite entradas malformadas que pueden degradar reglas de negocio y trazabilidad. | Media | Cambiar a `EmailStr` en Pydantic v2 y normalizar dominio. Ejemplo: `from pydantic import EmailStr` y `email: EmailStr`. |
| Seguridad (OWASP A09 Logging) | `RequestMiddleware` registra query string completa (`query=str(request.url.query)`), potencialmente incluyendo tokens/PII en logs. | Alta | Redactar o bloquear parámetros sensibles (`token`, `key`, `email`, etc.) antes de loggear. |
| Seguridad (OWASP A05 / transporte) | `Strict-Transport-Security` se añade siempre, incluso si el backend se sirve por HTTP en entornos no TLS locales; no es crítico, pero puede causar comportamientos inconsistentes en testing. | Baja | Activar HSTS solo cuando request sea HTTPS o en producción detrás de TLS. |
| Rendimiento/Escalabilidad | `BackgroundTasks` para envío de correos no persiste en cola externa; si el worker reinicia tras responder 200, se puede perder mensaje en vuelo. | Alta | Migrar a cola durable (Redis Streams/Celery/RQ/SQS). Persistir job y estado antes de responder `queued`. |
| Rendimiento/Async correctness | Riesgo de I/O bloqueante si adaptadores de email usan cliente sync en función async (revisar implementación del adapter). La ruta de contacto depende de que el adapter sea verdaderamente async/no bloqueante. | Media | Verificar adapter con cliente async (`httpx.AsyncClient`) o ejecutar sync I/O en threadpool explícito. |
| Arquitectura/Clean Code | `dependencies.py` define `get_repository()` (SQL), pero casi todos casos de uso leen desde `JsonRepository`; hay divergencia entre arquitectura declarada y real, dificultando evolución y testing de consistencia de datos. | Media | Unificar read model (SQL o JSON) por bounded context, o introducir interfaz de configuración por entorno con contrato explícito. |
| Manejo de errores | Respuestas de error no son 100% consistentes: en duplicado de contacto se retorna `{"error": {"code": ...}, "detail": ...}` en controlador, mientras handlers globales usan `error.message/details`. | Media | Centralizar todos errores vía excepciones de dominio + handlers para uniformidad API. |
| Bugs lógicos / idempotencia | Idempotencia se marca `in_progress` y se finaliza en `finally`; si hay crash de proceso entre `set_in_progress` y `set`, puede quedar bloqueo hasta TTL (1h), devolviendo 409 a cliente en reintentos. | Media | Reducir TTL de lock o separar lock TTL corto (ej. 30s) y resultado TTL largo (1h). Añadir heartbeat/renewal opcional. |
| SPOF infraestructura | Redis es componente crítico para rate-limit/dedup/idempotencia compartida; sin Redis, cada worker cae a memoria local -> comportamiento inconsistente multi-instancia. | Crítica | Redis HA (Sentinel/Cluster), timeouts finos, retry budget y circuit breaker. Definir modo degradado explícito por endpoint. |
| SPOF infraestructura | No se observa message broker durable para contacto; un único proceso app actúa como “cola” con `BackgroundTasks`. | Alta | Introducir broker externo durable y consumidor separado; añadir DLQ y reintentos exponenciales. |
| DB/Conexiones | `SqlRepository` crea engine pero no se aprecia hook de shutdown para `engine.dispose()`. En despliegues con recargas/restarts frecuentes puede dejar conexiones colgantes temporalmente. | Media | Registrar evento `lifespan` en FastAPI para cerrar pool (`await engine.dispose()`) al apagar. |
| SQL Injection | No se detecta SQL dinámico inseguro en las rutas revisadas; uso predominante de SQLModel/`select` y `text("SELECT 1")` constante. | Baja | Mantener consultas parametrizadas y prohibir interpolación manual en `text()`. |
| Tests / cobertura | Existe suite amplia (`test_robustness`, `test_resilience`, e2e chaos), pero conviene reforzar casos de caída real de Redis + concurrencia multi-worker para verificar idempotencia/dedup/rate limit bajo partición. | Media | Agregar tests de estrés concurrente (N>100) con Redis down/up y validación de “at-most-once” por Idempotency-Key. |

## Prioridad recomendada (Top 5)
1. Endurecer confianza de IP/proxy para evitar evasión de rate limiting.
2. Eliminar fail-open en `/contact` para abusos cuando Redis falla.
3. Sustituir `BackgroundTasks` por cola durable para evitar pérdida de mensajes.
4. Resolver SPOF de Redis con HA y modo degradado controlado.
5. Unificar contrato de errores y validación robusta de email.

