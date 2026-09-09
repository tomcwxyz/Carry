# Working alpha implementation status

## Implemented in bounded runner slice

- direct structured case understanding remains in place;
- bounded `runCase` decision boundary;
- bounded `advanceCase` loop capped at three runs per request;
- grounded OpenAI web-search worker with source capture;
- `action_started`, `research_completed`, `action_completed`, `action_failed`, `decision_requested` and `decision_made` event paths;
- `POST /api/cases/:id/run`;
- `POST /api/cases/:id/respond` with automatic resume;
- automatic bounded advance for captures that do not need an immediate user fact;
- case detail evidence payload;
- mobile decision input, retry action and research evidence surface;
- smoke harness that supplies a household location and expects grounded research.

## Still required before the next APK

- run the production gutter smoke repeatedly and inspect logs;
- verify purchase and general admin/web recipes;
- exercise voice through the same backend path;
- confirm the mobile controls against production after the backend gate is green;
- no Android build until the working-alpha gate passes.
