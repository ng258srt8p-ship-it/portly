#!/usr/bin/env python3
"""Direct NIM API test — hits integrate.api.nvidia.com directly."""

import httpx
import time
import os
import json

NIM_API_KEY = os.getenv("NVIDIA_API_KEY") or os.getenv("NIM_API_KEY")
if not NIM_API_KEY:
    # Try reading from auth.json
    import json as _json
    with open("/Users/georgetozer/.hermes/auth.json") as f:
        auth = _json.load(f)
    nvidia_creds = auth.get("credential_pool", {}).get("nvidia", [])
    for c in nvidia_creds:
        if c.get("label") == "NVIDIA_API_KEY":
            NIM_API_KEY = c.get("api_key")
            break

if not NIM_API_KEY:
    print("ERROR: No NVIDIA_API_KEY found")
    exit(1)

BASE_URL = "https://integrate.api.nvidia.com/v1"
HEADERS = {
    "Authorization": f"Bearer {NIM_API_KEY}",
    "Content-Type": "application/json",
}

MODEL_RPM = {
    "nvidia/nemotron-3-ultra": 3,
    "deepseek-ai/deepseek-v4-pro": 12,
    "deepseek-ai/deepseek-v4-flash": 20,
    "meta/llama-3.3-70b-instruct": 28,
}

def call_model(model: str, idx: int = 0) -> dict:
    payload = {"model": model, "messages": [{"role": "user", "content": f"Say OK #{idx}"}], "max_tokens": 10}
    start = time.monotonic()
    try:
        with httpx.Client(timeout=30.0) as client:
            r = client.post(f"{BASE_URL}/chat/completions", headers=HEADERS, json=payload)
        elapsed = time.monotonic() - start
        return {
            "model": model,
            "idx": idx,
            "status": r.status_code,
            "elapsed": round(elapsed, 2),
            "error": None if r.status_code == 200 else r.text[:100],
        }
    except Exception as e:
        return {
            "model": model,
            "idx": idx,
            "status": 0,
            "elapsed": round(time.monotonic() - start, 2),
            "error": str(e)[:100],
        }

def test_burst(model: str, num_calls: int = 8):
    """Fire rapid calls and measure throttling."""
    rpm = MODEL_RPM.get(model, 35)
    print(f"\n=== Burst test: {model} ({rpm} RPM) x {num_calls} ===")
    start = time.monotonic()
    results = []
    for i in range(num_calls):
        r = call_model(model, i)
        results.append(r)
        status = r["status"]
        elapsed = r["elapsed"]
        if status == 200:
            print(f"  #{i+1}: ✓ 200 ({elapsed:.2f}s)")
        elif status == 429:
            print(f"  #{i+1}: ✗ 429 RATE LIMITED ({elapsed:.2f}s)")
        else:
            print(f"  #{i+1}: ✗ {status} ({elapsed:.2f}s) - {r['error']}")
    total = time.monotonic() - start
    success = sum(1 for r in results if r["status"] == 200)
    rate_limited = sum(1 for r in results if r["status"] == 429)
    print(f"  Total: {total:.2f}s | 200: {success} | 429: {rate_limited}")
    return results

def test_sustained(model: str, num_calls: int = 20, delay: float = 0.1):
    """Sequential calls with small delay — tests sustained rate."""
    rpm = MODEL_RPM.get(model, 35)
    print(f"\n=== Sustained test: {model} ({rpm} RPM) x {num_calls} (delay {delay}s) ===")
    start = time.monotonic()
    results = []
    for i in range(num_calls):
        r = call_model(model, i)
        results.append(r)
        time.sleep(delay)
    total = time.monotonic() - start
    success = sum(1 for r in results if r["status"] == 200)
    rate_limited = sum(1 for r in results if r["status"] == 429)
    print(f"  Total: {total:.2f}s | 200: {success} | 429: {rate_limited}")
    return results

if __name__ == "__main__":
    print("=" * 60)
    print("Direct NIM API Rate Limit Test")
    print("=" * 60)
    print(f"API Key: {NIM_API_KEY[:10]}...{NIM_API_KEY[-4:]}")
    
    # Test burst on different models
    test_burst("deepseek-ai/deepseek-v4-pro", 8)
    test_burst("nvidia/nemotron-3-ultra", 5)
    
    # Test sustained
    test_sustained("deepseek-ai/deepseek-v4-pro", 15, 0.5)
    
    print("\n" + "=" * 60)
    print("SUMMARY")
    print("=" * 60)
    print("If you saw 429s: NIM account limit hit — our Hermes limiter prevents this")
    print("If 0 429s: Either under limit or NIM has generous burst allowance")