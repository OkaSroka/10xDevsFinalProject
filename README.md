# 10x Astro Starter

A modern, opinionated starter template for building fast, accessible, and AI-friendly web applications.

## Tech Stack


- [Astro](https://astro.build/) v5.5.5 - Modern web framework for building fast, content-focused websites
- [React](https://react.dev/) v19.0.0 - UI library for building interactive components
- [TypeScript](https://www.typescriptlang.org/) v5 - Type-safe JavaScript
- [Tailwind CSS](https://tailwindcss.com/) v4.0.17 - Utility-first CSS framework

## Testing Stack

- **Unit & Integration Testing:** [Vitest](https://vitest.dev/)
- **End-to-End (E2E) Testing:** [Playwright](https://playwright.dev/)

- **Coverage Reporting:** [Codecov](https://about.codecov.io/) (integrated with CI)


## Prerequisites

- Node.js v22.14.0 (as specified in `.nvmrc`)
- npm (comes with Node.js)

## Getting Started

1. Clone the repository:

```bash
git clone https://github.com/przeprogramowani/10x-astro-starter.git
cd 10x-astro-starter
```

2. Install dependencies:

```bash
npm install
```

3. Run the development server:

```bash
npm run dev
```

4. Build for production:

```bash
npm run build
```

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint
- `npm run lint:fix` - Fix ESLint issues

## Running Tests

### Unit & integration (Vitest)

- `npm run test` - Executes all unit/integration specs in `src/lib/__tests__`
- `npm run test:ui` - Opens the Vitest UI runner for focused debugging
- `npm run test:coverage` - Generates V8 coverage reports (`coverage/` folder)

Key scenarios covered today:

- `generation.service.test.ts` validates both the happy path and AI failure handling for `GenerationService`
- `example.test.ts` is a lightweight starter spec that confirms the tooling is wired correctly

### End-to-end (Playwright)

- `npm run test:e2e` - Runs the headless Playwright suite located in `e2e/`
- `npm run test:e2e:ui` - Launches the interactive Playwright UI
- `npm run test:e2e:debug` - Runs tests with Playwright's inspector for step-by-step debugging
- `npm run test:e2e:codegen` - Opens the recorder to scaffold new specs

Before running Playwright locally for the first time, install the required browsers with:

```bash
npx playwright install
```

### Current status

`npm run test` (Vitest) - all suites passing as of the latest run.

## API Testing Helpers

- `docs/flashcards.http` – VS Code REST Client compatible collection with ready-to-run POST `/api/flashcards` scenarios (manual creation, AI-linked batches, and validation failures). Update the `@baseUrl` and `@authToken` variables before executing requests.

## Project Structure

```md
.
├── src/
│ ├── layouts/ # Astro layouts
│ ├── pages/ # Astro pages
│ │ └── api/ # API endpoints
│ ├── components/ # UI components (Astro & React)
│ └── assets/ # Static assets
├── public/ # Public assets
```

## Documentation

Project documentation is located in the `.ai/` directory:

- **[Product Requirements Document (PRD)](.ai/prd.md)** - Complete product specification and requirements
- [API Plan](.ai/api-plan.md) - API endpoint design and specifications
- [Auth Specification](.ai/auth-spec.md) - Authentication and authorization details
- [Database Plan](.ai/db-plan.md) - Database schema and design
- [Tech Stack](.ai/tech-stack.md) - Technology stack decisions and rationale
- [Test Plan](.ai/test-plan.md) - Testing strategy and coverage

Additional guides are available in the `docs/` directory:

- [Auth Guide](docs/auth-guide.md) - Implementation guide for authentication

## AI Development Support

This project is configured with AI development tools to enhance the development experience, providing guidelines for:

- Project structure
- Coding practices
- Frontend development
- Styling with Tailwind
- Accessibility best practices
- Astro and React guidelines

### Cursor IDE

The project includes AI rules in `.cursor/rules/` directory that help Cursor IDE understand the project structure and provide better code suggestions.

### GitHub Copilot

AI instructions for GitHub Copilot are available in `.github/copilot-instructions.md`

### Windsurf

The `.windsurfrules` file contains AI configuration for Windsurf.

## Contributing

Please follow the AI guidelines and coding practices defined in the AI configuration files when contributing to this project.

## License

MIT
