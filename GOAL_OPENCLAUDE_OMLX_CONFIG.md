# Goal Loop: Configure OpenClaude for oMLX (Ornith-1.0-35B)

## Objective
Configure openclaude to connect to the local oMLX proxy at `http://127.0.0.1:8001` using the model `Ornith-1.0-35B-MTPLX-Vision-mxfp4-int4-mtp`, then verify that openclaude can generate a valid response through this setup. Do not exit the loop until you confirm a valid response is generated.

## Context
- **oMLX proxy**: Running at `http://127.0.0.1:8001`, auth token `958659`
- **Model**: `Ornith-1.0-35B-MTPLX-Vision-mxfp4-int4-mtp` (confirmed available via `/v1/models`)
- **OpenClaude binary**: `/Users/georgetozer/.local/bin/openclaude` (symlink to `@gitlawb/openclaude`)
- **Global config**: `~/.openclaude/settings.json`
- **Existing omlx launch script**: `~/.openclaude/omlx.sh` (sets env vars then launches openclaude)
- **Project-level config**: `/Users/georgetozer/Development/Portly/.openclaude/settings.local.json`

## Constraints
1. Do NOT modify the omlx proxy itself (it's a separate service)
2. Do NOT change the auth token (`958659`) — it's required by the proxy
3. Do NOT delete or overwrite `~/.openclaude/omlx.sh` — preserve the existing launch script
4. Do NOT modify any files outside `~/.openclaude/` or project `.openclaude/` directories
5. Do NOT install new npm packages or modify the openclaude binary
6. Do NOT change the model name — it must be exactly `Ornith-1.0-35B-MTPLX-Vision-mxfp4-int4-mtp`

## Read First
- `~/.openclaude/settings.json` — global openclaude settings (model, permissions)
- `~/.openclaude/omlx.sh` — existing launch script with env vars
- `/Users/georgetozer/Development/Portly/.openclaude/settings.local.json` — project-level overrides
- `/Users/georgetozer/Development/Shopify Apps/.openclaude/settings.json` — example of full openclaude config
- `~/.openclaude/model-discovery-cache.json` — check if model was already discovered
- Check if there are any openclaude docs: `~/.local/lib/node_modules/@gitlawb/openclaude/docs/`

## Validate
Run this command after each configuration change to test:

```bash
# Step 1: Verify oMLX proxy is running and model is available
curl -s http://127.0.0.1:8001/health
curl -s http://127.0.0.1:8001/v1/models -H 'Authorization: Bearer 958659'

# Step 2: Test that the proxy can generate a valid response with the model
curl -s http://127.0.0.1:8001/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer 958659" \
  -d '{"model": "Ornith-1.0-35B-MTPLX-Vision-mxfp4-int4-mtp", "messages": [{"role": "user", "content": "Reply with exactly one word: hello"}], "max_tokens": 10}'

# Step 3: Check openclaude config integrity
cat ~/.openclaude/settings.json

# Step 4: Verify openclaude binary is accessible
which openclaude
openclaude --version
```

## Checkpoints
Work in these checkpoints and log progress after each:

1. **Checkpoint 1 — Audit current state**: Read all config files, check omlx proxy health, verify the model is in the discovery cache, understand what's already configured vs. what's missing.
2. **Checkpoint 2 — Configure openclaude settings.json**: Ensure the global `~/.openclaude/settings.json` has `"model": "Ornith-1.0-35B-MTPLX-Vision-mxfp4-int4-mtp"` and any necessary provider/base URL settings.
3. **Checkpoint 3 — Configure environment/launch method**: Ensure the omlx.sh script has correct env vars (`ANTHROPIC_BASE_URL`, `ANTHROPIC_AUTH_TOKEN`, model vars). If openclaude supports provider profiles in settings.json, add the omlx provider there as an alternative.
4. **Checkpoint 4 — Test direct proxy call**: Confirm the omlx proxy responds with valid JSON for a chat completion request using the Ornith model.
5. **Checkpoint 5 — Test end-to-end**: Run openclaude with omlx env vars set and verify it can initialize and route a request through the proxy.
6. **Checkpoint 6 — Final verification**: Generate a valid response from openclaude configured against omlx with the Ornith model. Parse and validate the response JSON.

## Stop When
- The omlx proxy returns a valid chat completion response (JSON with `choices[0].message.content`) when called directly with curl, **AND**
- OpenClaude can be launched with the omlx configuration and successfully generates a non-empty response (test via `openclaude --help` or a direct prompt test using the configured provider), **AND**
- All config files are syntactically valid JSON and contain the correct model name and endpoint URL, **AND**
- A final verification command outputs the string `VALID RESPONSE CONFIRMED`
- OR when further progress requires changes to the omlx proxy itself or infrastructure beyond openclaude configuration

## Documentation
Write concise, targeted documentation for all changes — create a `docs/openclaude-omlx-setup.md` file (or update an existing one) documenting:
- How to launch openclaude with omlx (the env vars needed, the omlx.sh script usage)
- How to verify the connection works
- Troubleshooting steps if the proxy isn't responding
- The model name used

## Reward-Hacking Preventions
- Do NOT skip the end-to-end verification step — the curl test alone is not sufficient
- Do NOT accept an empty or error response as "valid"
- Do NOT modify the model name in any config to make the test pass more easily
- Do NOT delete or disable any existing config to bypass issues
- Do NOT accept stderr content as a valid response
