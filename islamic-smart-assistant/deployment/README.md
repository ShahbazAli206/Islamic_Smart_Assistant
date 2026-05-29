# Deployment

## Local development

```bash
docker compose up -d
```

Backend on http://localhost:4000 (Swagger at /docs), web on http://localhost:3000.

## Production: Kubernetes

The k8s/ directory contains a minimal cluster setup. Edit `values.env` and apply:

```bash
kubectl apply -k deployment/k8s/
```

Components:

- **backend-api** deployment (3 replicas) — REST + WebSocket pods, behind a Service of type ClusterIP, fronted by an Ingress with TLS.
- **backend-worker** deployment (2 replicas) — BullMQ workers, no inbound traffic. Scale independently of API.
- **postgres** is referenced by a Secret (`postgres-creds`) — use managed RDS / Cloud SQL in real production, not in-cluster.
- **redis** ditto — use Elasticache / Memorystore.
- **web** deployment (2 replicas) — the Next.js dashboard.

### Sticky WS sessions

When you scale the API tier, the Ingress must use `nginx.ingress.kubernetes.io/affinity: "cookie"` for the `/v1/sync` path so a client reconnects to the same pod. (The Redis adapter handles cross-pod broadcasts; affinity is only to reduce reconnect noise.)

### Scaling Azan fan-out

When throughput crosses ~50k concurrent users, move the Azan/Quran workers into their own deployment with HPA on Redis queue depth (use [KEDA](https://keda.sh) with the `bullmq` scaler).

## CI/CD

`deployment/ci/github-actions.yml` runs on PR:

1. Lint + typecheck (`backend`, `web`, `mobile`).
2. Run backend Jest tests against an ephemeral Postgres container.
3. Build all Docker images.
4. On `main`: push images to GHCR, run `kubectl rollout restart` on the API deployment.

Mobile builds are handled separately:

- Android: GitHub Actions matrix → Gradle assembleRelease → upload to Play Store internal track via `gradle-play-publisher`.
- iOS: macOS runner → xcodebuild archive → upload to TestFlight via `xcrun altool`.

## Smart speaker deployments

These are **separate projects** that live outside this monorepo because they're tied to platform-specific developer accounts.

- **Alexa Skill** — host the handler on AWS Lambda; configure the skill in the Alexa Developer Console; certify before launch. It hits our `/v1` API with the user's linked token.
- **Google Action** — host the webhook on Cloud Run; configure in Actions Console; review before launch.
- Both flows use OAuth account linking with the same `/auth/oauth/{provider}` endpoints used by mobile.
