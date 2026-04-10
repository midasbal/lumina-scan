import { NextResponse } from "next/server";
import { readFileSync } from "fs";
import { join } from "path";

/**
 * GET /api/mcp/config
 *
 * Returns the MCP (Model Context Protocol) server configuration.
 * AI agents can query this endpoint to discover available tools,
 * authentication requirements, and capability metadata.
 */

// Cache the manifest at module load time so we don't read from disk per request
let mcpManifest: Record<string, unknown> | null = null;

function loadManifest(): Record<string, unknown> {
  if (mcpManifest) return mcpManifest;

  try {
    const filePath = join(process.cwd(), "public", "mcp.json");
    const raw = readFileSync(filePath, "utf-8");
    mcpManifest = JSON.parse(raw) as Record<string, unknown>;
    return mcpManifest;
  } catch (err) {
    console.error("[mcp/config] Failed to load mcp.json:", err);
    return {
      error: "MCP manifest could not be loaded.",
    };
  }
}

export async function GET() {
  const manifest = loadManifest();

  // Inject runtime information
  const config = {
    ...manifest,
    runtime: {
      status: "operational",
      version: process.env.npm_package_version ?? "0.1.0",
      environment: process.env.NODE_ENV ?? "development",
      base_url:
        process.env.NEXT_PUBLIC_BASE_URL ??
        process.env.VERCEL_URL
          ? `https://${process.env.VERCEL_URL}`
          : "https://lumina-scan.vercel.app",
    },
  };

  return NextResponse.json(config, {
    status: 200,
    headers: {
      "Cache-Control": "public, max-age=3600, s-maxage=3600",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}

/**
 * Handle CORS preflight for AI agent discovery.
 */
export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}
