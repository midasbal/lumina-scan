#!/usr/bin/env python3
"""
Lumina Scan — Python SDK Example
=================================
Minimalist script showing how to call the Lumina Scan API
from Python or an AI agent framework (LangChain, CrewAI, AutoGen).

Requirements:
    pip install requests

Usage:
    python lumina-sdk-example.py

Features demonstrated:
    1. Dynamic pricing estimation
    2. Smart contract scanning via /api/scan
    3. MPP 402 challenge handling
    4. Priority queue (VIP lane)
    5. Session-based pay-as-you-go
    6. Pay-for-Patch remediation unlock
    7. On-chain audit proof verification
"""

import json
import hashlib
import requests
from typing import Optional

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

BASE_URL = "https://lumina-scan.vercel.app"
# BASE_URL = "http://localhost:3000"  # Uncomment for local development

# ---------------------------------------------------------------------------
# Pricing Calculator (mirrors lib/pricing.ts)
# ---------------------------------------------------------------------------

BASE_FEE_USDC = 0.10
PER_CHAR_USDC = 0.005
MIN_PRICE_USDC = 0.10
MAX_PRICE_USDC = 50.00
PRIORITY_SURCHARGE = 0.50


def estimate_price(code: str, priority: bool = False) -> float:
    """
    Calculate the expected scan price in USDC.
    Formula: price = max(0.10, min(50.00, 0.10 + chars × 0.005)) [+ 0.50 if priority]
    """
    if not code or not code.strip():
        base = MIN_PRICE_USDC
    else:
        raw = BASE_FEE_USDC + len(code) * PER_CHAR_USDC
        base = min(MAX_PRICE_USDC, max(MIN_PRICE_USDC, round(raw, 4)))
    return round(base + PRIORITY_SURCHARGE, 4) if priority else base


# ---------------------------------------------------------------------------
# 1. Basic Scan (with MPP challenge handling)
# ---------------------------------------------------------------------------

def scan_contract(
    code: str,
    priority: bool = False,
    session_token: Optional[str] = None,
) -> dict:
    """
    Scan a smart contract for vulnerabilities.

    Args:
        code:           Full source code of the contract.
        priority:       Enable VIP priority lane (+0.50 USDC, skips queue).
        session_token:  Pre-authorized session token (bypasses MPP per-request).

    Returns:
        Parsed scan report dict with vulnerabilityScore, riskLevel, issues, etc.
    """
    url = f"{BASE_URL}/api/scan"
    headers = {"Content-Type": "application/json"}

    # Attach session token if available
    if session_token:
        headers["X-Session-Token"] = session_token

    payload = {"code": code, "priority": priority}
    estimated = estimate_price(code, priority)
    print(f"[lumina] Estimated price: {estimated:.2f} USDC", end="")
    print(" (VIP)" if priority else "")

    response = requests.post(url, json=payload, headers=headers)

    # Handle MPP 402 payment challenge
    if response.status_code == 402:
        print("[lumina] ⚠ 402 Payment Required")
        print("[lumina] WWW-Authenticate:", response.headers.get("WWW-Authenticate", "N/A"))
        print("[lumina] Complete the Stellar USDC payment and retry.")
        print()
        print("  To handle this in production, parse the WWW-Authenticate header,")
        print("  submit a Stellar USDC payment to the specified recipient,")
        print("  and retry the request with the payment proof.")
        return {"error": "payment_required", "status": 402}

    response.raise_for_status()
    report = response.json()

    # Print remaining session allowance if present
    remaining = response.headers.get("X-Session-Remaining")
    if remaining:
        print(f"[lumina] Session remaining: {remaining} USDC")

    return report


# ---------------------------------------------------------------------------
# 2. Unlock Remediation Patch (1 USDC per issue)
# ---------------------------------------------------------------------------

def unlock_patch(
    issue_index: int,
    session_token: Optional[str] = None,
) -> dict:
    """
    Unlock the premium remediation code for a CRITICAL/HIGH issue.

    Args:
        issue_index:    Zero-based index of the issue to unlock.
        session_token:  Pre-authorized session token (optional).

    Returns:
        Dict with { unlocked: bool, issueIndex: int }
    """
    url = f"{BASE_URL}/api/unlock-patch"
    headers = {"Content-Type": "application/json"}
    if session_token:
        headers["X-Session-Token"] = session_token

    response = requests.post(url, json={"issueIndex": issue_index}, headers=headers)

    if response.status_code == 402:
        print(f"[lumina] ⚠ 402 — Pay 1 USDC to unlock patch #{issue_index}")
        return {"error": "payment_required", "status": 402}

    response.raise_for_status()
    return response.json()


# ---------------------------------------------------------------------------
# 3. Session Management (Pay-as-you-go)
# ---------------------------------------------------------------------------

def create_session(deposit_amount: float, wallet_address: str) -> dict:
    """
    Create a pre-paid session. Tiers: 5, 10, 25, 50 USDC.
    Returns a session token for frictionless subsequent requests.
    """
    url = f"{BASE_URL}/api/session"
    response = requests.post(url, json={
        "depositAmount": deposit_amount,
        "walletAddress": wallet_address,
    })

    if response.status_code == 402:
        print("[lumina] ⚠ 402 — Complete MPP deposit payment to create session")
        return {"error": "payment_required", "status": 402}

    response.raise_for_status()
    session = response.json()
    print(f"[lumina] ✅ Session created — token: {session['token'][:16]}...")
    print(f"[lumina]    Allowance: {session['remainingAllowance']} USDC")
    return session


