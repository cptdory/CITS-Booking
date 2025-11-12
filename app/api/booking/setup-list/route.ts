import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

// ===== Helper: Fetch or refresh token =====
async function getAccessToken() {
  const cacheFile = path.join(process.cwd(), "app/api/auth/cache/token_cache.json");

  // ✅ If cache exists and still valid
  if (fs.existsSync(cacheFile)) {
    const cache = JSON.parse(fs.readFileSync(cacheFile, "utf-8"));
    if (cache.access_token && cache.expires_at && Date.now() < cache.expires_at) {
      return cache.access_token;
    }
  }

  // 🔄 Otherwise, call the token route to refresh
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
  const tokenRes = await fetch(`${baseUrl}/api/auth/token`);
  if (!tokenRes.ok) {
    throw new Error(`Failed to refresh token (${tokenRes.status})`);
  }
  const data = await tokenRes.json();
  if (!data.access_token) throw new Error("Token route returned no token");
  return data.access_token;
}

// ===== Helper: Call Business Central API =====
async function fetchBusinessCentralData(accessToken: string, retry = true): Promise<any[]> {
  const tenantId = process.env.TENANT_ID!;
  const environment = "SandboxDev2";
  const company = "SQUADLETHICS";

  const url = `https://api.businesscentral.dynamics.com/v2.0/${tenantId}/${environment}/ODataV4/BookingAppointment_GetBookingSetupList?Company=${company}`;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${accessToken}`,
      "Accept": "application/json",
      "Content-Type": "application/json"
    },
    body: ""
  });

  // 🔁 If token expired/invalid, refresh and retry once
  if ((res.status === 401 || res.status === 403) && retry) {
    const newToken = await getAccessToken();
    return await fetchBusinessCentralData(newToken, false);
  }

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Failed request (${res.status}): ${text}`);
  }

  const json = await res.json();
  if (!json || !json.value) throw new Error("Invalid JSON from Business Central");

  const value = json.value;
  if (typeof value === "string") {
    try {
      return JSON.parse(value);
    } catch {
      return [];
    }
  }
  return Array.isArray(value) ? value : [];
}

// ===== GET =====
export async function GET() {
  try {
    const accessToken = await getAccessToken();
    const data = await fetchBusinessCentralData(accessToken);
    return NextResponse.json({ value: data });
  } catch (err: any) {
    return NextResponse.json({ error: "Server error", message: err.message }, { status: 500 });
  }
}

// ===== POST (for DataTables) =====
export async function POST(req: NextRequest) {
  try {
    const accessToken = await getAccessToken();
    const data = await fetchBusinessCentralData(accessToken);

    // === DataTables handling ===
    const body = await req.formData();
    const draw = parseInt(body.get("draw") as string) || 0;
    const start = parseInt(body.get("start") as string) || 0;
    const length = parseInt(body.get("length") as string) || 10;
    const search = (body.get("search[value]") as string)?.trim()?.toLowerCase() || "";

    const orderColumnIndex = body.get("order[0][column]") as string;
    const orderDir = ((body.get("order[0][dir]") as string) || "ASC").toUpperCase();

    const columns = ["Code", "Description", "Location"];
    const orderBy = columns[parseInt(orderColumnIndex)] || "Code";

    // === Filter ===
    let filtered = data;
    if (search) {
      filtered = data.filter((item: any) =>
        (item.Code?.toLowerCase().includes(search) ||
          item.Description?.toLowerCase().includes(search) ||
          item.Location?.toLowerCase().includes(search))
      );
    }

    // === Sort ===
    filtered.sort((a: any, b: any) => {
      const valA = a[orderBy] || "";
      const valB = b[orderBy] || "";
      if (valA === valB) return 0;
      return orderDir === "ASC"
        ? valA.localeCompare(valB)
        : valB.localeCompare(valA);
    });

    // === Pagination ===
    const totalRecords = data.length;
    const filteredRecords = filtered.length;
    const paginated = filtered.slice(start, start + length);

    return NextResponse.json({
      draw,
      recordsTotal: totalRecords,
      recordsFiltered: filteredRecords,
      data: paginated,
    });
  } catch (err: any) {
    return NextResponse.json({ error: "Server error", message: err.message }, { status: 500 });
  }
}
