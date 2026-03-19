# Microservice Feature Inventory

This document summarizes features confirmed in the current `manager/microservices` codebase.

## How this was compiled

The inventory below is based on:

- `docker-compose.yml`
- public and internal controller classes in each backend service
- selected service and scheduler classes where background behavior matters
- Angular route definitions for the frontend

Only features with visible routes, gateway wiring, internal service endpoints, or clearly wired background jobs were counted. Generated DTOs or frontend API models without matching backend routes were not treated as implemented features.

## Infrastructure and edge services

### `eureka-server` (`8761`)

Role: service discovery registry for the Spring microservices.

Confirmed responsibilities:

- Runs as the central Eureka registry.
- Lets other services register and discover each other by service name.
- Operates as a standalone registry and does not register itself or fetch an external registry.

### `config-server` (`8888`)

Role: centralized configuration delivery.

Confirmed responsibilities:

- Serves configuration from the embedded native `config-repo`.
- Provides shared and service-specific configuration for:
  - `api-gateway`
  - `ai-service`
  - `generator-service`
  - `notification-service`
  - `security-service`
  - `user-service`
  - `vault-service`
- Registers with Eureka so other services can locate it.

### `api-gateway` (`8080`)

Role: single entry point for the backend.

Confirmed responsibilities:

- Routes traffic to `user-service`, `vault-service`, `generator-service`, `security-service`, `notification-service`, and `ai-service`.
- Leaves `/api/auth/**` public for registration, login, and token refresh flows.
- Enforces JWT validation on protected routes.
- Adds downstream identity headers:
  - `X-User-Name`
  - `X-Is-Duress`
- Applies IP-based rate limiting:
  - `10` requests/minute for `/api/auth/**`
  - `60` requests/minute for other routes
- Exposes health/info actuator endpoints.

Current routing note:

- The gateway currently protects all `/api/shares/**` routes with `JwtAuthFilter`, even though `vault-service` contains a token-based share retrieval endpoint intended to be public.

## Business microservices

### `user-service` (`8081`)

Role: identity, authentication, account, and user preferences.

Confirmed features:

- User registration.
- Email verification with OTP and resend-verification flow.
- Login, logout, refresh-token, and token validation.
- CAPTCHA enforcement for risky login attempts.
- Adaptive authentication with risk scoring based on device, IP, time, and recent failures.
- OTP email delivery for verification and risky-login flows.
- Two-factor authentication:
  - status check
  - setup
  - verify setup
  - disable
  - backup code retrieval
  - backup code regeneration
- Password recovery:
  - forgot-password initiation
  - security-question verification
  - password reset
- Security question retrieval and update.
- Password hint retrieval and update.
- Master-password re-verification for sensitive actions.
- Duress password setup and duress login flow.
- Failed-login tracking, new-device/new-location alerts, and account lockout behavior.
- Session management:
  - list active sessions
  - get current session
  - extend session
  - terminate one session
  - terminate all sessions
- User profile read and update.
- Master password change.
- Dashboard tile counts by calling `vault-service` internal stats.
- Read-only mode toggle in user settings.
- User settings read/update endpoint.
- Account deletion scheduling, cancellation, and scheduled cleanup.
- Internal endpoints for other services to fetch user lookup and vault crypto details:
  - username/email lookup
  - user id lookup
  - master password hash
  - salt
  - 2FA status
  - TOTP secret for downstream verification

### `vault-service` (`8082`)

Role: secure vault storage, organization, sharing, backup, and vault activity analytics.

Confirmed features:

- Vault entry CRUD for passwords, notes, and secure data.
- Search, filter, and sort vault entries.
- Recent and recently used entry views.
- Favorites management.
- Bulk delete to trash.
- Password reveal endpoint for a vault entry.
- Sensitive-entry mode and extra verification flow for highly sensitive entry access.
- Password history and snapshot history per entry.
- Soft delete and trash management:
  - list trash
  - trash count
  - restore one item
  - restore all
  - permanently delete one
  - empty trash