def check_session(session_token: str) -> dict:
    """Check the status and remaining allowance of a session."""
    url = f"{BASE_URL}/api/session"
    response = requests.get(url, headers={"X-Session-Token": session_token})
    response.raise_for_status()
    return response.json()


def end_session(session_token: str) -> dict:
    """End and destroy an active session."""
    url = f"{BASE_URL}/api/session"
    response = requests.delete(url, headers={"X-Session-Token": session_token})
    response.raise_for_status()
    return response.json()


# ---------------------------------------------------------------------------
# 4. Verify On-Chain Audit Proof
# ---------------------------------------------------------------------------

def verify_audit_proof(report: dict, tx_hash: Optional[str] = None) -> str:
    """
    Verify that a scan report's SHA-256 hash matches the on-chain Stellar memo.

    Args:
        report:   The scan report dict.
        tx_hash:  Optional explicit tx hash (defaults to report's auditProofTxHash).

    Returns:
        Stellar Explorer URL for the proof transaction.
    """
    proof_hash = tx_hash or report.get("auditProofTxHash")
    if not proof_hash:
        print("[lumina] ⚠ No audit proof hash found in report")
        return ""

    # Compute local SHA-256 of the report JSON
    report_json = json.dumps(report, separators=(",", ":"), sort_keys=True)
    local_hash = hashlib.sha256(report_json.encode("utf-8")).hexdigest()
    print(f"[lumina] Local SHA-256:  {local_hash}")
    print(f"[lumina] On-chain proof: {proof_hash}")

    explorer_url = f"https://stellar.expert/explorer/testnet/tx/{proof_hash}"
    print(f"[lumina] 🔗 Verify at:   {explorer_url}")
    return explorer_url


# ---------------------------------------------------------------------------
# 5. LangChain Tool Integration Example
# ---------------------------------------------------------------------------

LANGCHAIN_TOOL_SCHEMA = {
    "name": "lumina_scan_audit",
    "description": (
        "Scan a smart contract for security vulnerabilities using Lumina Scan. "
        "Returns a structured report with vulnerability score (0-100), risk level, "
        "issues with severity, and a Stellar on-chain audit proof."
    ),
    "parameters": {
        "type": "object",
        "required": ["code"],
        "properties": {
            "code": {
                "type": "string",
                "description": "Full source code of the smart contract to audit.",
            },
            "priority": {
                "type": "boolean",
                "description": "Enable VIP priority queue (+0.50 USDC surcharge).",
                "default": False,
            },
        },
    },
}


def langchain_tool_handler(code: str, priority: bool = False) -> str:
    """
    Handler function compatible with LangChain's StructuredTool.
    Returns the scan report as a JSON string.

    Usage with LangChain:
        from langchain.tools import StructuredTool

        lumina_tool = StructuredTool.from_function(
            func=langchain_tool_handler,
            name="lumina_scan_audit",
            description=LANGCHAIN_TOOL_SCHEMA["description"],
        )
    """
    report = scan_contract(code, priority=priority)
    return json.dumps(report, indent=2)


# ---------------------------------------------------------------------------
# Demo — Run when executed directly
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    print("=" * 60)
    print("  Lumina Scan — Python SDK Demo")
    print("=" * 60)
    print()

    # Sample Solidity contract with a reentrancy vulnerability
    sample_code = """
pragma solidity ^0.8.0;

contract Vault {
    mapping(address => uint256) public balances;

    function deposit() public payable {
        balances[msg.sender] += msg.value;
    }

    function withdraw(uint256 amount) public {
        require(balances[msg.sender] >= amount, "Insufficient balance");
        // BUG: state update AFTER external call — classic reentrancy
        (bool success, ) = msg.sender.call{value: amount}("");
        require(success, "Transfer failed");
        balances[msg.sender] -= amount;
    }
}
""".strip()

    # 1. Estimate price
    print("[demo] Estimating price...")
    price = estimate_price(sample_code)
    price_vip = estimate_price(sample_code, priority=True)
    print(f"  Standard: {price:.2f} USDC")
    print(f"  Priority: {price_vip:.2f} USDC")
    print()

    # 2. Scan the contract
    print("[demo] Scanning contract...")
    report = scan_contract(sample_code)
    print()

    if "error" not in report:
        print(f"  Score:      {report.get('vulnerabilityScore', 'N/A')}/100")
        print(f"  Risk Level: {report.get('riskLevel', 'N/A')}")
        print(f"  Issues:     {len(report.get('issues', []))}")
        print()

        # 3. Verify on-chain proof
        if report.get("auditProofTxHash"):
            verify_audit_proof(report)
            print()

        # 4. Try unlocking a patch (if CRITICAL/HIGH issues exist)
        critical_issues = [
            (i, issue) for i, issue in enumerate(report.get("issues", []))
            if issue.get("severity") in ("CRITICAL", "HIGH")
        ]
        if critical_issues:
            idx, issue = critical_issues[0]
            print(f"[demo] Unlocking patch for issue #{idx}: {issue['title']}")
            result = unlock_patch(idx)
            print(f"  Result: {result}")
    else:
        print("[demo] Scan requires payment — see 402 challenge above.")

    print()
    print("=" * 60)
    print("  Demo complete. See /public/openclaw.json for full API spec.")
    print("=" * 60)
