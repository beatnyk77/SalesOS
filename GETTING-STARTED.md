# Getting Started with SalesOS (AI Co-Founder)

## 1. Project Overview
SalesOS is your autonomous AI Co-Founder designed specifically for solopreneurs, small agencies, and B2B service businesses. It handles the heavy lifting of the sales process—from finding and qualifying leads to drafting personalized outreach and generating final contracts—allowing you to focus entirely on closing deals and serving your clients.

By implementing SalesOS, businesses typically see a **60-70% reduction in time-to-first-contact**, **2-3x increase in reply rates** through hyper-personalization, and the ability to generate professional, collateral-backed **proposals in under 15 minutes**. It’s not just a CRM; it’s an intelligent sales engine that learns your business and acts on your behalf.

## 2. Prerequisites
To get SalesOS running, you will need the following accounts and API keys. Most offer a generous free tier for getting started:

*   **Supabase (Database & Auth):** Create a project at [supabase.com](https://supabase.com). You'll need your `Project URL` and `Anon Key`.
*   **Exa (AI Search):** Get your API key at [exa.ai](https://exa.ai). This powers the deep company research and lead enrichment.
*   **Hunter.io (Email Verification):** Get an API key at [hunter.io](https://hunter.io) to ensure your outreach never bounces.
*   **OpenAI/Anthropic (LLM Brain):** Ensure you have an API key from [OpenAI](https://platform.openai.com) or [Anthropic](https://console.anthropic.com) to power the agent crews.
*   **HubSpot or Gmail (Outreach):** Connect your existing accounts via the integration settings to enable automated (yet approved) sending.
*   **WhatsApp (Twilio or Meta Business):** A WhatsApp Business API account is required for the automated nurturer module.

## 3. Deployment Options

### Option 1: Local Development (Fastest for testing)
1.  **Clone the Repo:** `git clone https://github.com/beatnyk77/SalesOS.git`
2.  **Install Dependencies:** `npm install`
3.  **Setup Environment:** Create a `.env.local` file in the root directory (see checklist below).
4.  **Run Migrations:** Ensure the Supabase CLI is installed, then run `supabase db push`.
5.  **Start App:** `npm run dev`

### Option 2: Deploy Backend to Supabase (Edge Functions)
Deploy your intelligent agents to the cloud so they can run 24/7:
1.  Link your local project: `supabase link --project-ref your-project-id`
2.  Deploy functions: `supabase functions deploy`
3.  Set secrets: `supabase secrets set EXA_API_KEY=your_key HUNTER_API_KEY=your_key`

### Option 3: Deploy Frontend to Vercel (Recommended for Production)
1.  Push your code to a GitHub repository.
2.  Import the project into [Vercel](https://vercel.com).
3.  Add all environment variables from your `.env.local` to the Vercel project settings.

### Environment Variables Checklist (.env.local)
```bash
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key # KEEP SECRET
EXA_API_KEY=your_exa_key
HUNTER_API_KEY=your_hunter_key
OPENAI_API_KEY=your_openai_key
```

## 4. First-Time Setup (3-Minute Quick Start)
1.  **Initialize Database:** Run `supabase db push` to set up the leads, collateral, and contract tables.
2.  **Set Secrets:** Use the `supabase secrets set` command for all external API keys so the agents can access them securely.
3.  **Launch:** Run `npm run dev`. On first load, navigate to the **Dashboard**. You will see the "Actions Pending Approval" carousel, which will be empty until your agents start working.

## 5. How to Use SalesOS – Step-by-Step Workflow

1.  **Quick-Start ICP Generator:** Define your Ideal Customer Profile. The AI will use this to filter and score every prospect.
2.  **Upload Marketing Collateral:** Upload your PDFs, decks, and case studies. SalesOS indexs these to "prove" your value in every email and proposal.
3.  **Bulk Prospect Upload:** Drop a CSV or Excel file of leads into the **Prospects** tab. The **Evaluator Crew** will immediately start parallel enrichment (Exa) and qualification (Hunter + ICP Scoring).
4.  **Daily Usage Loop:**
    *   **Qualification:** Review high-scoring leads in the **Leads** tab.
    *   **Outreach:** Review AI-drafted **Emails** and **WhatsApp** messages. Edit if needed, then hit "Approve."
    *   **Meeting Prep:** Before a call, check the **Voice Prep** brief generated from your lead's research.
    *   **Proposals:** After the call, trigger the **Proposal Drafter**. It will automatically include relevant case studies from your collateral.
    *   **Negotiation:** If a prospect raises a price objection, the **Negotiation Crew** drafts a justification based on your ROI data for your review.
    *   **Closing:** Generate a **Contract** in one click and track the deal to "Signed" status in the **Closing Dashboard**.

**Pro-Tip: Dry-Run Mode**
By default, SalesOS runs in **Dry-Run Mode**. Agents will log their reasoning and drafts to the **Audit Trail** and **Actions Carousel** without ever sending a real message. Switch to Live mode in settings only when you are ready to automate.

## 6. Troubleshooting Common Issues
*   **MCP Connection Errors:** Ensure your local `mcp_config.json` is correctly pointing to the transcription and WhatsApp servers.
*   **Rate Limits:** If enrichment fails, check your Exa or Hunter.io credit balance.
*   **Permission Issues:** If you can't see your data, ensure your Supabase Row Level Security (RLS) policies were correctly applied during migration.

## 7. Next Steps & Beta Feedback
We are constantly improving SalesOS. Please track your **Time Saved per Lead** and **Reply Rates**—these are the core metrics of your new AI Co-Founder. 

To provide feedback or report a bug, please open an issue on the [GitHub Repository](https://github.com/beatnyk77/SalesOS/issues). Happy closing!
