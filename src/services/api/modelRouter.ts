import type { RoutingModelConfig } from 'src/utils/model/routingConfig.js'
import { getRoutingModelConfig, getFallbackModel } from 'src/utils/model/routingConfig.js'
import { analyzeMessageComplexity } from 'src/utils/model/routingDecision.js'
import type { MessageParam } from '@anthropic-ai/sdk/resources/beta/messages/messages.mjs'

export interface RoutingResult {
  provider: RoutingModelConfig['provider']
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
     const config = getRoutingConfigInstance()
    if (!config || !config.routingModel) return null

    const analysis = await analyzeMessageComplexity(messages, config.routingModel)

    const targetModelConfig =
       analysis.complexity === 'simple'
          ? getFallbackModel('simple')
          : getFallbackModel('complex')

    if (!targetModelConfig) return null

     const routingResult: RoutingResult = {
      provider: targetModelConfig.provider,
      model: targetModelConfig.model,
      baseUrl: targetModelConfig.baseUrl || undefined,
      apiKey: await getApiKey(targetModelConfig.apiKeyEnvar),
       reasoning: `Routing decision: ${analysis.intent} (${analysis.complexity}, ${analysis.estimatedTokens} tokens)`
     }

    return routingResult
   }
 }

export const modelRouter = ModelRouter.getInstance()

// Import helper at runtime to handle config properly
function getRoutingConfigInstance(): { routingModel?: RoutingModelConfig; fallbackModels: Record<'simple' | 'complex', RoutingModelConfig | null> } {
  const config = require('src/utils/model/routingConfig.js').getRoutingConfig()
  return {
    routingModel: config.routingModel || undefined,
    fallbackModels: config.fallbackModels
   }
}

async function getApiKey(keyName: string): Promise<string> {
  return process.env[keyName] || ''
}
