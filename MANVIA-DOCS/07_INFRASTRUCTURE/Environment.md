# MANVIA — Environment & Secrets Specification (M8)

## 1. Environment Separation Strategy

MANVIA defines three distinct runtime environments:

| Environment | Purpose | Database | Providers | Mock Policy |
| :--- | :--- | :--- | :--- | :--- |
| **Development** | Local feature iteration | Local PostgreSQL (port 5432) | Simulated / Local Storage | Allowed for offline work |
| **Staging** | Pre-release release validation | Cloud SQL Staging | Sandbox / Test keys (Razorpay Test, Twilio Test) | Mocks prohibited for primary flows |
| **Production** | Live clinical & patient operations | Cloud SQL Production (HA) | Real Live Providers (Razorpay Live, Resend Live, FCM) | **STRICTLY PROHIBITED** |

---

## 2. Categorized Environment Variable Specification

### 2.1 INFRASTRUCTURE & RUNTIME
| Variable | Category | Allowed Values | Production Required | Description |
| :--- | :--- | :--- | :--- | :--- |
| `NODE_ENV` | INFRASTRUCTURE | `development`, `staging`, `production`, `test` | YES | Configures runtime optimizations and security strictness |
| `PORT` | INFRASTRUCTURE | Integer (e.g. `3000`) | YES | Application listening port |
| `HOST` | INFRASTRUCTURE | String (e.g. `0.0.0.0`) | YES | Bind interface |
| `API_PREFIX` | INFRASTRUCTURE | String (e.g. `api/v1`) | YES | Global API route prefix |
| `LOG_LEVEL` | INFRASTRUCTURE | `trace`, `debug`, `info`, `warn`, `error`, `fatal` | YES | Pino log level (set to `info` in production) |
| `CORS_ALLOWED_ORIGINS` | INFRASTRUCTURE | Comma-separated URLs | YES | Explicit origin allowlist (wildcards prohibited) |

### 2.2 DATABASE
| Variable | Category | Description |
| :--- | :--- | :--- |
| `DATABASE_URL` | SERVER_SECRET | PostgreSQL connection string (`postgresql://user:pass@host:port/dbname?sslmode=require`) |
| `DATABASE_POOL_MIN` | DATABASE | Minimum connection pool size (default: 2) |
| `DATABASE_POOL_MAX` | DATABASE | Maximum connection pool size (default: 20) |

### 2.3 REDIS
| Variable | Category | Description |
| :--- | :--- | :--- |
| `REDIS_URL` | SERVER_SECRET | Redis connection string (`redis://:password@host:6379` or `rediss://` for TLS) |
| `REDIS_KEY_PREFIX` | INFRASTRUCTURE | Namespace prefix for Redis keys (e.g. `manvia:prod:`) |
| `REDIS_PASSWORD` | SERVER_SECRET | Password for authenticated Redis instances |

### 2.4 AUTH & SECURITY
| Variable | Category | Description |
| :--- | :--- | :--- |
| `JWT_SECRET` | SERVER_SECRET | HMAC secret for signing access tokens (>= 32 characters, cryptographically random) |
| `JWT_ACCESS_EXPIRATION` | AUTH | Duration for access token validity (e.g. `15m`) |
| `JWT_REFRESH_SECRET` | SERVER_SECRET | HMAC secret for signing refresh tokens (>= 32 characters, unique from JWT_SECRET) |
| `JWT_REFRESH_EXPIRATION` | AUTH | Duration for refresh token validity (e.g. `30d`) |

### 2.5 STORAGE
| Variable | Category | Description |
| :--- | :--- | :--- |
| `STORAGE_DRIVER` | STORAGE | `s3`, `minio`, `r2`, `gcs`, or `local` |
| `STORAGE_BUCKET` | STORAGE | Dedicated private object storage bucket name |
| `STORAGE_REGION` | STORAGE | Cloud region (e.g. `ap-south-1`, `us-east-1`) |
| `STORAGE_ENDPOINT` | STORAGE | S3-compatible endpoint (optional for AWS S3, required for MinIO / Cloudflare R2) |
| `STORAGE_ACCESS_KEY` | SERVER_SECRET | Cloud storage access key ID / service account key |
| `STORAGE_SECRET_KEY` | SERVER_SECRET | Cloud storage secret key |

