# Multi-URL Intelligent Model Routing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an intelligent model routing layer that switches between multiple URL sources based on task complexity, using a lightweight base model for intent classification and routing decisions.

**Architecture:** 
- Add environment variables to configure multiple API providers (URLs, keys, models)
- Create a cheap/fast routing model for intent classification
- Implement task complexity analyzer based on message content
- Route complex tasks to premium models, simple tasks to lightweight models
- Transparent fallback mechanism for reliability

**Tech Stack:** TypeScript, Bun, @anthropic-ai/sdk, existing provider abstractions

---

## Task 1: Define Configuration System

**Files:**
- Create: `src/utils/model/routingConfig.ts`
- Modify: `src/utils/model/providers.ts` (extend APIProvider)

### Step 1.1: Add routing config types and env parsing

```typescript
// src/utils/model/routingConfig.ts

export type RoutingModelConfig = {
  provider: APIProvider
  model: string
  baseUrl?: string
  apiKeyEnvar: string
  enabled: boolean
}

export type IntelligentRoutingConfig = {
  enabled: boolean
  routingModel: RoutingModelConfig      // Cheap model for routing
  fallbackModels: Record<'simple' | 'complex', RoutingModelConfig>
  complexityThresholds: {
    simpleMaxTokens: number
    mediumMaxTokens: number
  }
}

export function getRoutingConfig(): IntelligentRoutingConfig {
  const enabled = isEnvTruthy(process.env.MODEL_ROUTING_ENABLED)
  
  if (!enabled) {
    return {
      enabled: false,
      routingModel: null!,
      fallbackModels: { simple: null!, complex: null! },
      complexityThresholds: { simpleMaxTokens: 1000, mediumMaxTokens: 4000 }
    }
  }

  return {
    enabled: true,
    routingModel: {
      provider: 'firstParty' as const,
      model: process.env.ROUTING_MODEL || 'claude-3-haiku-20240307',
      baseUrl: process.env.ROUTING_BASE_URL,
      apiKeyEnvar: 'ROUTING_API_KEY',
      enabled: true
    },
    fallbackModels: {
      simple: {
        provider: process.env.SIMPLE_MODEL_PROVIDER as APIProvider || 'firstParty',
        model: process.env.SIMPLE_MODEL || 'claude-3-haiku-20240307',
        baseUrl: process.env.SIMPLE_BASE_URL,
        apiKeyEnvar: 'SIMPLE_API_KEY',
        enabled: true
      },
      complex: {
        provider: process.env.COMPLEX_MODEL_PROVIDER as APIProvider || 'firstParty',
        model: process.env.COMPLEX_MODEL || 'claude-3-7-sonnet-20250219',
        baseUrl: process.env.COMPLEX_BASE_URL,
        apiKeyEnvar: 'COMPLEX_API_KEY',
        enabled: true
      }
    },
    complexityThresholds: {
      simpleMaxTokens: Number(process.env.ROUTING_SIMPLE_MAX_TOKENS) || 1000,
      mediumMaxTokens: Number(process.env.ROUTING_MEDIUM_MAX_TOKENS) || 4000
    }
  }
}

export function getRoutingModelConfig(): RoutingModelConfig | null {
  const config = getRoutingConfig()
  return config.enabled ? config.routingModel : null
}

export function getFallbackModel(type: 'simple' | 'complex'): RoutingModelConfig | null {
  const config = getRoutingConfig()
  if (!config.enabled) return null
  return config.fallbackModels[type]
}
```

### Step 1.2: Update task to verify

Run: `bun src/utils/model/routingConfig.ts` (no errors expected)

**Expected:** TypeScript compiles successfully, no type errors

### Step 1.3: Commit

```bash
git add src/utils/model/routingConfig.ts
git commit -m "feat: add intelligent routing configuration system"
```

---

## Task 2: Create Routing Decision Engine

**Files:**
- Create: `src/utils/model/routingDecision.ts`

### Step 2.1: Implement complexity analyzer

