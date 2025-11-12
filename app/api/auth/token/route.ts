import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export async function GET() {
  try {
    const tenantId = process.env.TENANT_ID;
    const clientId = process.env.CLIENT_ID;
    const clientSecret = process.env.CLIENT_SECRET;
    const scope =
      process.env.SCOPE || "https://api.businesscentral.dynamics.com/.default";

    if (!tenantId || !clientId || !clientSecret) {
      return NextResponse.json(
        { error: "Missing environment variables" },
        { status: 500 }
      );
    }

    // Cache file path
    const cacheDir = path.join(process.cwd(), "app/api/auth/cache");
    const cacheFile = path.join(cacheDir, "token_cache.json");

    // Ensure /cache directory exists
    if (!fs.existsSync(cacheDir)) fs.mkdirSync(cacheDir, { recursive: true });

    // Check cache
    if (fs.existsSync(cacheFile)) {
      const cache = JSON.parse(fs.readFileSync(cacheFile, "utf8"));
      if (
        cache.access_token &&
        cache.expires_at &&
        Date.now() < cache.expires_at
      ) {
        // ✅ Token still valid
        return NextResponse.json({ access_token: cache.access_token });
      }
    }

    // 🆕 Request new token
    const tokenUrl = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`;
    const body = new URLSearchParams({
      grant_type: "client_credentials",
      client_id: clientId,
      client_secret: clientSecret,
      scope,
    });

    const res = await fetch(tokenUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });

    if (!res.ok) {
      const err = await res.text();
      return NextResponse.json(
        { error: "Failed to fetch token", details: err },
        { status: 500 }
      );
    }

    const result = await res.json();

    if (!result.access_token) {
      return NextResponse.json(
        { error: "Invalid token response", details: result },
        { status: 401 }
      );
    }

    const expiresAt = Date.now() + result.expires_in * 1000 - 60_000; // minus 60s buffer

    // Save to cache
    fs.writeFileSync(
      cacheFile,
      JSON.stringify(
        { access_token: result.access_token, expires_at: expiresAt },
        null,
        2
      )
    );

    return NextResponse.json({ access_token: result.access_token });
  } catch (error: any) {
    console.error("Error fetching Business Central token:", error);
    return NextResponse.json(
      { error: "Internal Server Error", details: error.message },
      { status: 500 }
    );
  }
}
