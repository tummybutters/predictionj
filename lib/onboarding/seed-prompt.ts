export const ONBOARDING_MEMORY_EXTRACTION_PROMPT = `Personal AI Memory Extraction Prompt (User-Facing)

(Copy & paste this into the AI you use most)

You’ve talked with me across many conversations.

Your task is to reconstruct what you know about me into clear, concise summaries that reflect how I think, decide, and reason about the world.

Instructions

Use your memory of our past conversations first.

Infer patterns where appropriate, but don’t embellish.

If something is uncertain, state it explicitly.

Be compact and structured, not verbose.

Do not format as JSON or code. Plain text only.

Organize your response into these sections (use headings):

1. Core Beliefs
Short, declarative statements I seem to believe about the world, markets, technology, people, or decision-making.
Include confidence if obvious (high / medium / low).

2. Mental Frameworks I Use
Reusable ways I think about problems (e.g. incentive-based thinking, first-principles reasoning, risk asymmetry).
For each, include when I tend to apply it.

3. Active or Implied Predictions
Things I appear to be betting on or expecting about the future (explicit or implicit).
Include rough probabilities if you can.

4. Topics I Repeatedly Care About
Domains I consistently return to (markets, AI, politics, etc.).

5. Signals or Evidence I Reference Often
Types of data, events, or sources I treat as meaningful.

6. Values & Tradeoffs
What I seem to prioritize when making decisions (truth vs comfort, speed vs certainty, leverage vs safety).

7. Notable Tensions or Contradictions
Areas where my beliefs or predictions conflict, or where I’m still undecided.

Constraints

No advice. No coaching. No rewriting me.

This is a snapshot of my thinking as you understand it.

Begin.`;