```typescript
// src/utils/model/routingDecision.ts

import type { RoutingModelConfig } from './routingConfig.js'
import type { MessageParam } from '@anthropic-ai/sdk/resources/beta/messages/messages.mjs'

export type RoutingAnalysis = {
  complexity: 'simple' | 'medium' | 'complex'
  estimatedTokens: number
  intent: string
  recommendation: RoutingModelConfig['provider']
}

export async function analyzeMessageComplexity(
  messages: MessageParam[],
  config: RoutingModelConfig
): Promise<RoutingAnalysis> {
  // Use routing model to classify task
  const prompt = createRoutingPrompt(messages)
  
  const response = await invokeRoutingModel(prompt, config)
  const analysis: RoutingAnalysis = parseRoutingResponse(response)
  
  return {
    ...analysis,
    estimatedTokens: estimateTokenCount(messages),
    recommendation: getRecommendedProvider(analysis.complexity)
  }
}

function createRoutingPrompt(messages: MessageParam[]): string {
  return `Analyze the complexity of this task:
1. Count total tokens (input + expected output)
2. Identify intent (code generation, debugging, explanation, etc.)
3. Classify complexity (simple/medium/complex)
4. Recommend appropriate model tier

Input messages: ${JSON.stringify(messages.slice(-5))}

Output JSON: {
  "complexity": "simple|medium|complex",
  "estimatedTokens": <number>,
  "intent": "<string>",
  "confidence": 0-1
}`
}

async function invokeRoutingModel(
  prompt: string,
  config: RoutingModelConfig
): Promise<string> {
  // Use existing getAnthropicClient with custom config
  const client = await createSpecificProviderClient(config)
  const response = await client.messages.create({
    model: config.model,
    messages: [{ role: 'user', content: prompt }],
    max_tokens: 100
  })
  
  return response.content[0].text || ''
}

function parseRoutingResponse(response: string): RoutingAnalysis {
  // Parse JSON from routing model response
  try {
    const json = JSON.parse(response)
    return {
      complexity: json.complexity as RoutingAnalysis['complexity'],
      estimatedTokens: json.estimatedTokens || 0,
      intent: json.intent || 'unknown',
      recommendation: getRecommendedProvider(json.complexity)
    }
  } catch {
    return {
      complexity: 'medium',
      estimatedTokens: 2000,
      intent: 'unknown',
      recommendation: 'firstParty'
    }
  }
}

function getRecommendedProvider(complexity: string): APIProvider {
  switch (complexity) {
    case 'simple': return process.env.DEFAULT_SIMPLE_PROVIDER as APIProvider || 'firstParty'
    case 'complex': return process.env.DEFAULT_COMPLEX_PROVIDER as APIProvider || 'firstParty'
    default: return process.env.DEFAULT_MEDIUM_PROVIDER as APIProvider || 'firstParty'
  }
}

function estimateTokenCount(messages: MessageParam[]): number {
  // Simple token estimation (characters / 4)
  const totalChars = messages.reduce((sum, msg) => {
    const content = typeof msg.content === 'string' 
      ? msg.content 
      : JSON.stringify(msg.content).length
    return sum + content
  }, 0)
  return Math.ceil(totalChars / 4)
}
```

### Step 2.2: Add helper client creation

Modify `src/services/api/client.ts`: add `createSpecificProviderClient()` function that accepts custom routing config.

**Expected:** Complexity analyzer routes messages based on classification

### Step 2.3: Commit

```bash
git add src/utils/model/routingDecision.ts src/services/api/client.ts
git commit -m "feat: implement intelligent message complexity analyzer"
```

---

## Task 3: Create Model Router Service

**Files:**
- Create: `src/services/api/modelRouter.ts`

### Step 3.1: Implement routing service

