import Std

/-
The finite maximum at the center of Context Pact's robust selector.
This checks the mathematical abstraction, not the TypeScript implementation,
the completeness of its enumeration, or the correctness of a tokenizer.
-/
namespace ContextPact

def maxScore (scores : List Nat) : Nat := scores.foldr Nat.max 0

theorem every_score_bounded (scores : List Nat) (s : Nat)
    (member : s ∈ scores) : s ≤ maxScore scores := by
  induction scores with
  | nil => simp at member
  | cons a tail ih =>
    simp only [List.mem_cons] at member
    simp only [maxScore, List.foldr_cons]
    rcases member with same | inTail
    · subst s
      exact Nat.le_max_left _ _
    · exact Nat.le_trans (ih inTail) (Nat.le_max_right _ _)

theorem least_upper_bound (scores : List Nat) (bound : Nat)
    (bounded : ∀ s ∈ scores, s ≤ bound) : maxScore scores ≤ bound := by
  induction scores with
  | nil => simp [maxScore]
  | cons a tail ih =>
    simp only [maxScore, List.foldr_cons]
    apply Nat.max_le.mpr
    constructor
    · exact bounded a (by simp)
    · apply ih
      intro s member
      exact bounded s (by simp [member])

-- For a complete list of feasible subset scores, equality to maxScore
-- is an optimality certificate. It must not be used for an incomplete list.
theorem certified_optimum (scores : List Nat) (winner : Nat)
    (certificate : winner = maxScore scores) :
    ∀ s ∈ scores, s ≤ winner := by
  intro s member
  rw [certificate]
  exact every_score_bounded scores s member

-- Raising every scenario's utility cannot lower a robust lower bound.
theorem robust_bound_monotone (old new : Nat) (totals : List Nat)
    (improved : old ≤ new) (bound : ∀ t ∈ totals, new ≤ t) :
    ∀ t ∈ totals, old ≤ t := by
  intro t member
  exact Nat.le_trans improved (bound t member)

#print axioms every_score_bounded
#print axioms least_upper_bound
#print axioms certified_optimum
#print axioms robust_bound_monotone
end ContextPact
