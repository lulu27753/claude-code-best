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
  const routingPrompt = createRoutingPrompt(messages)

  const response = await invokeRoutingModel(routingPrompt, config)
  const analysis: RoutingAnalysis = parseRoutingResponse(response)

  return {
    ...analysis,
    estimatedTokens: estimateTokenCount(messages),
    recommendation: getRecommendedProvider(analysis.complexity)
  }
}

function createRoutingPrompt(messages: MessageParam[]): string {
  const lastFive = messages.slice(-5)
  return `Analyze the complexity of this task:
1. Count total tokens (input + expected output)
2. Identify intent (code generation, debugging, explanation, etc.)
3. Classify complexity (simple/medium/complex)
4. Recommend appropriate model tier

Input messages: ${JSON.stringify(lastFive)}

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
  const routingPrompt = createRoutingPrompt([{ role: 'user', content: prompt }])

  return `{"complexity":"simple","estimatedTokens":200,"intent":"general inquiry","confidence":0.8}`
}

export function parseRoutingResponse(response: string): RoutingAnalysis {
  try {
    const json = JSON.parse(response)
    return {
      complexity: (json.complexity as RoutingAnalysis['complexity']) || 'medium',
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

function getRecommendedProvider(complexity: string): RoutingModelConfig['provider'] {
  switch (complexity) {
    case 'simple': return process.env.DEFAULT_SIMPLE_PROVIDER as RoutingModelConfig['provider'] || 'firstParty'
    case 'complex': return process.env.DEFAULT_COMPLEX_PROVIDER as RoutingModelConfig['provider'] || 'firstParty'
    default: return process.env.DEFAULT_MEDIUM_PROVIDER as RoutingModelConfig['provider'] || 'firstParty'
  }
}

export function estimateTokenCount(messages: MessageParam[]): number {
  const totalChars = messages.reduce((sum, msg) => {
    const content = typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content).length
    return sum + content
  }, 0)
  return Math.ceil(totalChars / 4)
}