### 2.6 PAYMENTS & PAYOUTS
| Variable | Category | Description |
| :--- | :--- | :--- |
| `PAYMENT_PROVIDER` | PAYMENTS | `razorpay` (production) or `simulated` (local dev) |
| `RAZORPAY_KEY_ID` | PAYMENTS / PUBLIC | Razorpay API Key ID (`rzp_live_...` or `rzp_test_...`) |
| `RAZORPAY_KEY_SECRET` | SERVER_SECRET | Razorpay API Key Secret (strictly private) |
| `RAZORPAY_WEBHOOK_SECRET`| SERVER_SECRET | HMAC secret used to verify Razorpay webhook signatures |

### 2.7 AI & MEDICAL RAG
| Variable | Category | Description |
| :--- | :--- | :--- |
| `AI_PROVIDER` | AI | `gemini` |
| `GEMINI_API_KEY` | SERVER_SECRET | Google Gemini AI API key |
| `GEMINI_MODEL` | AI | Foundation model (`gemini-3.8-flash`) |
| `AI_SAFETY_ENABLED` | AI | Boolean flag to enforce triage/safety classifier (must be `true`) |
| `AI_SAFETY_PROVIDER` | AI | Safety evaluation model provider (`gemini`) |
| `AI_SAFETY_MODEL` | AI | Safety classification model (`gemini-3.8-flash`) |
| `RAG_ENABLED` | AI | Boolean flag for pgvector medical context augmentation |
| `RAG_TOP_K` | AI | Number of retrieved clinical references (default: `5`) |
| `RAG_MIN_RELEVANCE` | AI | Minimum cosine similarity threshold (default: `0.70`) |
| `EMBEDDING_PROVIDER` | AI | Embedding model provider (`gemini`) |
| `EMBEDDING_MODEL` | AI | High-dimensional embedding model (`gemini-embedding-2`) |

### 2.8 REALTIME VOICE
| Variable | Category | Description |
| :--- | :--- | :--- |
| `REALTIME_PROVIDER` | REALTIME | `gemini` |
| `REALTIME_MODEL` | REALTIME | Realtime voice model (`gemini-3.8-live`) |

### 2.9 NOTIFICATIONS
| Variable | Category | Description |
| :--- | :--- | :--- |
| `EMAIL_PROVIDER` | NOTIFICATIONS | `resend` (production) or `simulated` (local dev) |
| `RESEND_API_KEY` | SERVER_SECRET | Resend transactional email API key |
| `EMAIL_FROM` | NOTIFICATIONS | Verified sender identity (`MANVIA Health <notifications@manvia.health>`) |
| `SMS_PROVIDER` | NOTIFICATIONS | `twilio` (production) or `simulated` (local dev) |
| `TWILIO_ACCOUNT_SID` | NOTIFICATIONS | Twilio Account SID |
| `TWILIO_AUTH_TOKEN` | SERVER_SECRET | Twilio Auth Token |
| `TWILIO_PHONE_NUMBER` | NOTIFICATIONS | Registered E.164 phone number for SMS dispatch |
| `PUSH_PROVIDER` | NOTIFICATIONS | `fcm` (production) or `simulated` (local dev) |
| `FIREBASE_PROJECT_ID` | NOTIFICATIONS | Firebase Project ID |
| `FIREBASE_CLIENT_EMAIL`| SERVER_SECRET | Firebase service account client email |
| `FIREBASE_PRIVATE_KEY` | SERVER_SECRET | Firebase service account private key |

### 2.10 MONITORING
| Variable | Category | Description |
| :--- | :--- | :--- |
| `SENTRY_DSN` | MONITORING | Sentry error tracking ingestion DSN |
| `SENTRY_AUTH_TOKEN` | SERVER_SECRET | Sentry release and source map upload token |
| `OTEL_SERVICE_NAME` | MONITORING | OpenTelemetry service name (`manvia-backend`) |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | MONITORING | OTLP telemetry collector endpoint |
| `OTEL_ENABLED` | MONITORING | Toggle for distributed tracing instrumentation |

### 2.11 FRONTEND PUBLIC CONFIGURATION
| Variable | Category | Description |
| :--- | :--- | :--- |
| `VITE_API_BASE_URL` | PUBLIC | Public API URL accessible from client browser |
| `VITE_BACKEND_URL` | PUBLIC | Base backend URL for health probes |
| `VITE_APP_ENV` | PUBLIC | Client environment badge (`production`, `staging`, `development`) |
| `VITE_APP_NAME` | PUBLIC | Brand title (`MANVIA`) |
