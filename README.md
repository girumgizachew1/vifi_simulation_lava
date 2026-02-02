# ViFi Protocol Simulation (VFE)

A high-fidelity simulation engine for the **Virtual Fiat Enclave (VFE)** protocol. This tool allows for the modeling, testing, and visualization of the ViFi protocol's core mechanics—specifically the **Variable Peg AMM (VP-AMM)**—against historical market data.

## 🎯 Overview

The simulation models the interaction between a **Liquidity Provider (LP)** and a **Market Agent** (User) trading distinct fiat currencies (e.g., NGNv, KESv) against the protocol's reserve (USD). It provides a granular accounting of system state, solvency, and LP valuation.

## ✨ Key Features

### 1. Core Protocol Logic
*   **Variable Peg AMM**: Implements the constant product formula ($x \cdot y = k$) with dynamic shifting based on the proprietary **Lambda ($\Lambda$)** health factor.
*   **Expansion (Minting)**: Users swap USD for Virtual Fiat ($F$). The protocol mints new $F$ and $R$ (Reserve tokens) based on over-collateralization ratios.
*   **Contraction (Redemption)**: Users swap $F$ back to USD. A quadratic solver determines the precise redemption amount to maintain invariant stability.
*   **Buffer Management**: Tracks the System Surplus ($S_U - S_R$) which acts as a "Volatility Buffer" to protect the peg.

### 2. Financial Accounting & Valuation
*   **Detailed LP NAV**: Real-time Net Asset Value calculation breaking down equity into:
    *   **Buffer**: Volatile over-collateralization.
    *   **Pool**: Assets held in the AMM active trading functionality.
    *   **Holdings**: Excess Fiat held by the LP.
    *   **Fees**: Accumulated protocol revenue ($Q_U$).
*   **Risk-Adjusted Metrics**:
    *   **Standard APY**: Annualized return based on Total NAV.
    *   **Independent APY**: Conservative return excluding the volatile Buffer (Safe Valuation).
*   **Flow Analysis**: Tracks Net Issuance (Growth) vs. Total Volume (Activity).

### 3. Simulation Engine
*   **Historical Replay**: Ingests real-world price data (2019-2024) for currencies like Nigerian Naira (NGN), Kenyan Shilling (KES), and Ethiopian Birr (ETB).
*   **Agent Logic**:
    *   **Realistic Constraints**: Agents utilize an actual "Wallet Balance" ($W_F$) preventing infinite selling; they can only sell what they previously bought or hold.
    *   **Smart/Zombie Modes**: Configurable agent behaviors (random vs. trend-following).

### 4. Interactive Dashboard
*   **Real-time Visualization**: Watch the simulation unfold day-by-day.
*   **Transaction Terminal**: detailed step-by-step logs of every trade, showing the internal math (Mint amounts, Fee deductions, State updates) and Valuation impact.
*   **Solvency Metrics**: Monitors critical health ratios ($\Lambda$, $\Phi$, $\Omega$).

## 🚀 Getting Started

### Prerequisites
*   Node.js (v18+)
*   npm or pnpm

### Installation

```bash
cd vifi_simulation
npm install
```

### Running the Simulation

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the dashboard.

## 📊 Metrics Definitions

*   **$S_U$ (Su)**: Total USD Collateral in the system.
*   **$S_R$ (Sr)**: System Reserves (Liabilities/Claims).
*   **Net Flow**: $Expansion Volume - Contraction Volume$ (Net System Growth).
*   **Safe Valuation**: $Total Valuation - Buffer$. Represents the "Realized" value if the peg buffer were eroded to zero.

---

*Verified & Refined: Feb 2026*
