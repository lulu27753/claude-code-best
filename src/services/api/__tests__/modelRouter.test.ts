import { describe, test, expect, beforeEach } from 'bun:test'

describe('ModelRouter', () => {
  let router: ReturnType<typeof import('../modelRouter.js').ModelRouter.getInstance>

  beforeEach(() => {
    delete process.env.MODEL_ROUTING_ENABLED
    })

  test('routes simple tasks to lightweight model', async () => {
      process.env.MODEL_ROUTING_ENABLED = '1'
       const { ModelRouter } = await import('../modelRouter.js')
     router = ModelRouter.getInstance()

    const result = await router.routeRequest([{ role: 'user', content: 'hello' }])

   expect(result).not.toBeNull()
      })

  test('returns null when routing is disabled', async () => {
       delete process.env.MODEL_ROUTING_ENABLED
         router = ModelRouter.getInstance()

    const result = await router.routeRequest([{ role: 'user', content: 'test' }])

       expect(result).toBeNull()
      })
    })
