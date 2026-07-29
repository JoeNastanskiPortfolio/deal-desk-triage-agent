# Deal Desk Triage Agent

A live AI agent that reads sales-exec deal questions and decides whether each one can be **auto-resolved** with a documented policy answer or must be **escalated** to a human (deal desk, finance, RevOps, or legal). Built with Next.js and the Anthropic API, with the API key held server-side and the endpoint locked to a fixed question set so it can't be abused.

Live demo: **https://deal-desk-triage-agent.vercel.app**

---

## What it is

Deal desks field a constant stream of questions from sales reps — discount approvals, payment term exceptions, contract redlines, security reviews. Many are routine policy lookups a rep could self-serve; others carry real financial, legal, or compliance risk and need a human. This project is an AI agent that reads each incoming question and makes that call: auto-resolve with a drafted answer, or escalate. It runs on a system prompt that encodes the escalation policy in plain language, so the business logic is readable and editable by anyone on the team, not buried in code.

What makes it more than a chatbot is the evaluation layer. The agent is scored against a held-out set of labeled questions where the correct routing is known in advance. Every run reports accuracy against those labels, automation rate, average confidence, and per-category performance — so the agent's quality is a measured number, not a guess, and any change to the prompt can be tested against ground truth before it ships.

The evaluation layer earns its keep by catching disagreements. In one run, the agent auto-resolved a question about mid-term seat downgrades that the answer key expected to escalate. Digging in, the cause was legitimate ambiguity: the question was phrased as a policy lookup ("what's our policy?") rather than an actual downgrade request with a stated size, and the escalation rule keys on downgrades that reduce contract value by more than 5%. That surfaced a real product decision — treat the question as a routine lookup, or tighten the rule so any downgrade signal escalates. I resolved it by aligning the label with the agent's reading, but the value was in the loop itself: define a policy, measure against ground truth, and let the disagreements tell you where the policy or the labels need work. That's the same discipline that keeps a production agent trustworthy as its rules evolve.

---

## The routing policy

The agent applies the following rules. When a question matches both an auto-resolve and an escalate condition, **escalate wins**.

**Deal-size override.** Any deal with a total contract value over $500,000 escalates regardless of category — large deals get executive/deal-desk review. Questions on deals of $500,000 or less, and general policy questions with no specific deal attached, remain eligible for auto-resolve.

### Escalate

1. **Discount authority.** Standard approval tiers are AE/rep up to 10%, Manager up to 15%, Director up to 20%. Any discount above 20%, or above the requester's tier, escalates.
2. **Payment terms.** Anything beyond standard Net 30 (Net 45, Net 60, milestone or deferred billing) escalates.
3. **Custom SLAs.** The standard uptime commitment is 99.5%. Anything above 99.5% escalates, and any SLA carrying a financial penalty or service credit escalates regardless of the uptime figure.
4. **Non-standard deal structures.** Any ramped, tiered, multi-year, or otherwise bespoke discount or pricing structure escalates.
5. **Competitive or churn-driven discounting.** Any discount justified by matching a competitor or by a stated churn risk escalates, unless it falls within the standard approved discount authority above.
6. **Contract or legal redlines.** Any requested change to standard contract language (indemnification, liability, IP, data terms, termination, governing law) escalates.
7. **Security or compliance exceptions.** Any request to skip, defer, or shortcut a security questionnaire or compliance review escalates, even when framed as urgent or justified by deal size.
8. **Comp or credit disputes.** Any disagreement over deal credit, split ownership, partner registration, or territory attribution escalates.
9. **Revenue-impacting amendments.** A mid-term downgrade or amendment that reduces contracted value by more than 5% escalates. Reductions of 5% or less may auto-resolve if otherwise routine.
10. **Override or exception requests.** Any request for an override, an exception, or urgent human intervention on an at-risk deal escalates, since these are by definition outside standard authority.

### Auto-resolve

