# Working on Carry

## Product guardrails

Carry is not a to-do list with AI features. Before adding a feature, ask whether it helps Carry **move an outcome forward** or helps the user make a necessary decision with less friction.

- Mobile first. Do not make web assumptions in core interaction design.
- Voice first. Text is important, but voice is a primary control surface.
- Cases, not tasks.
- Four user-facing states: Needs you / Carrying / Waiting / Done.
- Prefer one excellent hand-back over several progress notifications.
- Never pretend an action happened. Recorded, drafted, sent, booked and completed are distinct facts.
- Preserve an event trail for meaningful model/tool/user actions.
- Tool credentials and consequential actions stay server-side.
- Build components and domain modules so UI, state and provider integrations remain separable.
- Optimise model/tool usage: bounded runs, structured state, targeted workers, caching where appropriate.

## Code shape

- `app/` — routing/screens only
- `src/components/` — reusable presentation components
- `src/features/<feature>/` — domain logic + feature-specific components/adapters
- `src/theme/` — design tokens
- `docs/` — product, architecture and roadmap decisions

Screens should compose feature components; provider SDK calls should not live directly in screens.
