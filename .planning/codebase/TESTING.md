# Testing Strategy

## Current State
- **Automated Tests**: None currently implemented.
- **Manual Verification**: Features are verified manually through the UI and by monitoring server logs during development.
- **Build Verification**: `npx tsc --noEmit` is used to ensure type safety before deployment/completion.

## Planned Infrastructure
- **Unit Testing**: Vitest or Jest for utility functions (`encryption.ts`, `rate-limit.ts`).
- **Component Testing**: React Testing Library for core dashboard components.
- **E2E Testing**: Playwright for the onboarding flow and live streaming pipeline.

## Verification Patterns
- **API Tests**: Use `curl` or browser-based testing for REST endpoints.
- **WebSocket Tests**: Use custom test scripts or the integrated `obs-relay-client.ts` to monitor message flows.
- **Sarvam AI**: Validated using real API keys with small audio chunks during integration phases.
