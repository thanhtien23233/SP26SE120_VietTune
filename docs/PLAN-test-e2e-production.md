# PLAN - Test E2E All Production

## Phase -1: Context Check

### User Request
- Test E2E all production.

### Confirmed Inputs (Socratic Gate)
- Target environment: Production real domain.
- Test framework: Playwright.
- Release policy: Report only (does not block deploy).
- Required coverage:
  - Auth (login/logout/role guard)
  - Contributor workflow upload/submission
  - Researcher portal/search/filter/detail
  - Moderation/expert review
  - Smoke core pages/performance sanity

### Scope Boundaries
- This plan focuses on E2E production validation and reporting.
- No code changes in this phase.
- No backend schema/API redesign in this phase.

---

## Phase 0: Socratic Gate Outcomes

### Objective
- Provide a repeatable production E2E execution plan that validates core user journeys and outputs actionable reports.

### Success Criteria
- All planned suites run against production URL using Playwright config for prod.
- Results are published as report artifacts (HTML + machine-readable summary).
- Failures are triaged by severity and mapped to owner.
- Release continues (report-only), but critical failures are highlighted.

### Risks to Watch
- Production test data mutability and side effects.
- Flaky selectors/timing due to real network variance.
- Account/session conflicts when running parallel scenarios.
- Rate limiting or anti-bot protections.

---

## Phase 1: Inventory and Readiness

### Task Breakdown
1. Identify all existing E2E specs and map to required coverage buckets.
2. Verify production-safe test accounts per role:
   - Contributor
   - Researcher
   - Expert/Moderator
3. Confirm environment variable strategy for prod base URL and credentials source.
4. Define data safety rules:
   - Allowed writes
   - Cleanup expectations
   - Idempotent reruns
5. Confirm Playwright runtime setup for production execution profile.

### Deliverables
- Coverage matrix (suite -> feature -> role).
- Account + data readiness checklist.
- Production run profile definition.

### Agent Assignment
- QA Lead Agent: Coverage mapping and gap analysis.
- DevOps Agent: Runtime/env/artifact pipeline checks.
- Product/Domain Agent: Risk acceptance for production side effects.

---

## Phase 2: Suite Design for Production

### Test Suite Groups
- `smoke-prod`
  - Landing/header/nav
  - Core route availability
  - Basic API-backed page load checks
- `auth-prod`
  - Login valid/invalid
  - Role redirect correctness
  - Logout/session invalidation
- `contributor-prod`
  - Open upload flow
  - Submission creation path
  - Status visibility after submit
- `researcher-prod`
  - Search/filter interactions
  - Recording detail open/playback basic checks
  - Pagination/loading behavior sanity
- `moderation-prod`
  - Queue visibility
  - Open detail and moderate action path (safe mode/no destructive action unless approved)

### Prioritization
- P0: smoke, auth, open detail pages, core role access.
- P1: end-to-end role workflows with write actions.
- P2: non-critical UI/UX interaction checks.

### Execution Strategy
- Run smoke first; abort remaining only if environment unreachable.
- Run role suites in controlled parallelism to reduce account collision.
- Use retries only for known flaky categories; keep failure signals visible.

---

## Phase 3: Execution and Reporting

### Run Flow
1. Pre-flight check:
   - Production URL reachable
   - Credentials available
   - Playwright browsers ready
2. Execute suite groups in order:
   - smoke -> auth -> contributor -> researcher -> moderation
3. Collect artifacts:
   - Playwright HTML report
   - JUnit/JSON summary
   - Failure screenshots/videos/traces
4. Publish and notify:
   - Daily/triggered report to team channel
   - Failure summary by severity and owner

### Reporting Format
- Total tests, pass/fail, flaky count.
- Failures grouped by:
  - Severity (critical/high/medium)
  - Product area
  - Owner/team
- Recommended next action per failure.

---

## Phase 4: Triage and Stabilization Loop

### Triage Rules
- Critical path fail: raise immediate incident ticket.
- High severity fail: assign within same working day.
- Flaky suspect: tag and require second confirmation run.
- Known issue: link to existing tracker and mark expected until fixed.

### Stabilization Backlog
- Improve selectors for brittle elements.
- Add stable test hooks where needed.
- Refine test data seeding/isolation.
- Reduce non-deterministic waits.

---

## Phase X: Verification Checklist

- [ ] Production base URL is configured and validated.
- [ ] Production-safe credentials exist for all required roles.
- [ ] All five coverage groups are mapped to runnable specs.
- [ ] Run order and parallelism policy is documented.
- [ ] Artifact outputs are generated and accessible.
- [ ] Reporting template includes severity + owner mapping.
- [ ] Report-only release policy is explicitly documented.
- [ ] Triage workflow and SLA are agreed by team.

---

## Recommended Next Steps

1. Review this plan with QA + DevOps + Product owner.
2. Confirm production-safe write actions for contributor/moderation flows.
3. Start implementation/execution setup from this plan in the next command.
