# 智能模型路由系统 (Intelligent Model Routing System)

## 功能概述 🚀

这是一个**多 URL 源的智能模型路由系统**，通过轻量级基础模型对任务进行意图识别、复杂度分析、格式校验，然后智能地将其路由到适合的大模型。

### 核心特性

- ✅ **多来源支持**：可配置多个 API Provider (URL) 作为备选方案
- ✅ **智能路由决策**：通过轻量模型（如 Haiku）先分析任务，再决定用哪个模型处理
- ✅ **成本优化**：简单任务 → 小模型（快速便宜），复杂任务 → 大模型（能力强）
- ✅ **透明集成**：无需修改现有代码，默认关闭不影响功能

---

## 架构设计 🏗️

```
┌─────────────────────────────────────────┐
│        User Message (User Input)         │
└─────────────┬───────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────┐
│   ROUTING MODEL (Haiku/Cheap Model)      │
│   - Intent Classification                │
│   - Complexity Analysis                  │
│   - Format Validation                    │
└─────────────┬───────────────────────────┘
              │
        ┌─────┴─────┐
        ▼           ▼
    Simple     Complex
      │            │
      ▼            ▼
┌──────────┐  ┌──────────────┐
│Small Model│  │ Large Model  │
│(Cheap)   │  │ (Premium)    │
└──────────┘  └──────────────┘
```

### 处理流程

1. **接收输入** → 用户消息进入系统
2. **意图识别** → Routing Model 分析任务类型（code gen/debug/explanation）
3. **复杂度评分** → 基于 token 数量 + 工具调用数 + 图片判断
4. **路由决策** → Simple → Cheap, Complex → Premium
5. **执行请求** → 使用选择的模型处理实际任务

---

## 配置指南 ⚙️

### 基本配置（必需）

```bash
# 开启路由系统
export MODEL_ROUTING_ENABLED=1

# Routing Model（用于分析/分类）
export ROUTING_API_KEY="sk-your-routing-api-key"
export ROUTING_MODEL="claude-3-haiku-20240307"

# Simpl Model（简单任务用）
export SIMPLE_API_KEY="sk-your-simple-api-key"
export SIMPLE_MODEL="claude-3-haiku-20240307"

# Complex Model（复杂任务用）
export COMPLEX_API_KEY="sk-your-complex-api-key"
export COMPLEX_MODEL="claude-3-7-sonnet-20250219"
```

### 可选配置

```bash
# Token 阈值控制
export ROUTING_SIMPLE_MAX_TOKENS=1000    # < 1000 tokens → Simple
export ROUTING_MEDIUM_MAX_TOKENS=4000   # > 4000 tokens → Complex

# 自定义 API URL（可选）
export ROUTING_BASE_URL="https://custom.endpoint"
export SIMPLE_BASE_URL="https://simple.endpoint"
export COMPLEX_BASE_URL="https://complex.endpoint"

# 成本阈值（可选）
export ROUTING_COST_THRESHOLD=1.0      # $ 上限
```

---

## 使用场景 📖

### 场景 1：简单问答（成本优化）

```typescript
// Input: "你好，今天天气怎么样？"
// Routing Model 分析：意图=greeting，tokens=20 → Simple
// Router Route → claude-3-haiku (低成本快速响应)
// Cost: ~$0.001 (vs $0.01 for Sonnet)
```

### 场景 2：代码生成（高质量）

```typescript
// Input: "写一个完整的 React 组件，带 TypeScript、测试和文档"
// Routing Model 分析：意图=code generation, tokens=500 → Complex
// Router Route → claude-3-7-sonnet (高能力模型)
// Cost: ~$0.05 (但质量更高)
```

### 场景 3：代码调试（中等）

```typescript
// Input: "帮我看看这段代码哪里错了"
// Routing Model 分析：intent=debug, tokens=200 → Simple/Medium
// Router Route → Haiku 或 Sonnet (平衡选择)
```

---

## 成本分析 💰

### 预计节省

| 任务类型 | 无路由（Sonnet） | 有路由 | 节省 |
|---------|-----------------|--------|------|
| 简单问答 (90%) | $0.01/token | $0.001/token | **~80%** |
| 代码生成 (5%) | $0.01/token | $0.03/token | **-200%** (质量更好) |
| 复杂数据分析 (5%) | $0.01/token | $0.02/token | **-100%** (需要大模型) |

### 总体期望

- **简单任务**：从 Sonnet ($0.03/token) → Haiku ($0.0008/token) = **97% cost reduction**
- **整体账单**：预计节省 **60-80%**（取决于简单任务占比）

---

## 环境配置示例 📝

### 完整示例（生产环境）

```bash
# .env.local 或 shell export

# === Routing System ===
export MODEL_ROUTING_ENABLED=1

# Routing Model (轻量分析)
export ROUTING_API_KEY="sk-routing-key"
export ROUTING_MODEL="claude-3-haiku-20240307"

# Simple Fallback (低成本)
export SIMPLE_API_KEY="sk-simple-key"
export SIMPLE_MODEL="claude-3-haiku-20240307"

# Complex Fallback (高质量)
export COMPLEX_API_KEY="sk-complex-key"
export COMPLEX_MODEL="claude-3-7-sonnet-20250219"

# Thresholds (可选)
export ROUTING_SIMPLE_MAX_TOKENS=800
export ROUTING_MEDIUM_MAX_TOKENS=3000
```

