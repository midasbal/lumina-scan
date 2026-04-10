#!/usr/bin/env python3
"""
Lumina Scan — OpenClaw / LangChain Integration Script
=====================================================
This script demonstrates how to integrate Lumina Scan as a tool
within popular AI agent frameworks: LangChain, CrewAI, AutoGen.

See /public/openclaw.json for the full OpenAPI spec.
See /public/lumina-sdk-example.py for the low-level HTTP client.

Requirements:
    pip install requests langchain-core

Note: This is a reference implementation. In production, configure
proper Stellar wallet credentials and MPP payment handling.
"""

import json
import requests
from typing import Optional

BASE_URL = "https://lumina-scan.vercel.app"


# ---------------------------------------------------------------------------
# LangChain Integration
# ---------------------------------------------------------------------------

def create_langchain_tool(base_url: str = BASE_URL, session_token: Optional[str] = None):
    """
    Create a LangChain StructuredTool for Lumina Scan.

    Usage:
        from langchain.agents import initialize_agent, AgentType
        from langchain_openai import ChatOpenAI

        tool = create_langchain_tool()
        llm = ChatOpenAI(model="gpt-4")
        agent = initialize_agent([tool], llm, agent=AgentType.OPENAI_FUNCTIONS)
        result = agent.run("Audit this Solidity contract: ...")
    """
    try:
        from langchain_core.tools import StructuredTool
    except ImportError:
        raise ImportError("Install langchain-core: pip install langchain-core")

    def scan(code: str, priority: bool = False) -> str:
        """Scan a smart contract for security vulnerabilities."""
        headers = {"Content-Type": "application/json"}
        if session_token:
            headers["X-Session-Token"] = session_token

        resp = requests.post(
            f"{base_url}/api/scan",
            json={"code": code, "priority": priority},
            headers=headers,
        )

        if resp.status_code == 402:
            return json.dumps({
                "error": "payment_required",
                "message": "Complete Stellar MPP payment. See WWW-Authenticate header.",
                "www_authenticate": resp.headers.get("WWW-Authenticate", ""),
            })

        resp.raise_for_status()
        return json.dumps(resp.json(), indent=2)

    return StructuredTool.from_function(
        func=scan,
        name="lumina_scan_audit",
        description=(
            "Scan a smart contract for security vulnerabilities using Lumina Scan. "
            "Returns vulnerability score (0-100), risk level, issues with severity, "
            "remediation hints, and a Stellar on-chain audit proof hash. "
            "Accepts 'code' (required) and 'priority' (optional, +0.50 USDC) parameters."
        ),
    )


# ---------------------------------------------------------------------------
# Generic Agent Integration (CrewAI, AutoGen, etc.)
# ---------------------------------------------------------------------------

def get_tool_definition() -> dict:
    """
    Return a tool definition dict compatible with OpenAI function calling,
    CrewAI tools, and AutoGen tool registration.
    """
    return {
        "type": "function",
        "function": {
            "name": "lumina_scan_audit",
            "description": (
                "Scan a smart contract for security vulnerabilities. "
                "Returns a structured report with vulnerability score (0-100), "
                "risk level, issues, and Stellar on-chain audit proof."
            ),
            "parameters": {
                "type": "object",
                "required": ["code"],
                "properties": {
                    "code": {
                        "type": "string",
                        "description": "Full source code of the smart contract.",
                    },
                    "priority": {
                        "type": "boolean",
                        "default": False,
                        "description": "Enable VIP priority queue (+0.50 USDC).",
                    },
                },
            },
        },
    }


if __name__ == "__main__":
    print("Tool Definition:")
    print(json.dumps(get_tool_definition(), indent=2))
    print()
    print("Use create_langchain_tool() to integrate with LangChain agents.")
