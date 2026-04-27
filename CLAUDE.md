# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commonly Used Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Starts the development server. Use this to run the app locally with hot-reloading. |
| `npm run build` | Builds the production-ready bundle. Use this before deploying. |
| `npm test` | Runs the full test suite. To run a single test file, use `npm test -- <test-file-name>`. |
| `npm run lint` | Lints the codebase for formatting and potential issues. |

## High-Level Architecture

This codebase implements a custom Next.js variant with breaking changes from standard Next.js conventions. Key architectural aspects to note:

1. **File Structure**: The project deviates from typical Next.js patterns. Key directories to review:
   - `app/` for routing and page components
   - `supabase/` for database migrations and configurations
   - `lib/` for reusable utilities

2. **Breaking Changes**: Compared to standard Next.js, this version:
   - Uses a custom API layer for data handling
   - Implements specific security constraints in routes
   - Has modified state management patterns

3. **Critical Files**:
   - `CLAUDE.md` and `AGENTS.md` should be read for project-specific conventions
   - `node_modules/next/dist/docs/` contains documentation for this variant's specific features

## Important Guidelines

- Always consult `node_modules/next/dist/docs/` for framework-specific guidance
- Review AWS Supabase integration patterns in `supabase/` directory
- For new feature implementation, follow the structure shown in `app/dashboard/` as a reference

If you encounter cursor rules or Copilot instructions, refer to `.cursor/rules/` or `.github/copilot-instructions.md` for project-specific coding standards.