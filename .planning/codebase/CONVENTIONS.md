# Coding Conventions

## Language & Framework
- **TypeScript**: Strict typing is preferred. Use `interface` or `type` for data structures.
- **Next.js**: App Router (Server & Client components). Use Server Actions for mutations.

## Code Style
- **Indentation**: 2 spaces.
- **Naming**: 
  - PascalCase for components and classes.
  - camelCase for functions and variables.
  - UPPER_SNAKE_CASE for constants.
- **Documentation**: JSDoc blocks for all exported functions and complex logic.
- **Sectioning**: Use `// ── Section Name ──` for major logical blocks within files.

## Patterns
- **Error Handling**: 
  - Use `try/catch` with `unknown` type in catch blocks.
  - Provide descriptive error messages.
  - Throw errors rather than returning null for exceptional cases.
- **API Calls**: 
  - Use `AbortController` with timeouts for network requests.
  - Prefer `Promise.allSettled` for parallel requests to ensure partial success.
- **Singletons**: Use global-preserving singletons (e.g., `src/lib/mongodb.ts`) to survive HMR in dev mode.

## Components
- **Client Components**: Mark with `"use client"` at the top.
- **Icons**: Use `lucide-react`.
- **Animations**: Use `framer-motion`.
