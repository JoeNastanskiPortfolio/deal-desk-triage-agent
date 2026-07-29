Deal desks field a constant stream of questions from sales reps — discount approvals, payment term exceptions, contract redlines, security reviews. Many are routine policy lookups a rep could self-serve; others carry real financial, legal, or compliance risk and need a human. This project is an AI agent that reads each incoming question and makes that call: auto-resolve with a drafted answer, or escalate to deal desk, finance, or legal. It runs on a system prompt that encodes the escalation policy in plain language, so the business logic is readable and editable by anyone on the team, not buried in code.

What makes it more than a chatbot is the evaluation layer. The agent is scored against a held-out set of 16 labeled questions where the correct routing is known in advance. Every run reports accuracy against those labels, automation rate, average confidence, and per-category performance — so the agent's quality is a measured number, not a guess, and any change to the prompt can be tested against ground truth before it ships. Built with Next.js and the Anthropic API, with the API key held server-side and the endpoint locked to a fixed question set so it can't be abused.

# Deal Desk Triage Agent

A live agent that classifies sales-exec deal questions as auto-resolve or escalate,
scored against a held-out 16-question eval set. Built with Next.js, calling Claude
(Anthropic API) from a secure server-side route.

## Deploy this in about 10 minutes

### 1. Get an Anthropic API key
- Go to https://console.anthropic.com and sign up / log in
- Go to "API Keys" and create a new key
- Anthropic gives new accounts a small amount of free credit; this demo costs
  fractions of a cent per run, so that will last a long time
- Copy the key somewhere safe — you'll paste it into Vercel in step 4

### 2. Push this project to GitHub
- Create a new repository on https://github.com (e.g. `deal-desk-triage-agent`)
- In a terminal, from this project folder:
  ```
  git init
  git add .
  git commit -m "Initial commit"
  git branch -M main
  git remote add origin https://github.com/YOUR-USERNAME/deal-desk-triage-agent.git
  git push -u origin main
  ```

### 3. Create a Vercel account and import the project
- Go to https://vercel.com and sign up using your GitHub account
- Click "Add New... > Project"
- Select the repository you just pushed
- Leave the default framework settings (Vercel auto-detects Next.js)

### 4. Add your API key as an environment variable
- Before clicking deploy (or after, in Project Settings > Environment Variables):
  - Name: `ANTHROPIC_API_KEY`
  - Value: the key you copied in step 1
- Apply it to Production, Preview, and Development
- Click Deploy

### 5. You're live
- Vercel gives you a URL like `deal-desk-triage-agent.vercel.app`
- Every future `git push` to `main` automatically redeploys

### 6. Link it from your portfolio
- Add a project card/link on your GitHub Pages portfolio pointing at the Vercel URL
- Optional: use a custom domain in Vercel's Project Settings if you want a cleaner link

## Local development (optional)
```
npm install
cp .env.example .env.local   # then paste your real key into .env.local
npm run dev
```
Visit http://localhost:3000

## What's different from the Claude.ai artifact version
- API calls now go through `/pages/api/classify.js`, a server-side route that holds
  your Anthropic key securely (browsers can never see it)
- Persistence uses real browser `localStorage` instead of the Claude-artifact-only
  storage API
- Everything else — the UI, the eval set, the charts — is unchanged