### CI/CD 示例（GitHub Actions）

```yaml
jobs:
  claude-tests:
    runs-on: ubuntu-latest
    env:
      MODEL_ROUTING_ENABLED: "1"
      ROUTING_API_KEY: ${{ secrets.ROUTING_API_KEY }}
      SIMPLE_API_KEY: ${{ secrets.SIMPLE_API_KEY }}
      COMPLEX_API_KEY: ${{ secrets.COMPLEX_API_KEY }}
    steps:
      - run: bun test
```

---

## 故障排查 🔧

### Q1: 路由返回 null？

**原因**：路由被禁用或 config 无效

**检查步骤**：
```bash
# 1. 确认启用
echo $MODEL_ROUTING_ENABLED  # Should be "1"

# 2. 确认所有 keys 存在
env | grep ROUTING_API_KEY
env | grep SIMPLE_API_KEY
env | grep COMPLEX_API_KEY

# 3. 查看路由 config（调试）
export DEBUG_ROUTING=1
```

### Q2: 路由不发挥作用？

**可能原因**：
- Keys 无效或过期
- Model not configured correctly
- Routing model call failed

**解决**：
```bash
# Test routing model connection
curl -H "Authorization: Bearer $ROUTING_API_KEY" \
     -H "Content-Type: application/json" \
     https://api.anthropic.com/v1/messages \
     -d '{"model":"claude-3-haiku","messages":[{"role":"user","content":"hello"}]}'
```

### Q3: 路由决策不正确？

**调整阈值**：
```bash
# 提高简单任务门槛
export ROUTING_SIMPLE_MAX_TOKENS=1500  # >1500 tokens 才路由到 Simple

# 降低复杂任务门槛  
export ROUTING_MEDIUM_MAX_TOKENS=2000  # >2000 tokens → Complex
```

---

## API 参考 📚

### `routingConfig.ts`

```typescript
// Config Parser
getRoutingConfig(): IntelligentRoutingConfig
// Returns: { enabled, routingModel, fallbackModels }

getRoutingModelConfig(): RoutingModelConfig | null
getFallbackModel(type: 'simple' | 'complex'): RoutingModelConfig | null
```

### `routingDecision.ts`

```typescript
// Complexity Analyzer
analyzeMessageComplexity(messages, config): Promise<RoutingAnalysis>

// Response Parser
parseRoutingResponse(response): RoutingAnalysis
// Returns: { complexity, estimatedTokens, intent, recommendation }

estimateTokenCount(messages): number
// Cost estimation helper
```

### `modelRouter.ts`

```typescript
// Main Entry Point
class ModelRouter {
  async routeRequest(messages): Promise<RoutingResult | null>
  // Returns routing decision for API call
}

const modelRouter = ModelRouter.getInstance()  // Singleton
```

---

## 测试验证 ✅

### 运行测试

```bash
# Config tests (should pass)
bun test src/utils/model/__tests__/routingConfig.test.ts

# Decision tests
bun test src/utils/model/__tests__/routingDecision.test.ts

# Router integration tests
bun test src/services/api/__tests__/modelRouter.test.ts
```

### 预期结果

- ✅ `routingConfig.test.ts`: 10/10 pass
- ✅ `routingDecision.test.ts`: Basic tests working
- ✅ `modelRouter.test.ts`: Integration verified

---

## FAQ ❓

**Q: 是否必须配置所有三个模型？**
A: 可以选择性配置。如果不设置 SIMPLE_MODEL，路由到 simple 时会 fallback 到 routingModel。但建议配置完整以获得成本优化效果。

**Q: 可以动态切换路由吗？**
A: 是的，通过环境变量实现。重启应用即可生效。未来可支持 runtime toggle via config API。

**Q: 如果 routing model 失败了怎么办？**
A: 系统会 fallback 到 default 行为（complex）。可以通过错误日志追踪问题。

**Q: 对现有代码有影响吗？**
A: 不影响！路由默认关闭，`MODEL_ROUTING_ENABLED=0`（或 unset）。开启后才发挥作用。

---

## 安全考虑 🔒

1. **API Keys**: 确保所有 `*_API_KEY` env vars 安全存储（不要提交到 git）
2. **Rate Limits**: Routing model 调用频繁，注意 API rate limits
3. **Cost Monitoring**: 定期检查实际成本 vs 预期节省
4. **Fallback Safety**: 路由失败时 fallback 到默认模型，不会中断服务

---

## 下一步优化 🚀

- [ ] 添加 A/B testing framework
- [ ] Dynamic threshold adjustment based on usage patterns
- [ ] Metrics dashboard for routing decisions
- [ ] Support more providers (OpenAI, Gemini, etc.)
- [ ] Cache routing decision for repeated queries

---

## Contributors & Credits

This feature was developed following the **Intelligent Model Routing System** architecture and best practices.

Contact: lulu27753@163.com
Repo: https://github.com/claude-code-best/claude-code
