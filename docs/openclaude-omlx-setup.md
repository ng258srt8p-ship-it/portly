# OpenClaude + oMLX Setup

## Overview

This setup configures [OpenClaude](https://github.com/Gitlawb/openclaude) to connect to the local **oMLX proxy** serving the `Ornith-1.0-35B-MTPLX-Vision-mxfp4-int4-mtp` model.

The oMLX proxy runs at `http://127.0.0.1:8001` and provides an Anthropic-compatible API endpoint. OpenClaude is configured to route all API calls through this proxy using the target model.

## Files

| File | Purpose |
|------|---------|
| `~/.openclaude/settings.json` | Global openclaude config — sets the default model to `Ornith-1.0-35B-MTPLX-Vision-mxfp4-int4-mtp` |
| `~/.openclaude/omlx.sh` | Launch script — sets required env vars, then launches openclaude |

## How to Launch

### Via the omlx launch script (recommended)

```bash
bash ~/.openclaude/omlx.sh
```

Or source it to apply env vars to your current shell first:

```bash
source ~/.openclaude/omlx.sh
openclaude
```

### Direct (if env vars are already set)

```bash
openclaude
```

Requires these environment variables to be set:

| Variable | Value |
|----------|-------|
| `ANTHROPIC_BASE_URL` | `http://127.0.0.1:8001` |
| `ANTHROPIC_AUTH_TOKEN` | `958659` |
| `ANTHROPIC_DEFAULT_OPUS_MODEL` | `Ornith-1.0-35B-MTPLX-Vision-mxfp4-int4-mtp` |
| `ANTHROPIC_DEFAULT_SONNET_MODEL` | `Ornith-1.0-35B-MTPLX-Vision-mxfp4-int4-mtp` |
| `ANTHROPIC_DEFAULT_HAIKU_MODEL` | `Ornith-1.0-35B-MTPLX-Vision-mxfp4-int4-mtp` |

## How It Works

1. `omlx.sh` sets `ANTHROPIC_BASE_URL=http://127.0.0.1:8001` — this tells OpenClaude's Anthropic API client to send all requests to the oMLX proxy instead of the Anthropic cloud API.
2. `ANTHROPIC_AUTH_TOKEN=958659` is the proxy's authentication token (sent as `Authorization: Bearer` header).
3. The model env vars ensure OpenClaude requests the correct Ornith model regardless of which model "tier" (Opus/Sonnet/Haiku) is selected internally.
4. `settings.json` has `"model": "Ornith-1.0-35B-MTPLX-Vision-mxfp4-int4-mtp"` as the default model name.

## Verifying the Connection

### Check the proxy is running

```bash
curl -s http://127.0.0.1:8001/health
```

Expected response: `{"status":"healthy",...}`

### List available models

```bash
curl -s http://127.0.0.1:8001/v1/models -H 'Authorization: Bearer 958659'
```

Expected: A JSON list with 8 models including `Ornith-1.0-35B-MTPLX-Vision-mxfp4-int4-mtp`.

### Test a chat completion

```bash
curl -s http://127.0.0.1:8001/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer 958659" \
  -d '{
    "model": "Ornith-1.0-35B-MTPLX-Vision-mxfp4-int4-mtp",
    "messages": [{"role": "user", "content": "Say hello"}],
    "max_tokens": 20
  }'
```

Expected: A valid JSON response with `choices[0].message.content` containing text.

## Troubleshooting

| Symptom | Likely Cause | Fix |
|---------|-------------|-----|
| `curl: connection refused` on :8001 | oMLX proxy not running | Start the oMLX server |
| `401 Unauthorized` | Wrong auth token | Verify `ANTHROPIC_AUTH_TOKEN=958659` |
| `404` on `/v1/models` | Wrong URL | Verify `ANTHROPIC_BASE_URL=http://127.0.0.1:8001` |
| Model name errors | Model not loaded | Check `/health` for `loaded_count` |
| Wrong model response | Env vars not set | Source `omlx.sh` before launching openclaude |

## Model Details

- **Model ID**: `Ornith-1.0-35B-MTPLX-Vision-mxfp4-int4-mtp`
- **Quantization**: mxfp4-int4 (mixed FP4 + INT4, MTP)
- **Context window**: 262,144 tokens (256K)
- **Provider**: oMLX (local inference via MLX on Apple Silicon)
