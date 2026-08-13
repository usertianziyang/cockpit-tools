# Use native Responses for the official DeepSeek Codex preset

The official DeepSeek preset speaks DeepSeek's native Responses API upstream and migrates existing DeepSeek provider and API-key account records to that protocol (`wire_api = "responses"`, catalog `deepseek-v4-flash` + `deepseek-v4-pro`), because the vendor now documents native Codex support and the Chat Completions bridge is no longer needed for these accounts.

The official preset writes a native `deepseek` provider to `config.toml`, including the DeepSeek bearer token, and writes the vendor-published model metadata under the native `deepseek-v4-*` slugs. Requests go directly to `https://api.deepseek.com/responses`; they are not projected onto OpenAI model shells and do not pass through the local Chat Completions conversion gateway. Users who still need the legacy Chat Completions protocol must create a custom provider with a non-official endpoint.
