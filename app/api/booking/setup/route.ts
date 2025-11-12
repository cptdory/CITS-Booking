import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const branch = searchParams.get("branch");

    if (!branch) {
      return NextResponse.json({ error: "Branch parameter is required" }, { status: 400 });
    }

    const cacheFile = path.join(process.cwd(), "app/api/auth/cache/token_cache.json");
    if (!fs.existsSync(cacheFile)) {
      return NextResponse.json({ error: "No valid access token found" }, { status: 401 });
    }

    const cache = JSON.parse(fs.readFileSync(cacheFile, "utf-8"));
    const accessToken = cache.access_token;

    const tenantId = process.env.TENANT_ID!;
    const environment = "SandboxDev2";
    const company = "SQUADLETHICS";

    const url = `https://api.businesscentral.dynamics.com/v2.0/${tenantId}/${environment}/ODataV4/BookingAppointment_GetBookingSetup?Company=${company}`;

    const body = JSON.stringify({
      _BookingSetupCode: branch
    });

    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Accept": "application/json",
        "Content-Type": "application/json"
      },
      body
    });

    if (!res.ok) {
      const text = await res.text();
      return NextResponse.json({ error: "Failed request", status: res.status, response: text }, { status: res.status });
    }

    const json = await res.json();
    return NextResponse.json(json);

  } catch (err: any) {
    return NextResponse.json({ error: "Server error", message: err.message }, { status: 500 });
  }
}