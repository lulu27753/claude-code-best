import { describe, test, expect, beforeEach } from 'bun:test'
import { getRoutingConfig, getRoutingModelConfig, getFallbackModel } from '../routingConfig.js'

describe('getRoutingConfig', () => {
  beforeEach(() => {
    delete process.env.MODEL_ROUTING_ENABLED
    delete process.env.ROUTING_MODEL
    delete process.env.SIMPLE_MODEL
    delete process.env.COMPLEX_MODEL
    delete process.env.ROUTING_SIMPLE_MAX_TOKENS
    delete process.env.ROUTING_MEDIUM_MAX_TOKENS
  })

  test('returns disabled config when MODEL_ROUTING_ENABLED not set', () => {
    const config = getRoutingConfig()

    expect(config.enabled).toBe(false)
    expect(config.routingModel).toBeUndefined()
    expect(config.fallbackModels).toEqual({ simple: undefined, complex: undefined })
    expect(config.complexityThresholds.simpleMaxTokens).toBe(1000)
  })

  test('parses enabled routing config from env vars', () => {
    process.env.MODEL_ROUTING_ENABLED = '1'
    process.env.ROUTING_MODEL = 'claude-3-haiku-test'
    process.env.SIMPLE_MODEL = 'simple-model'
    process.env.COMPLEX_MODEL = 'complex-model'

    const config = getRoutingConfig()

    expect(config.enabled).toBe(true)
    expect(config.routingModel?.model).toBe('claude-3-haiku-test')
    expect(config.fallbackModels.simple?.model).toBe('simple-model')
    expect(config.fallbackModels.complex?.model).toBe('complex-model')
  })

  test('defaults to claude-3-haiku when ROUTING_MODEL not specified', () => {
    process.env.MODEL_ROUTING_ENABLED = '1'

    const config = getRoutingConfig()

    expect(config.enabled).toBe(true)
    expect(config.routingModel?.model).toBe('claude-3-haiku-20240307')
  })

  test('parses complexity thresholds from env vars', () => {
    process.env.MODEL_ROUTING_ENABLED = '1'
    process.env.ROUTING_SIMPLE_MAX_TOKENS = '500'
    process.env.ROUTING_MEDIUM_MAX_TOKENS = '2000'

    const config = getRoutingConfig()

    expect(config.complexityThresholds.simpleMaxTokens).toBe(500)
    expect(config.complexityThresholds.mediumMaxTokens).toBe(2000)
  })

  test('applies default threshold values when not specified', () => {
    process.env.MODEL_ROUTING_ENABLED = '1'

    const config = getRoutingConfig()

    expect(config.complexityThresholds.simpleMaxTokens).toBe(1000)
    expect(config.complexityThresholds.mediumMaxTokens).toBe(4000)
  })
})

describe('getRoutingModelConfig', () => {
  beforeEach(() => {
    delete process.env.MODEL_ROUTING_ENABLED
  })

  test('returns null when routing disabled', () => {
    const result = getRoutingModelConfig()

    expect(result).toBeNull()
  })

  test('returns routing model config when enabled', () => {
    process.env.MODEL_ROUTING_ENABLED = '1'

    const result = getRoutingModelConfig()

    expect(result).not.toBeNull()
    expect(result?.provider).toBe('firstParty')
    expect(result?.model).toBe('claude-3-haiku-20240307')
  })
})

describe('getFallbackModel', () => {
  beforeEach(() => {
    delete process.env.MODEL_ROUTING_ENABLED
  })

  test('returns null when routing disabled', () => {
    expect(getFallbackModel('simple')).toBeNull()
    expect(getFallbackModel('complex')).toBeNull()
  })

  test('returns simple model config', () => {
    process.env.MODEL_ROUTING_ENABLED = '1'
    process.env.SIMPLE_MODEL = 'custom-simple-model'

    const result = getFallbackModel('simple')

    expect(result).not.toBeNull()
    expect(result?.model).toBe('custom-simple-model')
  })

  test('returns complex model config', () => {
    process.env.MODEL_ROUTING_ENABLED = '1'
    process.env.COMPLEX_MODEL = 'custom-complex-model'

    const result = getFallbackModel('complex')

    expect(result).not.toBeNull()
    expect(result?.model).toBe('custom-complex-model')
  })
})
