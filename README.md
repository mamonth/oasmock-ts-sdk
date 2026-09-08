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

### Async (AsyncAPI) management

> **Experimental**: the async management API and the notification stream may change without a
> backward-compatibility guarantee.

```typescript
import { MockSDK } from 'oasmock-sdk'

const mockSDK = new MockSDK('http://localhost:19191')

// Event-driven example: pushed when 'user.created' fires
const exampleId = await mockSDK
  .asyncChannel('/schema-prefix/user/updates')  // address includes the schema prefix
  .onEvent('user.created')
  .withDelay('250ms')
  .push({ userId: '{$event.userId}' })

// Fire the named event (global by default)
await mockSDK.fireEvent('user.created', { payload: { userId: '42' } })

// Instant broadcast to the channel's consumers
await mockSDK.asyncChannel('/schema-prefix/user/updates').push({ kind: 'ping' })

// Periodic delivery at a fixed cadence, cancelled via deleteExample
const intervalId = await mockSDK
  .asyncChannel('/schema-prefix/user/updates')
  .onInterval('1s')
  .push({ ping: 'pong' }, { ttl: '30s' })
await mockSDK.deleteExample(intervalId)

// Consumers: list, target, force-disconnect
const consumers = await mockSDK.asyncConsumers.getList()
await consumers[0].push({ direct: 'message' })
await consumers[0].disconnect({ abrupt: true })

// Management notification stream (lazy WebSocket)
const off = mockSDK.on('push', ({ push }) => console.log(push.channel, push.payload))
const offEvents = mockSDK.on('user.created', ({ event }) => console.log(event.name))
off()  // unsubscribe; socket closes when the last handler is removed
```

## API Reference

See [docs/api.md](docs/api.md) for the full `MockSDK` / `MockSDKRequest` / async API reference, type definitions, and error handling.

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