Auto-resolve applies when the question is low-risk, the deal is $500,000 or less (or no specific deal is attached), and it involves:

1. **Standard policy lookups.** Stating the policy itself, not requesting an exception. Standard renewal uplift is 7%, standard payment terms are Net 30, standard SLA is 99.5%, and standard discount tiers are AE 10% / Manager 15% / Director 20%.
2. **Pre-approved ranges.** Trial extensions of up to 30 additional days auto-resolve; extensions beyond 30 days escalate.
3. **Documented CPQ or tooling processes.** Routine, tooling-supported actions such as co-terminating an add-on to an existing contract end date.
4. **Tooling or data issues.** Incorrect list prices or other CPQ display bugs, which are support questions rather than policy exceptions.

---

## Using the dashboard

**Start by clicking "Run evaluation" (top-right).** Nothing is classified until you do — the agent runs the full question set live, one at a time, and the page fills in as it goes.

Once you run it, the main landing page (Console) shows:

- **Agent trace (top).** The single question the agent is currently working on, with a live/idle status indicator.
- **Metric cards (four across).** *Accuracy vs. labeled set* — how often the agent's routing matched the answer key. *Automation rate* — the share of questions it auto-resolved rather than escalated. *Avg. confidence* — the agent's mean confidence across all questions. *Questions scored* — how many of the set have been classified so far. Each card includes a small trend line drawn from your saved past runs.
- **Deal question queue (center).** Every question in the set. As the evaluation runs, each row updates live — from "Not yet run" to "Classifying…" to its final Escalate or Auto-resolve badge, with a green dot when the agent's decision matched the label and a red dot when it diverged. Filter tabs let you view All, Needs review (low-confidence answers), or Escalated.
- **Detail panel (below the queue).** Click any question to see the agent's full output: the classification and confidence, its one-sentence reasoning, and a drafted reply. Tabs switch between Details, Trace (a step-by-step view), History (past runs), and Notes.
- **Analytics charts (bottom).** *Question volume by category* — a bar chart of how the set breaks down across deal-question types. *Accuracy & automation over time* — a line chart tracking those two metrics across every saved eval run, so you can see whether a policy change moved the numbers.

The other sidebar pages (Queue, Tickets, Analytics, Evaluations, Knowledge, Settings) are fuller views of the same data — a table of every question and its result, per-category accuracy, run history, the policy itself, and a Settings page where the confidence threshold that drives "Needs review" can be adjusted.

---

## How the evaluation works — the two files

The evaluation compares two independent sources of truth, which live in two separate files:

- **`pages/api/classify.js`** holds the questions the agent classifies (the "tickets") and the system prompt (the routing policy). When the agent runs, it reads each question from here and decides how to route it — using only the policy, with no knowledge of the correct answer. This is also where new test questions get added.
- **`components/DealDeskConsole.jsx`** holds the same questions plus each one's **expected label** — the correct routing, assigned in advance. This is the answer key, and it's also the entire front-end dashboard.

When a question is classified, the app compares the agent's decision (from `classify.js`) against the expected label (from `DealDeskConsole.jsx`). A match counts toward accuracy; a mismatch is flagged for review. Because the agent's decision and the label are set separately — one from the policy, one from human judgment — the comparison is meaningful rather than the agent grading its own homework.

To add a new test question, it goes in **both** files: the question text (by ID) in `classify.js`, and the same question with its expected label in `DealDeskConsole.jsx`. Keeping the two in sync is what ensures the question the dashboard displays is the same one the agent classified and scored.

---

## Architecture & security

- The Anthropic API key lives only in Vercel's environment variables, read server-side in `classify.js`. It is never in the repo and never reaches the browser.
- The classify endpoint accepts only known question IDs, not arbitrary text, so it can't be used as a free proxy to the model.
- A per-IP rate limit caps requests per minute as an additional guard.

## Running it locally

```
npm install
cp .env.example .env.local   # then paste your real key into .env.local
npm run dev
```

Visit http://localhost:3000.
