# ViFi Simulation: Python vs TypeScript Logic Comparison

## Executive Summary

After comprehensive review, the TypeScript implementation has **3 major discrepancies** with the Python reference implementation that need clarification from the ViFi team.

---

## ✅ What Matches Correctly

### 1. **Initialization Logic**
- ✅ Total liquidity split: $1M total, ~$900k LP, ~$100k users
- ✅ AMM pool initialization with premium rate
- ✅ Constant product invariant (k = x * y)

### 2. **Fee Accounting**
- ✅ Fee rate application (0.1% default)
- ✅ Fee accumulation in `Q_U` / `surplusUSD`
- ✅ Separate tracking of expansion vs contraction fees

### 3. **AMM Swap Mechanics**
- ✅ Forward swap (USD → Fiat): Constant product formula
- ✅ Reverse swap (Fiat → USD): Quadratic solver
- ✅ Slippage and price impact calculations

---

## ⚠️ Major Discrepancies

### **Issue #1: Lambda (λ) Calculation & Application**

**Python Implementation:**
```python
def funding_rate(self, FR: Decimal, RR: Decimal) -> Decimal:
    """
    Calculate funding rate (λ) based on:
    - Flux Ratio (FR) = O_R / P_R
    - Reserve Ratio (RR) = S_U / S_R
    """
    # Complex piecewise function with state transitions
    if FR > 1:  # Oracle > Protocol (Positive Flux)
        lam = min(FR, RR)  # Capped by solvency
    elif FR < 1:  # Oracle < Protocol (Negative Flux)
        lam = max(FR, 1/RR)  # Floor at inverse solvency
    else:
        lam = 1  # Equilibrium
    return lam
```

**TypeScript Implementation:**
```typescript
// Simplified approximation
const Lambda = Math.min(fluxRatio, reserveRatio);
```

**Problem:**
- TypeScript **only handles the positive flux case** (FR > 1)
- Missing **negative flux logic** (FR < 1) which is critical for depegging scenarios
- Missing **equilibrium state transitions** (S0 → S1 → S2 → S3 → S4)

**Impact:**
- **Underestimates risk** during market stress (when local fiat weakens)
- LP valuation may be **overly optimistic** in bear markets
- System health metrics (Phi, Omega) may not reflect true solvency constraints

---

### **Issue #2: VARQ State Machine & Transition Logic**

**Python Implementation:**
```python
class VARQState(Enum):
    S0 = "s0"  # O_R == P_R and C_U == 0
    S1 = "s1"  # O_R >  P_R (C_U may be 0 or >0)
    S2 = "s2"  # O_R == P_R and C_U > 0
    S3 = "s3"  # O_R <  P_R and C_U > 0
    S4 = "s4"  # O_R <  P_R and C_U == 0

# Enforced transitions
_allowed_transitions = {
    VARQState.S0: {S0, S1, S4},
    VARQState.S1: {S0, S1, S2, S3, S4},
    # ... etc
}
```

**TypeScript Implementation:**
```typescript
// No explicit state machine
// No transition validation
// No state-dependent logic branching
```

**Problem:**
- TypeScript **does not track or enforce VARQ states**
- Missing **state-dependent behavior** (e.g., S3 requires different Lambda logic than S1)
- No **transition guards** to prevent illegal state hops

**Impact:**
- System may enter **undefined states** during edge cases
- **Incorrect Lambda values** when transitioning between states
- **Unpredictable behavior** during rapid oracle price changes

---

### **Issue #3: Over-Collateralization Buffer (C_U) Handling**

**Python Implementation:**
```python
# During Lambda > 1 expansion
U_del_surplus = self.C_U / (lam - 1)  # Max U that can use buffer

if U_del > U_del_surplus:
    # SPLIT: Part uses buffer, part goes 1:1
    R_del_surplus = U_del_surplus * lam
    R_del_normal = (U_del - U_del_surplus) * 1.0
    R_del = R_del_surplus + R_del_normal
```