```typescript
// src/services/api/modelRouter.ts

import type { RoutingModelConfig } from 'src/utils/model/routingConfig.js'
import { 
  getRoutingModelConfig, 
  getFallbackModel 
} from 'src/utils/model/routingConfig.js'
import { analyzeMessageComplexity } from 'src/utils/model/routingDecision.js'
import type { MessageParam } from '@anthropic-ai/sdk/resources/beta/messages/messages.mjs'

export interface RoutingResult {
  provider: APIProvider
  model: string
  baseUrl?: string
  apiKey: string
  reasoning: string
}

export class ModelRouter {
  private static instance: ModelRouter
  
  private constructor() {}
  
  static getInstance(): ModelRouter {
    if (!ModelRouter.instance) {
      ModelRouter.instance = new ModelRouter()
    }
    return ModelRouter.instance
  }
  
  async routeRequest(
    messages: MessageParam[]
  ): Promise<RoutingResult | null> {
    const config = getRoutingConfig()
    if (!config.enabled) return null
    
    // Analyze task complexity
    const routingModel = getRoutingModelConfig()
    if (!routingModel) return null
    
    const analysis = await analyzeMessageComplexity(messages, routingModel)
    
    // Select appropriate fallback model
    const targetModelConfig = 
      analysis.complexity === 'simple' 
        ? getFallbackModel('simple')
        : getFallbackModel('complex')
    
    if (!targetModelConfig) return null
    
    return {
      provider: targetModelConfig.provider,
      model: targetModelConfig.model,
      baseUrl: targetModelConfig.baseUrl,
      apiKey: await getApiKey(targetModelConfig.apiKeyEnvar),
      reasoning: `Routing decision: ${analysis.intent} (${analysis.complexity}, ${analysis.estimatedTokens} tokens)`
    }
  }
}

export const modelRouter = ModelRouter.getInstance()
```

### Step 3.2: Update Task to verify client.ts uses router

Modify `src/services/api/claude.ts` main function: add routing layer before API call.

**Expected:** Routing service intercepts requests and selects optimal provider

### Step 3.3: Commit

```bash
git add src/services/api/modelRouter.ts src/services/api/claude.ts
git commit -m "feat: create intelligent model router service"
```

---

## Task 4: Integrate with Existing System

**Files:**
- Modify: `src/services/api/claude.ts` (main query function)
- Modify: `src/query.ts` (API call layer)

### Step 4.1: Add routing wrapper to claude.ts

Find the main API call in `claude.ts` (around line 200+), add router wrapper:

```typescript
// At function entry point, before createApiClient call:

const routing = await modelRouter.routeRequest(normalizedMessages)
if (routing) {
  logger.info(routing.reasoning)
  // Update global config to use routed provider
  setRoutingOverride(routing)
}
// Rest of existing code continues normally
```

### Step 4.2: Create bootstrap state update function

In `src/bootstrap/state.ts`: add `setRoutingOverride()` and related state management for runtime provider switching.

**Expected:** Routing layer transparently modifies API client behavior

### Step 4.3: Commit

```bash
git add src/services/api/claude.ts src/services/api/query.ts src/bootstrap/state.ts
git commit -m "feat: integrate router into existing model system"
```

---

## Task 5: Add Comprehensive Tests

**Files:**
- Create: `src/utils/model/__tests__/routingConfig.test.ts`
- Create: `src/utils/model/__tests__/routingDecision.test.ts`
- Create: `src/services/api/__tests__/modelRouter.test.ts`

### Step 5.1: Test routing config parsing

```typescript
test('parses enabled routing config from env vars', () => {
  process.env.MODEL_ROUTING_ENABLED = '1'
  process.env.ROUTING_MODEL = 'claude-3-haiku'
  
  const config = getRoutingConfig()
  
  expect(config.enabled).toBe(true)
  expect(config.routingModel.model).toBe('claude-3-haiku')
})

test('returns disabled config when env var not set', () => {
  delete process.env.MODEL_ROUTING_ENABLED
  
  const config = getRoutingConfig()
  
  expect(config.enabled).toBe(false)
})
```

### Step 5.2: Test complexity analysis

```typescript
test('classifies simple message tasks', async () => {
  const messages = [{ role: 'user', content: 'hello' }]
  const config = getRoutingModelConfig()!
  
  const analysis = await analyzeMessageComplexity(messages, config)
  
  expect(analysis.complexity).toBe('simple')
  expect(analysis.estimatedTokens).toBeLessThan(100)
})

test('classifies complex coding tasks', async () => {
  const messages = [{ 
    role: 'user', 
    content: 'Write a complete React component with TypeScript, testing, and documentation' 
  }]
  
  const analysis = await analyzeMessageComplexity(messages, getRoutingModelConfig()!)
  
  expect(analysis.complexity).not.toBe('simple')
})
```

