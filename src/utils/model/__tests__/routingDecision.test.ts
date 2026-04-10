import { describe, test, expect } from 'bun:test'

describe('analyzeMessageComplexity', () => {
  test('returns analysis with estimated tokens for greeting messages', async () => {
    const { analyzeMessageComplexity } = await import('../routingDecision.js')
     const routingConfig = { provider: 'firstParty' as const, model: 'claude-3-haiku-tests', apiKeyEnvar: 'TEST_KEY' }

    const result = await analyzeMessageComplexity([{ role: 'user', content: 'hello' }], routingConfig)
      expect(result.estimatedTokens).toBeGreaterThan(0)
       })

  test('parses routing response correctly', async () => {
      const { parseRoutingResponse } = await import('../routingDecision.js')

    const result = parseRoutingResponse(JSON.stringify({ complexity: 'simple' as const, estimatedTokens: 150, intent: 'test' }))
     expect(result.complexity).toBe('simple')
       expect(result.estimatedTokens).toBe(150)
      expect(result.intent).toBe('test')
        })
    })

describe('estimateTokenCount', () => {
  test('returns tokens for messages', async () => {
     const { estimateTokenCount } = await import('../routingDecision.js')

    expect(estimateTokenCount([{ role: 'user', content: 'hello' }])).toBeGreaterThan(0)
       })

    test('counts larger messages with more tokens', async () => {
        const { estimateTokenCount } = await import('../routingDecision.js')
         const shortResult = estimateTokenCount([{ role: 'user', content: 'hi' }])
             const longResult = estimateTokenCount([{ role: 'user', content: 'this is a much longer message with more tokens' }])

            expect(shortResult).toBeGreaterThan(0)
               expect(shortResult).toBeLessThan(longResult)
                    })
                })
