import type { APIProvider } from './providers.js'
import { isEnvTruthy } from '../envUtils.js'

export type RoutingModelConfig = {
  provider: APIProvider
  model: string
  baseUrl?: string
  apiKeyEnvar: string
  enabled: boolean
}

export type IntelligentRoutingConfig = {
  enabled: boolean
  routingModel: RoutingModelConfig | undefined | null
  fallbackModels: Record<'simple' | 'complex', RoutingModelConfig | undefined | null>
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
      routingModel: undefined,
      fallbackModels: { simple: undefined, complex: undefined },
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
        provider: (process.env.SIMPLE_MODEL_PROVIDER as APIProvider) || 'firstParty',
        model: process.env.SIMPLE_MODEL || 'claude-3-haiku-20240307',
        baseUrl: process.env.SIMPLE_BASE_URL,
        apiKeyEnvar: 'SIMPLE_API_KEY',
        enabled: true
      },
      complex: {
        provider: (process.env.COMPLEX_MODEL_PROVIDER as APIProvider) || 'firstParty',
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
  return config.fallbackModels[type] ?? null
}
