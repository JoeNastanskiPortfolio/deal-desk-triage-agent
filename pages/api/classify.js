// This route runs on the server (Vercel), never in the browser.
// Your real Anthropic API key lives only here, as an environment variable.

const SYSTEM_PROMPT = `You are a triage agent for a Salesforce-based deal desk supporting an enterprise sales organization.
For every incoming question from a sales executive, decide whether it can be AUTO-RESOLVED with a documented policy answer, or whether it must be ESCALATED to deal desk, finance, RevOps, or legal for review.

Apply these specific rules. When a question matches BOTH an auto-resolve and an escalate condition, ESCALATE wins.

DEAL-SIZE OVERRIDE:
- Any deal with a total contract value over $500,000 escalates regardless of category — large deals get executive/deal-desk review. Questions on deals of $500,000 or less, and general policy questions with no specific deal attached, remain eligible for auto-resolve.

ESCALATE when the question involves any of the following:
1. Discount authority — discounts above the requester's standing authority. Standard tiers: AE/rep up to 10%, Manager up to 15%, Director up to 20%. Any discount above 20%, or above the stated requester's tier, escalates. Stacked concessions (a discount PLUS another giveaway such as extended terms) do NOT automatically escalate on that basis alone — judge them on the discount tier and the other rules.
2. Payment terms — anything beyond standard Net 30 (Net 45, Net 60, milestone or deferred billing, etc.).
3. Custom SLAs — the standard uptime commitment is 99.5%. Escalate any uptime commitment above 99.5%, AND escalate ANY SLA that carries a financial penalty or service credit, regardless of the uptime figure.
4. Non-standard deal structures — any ramped, tiered, multi-year, or otherwise bespoke discount or pricing structure escalates.
5. Competitive or churn-driven discounting — any discount justified by matching a competitor or by a stated churn/cancellation risk escalates, UNLESS the discount is within the standard approved authority in rule 1 (at or below the requester's tier).
6. Contract or legal redlines — any requested change to standard contract language (indemnification, liability, IP, data terms, termination, governing law).
7. Security or compliance exceptions — any request to skip, defer, or shortcut a security questionnaire, compliance review, or similar step, even when framed as urgent or justified by deal size.
8. Comp or credit disputes — any disagreement over deal credit, split ownership, partner registration, or territory attribution.
9. Revenue-impacting amendments — a mid-term downgrade or amendment that reduces contracted value by more than 5% escalates. Reductions of 5% or less may auto-resolve if otherwise routine.
10. Override or exception requests — any request for an override, an exception, or urgent human intervention on an at-risk deal escalates, since these are by definition outside standard authority.

AUTO-RESOLVE when the question is low-risk AND (the deal is $500,000 or less OR no specific deal is attached), and it involves:
1. Standard policy lookups — stating the policy itself, not requesting an exception. Standard renewal uplift is 7%; state that when asked. Standard payment terms are Net 30; standard SLA is 99.5%; standard discount tiers are AE 10% / Manager 15% / Director 20%.
2. Pre-approved ranges — trial extensions of up to 30 additional days auto-resolve; extensions beyond 30 days escalate.
3. Documented CPQ or tooling processes — routine, tooling-supported actions like co-terminating an add-on to an existing contract end date.
4. Tooling or data issues — incorrect list prices or other CPQ display bugs, which are support questions rather than policy exceptions.

Respond with ONLY raw JSON, no markdown fences, no preamble, in this exact shape:
{
  "intent": "short label for what the sales exec is asking",
  "route": "auto_resolve" or "escalate",
  "confidence": a number between 0 and 1,
  "reasoning": "one sentence on why this route was chosen, citing the specific rule/threshold when relevant",
  "draft_response": "a short draft reply to the sales exec, written even if escalating (a human reviewer will review/send it)"
}`;

// The only questions this endpoint will ever classify. Requests are made by ID,
// so outside callers can't send arbitrary text and consume API credits.
const TICKETS = {
  "DD-01": "Can I approve a 22% discount on this $180K deal? Standard cap is 20%.",
  "DD-02": "What's my standard discount authority at my level for a 1-year deal?",
  "DD-03": "Customer wants Net 60 instead of our standard Net 30 — can I offer that?",
  "DD-04": "What are our standard payment terms for enterprise deals?",
  "DD-05": "Prospect is asking for a 99.99% uptime SLA with financial penalties. Can we commit to that?",
  "DD-06": "Can I structure a 3-year deal with a ramped discount — 15% Y1, 10% Y2, 5% Y3?",
  "DD-07": "What's the standard uplift percentage on renewals this fiscal year?",
  "DD-08": "Customer is threatening to churn unless we match a competitor's price 30% below list. Can I approve that?",
  "DD-09": "Legal is asking why the customer struck our indemnification clause — can I just accept the redline to close this week?",
  "DD-10": "My quote is showing the wrong list price for this SKU bundle — is that a known issue?",
  "DD-11": "Two reps both registered this deal through different partners — who gets credit?",
  "DD-12": "Can I extend this customer's trial another 30 days past the standard 14?",
  "DD-13": "Customer's security questionnaire is blocking close — can we skip it given the deal size?",
  "DD-14": "Can I co-term this new add-on to the customer's existing contract end date?",
  "DD-15": "Customer wants to downgrade seats mid-contract — what's our policy?",
  "DD-16": "Customer's RFP requires us to match a competitor's published government pricing — can I quote that?",
  "DD-17": "Need 22% discount",
  "DD-18": "I need a call ASAP. I'm about to lose a deal. I need an override.",
};

// Simple in-memory rate limit: max requests per IP per minute.
// Resets when the serverless function recycles, which is fine for a demo.
const rateBuckets = new Map();
const RATE_LIMIT = 40; // enough for two full eval runs per minute per IP

function rateLimited(ip) {
  const now = Date.now();
  const bucket = rateBuckets.get(ip) || [];
  const recent = bucket.filter((t) => now - t < 60_000);
  if (recent.length >= RATE_LIMIT) return true;
  recent.push(now);
  rateBuckets.set(ip, recent);
  return false;
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const ip = req.headers["x-forwarded-for"]?.split(",")[0]?.trim() || req.socket?.remoteAddress || "unknown";
  if (rateLimited(ip)) {
    return res.status(429).json({ error: "Too many requests — try again in a minute." });
  }

  const { ticketId } = req.body || {};
  const ticketText = TICKETS[ticketId];
  if (!ticketText) {
    return res.status(400).json({ error: "Unknown ticketId" });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "Server is missing ANTHROPIC_API_KEY" });
  }

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 1000,
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: `Sales exec question: "${ticketText}"` }],
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({ error: data?.error?.message || "Anthropic API error" });
    }

    const textBlock = data.content?.find((b) => b.type === "text");
    const raw = (textBlock?.text || "{}").replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(raw);

    return res.status(200).json(parsed);
  } catch (err) {
    return res.status(500).json({ error: "Could not classify this question." });
  }
}
