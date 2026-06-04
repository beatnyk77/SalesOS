// scripts/validate-env.ts
import { config } from 'dotenv';

// Load environment variables from .env.local
config({ path: '.env.local' });

const requiredEnvVars = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'EXA_API_KEY',
  // For LLM, either OpenAI or Anthropic must be set
];

// Check for at least one LLM provider
const hasOpenAI = !!process.env.OPENAI_API_KEY;
const hasAnthropic = !!process.env.ANTHROPIC_API_KEY;

const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingVars.length > 0) {
  console.error('❌ Missing required environment variables:');
  missingVars.forEach(varName => console.error(`  - ${varName}`));
  console.error('\nPlease add them to your .env.local file.');
  console.error('See .env.example for reference.');
  process.exit(1);
}

if (!hasOpenAI && !hasAnthropic) {
  console.error('❌ Missing LLM API key. Please set either OPENAI_API_KEY or ANTHROPIC_API_KEY in your .env.local file.');
  process.exit(1);
}

console.log('✅ All required environment variables are set.');