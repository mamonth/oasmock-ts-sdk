# OASMock TS SDK

**Agent SHOULD NOT change this file, only suggest changes to user when inconsistency or potential improvement can be done**

## References
- [OASMock API Schema](node_modules/oasmock/api/openapi.yaml) (If not present - run `npm install`)
- [Project context & standards](docs/project.md)
- [SDK API description](docs/api.md)

## Session Start
- Read the documents in References before working on the project.
- Follow the testing standards in [docs/project.md](docs/project.md) when writing or editing tests.

## Development Guidelines
- Cognitive Complexity ([metric by Sonar Source](https://redirect.sonarsource.com/doc/cognitive-complexity.html)) MUST be as low as possible by keeping conditionals simple and nesting levels moderately low (with helper functions and/or declarative approach)
- Module coupling MUST be moderately low to enable clean unit testing and make the codebase resilient to changes
- Module cohesion (module context, knowledge and logic density) MUST be as high as possible
- Code duplication SHOULD be as minimal as possible as long as it reduces complexity (see the rules about coupling and cohesion)
- Function length SHOULD be ignored, as long as no code or logic duplication is presented and code responsibility is in the right place (high cohesion)
- Data-driven approaches SHOULD be used instead of repetitive control structures (declarative over imperative)
- Core constants or configuration MUST be defined in one place, and derived representations (e.g., a set for fast lookup) SHOULD be derived programmatically
- When in need to perform frequent membership checks, the source-of-truth slice SHOULD be converted into a map (set) once—preferably at initialization (init)

## Code Design
- Use the design-first and TDD principle:
  1. Design the function interface according to the usage need and check its usability in context
  2. Write or edit tests for parent code (code where the new interface is used), mocking the new/edited interface, to ensure host code works as expected
  3. Write or edit tests for the interface itself
  4. Write the implementation of the interface until tests pass

## Quality Assurance
- Follow the testing standards (unit/integration split, Gherkin scenario comments, parameterized tests, benchmark rules) defined in [docs/project.md](docs/project.md)
- All tests MUST follow the common development guidelines
