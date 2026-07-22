/**
 * Test Unsloth LLM Integration Options
 * 
 * Unsloth provides fast fine-tuned models via:
 * 1. HuggingFace Hub (GGUF quantized models)
 * 2. Local inference via llama.cpp / MLX / vLLM
 * 3. Cloud endpoints (if available)
 */

const UNSLOTH_MODELS_HF = [
  'unsloth/Llama-3-8B-bnb-4bit',
  'unsloth/Mistral-7b-Instruct-v0.3-bnb-4bit',
  'unsloth/gemma-7b-bnb-4bit',
  'unsloth/Llama-3-8B-GGUF',
  'unsloth/Mistral-7b-Instruct-v0.3-GGUF',
];

async function testHuggingFaceHub() {
  console.log('\n🤗 Testing HuggingFace Hub for Unsloth models...\n');
  
  const results: Array<{model: string, status: string, data?: any, error?: string}> = [];
  
  for (const model of UNSLOTH_MODELS_HF.slice(0, 3)) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      const url = `https://huggingface.co/api/models/${model}`;
      const res = await fetch(url, {
        headers: { 'User-Agent': 'TripTide Bot/1.0' },
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      
      if (res.ok) {
        const data = await res.json();
        console.log('✅ ' + model);
        console.log('   Downloads: ' + (data.downloads ? data.downloads.toLocaleString() : 'N/A'));
        console.log('   Likes: ' + (data.likes ? data.likes.toLocaleString() : 'N/A'));
        console.log('   Pipeline: ' + (data.pipeline_tag || 'N/A'));
        results.push({ model, status: 'found', data });
      } else {
        console.log('❌ ' + model + ' - ' + res.status);
        results.push({ model, status: 'not_found' });
      }
    } catch (err: any) {
      console.log('❌ ' + model + ' - ' + err.message);
      results.push({ model, status: 'error', error: err.message });
    }
  }
  
  return results;
}

async function testOllamaLocal() {
  console.log('\n🦙 Testing local Ollama for Unsloth models...\n');
  
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);
    
    const res = await fetch('http://localhost:11434/api/tags', {
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    
    if (!res.ok) {
      console.log('❌ Ollama not running or unreachable');
      return { running: false, models: [] };
    }
    
    const data: any = await res.json();
    const models = data.models || [];
    
    if (models.length === 0) {
      console.log('⚠️  Ollama running but no models installed');
      return { running: true, models: [] };
    }
    
    console.log('✅ Ollama running with ' + models.length + ' model(s):\n');
    
    const unslothModels = models.filter((m: any) => 
      m.name.toLowerCase().includes('unsloth') || 
      m.name.toLowerCase().includes('llama-3') ||
      m.name.toLowerCase().includes('mistral')
    );
    
    if (unslothModels.length > 0) {
      console.log('🎯 Unsloth/compatible models found:');
      unslothModels.forEach((m: any) => {
        console.log('   - ' + m.name + ' (' + (m.size / 1e9).toFixed(1) + ' GB)');
      });
    } else {
      console.log('ℹ️  No Unsloth models found, but Ollama is ready for installation');
    }
    
    return { running: true, models };
  } catch (err: any) {
    console.log('❌ Ollama test failed: ' + err.message);
    return { running: false, models: [] };
  }
}

async function testLMStudioLocal() {
  console.log('\n🎬 Testing local LM Studio for Unsloth models...\n');
  
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);
    
    const res = await fetch('http://localhost:1234/v1/models', {
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    
    if (!res.ok) {
      console.log('❌ LM Studio server not running');
      return { running: false, models: [] };
    }
    
    const data: any = await res.json();
    const models = data.data || [];
    
    if (models.length === 0) {
      console.log('⚠️  LM Studio running but no models loaded');
      return { running: true, models: [] };
    }
    
    console.log('✅ LM Studio running with ' + models.length + ' model(s):\n');
    
    models.forEach((m: any) => {
      console.log('   - ' + m.id);
    });
    
    return { running: true, models };
  } catch (err: any) {
    console.log('❌ LM Studio test failed: ' + err.message);
    return { running: false, models: [] };
  }
}

async function testMLXMac() {
  console.log('\n🍎 Testing MLX (Apple Silicon) for Unsloth models...\n');
  
  const { exec } = require('child_process');
  const util = require('util');
  const execPromise = util.promisify(exec);
  
  try {
    await execPromise('which mlx_lm');
    console.log('✅ MLX installed');
    
    const cacheDir = process.env.HOME + '/.cache/mlx';
    try {
      const result: any = await execPromise('ls -la ' + cacheDir + ' 2>/dev/null | head -10');
      console.log('📁 MLX cache directory:\n');
      console.log(result.stdout);
      
      if (result.stdout.toLowerCase().includes('unsloth')) {
        console.log('🎯 Unsloth models found in MLX cache!');
      } else {
        console.log('ℹ️  No Unsloth models in cache yet');
      }
    } catch (e) {
      console.log('⚠️  MLX cache directory empty or inaccessible');
    }
    
    return { installed: true };
  } catch (err: any) {
    console.log('❌ MLX not installed: ' + err.message);
    return { installed: false };
  }
}

async function runAllTests() {
  console.log('🚀 Unsloth Integration Test Suite\n');
  console.log('Testing all possible integration paths...\n');
  
  const hfResults = await testHuggingFaceHub();
  const ollamaResults = await testOllamaLocal();
  const lmStudioResults = await testLMStudioLocal();
  const mlxResults = await testMLXMac();
  
  console.log('\n' + '='.repeat(60));
  console.log('SUMMARY & RECOMMENDATIONS');
  console.log('='.repeat(60));
  
  const hfFound = hfResults.filter((r) => r.status === 'found').length;
  console.log('\n📊 HuggingFace Hub: ' + hfFound + '/' + UNSLOTH_MODELS_HF.slice(0, 3).length + ' models found');
  console.log('🦙 Ollama: ' + (ollamaResults.running ? '✅ Running' : '❌ Not running') + ' (' + ollamaResults.models.length + ' models)');
  console.log('🎬 LM Studio: ' + (lmStudioResults.running ? '✅ Running' : '❌ Not running') + ' (' + lmStudioResults.models.length + ' models)');
  console.log('🍎 MLX: ' + (mlxResults.installed ? '✅ Installed' : '❌ Not installed'));
  
  console.log('\n💡 RECOMMENDATION:');
  
  if (ollamaResults.running && ollamaResults.models.length > 0) {
    console.log('   → Use Ollama (already running with models)');
    console.log('   → Install Unsloth: ollama run unsloth/llama-3-8b-bnb-4bit');
  } else if (lmStudioResults.running) {
    console.log('   → Use LM Studio (already running)');
    console.log('   → Download Unsloth GGUF from HuggingFace');
  } else if (mlxResults.installed) {
    console.log('   → Use MLX (Apple Silicon native)');
    console.log('   → Run: mlx_lm.generate --model unsloth/Llama-3-8B-bnb-4bit');
  } else {
    console.log('   → Install Ollama: https://ollama.ai');
    console.log('   → Then run: ollama run unsloth/llama-3-8b-bnb-4bit');
  }
  
  console.log('\n📚 Next Step: Add Unsloth to Hermes config.yaml');
  console.log('   See: ~/.hermes/config.yaml → providers: section');
}

runAllTests().catch(console.error);