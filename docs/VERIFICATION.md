# Verification — 2026-10-08

Windows host, Node 24.19.0 and a separate Node 22 runtime: all 15 automated tests passed. The suite includes 200 seeded generated instances checked by an independent recursive subset oracle; nonmonotonic cost counters; dependency cycles; tenant/expiry propagation; conflict/mandatory/facet constraints; score overflow; forged results; CLI exclusive output; and an ephemeral-port loopback HTTP server.

Coverage recorded on Node 24: selection and tokenizer adapter 100% line coverage; independent checker 100%; aggregate measured library/CLI files 98.56% line coverage, 86.79% branch coverage. The server is tested in a subprocess and is not included in that aggregate instrumented coverage. A passing oracle suite is evidence, not a formal proof of the TypeScript executable.

Lean 4.19.0 accepted all four declarations in `proofs/Selection.lean`. The first three report `propext`, the last reports no axioms. No `sorry` or project axiom declarations are present. See MATHEMATICS.md for the narrow proof boundary.

Real Chromium workbench checks: complete selection at 1500 bytes; 750-byte selection and forced-inclusion tradeoff; zero-budget infeasibility; malformed JSON clearing all previous metrics/context and disabling export; restore fixture; desktop 1400×1000 and mobile 390×844 layout. The app stores no fixture in browser storage and performs selection in a dedicated worker. The initial favicon 404 was addressed in the static server.

`npm audit --omit=dev` reported no known advisories at this check. The reproducible 100-case selection benchmark is in benchmark.json and its exact-generator script is tracked. Its utility improvements are not measurements of model accuracy, safety or future model capability.

Hosted [CI run 37794140499](https://github.com/itzKLAUS/context-pact/actions/runs/37794140499) passed at commit `398f88237c8c07d4c62d0e2473ac0628b8730f18`: Node 22/24 on Linux and Windows, plus the pinned Lean proof check. Each Node job runs the full suite, runtime dependency audit and package build.

A clean consumer directory installed the packed tarball with no project development dependencies. Its own installed core, tokenizer and independent checker compiled the example to an optimal 238-token context and agreed on its feasibility. This is separate from importing the working tree's source.

No production integration or independent security review has been established.
