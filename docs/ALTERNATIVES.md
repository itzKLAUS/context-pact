# Related work and fit

Research checked on 2026-10-08. This is not an exhaustive novelty search.

- [Knowing](https://github.com/blackwell-systems/knowing/blob/main/docs/architecture/context-engine.md): graph-ranked code context and knapsack packing. Context Pact accepts a retrieved shortlist and focuses on explicit contracts and finite-scenario robust selection.
- [TokenPack](https://github.com/mo-tunn/TokenPack): local retrieval, evidence scoring and budget-aware selection. Context Pact does not extract PDFs or compute embeddings; its boundary is a small scored candidate graph.
- [context-packer](https://github.com/sharvinvarghese/context-packer): multiple context compression and priority strategies. Context Pact uses exact small-set search with dependency/conflict/expiry/tenant constraints and forced-inclusion alternatives.
- [Havoc](https://github.com/bernardobbl/havoc): deterministic fault simulation for agent tool workflows. It addresses reliability in a different layer; we avoided duplicating its premise as the portfolio project.

The useful combination here is inspectable constraints, robust scenario utility, complete-envelope cost measurement, explicit incomplete-search results and a scoped mathematical artifact. Existing systems share individual mechanisms. No worldwide uniqueness or defense against reproduction by a frontier model is claimed.
