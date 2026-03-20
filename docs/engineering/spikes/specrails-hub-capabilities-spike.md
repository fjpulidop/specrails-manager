# Technical Spike: specrails-hub Standalone Capabilities and Agent Orchestration Gaps

**Autor:** Hub Engineer
**Fecha:** 2026-03-20
**Tarea:** SPEA-80
**Input para:** PRD — Agent Orchestration Protocol (P1 Q2 2026)

---

## 1. Auditoría de estado actual

### 1.1 Express API — Rutas activas

#### Hub-level (`/api/hub/*`)

| Método | Ruta | Descripción |
|--------|------|-------------|
| `GET`  | `/api/hub/projects` | Listar proyectos registrados |
| `POST` | `/api/hub/projects` | Registrar un nuevo proyecto por path |
| `DELETE` | `/api/hub/projects/:id` | Eliminar proyecto del registro |
| `GET`  | `/api/hub/state` | Estado general del hub |
| `GET`  | `/api/hub/resolve?path=` | Resolver proyecto por path de filesystem |
| `GET`  | `/api/hub/settings` | Leer settings del hub (port, specrailsTechUrl) |
| `PUT`  | `/api/hub/settings` | Actualizar settings del hub |
| `GET`  | `/api/hub/specrails-tech/status` | Health check proxy → specrails-tech |
| `GET`  | `/api/hub/specrails-tech/agents` | Lista de agentes (proxy) |
| `GET`  | `/api/hub/specrails-tech/docs` | Lista de docs (proxy) |

#### Per-project (`/api/projects/:projectId/*`)

| Grupo | Rutas |
|-------|-------|
| **Queue/Spawn** | `POST /spawn`, `GET /state`, `GET /queue`, `POST /queue/pause`, `POST /queue/resume`, `PUT /queue/reorder` |
| **Jobs** | `GET /jobs`, `GET /jobs/:id`, `DELETE /jobs/:id`, `DELETE /jobs` (purge) |
| **Analytics** | `GET /stats`, `GET /analytics?period=` |
| **Config** | `GET /config`, `POST /config` |
| **Issues** | `GET /issues` (GitHub/Jira) |
| **Chat** | CRUD `/chat/conversations/*`, streaming via WS |
| **Setup wizard** | `POST /setup/install`, `POST /setup/start`, `POST /setup/message`, `GET /setup/checkpoints`, `POST /setup/abort` |
| **Proposals** | `GET/POST /propose`, `GET/POST /propose/:id`, `POST /propose/:id/refine`, `POST /propose/:id/create-issue`, `DELETE /propose/:id` |
| **Hooks** | `POST /hooks/events`, `GET /hooks/phases`, `GET /hooks/phases/definitions` |

#### Otros

- `GET /api/docs/*` — portal de documentación local (markdown)
- Legacy single-project mode (vía `--legacy`): todas las rutas bajo `/api/` sin `:projectId`

---

### 1.2 WebSocket — Mensajes soportados

Conexión única (`ws://localhost:4200`). Todos los mensajes incluyen `timestamp`; los mensajes de proyecto incluyen `projectId`.

**Hub-level (broadcast a todos los clientes):**

| Tipo | Disparado por |
|------|---------------|
| `hub.projects` | On WS connect — estado inicial de todos los proyectos |
| `hub.project_added` | `POST /api/hub/projects` |
| `hub.project_removed` | `DELETE /api/hub/projects/:id` |

**Por proyecto:**

