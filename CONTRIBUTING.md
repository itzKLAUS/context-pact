# Contributing

Start with an issue containing a real context-selection failure, a minimal synthetic fixture and the expected contract outcome. Please avoid real customer data or secrets. Changes to selection need independent-oracle cases; changes to claims need corresponding evidence.

Run `npm ci`, `npm test`, `npm run coverage`, `npm audit --omit=dev` and `npm run benchmark`. Recompile `proofs/Selection.lean` with Lean 4.19.0 for proof changes. Review public APIs and the mathematical scope when changing counters or constraints.

Useful areas: externally validated failure fixtures, tokenizer adapters, application integrations and bounded scalable solvers with honest optimality-gap reporting. Model-quality claims need evaluated tasks and released methodology; a packing-utility score is insufficient.
