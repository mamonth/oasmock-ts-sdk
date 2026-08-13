# OASMock TypeScript SDK

TypeScript/JavaScript SDK for programmatic interaction with the [OASMock](https://github.com/mamonth/oasmock) server via its HTTP API.

## Installation

```bash
npm install oasmock-sdk
```

## Basic Usage

```typescript
import { MockSDK } from 'oasmock-sdk'

const mockSDK = new MockSDK('http://localhost:19191')

// One‑time mocking of a response
await mockSDK.onRequest('/some/url', 'POST').respondWithOnce({
  body: { some: 'data' }
})

// Mocking with additional conditions
await mockSDK.onRequest('/some/url')
  .withCookies({ uid: '1' })
  .withHeaders({ authorization: 'Bearer token' })
  .withSearchParams({ test: 'value' })
  .respondWith({
    body: {}
  })

// Retrieve request history
const lastRequest = await mockSDK.getLastRequest({
  path: '/some/url',
  method: 'POST'
})
```

## API Reference

See [docs/api.md](docs/api.md) for the full `MockSDK` / `MockSDKRequest` reference, type definitions, and error handling.

## Development

### Building
```bash
npm run build
```

### Testing
```bash
npm test
```

### Linting & Formatting
```bash
npm run lint
npm run format
```

### Type Checking
```bash
npm run typecheck
```

## Releasing

Publishing is tag-driven: the git tag is the single source of truth for the npm version.

1. Create and push a `vX.Y.Z` tag (e.g. `v0.0.7`):
   ```bash
   git tag v0.0.7 && git push origin v0.0.7
   ```
2. The publish workflow derives the version from the tag, validates it as semver, and publishes `oasmock-sdk@X.Y.Z` to npm.

The version committed in `package.json` is not the publish authority — the tag always wins.

## License

MIT