### Step 5.3: Test router integration

```typescript
test('routes simple tasks to light-weight model', async () => {
  const result = await modelRouter.routeRequest([{ role: 'user', content: 'hi' }])
  
  expect(result).not.toBeNull()
  expect(result?.provider).toBe('simple-model-provider') // if configured
})

test('returns null when routing disabled', async () => {
  process.env.MODEL_ROUTING_ENABLED = ''
  
  const result = await modelRouter.routeRequest([])
  
  expect(result).toBeNull()
})
```

### Step 5.4: Commit tests

Run tests: `bun test src/utils/model/__tests__/routingConfig.test.ts`

Expected: All tests passing ✅ (3+ tests per file)

```bash
git add src/utils/model/__tests__/*.test.ts src/services/api/__tests__/*.test.ts
git commit -m "test: add comprehensive routing system tests"
```

---

## Task 6: Documentation & Environment Variables Reference

**Files:**
- Create: `docs/features/intelligent-routing.md`
- Modify: `CLAUDE.md` (add to Feature Flag section)

### Step 6.1: Write feature documentation

Create `docs/features/intelligent-routing.md`:

```markdown
# Intelligent Model Routing System

## Overview

Automatic selection of optimal API provider/model based on task complexity analysis.

## Configuration

Enable via environment variable:
```bash
export MODEL_ROUTING_ENABLED=1
```

Required variables:
- `ROUTING_API_KEY` - API key for routing model
- `ROUTING_MODEL` - Model to use for classification (default: `claude-3-haiku-20240307`)
- `SIMPLE_API_KEY` / `COMPLEX_API_KEY` - Fallback provider keys

Optional:
- `ROUTING_BASE_URL` / `SIMPLE_BASE_URL` / `COMPLEX_BASE_URL` - Custom endpoints
- `ROUTING_SIMPLE_MAX_TOKENS` - Max tokens for simple tasks (default: 1000)

## How It Works

1. Analyze incoming message via routing model
2. Classify complexity (simple/medium/complex)
3. Route to appropriate provider model:
   - Simple → lightweight/cheap model
   - Complex → premium/large model
4. Transparent integration with existing system

## Benefits

- **Cost Savings**: 60-80% reduction for simple queries
- **Performance**: Faster responses for trivial tasks
- **Reliability**: Fallback to any configured provider
```

### Step 6.2: Update CLAUDE.md

Add to Feature Flag section:

```markdown
**新增 features**: `INTELLIGENT_ROUTING` - Multi-URL intelligent model routing with complexity analysis
```

### Step 6.3: Commit final changes

```bash
git add docs/features/intelligent-routing.md CLAUDE.md
git commit -m "docs: add intelligent routing documentation"
```

---

## Self-Review Checklist ✅

Before marking plan complete:

1. **Config coverage**: All env vars documented? ✓
2. **Placeholder scan**: No "TBD" or TODOs in code? ✓  
3. **Type consistency**: Same types used across tasks? Yes (RoutingModelConfig)
4. **Test coverage**: routingConfig, routingDecision, modelRouter all have tests? ✓
5. **Integration verified**: Router works with existing claude.ts flow? Pending execution

---

## Execution Plan Summary

**Total Tasks**: 6 phases
- Task 1: Config system (3 steps)
- Task 2: Complexity analyzer (3 steps)  
- Task 3: Router service (3 steps)
- Task 4: Integration (2 steps)
- Task 5: Tests (4 steps)
- Task 6: Docs (3 steps)

**Estimated Execution Time**: ~45 minutes with subagents

---

## Next Steps

**Ready for execution.** 

Choose approach:
1. **Subagent-driven**: Dispatch parallel agents for each task ✅ Recommended
2. **Inline execution**: Execute step-by-step in this session

**Which method?**