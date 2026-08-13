# Project Context

## Tech Stack
- `TypeScript 7.0` (native compiler, `tsc`); `@typescript/typescript6` installed side-by-side for the programmatic API used by build tooling
- `@hey-api/openapi-ts` for generating types and sdk from OpenAPI spec
- `Vite` for building library
- `Vitest` for unit and integration tests
- `OASMock` for integration test mocking

## Project structure
- `src/` - Application codebase
- `scripts/` - Various automation scripts
- `test/` - Integration tests and test related codebase and resources
  - `test/_shared` - Common files for tests codebase including fixtures, helper functions, resources etc
    - `test/_shared/resources` - Various resources (e.g. yaml, json files)
- `docs/` - Project documentation

## Testing Standards

These standards mirror the shared testing conventions of the OASMock ecosystem.

### Test classification
- All tests are divided into "unit" and "integration"
- Benchmarks can be unit or integrative, and MUST comply with the corresponding rules
- All test functions MUST contain a multiline (`/**/`) comment before the function declaration with the Gherkin notation of the test case:
  ```
  /*
  Scenario: Adding records to ring buffer and retrieving all
  Given a ring buffer with capacity 3
  When records are added up to and beyond capacity
  Then GetAll returns correct records, oldest records are overwritten on overflow
  */
  ```
- Use parameterized tests when all the test's steps (AAA) are identical across all cases, and only the input and expected output differ. Otherwise, write separate tests.

### Unit tests
Check one interface at a time.
- MUST call one interface per test exclusively
- All dependencies including public interface calls within the project codebase MUST be mocked or stubbed
- Private interfaces SHOULD NOT be tested directly, although their coverage MUST be implemented indirectly
- MUST be placed near the tested module with a `.spec.ts` filename suffix (i.e. `module.spec.ts`)
- SHOULD use parallel execution when conflicts are completely impossible
- SHOULD contain one assertion (or one logical group of assertions) per test

### Integration tests
Check the ready-to-ship application as a complete system.
- MUST check gaps in unit test cases and the system integration result
- SHOULD NOT call any internal interfaces directly (only the bundled system as a black box)
- MUST be placed at `test/` or its subdirectories with a `.test.ts` filename suffix (i.e. `domain-or-scenario.test.ts`)