| Tipo | Descripción |
|------|-------------|
| `init` | Estado inicial al conectar (modo legacy) |
| `log` | Línea de stdout/stderr del proceso Claude |
| `phase` | Cambio de fase (Architect / Developer / Reviewer / Ship) |
| `queue` | Cambio en la cola de trabajos |
| `event` | Evento JSON del Claude CLI (tool calls, results, etc.) |
| `chat_stream` | Delta de texto del stream de chat |
| `chat_done` | Mensaje completo de chat finalizado |
| `chat_error` | Error en conversación de chat |
| `chat_command_proposal` | Claude propone ejecutar un comando |
| `chat_title_update` | Actualización de título de conversación |
| `setup_log` | Log durante instalación de specrails-core |
| `setup_checkpoint` | Progreso de checkpoint del setup wizard |
| `setup_chat` | Mensaje de la conversación /setup |
| `setup_install_done` | Instalación de specrails-core completada |
| `setup_complete` | Setup wizard completado |
| `setup_error` | Error durante el setup |
| `setup_turn_done` | Turno del setup chat terminado |
| `proposal_stream` | Delta de exploración de propuesta |
| `proposal_ready` | Propuesta lista para review |
| `proposal_refined` | Propuesta refinada con feedback |
| `proposal_issue_created` | GitHub Issue creado desde propuesta |
| `proposal_error` | Error en flujo de propuesta |

**Total: 21 tipos de mensajes WS.**

---

### 1.3 SQLite — Esquema actual

#### `~/.specrails/hub.sqlite` (hub global)

```sql
projects         -- id, slug, name, path, db_path, added_at, last_seen_at
hub_settings     -- key, value (port, specrails_tech_url)
schema_migrations
```

#### `~/.specrails/projects/<slug>/jobs.sqlite` (por proyecto)

```sql
jobs             -- id, command, status, started_at, finished_at,
                 -- tokens_in/out/cache, total_cost_usd, num_turns,
                 -- model, duration_ms, duration_api_ms, session_id,
                 -- queue_position
events           -- id, job_id, seq, event_type, source, payload, timestamp
job_phases       -- job_id, phase, state, updated_at
queue_state      -- key/value (config.active_tracker, config.label_filter,
                 -- queue.paused, queue.jobs)
chat_conversations -- id, title, model, session_id, created_at, updated_at
chat_messages    -- id, conversation_id, role, content, created_at
proposals        -- id, idea, session_id, status, result_markdown, issue_url,
                 -- created_at, updated_at
schema_migrations
```

**Total: 9 tablas, completamente local, sin red.**

---

### 1.4 Dashboard UI — Features existentes

| Feature | Dónde |
|---------|-------|
| Tab bar multi-proyecto (hasta N proyectos) | App shell |
| Route memory por proyecto (recuerda última pestaña) | App shell |
| Welcome screen + add-project dialog | Hub mode |
| Setup wizard 5 fases (install → chat → complete) | Hub mode |
| Command grid (trigger `/sr:*` commands) | Dashboard |
| Recent jobs list (jobs + proposals mezclados) | Dashboard |
| Implement wizard (flujo issue → comando) | Dashboard |
| Batch implement wizard (múltiples issues) | Dashboard |
| Feature proposal modal (AI-assisted) | Dashboard |
| Log viewer en tiempo real (WS streaming) | Project layout |
| Pipeline progress tracker (fases) | Project layout |
| Chat sidebar (conversaciones Claude) | Project layout |
| Job detail page (events, tokens, coste) | `/jobs/:id` |
| Analytics page (KPIs, gráficos, histogramas) | `/analytics` |
| Settings page por proyecto (tracker, labels) | `/settings` |
| Global settings modal (port, specrails-tech URL) | Hub settings |
| Docs portal (`/docs`) | Hub/legacy |
| Stale-while-revalidate cache por proyecto | Todas las páginas |

---

## 2. Gap Analysis — Agent Orchestration Protocol

### Gap 1: Sin modelo de agente — solo hay "trabajos"

**Situación actual:** El hub rastrea `jobs` (ejecuciones del proceso `claude`) identificados por el comando que se ejecutó. No existe ninguna entidad "agente" en la base de datos. Cuando el Job Detail muestra "quien hizo esto", solo puede mostrar el comando, no el agente.

