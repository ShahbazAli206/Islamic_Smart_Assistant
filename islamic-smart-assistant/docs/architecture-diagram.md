# Architecture Diagram (Text Form)

```
                          ┌───────────────────────────────────────────────────────────┐
                          │                       USERS                                │
                          │                                                            │
   ┌──────────────┐    ┌──┴──────────┐   ┌─────────────┐   ┌──────────────┐           │
   │ Alexa Echo   │    │ React Native│   │ Next.js Web │   │ Electron     │           │
   │ Google Home  │    │ Mobile App  │   │ Dashboard   │   │ Desktop App  │           │
   └──────┬───────┘    └──────┬──────┘   └──────┬──────┘   └──────┬───────┘           │
          │                   │                  │                  │                   │
          │ HTTP (linked)     │ HTTPS + WSS      │ HTTPS + WSS      │ HTTPS + WSS       │
          ▼                   ▼                  ▼                  ▼                   │
   ┌──────────────────────────────────────────────────────────────────────────┐         │
   │                        EDGE / INGRESS                                     │         │
   │              (Nginx-Ingress + cert-manager + sticky WS)                   │         │
   └─────────────────────────────┬────────────────────────────────────────────┘         │
                                 │                                                       │
                  ┌──────────────┴──────────────┐                                        │
                  ▼                             ▼                                        │
   ┌─────────────────────────┐    ┌─────────────────────────┐                            │
   │  backend-api (Deploy)   │    │  backend-worker (Deploy)│                            │
   │  3+ replicas (HPA)      │    │  2+ replicas (KEDA)     │                            │
   │  - NestJS HTTP + WS     │    │  - AzanWorker           │                            │
   │  - Modules:             │    │  - QuranWorker          │                            │
   │    auth, users,         │    │  - DailyRolloverCron    │                            │
   │    prayer, azan, quran, │    │                         │                            │
   │    devices, sync,       │    │                         │                            │
   │    scheduling, notif    │    │                         │                            │
   └──────┬──────────┬───────┘    └─────────┬───────────────┘                            │
          │          │                       │                                            │
          │   ┌──────┴──────┐                │                                            │
          │   ▼             ▼                ▼                                            │
   ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐                │
   │  PostgreSQL  │  │  Redis       │  │  Redis BullMQ│  │  S3 / R2     │                │
   │  (managed)   │  │  pub/sub +   │  │  delayed     │  │  audio packs │                │
   │  RDS / CSQL  │  │  ws-adapter  │  │  job sets    │  │  CDN          │                │
   └──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘                │
                                                                                          │
   ┌──────────────────────────────────────────────────────────────────────┐                │
   │                  EXTERNAL INTEGRATIONS                                │                │
   │  FCM (Android push) | APNS (iOS push) | OAuth (Google, Apple)         │                │
   │  Alexa Skills Kit   | Google Actions  | IP-Geolocation provider       │                │
   └──────────────────────────────────────────────────────────────────────┘                │
                                                                                          │
   ┌──────────────────────────────────────────────────────────────────────┐                │
   │                  OBSERVABILITY                                        │                │
   │  Prometheus + Grafana | Loki (logs) | Sentry (errors) | OpenTelemetry │                │
   └──────────────────────────────────────────────────────────────────────┘                │
                                                                                          │
                                                                                          ┘
```

## Component responsibilities

- **Edge**: TLS termination, rate limiting (`limit_req` zone per IP), sticky cookie for WS path.
- **backend-api**: Stateless. Handles REST + WebSocket. Behind HPA scaling on CPU.
- **backend-worker**: Stateless. Pulls from BullMQ. Scales on queue depth via KEDA.
- **PostgreSQL**: Source of truth for all persistent state. Schema in `db/schema.sql`. Single primary, read replicas in larger deployments.
- **Redis**: Three roles — pub/sub for cross-pod broadcast, Socket.IO adapter, and BullMQ backing store. For >10k req/s, split into separate Redis clusters per role.
- **Object storage**: Audio assets, signed-URL delivery via CloudFront / R2 public buckets.
