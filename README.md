# Context Pact

**Keep an agent's evidence attached when its context gets smaller.**

![The local context-selection workbench](docs/workbench.png)

A coding agent sees “roll back the release” but loses the migration note explaining why old binaries cannot read new rows. A support agent carries a summary forward after its source expires. A retriever ranks two individually useful snippets whose assumptions conflict.

Context Pact selects a **small context bundle under explicit rules**, instead of asking a model to summarize those rules away. It is a TypeScript library, CLI and local browser workbench. It makes no model calls and needs no API key.

## What it does

- Preserves prerequisite records, including dependency cycles as indivisible sets.
- Excludes other tenants, expired records and records depending on unavailable evidence.
- Enforces required records, evidence facets and conflicting assumptions.
- Maximizes the **worst-case supplied utility across task scenarios**, or ordinary utility for a single task.
- Measures the **complete rendered context** with a supplied tokenizer. No character-to-token estimate, additive-cost assumption or unsafe budget pruning.
- Exhaustively searches up to 20 candidates. Reports `optimal`, `infeasible` or `limited` explicitly.
- Explains excluded eligible records with a forced-inclusion alternative: what must be exchanged and how utility changes.
- Provides a separately implemented feasibility checker, independent test oracle and scoped Lean proof artifact.

This belongs **after retrieval and before inference**. Retrieve a shortlist, supply trustworthy metadata and scores, compile, check the result, then send the context to your model. A bigger or more capable model can use the same boundary; no claims about unreleased model APIs are needed.

## Try it

Node.js 22 or newer:

```sh
git clone https://github.com/itzKLAUS/context-pact.git
cd context-pact
npm ci
npm test
npm run serve
```

Open <http://127.0.0.1:4317>. The synthetic incident is editable. Try a 750-byte budget, then a zero budget; the latter produces no feasible context. Change a setting and the previous result clears. The workbench uses a worker so search does not block the UI, and sends no fixture data over the network.

CLI token counting uses `cl100k_base`, not an assumed tokenizer for future models:

```sh
npm run build
node dist/cli.js examples/incident.json --explain --output result.json
node dist/cli.js examples/incident.json --unit utf8-bytes
```

Output files are created exclusively; an existing file is never overwritten. Exit codes: `0` complete optimum, `2` complete infeasibility, `3` limited search, `1` invalid input or I/O failure. Reports contain selected text and must be handled as sensitive data.

## Library integration

Install the release tarball from [GitHub Releases](https://github.com/itzKLAUS/context-pact/releases). This package is not claimed to be published on npm.

```ts
import { compile } from '@itzklaus/context-pact';
import { verifyCandidate } from '@itzklaus/context-pact/verify';
import { cl100k } from '@itzklaus/context-pact/tokenizer';

const result = compile(request, cl100k, true);
if (result.status !== 'optimal' || !result.candidate) {
  throw new Error(`Context contract not certified: ${result.status}`);
}
const errors = verifyCandidate(request, result.candidate, cl100k);
if (errors.length) throw new Error(errors.join('; '));
// result.candidate.context is ready for your application's context message.
```

The pure core defaults to **UTF-8 bytes**, not tokens. For another model, supply `{ id, unit: 'tokens', count(text) }` using its actual tokenizer. The counter must be deterministic and return nonnegative safe integers. Budget the rest of your request separately, or include its fixed text in `prefix` and `suffix`. Provider chat templates, tool schemas and output reservations are not counted automatically.

## The mathematics

For selected record set $S$, scenario utilities $u_{ik}$ and deterministic rendered cost $C$:

$$\max_{S\text{ feasible}}\;\min_{k\in K}\sum_{i\in S}u_{ik},\qquad C(\operatorname{render}(S))\le B.$$

Feasibility includes dependency closure, conflict exclusion, expiry, tenant scope, mandatory records and facet coverage. Ties choose lower measured cost, then lexicographically smaller ID lists. This is finite robust combinatorial optimization, not a new theorem or a promise of polynomial-time exact optimization.

The proof discipline is inspired by [OpenAI's mathematical manuscript and proof collection](https://github.com/openai/math). We inspected its README, formalization catalogue and the scope notes for family 102 at commit `fd4aeeb2ee4fc729c18d98444fed42fd0529eeeb`. We do **not** use that family's hardness results as an algorithm, copy its manuscripts, depend on its unformalized claims or imply OpenAI affiliation.

Our original [Lean artifact](proofs/Selection.lean) checks finite maximum bounds, least-upper-bound characterization, the scoped optimality certificate and a robust-bound monotonicity statement. It does **not** formally verify the TypeScript implementation, subset enumeration, constraints, tokenizer or model behavior. [Mathematics and proof scope](docs/MATHEMATICS.md).

## Evidence

At the initial Windows/Node 24 verification: 15 automated tests passed, including 200 generated instances compared with an independent recursive power-set oracle. Core selection, tokenizer adapter and independent checker have 100% measured line coverage; line coverage does not establish correctness of every branch. CLI, static server and real browser flows were exercised. Lean 4.19.0 accepted all four theorem declarations without `sorry`; axiom output is documented separately.

On 100 seeded synthetic 10-record cases, exact robust selection improved supplied worst-case utility over a feasible dependency-closed density baseline in **65 cases**, with mean utility gap **5.15**. This measures a finite selection objective, **not LLM answer quality**. Reproduce with `npm run benchmark`; [raw results](docs/benchmark.json).

## Boundaries worth knowing

Twenty candidates means at most $2^{20}$ subsets per search. Explanations perform additional searches. Do retrieval first; this is not a million-record memory store. A search cutoff returns `limited`, including when no candidate was found. It never certifies infeasibility from a partial search.

Metadata is supplied by a trusted application. Tenant filtering is not authentication; records must already be fetched under your application's access controls. Expiry cannot validate truth, provenance links are not signatures, and a trust label does not prevent prompt injection. Scores and scenario choices can encode bad priorities. Critical constraints should be mandatory, not merely highly scored. The clock is supplied explicitly so replay is reproducible; callers must refresh it for new decisions.

No production workload, independent security audit or model-quality gain has been established. Existing context packers and knowledge systems overlap with parts of this work; [alternatives and differentiation](docs/ALTERNATIVES.md) explain the narrow fit.

MIT licensed. [Contributing](CONTRIBUTING.md) · [Security](SECURITY.md) · [Support](https://github.com/sponsors/itzKLAUS)