**Impacto para Agent Orchestration:**
- Imposible asignar un trabajo a un agente específico
- Imposible rastrear el estado (idle/busy/error) de cada agente individual
- Los dashboards de agentes no tienen fuente de datos local

**Solución técnica necesaria:** Nueva tabla `agents` en `hub.sqlite`:
```sql
agents (
  id TEXT PRIMARY KEY,
  slug TEXT UNIQUE,
  name TEXT,
  role TEXT,
  status TEXT DEFAULT 'idle',  -- idle|busy|error
  current_job_id TEXT,
  last_heartbeat_at TEXT,
  config JSON
)
```
**Complejidad estimada:** Media (1–2 días). No requiere cambios en las tablas de jobs.

---

### Gap 2: Sin coordinación cross-project — silos completos

**Situación actual:** Cada proyecto tiene su propia `QueueManager` aislada. No existe ninguna vista hub-level de "qué está corriendo en este momento en todos los proyectos". El hub puede iniciar 5 procesos Claude simultáneamente en 5 proyectos sin throttle global.

**Impacto para Agent Orchestration:**
- Sin límite global de concurrencia → riesgo de saturar recursos (CPU/memoria/rate limits de Anthropic)
- Sin vista cross-project de actividad en el dashboard
- Los agentes no pueden conocer el estado de otros agentes en otros proyectos

**Solución técnica necesaria:**
1. `GET /api/hub/jobs` — endpoint que agrega jobs activos de todos los proyectos
2. `HubQueueCoordinator` — componente que imponga un límite configurable de procesos Claude paralelos (default: 3)
3. WS message `hub.jobs_update` — broadcast hub-level cuando cambia cualquier job en cualquier proyecto

**Complejidad estimada:** Alta (3–5 días). Requiere refactor de `ProjectRegistry` para coordinar `QueueManager` instances.

---

### Gap 3: Sin protocolo de comunicación inter-agente

**Situación actual:** El sistema de hooks (`/hooks/events`) permite que Claude CLI notifique al hub sobre cambios de fase. Pero no existe ningún mecanismo para que un agente notifique o llame a otro agente. Cada proceso Claude es completamente independiente.

**Impacto para Agent Orchestration:**
- La cadena Architect → Developer → Reviewer debe coordinarse externamente (hoy: manualmente o vía comandos separados)
- No hay handoff automático: cuando el Architect termina, el Developer no arranca automáticamente
- No hay manera de que un agente bloquee esperando input de otro

**Solución técnica necesaria:**
1. Tabla `agent_signals` en hub.sqlite: permite a un job publicar un evento tipado (`phase_complete`, `handoff_ready`, etc.)
2. `GET /api/hub/signals?agentId=&since=` — polling endpoint para que agentes lean señales
3. `POST /api/hub/signals` — endpoint para publicar señales
4. Opcional: WS message `hub.agent_signal` para push en tiempo real

**Complejidad estimada:** Media (2–3 días). No requiere cambios en el CLI ni en `QueueManager`.

---

### Gap 4: Sin hub-level analytics (métricas cross-project)

**Situación actual:** La página de Analytics existe y es rica en datos (KPIs, histogramas, token efficiency), pero es **estrictamente por proyecto**. No existe ninguna vista hub-level de coste total, throughput o tasa de éxito agregados.

**Impacto para Metrics Dashboard v1:**
- El CEO/manager no puede ver "cuánto costó toda la semana en todos los proyectos"
- No se puede comparar el rendimiento entre proyectos
- Los modelos utilizados no se pueden analizar globalmente

**Solución técnica necesaria:**
1. `GET /api/hub/analytics?period=` — endpoint que hace JOIN cross-project de las tablas `jobs`
2. Nuevo componente `HubAnalyticsPage` (ruta `/hub/analytics`) con métricas agregadas
3. Extender `GET /api/hub/state` para incluir stats rápidas (jobs hoy, coste hoy)

