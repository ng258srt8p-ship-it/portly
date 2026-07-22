**Objective:** Verify the full oMLX + Ornith-35B + DFlash setup is working, correctly tuned, producing fast generation speeds, and handling tool calls without errors.
**Read first:** ~/.omlx/settings.json, ~/.omlx/model_settings.json, ~/.omlx/logs/server.log (last 50 lines), ~/.openclaude/omlx.sh
**Constraints:** Do NOT modify oMLX server code. Do NOT change model files. Do NOT delete logs. Do NOT change auth tokens or API keys.
**Validate:** Run `curl -s http://127.0.0.1:8001/health -H "Authorization: Bearer 958659"` for health; `curl -s http://127.0.0.1:8001/v1/models -H "Authorization: Bearer 958659"` to confirm models listed; check generator speed in oMLX logs after each test prompt.
**Checkpoints:**
1. Verify oMLX server is running and healthy → check health endpoint, server log for errors/warnings
2. Verify Ornith model is loaded and DFlash is active → check log for "DFlashEngine loaded" and DFlash generation entries
3. Verify context window config → max_context_window should be 131072, max_context_window_policy 131072
4. Verify timeout configs → CLAUDE_STREAM_IDLE_TIMEOUT_MS ≥ 600000, API_TIMEOUT_MS ≥ 3000000
5. Send a minimal test prompt → confirm generation speed (target ≥ 20 tok/s at small context)
6. Send a prompt requesting a tool call (Bash/Read/Edit) → confirm tool_calls finish_reason works
7. Check token rates at various context sizes → log speeds for prompts at 10k, 50k, 100k tokens
8. Report summary of all findings with pass/fail for each check
**Document:** Write a brief summary to GOAL_VERIFY_OMLX_SETUP.md updating the results section at the bottom with pass/fail status for each checkpoint, any issues found, and recommended fixes.
**Stop when:** All 8 checkpoints pass with acceptable metrics (health OK, DFlash active, ≥15 tok/s at ≤50k context, tool calls return cleanly, no 400/timeout errors), OR when a fix requires changes outside the allowed scope.
