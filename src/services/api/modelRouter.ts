import type { RoutingModelConfig } from 'src/utils/model/routingConfig.js'
import { getFallbackModel } from 'src/utils/model/routingConfig.js'
import { analyzeMessageComplexity } from 'src/utils/model/routingDecision.js'
import type { BetaMessageParam as MessageParam } from '@anthropic-ai/sdk/resources/beta/messages/messages.mjs'

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
       const config = await getRoutingConfigInstance()
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
        apiKey: getApiKey(targetModelConfig.apiKeyEnvar),
         reasoning: `Routing decision: ${analysis.intent} (${analysis.complexity}, ${analysis.estimatedTokens} tokens)`
          }

      return routingResult
       }
     }

export const modelRouter = ModelRouter.getInstance()

async function getRoutingConfigInstance(): Promise<{ routingModel?: RoutingModelConfig; fallbackModels: Record<'simple' | 'complex', RoutingModelConfig | null> }> {
  const configModule = await import('src/utils/model/routingConfig.js')
  const config = configModule.getRoutingConfig()

  return {
    routingModel: config.routingModel || undefined,
    fallbackModels: config.fallbackModels
   }
}

// Get API key from environment variables safely
function getApiKey(keyName: string): string {
  return process.env[keyName] || ''
}
