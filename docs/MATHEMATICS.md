# Mathematical contract and proof boundaries

Let each binary variable $x_i$ indicate inclusion. For prerequisite $i\to j$, enforce $x_i\le x_j$. For conflicting records $(i,j)$, enforce $x_i+x_j\le1$. Mandatory records have $x_i=1$; ineligible records have $x_i=0$. Every required facet $f$ imposes $\sum_{i\text{ carrying }f}x_i\ge1$.

The objective is $\max_x\min_{k\in K}\sum_i u_{ik}x_i$, with nonnegative integer utilities. No probability distribution over tasks is assumed: this is a finite-scenario robust objective, not Bayesian inference or a Wasserstein distributional-robustness guarantee. All scenario scores must be supplied. Without scenarios, ordinary `score` values define a single objective.

Rendered-token cost is treated as a deterministic black-box set function. It need not be additive, submodular or monotone. This is why the implementation does not prune an oversize subset's supersets: a supplied counter could measure a larger text as cheaper. It only skips measuring candidates whose score is strictly worse than an already feasible winner. Cost ties still require measurement.

## Finite search argument

After fixed-point ineligibility propagation, every feasible selected set is a subset of the remaining candidate universe. The bit-mask loop visits each such subset once. Each constraint is checked before cost evaluation. A completed search therefore returns the maximum feasible objective; the final comparison implements the documented tie order. This is a written implementation argument plus oracle testing, not an end-to-end Lean proof of the executable.

Search is exponential: $O(2^n)$ candidate subsets, with validation, rendering and tokenizer work in addition. Explanations run one forced-inclusion search per excluded eligible record. The cap applies per search, not to all explanation searches combined. The result is optimal only within the supplied shortlist and rules. More compute or a richer candidate pool can change the optimum.

## What Lean checks

`proofs/Selection.lean`, compiled with Lean 4.19.0 and no mathlib dependency:

- `every_score_bounded`: every element of a finite score list is bounded by its folded maximum.
- `least_upper_bound`: any upper bound on all list elements bounds that maximum.
- `certified_optimum`: equality to the complete feasible-score maximum implies dominance over each listed feasible score.
- `robust_bound_monotone`: lowering a valid common lower bound preserves that bound.

The first three use Lean's standard `propext` axiom; the fourth reports no axioms. There are no project axioms, `sorry`, imported OpenAI proofs or native-decide shortcuts. Run:

```sh
cd proofs
lean Selection.lean
```

With elan installed, the adjacent `lean-toolchain` selects the pinned compiler. The compilation emits each theorem's axiom dependencies. These statements do not prove complete subset enumeration, JSON parsing, graph filtering, measurement, optimal tie-breaking or implementation refinement. The independent feasibility checker verifies an exported candidate's constraints and measurements but intentionally makes no claim about optimality.

## Inspiration and related work

[openai/math](https://github.com/openai/math), pinned inspection commit `fd4aeeb2ee4fc729c18d98444fed42fd0529eeeb`, distinguishes research manuscripts from formal proof coverage. Family [102's scope notes](https://github.com/openai/math/blob/fd4aeeb2ee4fc729c18d98444fed42fd0529eeeb/lean/docs/102.md) concern approximation-hardness results. They motivate care about claims and proof scope, not a direct speedup or theorem dependency in this project. This project uses established finite optimization and its own small proof artifact. It does not claim to apply every advanced mathematical method or to be impossible to reproduce.