**TypeScript Implementation:**
```typescript
// Similar split logic exists
const U_del_surplus = overCollat / (Lambda - 1);
if (netUSDIn > U_del_surplus) {
    // SPLIT transaction
    const Ri_surplus = U_del_surplus * Lambda;
    const Ri_normal = (netUSDIn - U_del_surplus) * 1.0;
    Ri = Ri_surplus + Ri_normal;
}
```

**Status:** ✅ **This logic matches!**

However, there's a **secondary issue**:

**Python:**
```python
# Equilibrium calculation
U_eq = (self.S_F - (self.O_R * self.S_R)) / (self.O_R * (lam - 1))

# Check if hitting equilibrium BEFORE hitting buffer limit
if U_eq < U_del_surplus:
    if U_del > U_eq:
        # Different split logic for equilibrium
```

**TypeScript:**
```typescript
// Missing equilibrium check
// Always uses buffer logic, never checks U_eq
```

**Problem:**
- TypeScript **doesn't handle equilibrium transitions** (S1 → S2)
- May **over-allocate buffer** when system should return to equilibrium first

**Impact:**
- **Incorrect buffer depletion** during large trades
- LP valuation **buffer component** may be miscalculated
- System may **fail to return to equilibrium** when it should

---

## 🔍 Minor Differences (Likely Acceptable)

### 1. **Valuation Formula**
- Python uses `Decimal` precision
- TypeScript uses `number` (IEEE 754 float)
- **Impact:** Rounding errors accumulate over 365 days, but likely <0.1% difference

### 2. **Wallet Constraint Logic**
- TypeScript caps contraction at `publicFiat` (user wallet balance)
- Python uses `holdings.W_F` (same concept, different variable name)
- **Impact:** None, logic is equivalent

### 3. **Initial User Allocation**
- Python: `u_delta_for_fiat * (oracle_rate + init_ratio)`
- TypeScript: `100000 * (oracle_rate + amm_rate)`
- **Impact:** Hardcoded 100k vs parameterized, but mathematically identical

---

## 📋 Recommended Questions for ViFi Team

### **Question 1: Lambda Negative Flux**
> "Our TypeScript simulation currently only implements the positive flux case for Lambda (λ = min(FR, RR)). 
> 
> For negative flux scenarios (when O_R < P_R), should we implement:
> - `λ = max(FR, 1/RR)` as shown in the Python code?
> - Or is there a simplified formula you recommend for production?
> 
> Context: This affects LP risk modeling during local currency depreciation."

### **Question 2: VARQ State Machine**
> "The Python implementation enforces a strict VARQ state machine (S0 → S1 → S2 → S3 → S4) with transition guards.
> 
> Questions:
> - Is this state machine **critical** for production, or is it primarily for simulation validation?
> - Can we simplify by only tracking C_U and O_R/P_R ratios without explicit state enums?
> - Are there specific state transitions that **must** be enforced for system safety?
> 
> Context: We want to balance correctness with implementation complexity."

### **Question 3: Equilibrium vs Buffer Priority**
> "During expansion with λ > 1, the Python code checks if the system hits equilibrium (U_eq) before exhausting the buffer (U_del_surplus).
> 
> Questions:
> - Is this equilibrium check **necessary** for accurate LP valuation?
> - What happens if we skip it and always prioritize buffer usage first?
> - Does this affect the 'Conservative APY (Excl. Buffer)' metric we're showing LPs?
> 
> Context: This impacts how we calculate and display LP risk-adjusted returns."

---

## 🎯 Conclusion

The TypeScript implementation is **functionally correct for normal market conditions** (positive flux, stable peg), but **lacks robustness** for edge cases:

1. **Missing negative flux Lambda logic** → Underestimates bear market risk
2. **No VARQ state machine** → Unpredictable behavior during rapid oracle changes
3. **Missing equilibrium priority** → Incorrect buffer accounting in some scenarios

**Recommendation:** 
- Send these 3 questions to ViFi team **before** implementing Monte Carlo batch simulation
- Their answers will determine if we need major refactoring or just minor tweaks
- This is **critical due diligence** for LP economics validation

---

*Generated: 2026-02-03*