**Complejidad estimada:** Baja-media (1–2 días). El modelo de datos ya existe en cada `jobs.sqlite`; solo falta agregarlos.

---

### Gap 5: Sin persistencia de conversaciones de setup entre reinicios

**Situación actual:** El setup wizard almacena el `sessionId` de Claude en memoria (en `SetupManager`). Si el servidor se reinicia durante el setup de un proyecto, la conversación se pierde y el wizard debe empezar de cero.

**Impacto:** Experiencia mala al reiniciar el servidor; puede confundir al usuario.

**Solución:** Persisitir `setup_session_id` en `hub.sqlite` por proyecto. Ya existe la infraestructura (`hub_settings`).

**Complejidad estimada:** Muy baja (horas).

---

## 3. Propuesta técnica — Qué construir primero

### Priorización

| # | Feature | Impacto | Complejidad | Depende de |
|---|---------|---------|-------------|------------|
| 1 | **Agent Registry** (tabla `agents` + CRUD) | Alto | Medio | — |
| 2 | **Hub-level analytics** (`/api/hub/analytics`) | Alto | Bajo | — |
| 3 | **Hub-level jobs view** (`/api/hub/jobs`) | Medio | Medio | — |
| 4 | **Inter-agent signals** (`agent_signals`) | Alto | Medio | Agent Registry |
| 5 | **Global concurrency throttle** | Medio | Alto | Hub jobs view |
| 6 | **Setup session persistence** | Bajo | Muy bajo | — |

### Orden de construcción recomendado

**Fase 1 — Visibilidad (sin cambios en QueueManager):**
- Agent Registry + API CRUD
- Hub-level analytics endpoint + UI page
- Extensión de `/api/hub/state` con stats rápidas

**Fase 2 — Coordinación:**
- Hub-level jobs view (cross-project)
- Inter-agent signals (polling)
- WS push para `hub.jobs_update`

**Fase 3 — Control:**
- Global concurrency throttle en `ProjectRegistry`
- Setup session persistence

### Dependencias técnicas / riesgos

1. **Riesgo de contención en SQLite:** Para hub-level analytics, el server leerá múltiples `jobs.sqlite` simultáneamente. Better-sqlite3 es síncrono, así que con muchos proyectos esto puede bloquear el event loop. Solución: Workers o lectura lazy con paginación.

2. **Riesgo de backcompat con el CLI:** Si modificamos el protocolo de hooks para soportar señales inter-agente, necesitamos asegurar que versiones antiguas de `specrails-core` no rompan. El hub debe ser tolerante a campos desconocidos.

3. **Modelo de permisos pendiente:** El PRD de Agent Orchestration necesita definir si los agentes tienen permisos diferenciados o si todos son iguales. El hub actualmente no tiene autenticación (localhost-only), lo que simplifica v1 pero necesita revisarse para multi-user.

### Estimación global (Fase 1 + 2)

| Fase | Esfuerzo estimado |
|------|-------------------|
| Fase 1 (Visibilidad) | 4–5 días |
| Fase 2 (Coordinación) | 4–6 días |
| Fase 3 (Control) | 3–4 días |
| **Total** | **11–15 días de ingeniería** |

---

## 4. Conclusión

specrails-hub tiene una base sólida: multi-proyecto, WebSocket en tiempo real, analytics por proyecto, y un modelo de datos limpio en SQLite. Los 5 gaps identificados no son deudas técnicas — son ausencias de features que no se necesitaban antes de que el roadmap incorporara "Agent Orchestration".

La inversión prioritaria es **visibilidad cross-project** (Fase 1): el Agent Registry y el hub-level analytics son features de alto impacto que no requieren romper nada existente. Una vez que el hub puede responder "qué está haciendo cada agente en cada proyecto", la base para coordinarlos está puesta.

*Este documento es pre-PRD discovery. Las estimaciones de complejidad asumen familiaridad completa con el codebase.*
