# Alpha 2 action engine

Alpha 2 introduces bounded runs: Carry records each run, action, result, and stop reason rather than hiding autonomy in a single model call.

The initial worker is deliberately conservative:
- web research can run automatically
- drafting can be automatic once added
- sending, booking, spending, publishing and other external commitments require approval
- destructive actions are disabled
- each run is capped and leaves an event trail

The first Alpha 2 golden path is the blocked-gutter case: Carry researches the situation, records sources, updates what it knows, then either continues safely or asks one precise question/approval.
