# DeepSeek Codex / Responses API 官方协议核对

核对日期：2026-08-13。本文仅整理 DeepSeek 官方文档当前公开的协议要求，供 Cockpit Tools 的 DeepSeek 官方预设、Responses API 转发和余额查询实现与测试使用。

## 官方资料

- [接入 Codex](https://api-docs.deepseek.com/zh-cn/quick_start/agent_integrations/codex)
- [使用 Responses API](https://api-docs.deepseek.com/zh-cn/guides/responses_api)
- [Responses API 接口定义](https://api-docs.deepseek.com/zh-cn/api/create-response)
- [查询余额](https://api-docs.deepseek.com/zh-cn/api/get-user-balance)
- [首次调用 API（认证示例）](https://api-docs.deepseek.com/zh-cn/)
- [错误码](https://api-docs.deepseek.com/zh-cn/quick_start/error_codes)

## 1. Codex 接入配置

DeepSeek 原生支持 Codex 使用的 Responses API。Codex CLI、ChatGPT 桌面端和 VS Code Codex 插件共用 `~/.codex/config.toml` 与模型目录，因此配置一次即可供三种客户端使用。[来源](https://api-docs.deepseek.com/zh-cn/quick_start/agent_integrations/codex)

官方手动配置的核心字段如下：

```toml
model = "deepseek-v4-flash"
model_provider = "deepseek"
preferred_auth_method = "apikey"
forced_login_method = "api"
model_reasoning_effort = "high"
model_catalog_json = "~/.codex/models.json"

[model_providers.deepseek]
name = "deepseek"
base_url = "https://api.deepseek.com/"
wire_api = "responses"
experimental_bearer_token = "<DeepSeek API Key>"
```

协议实现必须保留以下含义：[来源](https://api-docs.deepseek.com/zh-cn/quick_start/agent_integrations/codex)

| 字段 | 约束 |
| --- | --- |
| `model_provider` | 必须指向下方同名 provider 配置段。 |
| `preferred_auth_method = "apikey"`、`forced_login_method = "api"` | 使用 API Key，跳过 ChatGPT 账号登录。 |
| `base_url` | 官方地址为 `https://api.deepseek.com/`。 |
| `wire_api` | 必须是 `"responses"`，不能把官方预设继续按 Chat Completions 协议发送。 |
| `experimental_bearer_token` | 直接填写 DeepSeek API Key。生成或记录配置时必须按密钥处理。 |
| `model_catalog_json` | 指向官方模型元数据目录。 |

官方模型目录当前声明 `deepseek-v4-flash` 和 `deepseek-v4-pro`，最低 Codex 客户端版本均为 `0.144.0`；两者只接受文本输入、不开启 Responses Lite、不偏好 WebSocket，支持并行工具调用、服务端搜索和 `apply_patch` freeform 工具。官方目录给出的上下文窗口为 `1,048,576`，有效窗口比例为 95%，Codex 侧截断策略为 token 模式、保留限额 `10,000`。[来源](https://api-docs.deepseek.com/zh-cn/quick_start/agent_integrations/codex)

官方脚本在改写配置前会备份 `config.toml`、保留 MCP 与项目信任配置、删除冲突字段并说明原因，且先校验 TOML/JSON，失败时不写文件。产品内的配置改写应达到同等的可恢复性和原子性。[来源](https://api-docs.deepseek.com/zh-cn/quick_start/agent_integrations/codex)

切换提供方后，Codex 会按登录方式分组显示历史会话；旧会话没有被删除，只会暂时隐藏。ChatGPT 桌面端切换后需要重启。Windows 模型选择器可能显示“自定义”，这仍可能表示已实际使用 DeepSeek。[来源](https://api-docs.deepseek.com/zh-cn/quick_start/agent_integrations/codex)

## 2. Responses API 请求

接口为 `POST https://api.deepseek.com/responses`。它是无状态 API，服务端不存储响应或会话；多轮调用必须由客户端把历史 item 重新放入下一次 `input`。[来源](https://api-docs.deepseek.com/zh-cn/api/create-response)

DeepSeek API 的通用认证方式是 `Authorization: Bearer <DEEPSEEK_API_KEY>`；JSON 请求同时发送 `Content-Type: application/json`。[来源](https://api-docs.deepseek.com/zh-cn/)

### 顶层参数兼容性

下表为 DeepSeek 当前明确公布的兼容范围。[来源](https://api-docs.deepseek.com/zh-cn/guides/responses_api)

| 参数 | 支持情况与约束 |
| --- | --- |
| `model` | 支持 `deepseek-v4-flash`、`deepseek-v4-pro`。 |
| `input` | 支持字符串或输入 item 列表；`input` 与 `instructions` 至少提供一个。 |
| `instructions` | 支持，作为第一条 system 消息。 |
| `stream` | 支持。 |
| `temperature` | 支持 `[0.0, 2.0]`；思考模式下不生效。 |
| `top_p` | 支持；思考模式下不生效。 |
| `max_output_tokens` | 支持。 |
| `top_logprobs` | 支持 `[0, 20]`。 |
| `tools` | 部分支持，见工具表。 |
| `tool_choice` | 支持 `none`、`auto`、`required`，也支持指定 function 或 web search。 |
| `reasoning` | `effort` 支持；`summary` 可以传入，但不生成摘要。 |
| `text` | `format` 完整支持；`verbosity` 可传入但不生效。 |
| `user` | 支持，可用于限速和用户隔离。 |
| `parallel_tool_calls` | 忽略；并行工具调用始终开启。 |
| `max_tool_calls` | 忽略。 |
| `previous_response_id`、`conversation` | 不支持，因为 API 无状态。 |
| `store` | 不支持；响应中恒为 `false`。 |
| `background`、`metadata`、`include`、`prompt` | 不支持。 |
| `truncation` | 不支持；输入超出上下文窗口时返回 HTTP 400。 |
| `service_tier`、`safety_identifier` | 不支持。 |
| `prompt_cache_key`、`prompt_cache_retention` | 不支持；上下文缓存由服务端自动管理。 |
| `context_management`、`stream_options` | 不支持。 |

不支持的顶层参数会被静默忽略而不是报错。兼容层不能以“请求成功”推断某个参数已实际生效。[来源](https://api-docs.deepseek.com/zh-cn/guides/responses_api)

### 输入 item 兼容性

| item 类型 | 支持情况与约束 |
| --- | --- |
| `message` | 支持 `user`、`assistant`、`system`、`developer`；`developer` 按 `system` 处理。content 支持字符串及 `input_text` / `output_text`。 |
| `input_image` / 文件输入 | 不支持。`input_image` 不报错，而是替换为占位文本。 |
| `function_call` | 支持，并归并到相邻 assistant 消息。 |
| `function_call_output` | 支持。 |
| `reasoning` | 明文 `content` 归并到相邻 assistant 消息；不支持 `summary`、`encrypted_content`。 |
| `web_search_call` | 支持原样回传，服务端自动恢复搜索结果。 |
| 其他 item 类型 | 忽略。 |

来源：[Responses API 兼容性明细](https://api-docs.deepseek.com/zh-cn/guides/responses_api)

### 工具兼容性

| 工具类型 | 支持情况与约束 |
| --- | --- |
| `function` | 支持。 |
| `web_search`、`web_search_2025_08_26` | 支持，由服务端执行；`search_context_size`、`user_location` 被忽略。 |
| `custom` | 只支持 `{ "type": "custom", "name": "apply_patch" }`；其他 custom 名称返回 HTTP 400。 |
| `file_search`、`code_interpreter`、`computer_use`、`mcp` 等 | 忽略。 |

来源：[Responses API 兼容性明细](https://api-docs.deepseek.com/zh-cn/guides/responses_api)

## 3. Responses API 响应与流式事件

非流式响应与 OpenAI Responses API 的 response 对象结构兼容。依赖未支持能力的字段返回固定值，例如 `store: false`、`previous_response_id: null`、`parallel_tool_calls: true`。[来源](https://api-docs.deepseek.com/zh-cn/guides/responses_api)

`usage` 至少需要兼容以下字段：[来源](https://api-docs.deepseek.com/zh-cn/guides/responses_api)

- `input_tokens`，其中 `input_tokens_details.cached_tokens` 表示命中上下文缓存的 token 数；
- `output_tokens`，其中 `output_tokens_details.reasoning_tokens` 表示思维链 token 数。

当 `stream: true` 时，响应为语义化 SSE 事件序列。每个事件数据对象都带 `type`（文档也称 event 类型）与递增的 `sequence_number`。SSE 帧示例使用 `event: response.output_text.delta` 和相应 JSON `data:`。实现不能只解析裸 `data:`，也不能依赖 Chat Completions 的 chunk 结构。[来源](https://api-docs.deepseek.com/zh-cn/api/create-response)

完整事件族如下：[来源](https://api-docs.deepseek.com/zh-cn/guides/responses_api)

| 事件 | 含义 |
| --- | --- |
| `response.created` | 首个事件，response 状态为 `in_progress`。 |
| `response.in_progress` | 响应正在生成。 |
| `response.output_item.added` / `.done` | reasoning、message、function_call、custom_tool_call 或 web_search_call 输出 item 开始/完成。 |
| `response.content_part.added` / `.done` | 输出 item 内内容块开始/完成。 |
| `response.reasoning_text.delta` / `.done` | 思维链文本增量/完整文本。 |
| `response.output_text.delta` / `.done` | 输出文本增量/完整文本。 |
| `response.function_call_arguments.delta` / `.done` | Function 参数增量/完整参数。 |
| `response.custom_tool_call_input.delta` / `.done` | `apply_patch` 输入增量/完整输入。 |
| `response.web_search_call.in_progress` / `.searching` / `.completed` | 服务端联网搜索状态。 |
| `response.completed` | 正常终止，携带含 `usage` 的完整 response。 |
| `response.incomplete` | 截断终止，例如达到 `max_output_tokens`，携带完整 response。 |
| `response.failed` | 失败终止，携带含 `error` 的完整 response。 |

流的最后一条事件只能按 `response.completed`、`response.incomplete` 或 `response.failed` 判断。DeepSeek Responses 流没有 `data: [DONE]`；等待 `[DONE]` 会导致客户端不能正常收尾。[来源](https://api-docs.deepseek.com/zh-cn/guides/responses_api)

## 4. 余额查询

请求为 `GET https://api.deepseek.com/user/balance`，无请求体。[接口与路径来源](https://api-docs.deepseek.com/zh-cn/api/get-user-balance) [API 基地址来源](https://api-docs.deepseek.com/zh-cn/)

余额接口使用同一 DeepSeek API Key 认证，即请求头 `Authorization: Bearer <DEEPSEEK_API_KEY>`。官方余额页未单独重复认证段；该要求来自 DeepSeek 官方首次调用文档公布的 API 通用 Bearer 认证方式。缺失或错误密钥返回 401。[认证来源](https://api-docs.deepseek.com/zh-cn/) [401 来源](https://api-docs.deepseek.com/zh-cn/quick_start/error_codes)

HTTP 200 返回 JSON：

```json
{
  "is_available": true,
  "balance_infos": [
    {
      "currency": "CNY",
      "total_balance": "110.00",
      "granted_balance": "10.00",
      "topped_up_balance": "100.00"
    }
  ]
}
```

字段契约：[来源](https://api-docs.deepseek.com/zh-cn/api/get-user-balance)

| 字段 | 类型 | 含义 |
| --- | --- | --- |
| `is_available` | boolean | 当前账户是否有余额可供 API 调用。它不是金额字段的替代。 |
| `balance_infos` | object[] | 按币种返回的余额明细；实现应遍历数组，不能假定只有一项。 |
| `currency` | string | 仅 `CNY` 或 `USD`。 |
| `total_balance` | string | 总可用余额，包含赠金和充值余额。 |
| `granted_balance` | string | 未过期赠金余额。 |
| `topped_up_balance` | string | 充值余额。 |

所有金额都是十进制字符串，不是 JSON number。解析时应使用十进制定点表示或保留原字符串，不能经二进制浮点计算后再显示。[类型来源](https://api-docs.deepseek.com/zh-cn/api/get-user-balance)

与本功能直接相关的官方错误码包括 400（请求体格式错误）、401（认证失败）、402（余额不足）、422（参数错误）、429（TPM/RPM 达到上限）、500（服务端故障）和 503（服务繁忙）。调用侧应保留 HTTP 状态与错误正文；500/503 可按有界退避重试，401/402 不应盲目重试。[错误含义来源](https://api-docs.deepseek.com/zh-cn/quick_start/error_codes)

## 5. 实现与验证清单

- 官方 DeepSeek 预设生成 `wire_api = "responses"`，模型为 `deepseek-v4-flash` / `deepseek-v4-pro`，并使用 Responses 原生请求，不回退为 Chat Completions。[来源](https://api-docs.deepseek.com/zh-cn/quick_start/agent_integrations/codex)
- 上游 Responses URL 最终为 `https://api.deepseek.com/responses`；余额 URL 为 `https://api.deepseek.com/user/balance`，不能误加 `/v1`。[来源](https://api-docs.deepseek.com/zh-cn/api/create-response) [来源](https://api-docs.deepseek.com/zh-cn/api/get-user-balance)
- 两类请求都发送相应 DeepSeek API Key 的 Bearer 认证，且日志、诊断、持久化导出中不泄露密钥。[来源](https://api-docs.deepseek.com/zh-cn/)
- Responses 非流式路径保留完整 `output` 和 `usage`；流式路径识别全部语义事件与三种终止事件，不等待 `[DONE]`。[来源](https://api-docs.deepseek.com/zh-cn/guides/responses_api)
- 多轮由客户端重放历史，不发送 `previous_response_id` 或 `conversation` 并期待服务端续接。[来源](https://api-docs.deepseek.com/zh-cn/guides/responses_api)
- `apply_patch` custom tool、function call/output、web search、reasoning 和 message items 能往返；图片、文件以及未支持工具不会被错误地宣称为可用。[来源](https://api-docs.deepseek.com/zh-cn/guides/responses_api)
- 余额响应按 `balance_infos[]` 和字符串金额解析，同时展示 `is_available`；覆盖 CNY、USD、多币种、零余额、401 和网络失败。[来源](https://api-docs.deepseek.com/zh-cn/api/get-user-balance)
