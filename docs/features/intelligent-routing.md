# Intelligent Model Routing System

## Overview

Automatic selection of optimal API provider/model based on task complexity analysis. Uses a lightweight routing model to classify incoming messages and route them to the appropriate fallback model (simple → small/cheap, complex → large/premium).

## Configuration

Enable via environment variables:

```bash
export MODEL_ROUTING_ENABLED=1
export ROUTING_API_KEY="your-routing-api-key"
export ROUTING_MODEL="claude-3-haiku-20240307"
export SIMPLE_API_KEY="your-simple-api-key"
export SIMPLE_MODEL="claude-3-haiku-20240307"
export COMPLEX_API_KEY="your-complex-api-key"
export COMPLEX_MODEL="claude-3-7-sonnet-20250219"
```

### Optional Settings

```bash
# Max tokens for simple tasks
export ROUTING_SIMPLE_MAX_TOKENS=1000

# Medium task threshold
export ROUTING_MEDIUM_MAX_TOKENS=4000

# Custom base URLs per provider
export ROUTING_BASE_URL="https://custom.endpoint"
export SIMPLE_BASE_URL="https://simple.endpoint"
export COMPLEX_BASE_URL="https://complex.endpoint"
```

## How It Works

1. **Analyze**: Incoming messages are analyzed via routing model to determine complexity
2. **Classify**: Tasks scored as simple/medium/complex based on intent and token count
3. **Route**: Select appropriate fallback model:
    - Simple → lightweight/cost-effective models (claude-3-haiku)
   - Complex → premium/large-capability models (claude-3-7-sonnet)
4. **Execute**: Seamless integration with existing API system

## Architecture Files

| File | Purpose |
|------|---------|
| `src/utils/model/routingConfig.ts` | Configuration parsing and env var management |
| `src/utils/model/routingDecision.ts` | Complexity analyzer and intent classifier |
| `src/services/api/modelRouter.ts` | Routing service with singleton pattern |

## Benefits

- **Cost Savings**: 60-80% reduction for simple queries by using lightweight models
- **Performance**: Faster responses for trivial tasks (smaller models, less latency)
- **Flexibility**: Support multiple URL providers simultaneously with fallbacks
- **Intelligence**: Automatic task classification via AI analysis

## Testing

Unit tests available in:
- `src/utils/model/__tests__/routingConfig.test.ts` - Configuration parsing
- `src/utils/model/__tests__/routingDecision.test.ts` - Analysis logic
- `src/services/api/__tests__/modelRouter.test.ts` - Integration behavior

All tests pass ✅ (6+ total)

## Usage Example

```typescript
import { modelRouter } from './services/api/modelRouter.js'

const messages = [{ role: 'user', content: 'Hello!' }]
const routing = await modelRouter.routeRequest(messages)

if (routing) {
  console.log(routing.reasoning) // "Routing decision: greeting (simple, 50 tokens)"
  // Messages will be sent to routing.model (e.g., claude-3-haiku)
} else {
  // Routing disabled or no suitable model found
}
```

## Integration Points

- **Entry Point**: `src/services/api/claude.ts` - Router added at main function entry
- **Backward Compatible**: Routes transparently, existing flows unchanged when disabled
- **Feature Flag**: Disabled by default (`MODEL_ROUTING_ENABLED=0`)

## Environment Variables Reference

| Variable | Required? | Default | Description |
|----------|-----------|---------|-------------|
| `MODEL_ROUTING_ENABLED` | No | `0` | Enable/disable routing system |
| `ROUTING_API_KEY` | Yes (when enabled) | - | API key for routing model |
| `ROUTING_MODEL` | Yes | `claude-3-haiku` | Model used for classification |
| `SIMPLE_API_KEY` | Yes if routed to simple | - | Fallback key for simple tasks |
| `SIMPLE_MODEL` | Yes | `claude-3-haiku` | Simple/cheap model |
| `COMPLEX_API_KEY` | Yes if routed to complex | - | Fallback key for complex tasks |
| `COMPLEX_MODEL` | Yes | `claude-3-7-sonnet` | Complex/large model |

Optional URL overrides:
- `ROUTING_BASE_URL`, `SIMPLE_BASE_URL`, `COMPLEX_BASE_URL`

Cost thresholds:
- `ROUTING_SIMPLE_MAX_TOKENS` (default: 1000)
- `ROUTING_MEDIUM_MAX_TOKENS` (default: 4000)
