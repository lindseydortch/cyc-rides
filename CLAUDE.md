# CLAUDE.md — CYC Rides

## Build log
Maintain a BUILD_LOG.md at the project root. After finishing the work for
each numbered prompt in this project's build sequence, append a new entry
(don't overwrite prior entries) titled with the prompt number and a short
name, e.g. "## Prompt #2: Database schema + RLS policies". Each entry should
cover, in whatever subset applies:
- Scope: one or two sentences on what this prompt covered and explicitly
  didn't (e.g. "frontend only, no backend changes").
- Routes/files/components introduced: what got created, with paths.
- Assumptions made: anywhere you filled a gap the prompt didn't specify —
  naming, a default value, which existing pattern you followed, a schema
  detail you inferred — state the assumption plainly so it can be corrected
  if wrong.
- Left as placeholder / open questions: anything stubbed out, hardcoded, or
  deferred, and anything genuinely ambiguous that you made a judgment call on
  rather than asking about. Flag these for confirmation before the next
  session builds on top of them.
- Verification: what you actually ran (tests, typecheck, manual/live checks)
  and the result — not just "should work," what you confirmed.
Keep entries factual and specific rather than a narrative summary — this file
is read by a human deciding what to double-check, not a changelog for its own
sake.

## Testing strategy
Tests are written progressively, prompt by prompt, not saved for the end.
Two tiers:
- RLS/security tests (Prompt 2): an automated pgTAP suite (or a Vitest/Node
  script using real Supabase test users if pgTAP isn't practical) that
  authenticates as multiple distinct users — requester A, requester B,
  driver C, admin D — and asserts each can/can't read and write exactly the
  rows they should. This tier is non-negotiable: a bug here is a privacy
  leak, not a UI glitch.
- Component/integration tests (Prompts 4–6): Vitest + React Testing Library
  — form validation, correct data shown per role, mutations firing
  correctly.
A final end-to-end smoke test (Prompt 7) closes out the build sequence,
walking one full request → claim → confirm flow rather than re-testing
individual pieces.

## Branding
CYC Rides should feel visually related to the Commit Your Code conference
(commityourcode.com) without using their actual logo (not ours to use).
These are the exact CSS variables pulled from the live site:
- Background (default): #ffffff
- Background (soft): #f5f8fc (--cloud — section/card backgrounds)
- Navy (hero/header): #031227 (--navy)
- Navy, softer: #0a2345 (--navy-soft)
- Text primary: #07152e (--ink)
- Text secondary: #5f6e83 (--muted)
- Border/line: #dce5f0 (--line)
- Accent, primary: #0868f7 (--blue — buttons, links, primary CTAs)
- Accent, primary hover: #0056d8 (--blue-dark)
- Accent, success: #079455 (--green — use for "ride confirmed" states)
- Font, body/UI: Geist Sans (open-source/free — via the `geist` npm package
  or Google Fonts, which lists it as "Geist")
- Logo/favicon: a simple car icon (e.g. lucide-react's `Car` icon) in --blue
  on white or --cloud — generic, not a recreation of the CYC logo
Overall feel: white/light body background by default, a navy band for the
header or hero area, blue for interactive elements, green reserved for
positive/confirmed states.
