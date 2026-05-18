#!/bin/bash
# scripts/set-edge-secrets.sh
# Sets required secrets for Supabase Edge Functions.

if [ -z "$SUPABASE_PROJECT_REF" ]; then
  echo "Error: SUPABASE_PROJECT_REF is not set."
  exit 1
fi

echo "Setting Supabase Edge Secrets for project $SUPABASE_PROJECT_REF..."

# Create a temporary .env file for the secrets
cat <<EOF > /tmp/supabase-secrets.env
EXA_API_KEY=$EXA_API_KEY
HUNTER_API_KEY=$HUNTER_API_KEY
OPENAI_API_KEY=$OPENAI_API_KEY
RESEND_API_KEY=$RESEND_API_KEY
WEBHOOK_SECRET=$WEBHOOK_SECRET
EOF

# Set the secrets from the file
supabase secrets set --env-file /tmp/supabase-secrets.env --project-ref "$SUPABASE_PROJECT_REF"

# Clean up
rm /tmp/supabase-secrets.env

echo "✅ Edge secrets set successfully."