- Scheduled cleanup of expired trash entries every day.
- Category management:
  - list
  - get by id
  - create
  - update
  - delete
  - list entries in category
- Folder management:
  - list
  - get by id
  - create
  - rename
  - move in hierarchy
  - delete
  - list entries in folder
- Secure sharing:
  - create encrypted, time-limited shares
  - fetch share by token
  - list active shares
  - list received shares
  - revoke share
  - track view count and expiry
  - audit sharing actions
  - create recipient notifications
- Scheduled cleanup of expired shares every hour.
- Backup and restore:
  - export vault
  - export preview
  - import vault
  - validate import payload
  - restore snapshots
  - list snapshots
- Third-party import support via importers for:
  - `Chrome`
  - `Firefox`
  - `LastPass`
  - `1Password`
- Vault timeline analytics:
  - full timeline
  - timeline summary
  - per-entry timeline
  - timeline stats
  - access heatmap
- Internal endpoints for other services:
  - decrypted vault entries for `security-service` analysis
  - dashboard counts for `user-service`
- Security and notification integration on vault operations:
  - audit logs for create/update/delete/view/share events
  - notification creation for vault activity
  - password analysis trigger after vault changes

### `generator-service` (`8083`)

Role: password generation and strength evaluation.

Confirmed features:

- Generate a single password from requested rules.
- Generate multiple passwords in one request.
- Check password strength.
- Validate password quality using the same analysis path.
- Return default generator settings.

### `security-service` (`8084`)

Role: security reporting, alerting, audit history, and vault password analysis.

Confirmed features:

- Audit log retrieval.
- Login history retrieval.
- Security alert list.
- Mark alert as read.
- Delete alert.
- Security audit report generation.
- Weak password report.
- Reused password report.
- Old password report.
- Dashboard metrics:
  - security score
  - password health
  - reused-password breakdown
  - password age distribution
  - trend data
  - weak-password detail list
  - old-password detail list
- Internal audit endpoint for vault activity events from `vault-service`.
- Internal password-analysis endpoint for vault entry changes from `vault-service`.
- Internal audit and alert endpoints for auth/account activity from `user-service`.
- Persistence of password-analysis data and security-metric history snapshots.
- Local rate-limit utility class for auth/general request counting.

### `notification-service` (`8085`)

Role: in-app notification feed.

Confirmed features:

- List notifications for the authenticated user.
- Get unread notification count.
- Mark one notification as read.
- Mark all notifications as read.
- Delete a notification.
- Internal notification creation endpoint used by other services.
- User-resolution lookup through `user-service` before persisting notifications.

### `ai-service` (`8086`)

Role: LLM-backed AI features.

Confirmed features:

- AI provider health check endpoint.
- Password analysis using an LLM, returning:
  - strength rating
  - vulnerabilities
  - improvement suggestions
- Smart vault-entry categorization using an LLM, returning:
  - suggested category
  - tags
  - confidence score
- Security chatbot for password/security questions.
- Optional password generation inside chatbot responses when the user asks for one.
- Provider abstraction layer for configurable LLM backends.

## Frontend container

### `frontend` (`80`)

Role: Angular user interface served as the web client.

Confirmed routed features:

- Public pages:
  - landing page
  - login
  - registration
  - forgot password
  - share access by token
- Authenticated pages:
  - dashboard
  - vault
  - profile/account settings
  - security settings
  - preferences settings
  - session settings
  - audit logs
  - security alerts
  - backup export
  - backup import
  - backup snapshots
  - AI password analyzer
- Uses route guards for guest-only and authenticated-only navigation.

## Supporting data services

### `mysql`

Role: primary relational data store for the application services.

### `redis`

Role: cache/data-store dependency configured for the microservices stack, especially `user-service`.

## Summary by service count

- Infrastructure and edge services: `3`
- Business microservices: `6`
- Frontend container: `1`
- Supporting data services: `2`

Total runtime containers defined in `docker-compose.yml`: `11`
