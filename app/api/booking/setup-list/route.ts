import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

let memoryCache: { access_token: string; expires_at: number } | null = null;

// ===== Helper: Fetch or refresh token =====
async function getAccessToken() {
  const isVercel = !!process.env.VERCEL;
  const cacheFile = path.join(process.cwd(), "app/api/auth/cache/token_cache.json");

  // ✅ Use memory cache on Vercel
  if (isVercel) {
    if (memoryCache && Date.now() < memoryCache.expires_at) {
      return memoryCache.access_token;
    }
  } else if (fs.existsSync(cacheFile)) {
    // ✅ Local file cache
    const cache = JSON.parse(fs.readFileSync(cacheFile, "utf-8"));
    if (cache.access_token && Date.now() < cache.expires_at) {
      return cache.access_token;
    }
  }

  // 🔄 Otherwise, call the token route to refresh
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;
  const tokenRes = await fetch(`${baseUrl}/api/auth/token`);
  if (!tokenRes.ok) throw new Error(`Failed to refresh token (${tokenRes.status})`);
  const data = await tokenRes.json();

  // Store in memory cache if Vercel
  if (isVercel && data.access_token) {
    memoryCache = {
      access_token: data.access_token,
      expires_at: Date.now() + 1000 * 60 * 30, // fallback 30min
    };
  }

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
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: "",
  });

  if ((res.status === 401 || res.status === 403) && retry) {
    const newToken = await getAccessToken();
    return await fetchBusinessCentralData(newToken, false);
  }

if (!res.ok) {
  const text = await res.text();
  console.error("Business Central API error:", {
    status: res.status,
    statusText: res.statusText,
    url,
    response: text,
  });
  throw new Error(`Failed request (${res.status}): ${res.statusText} - ${text}`);
}


  const json = await res.json();
  if (!json?.value) throw new Error("Invalid JSON from Business Central");

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

// ===== POST =====
export async function POST(req: NextRequest) {
  try {
    const accessToken = await getAccessToken();
    const data = await fetchBusinessCentralData(accessToken);

    const body = await req.formData();
    const draw = parseInt(body.get("draw") as string) || 0;
    const start = parseInt(body.get("start") as string) || 0;
    const length = parseInt(body.get("length") as string) || 10;
    const search = (body.get("search[value]") as string)?.trim()?.toLowerCase() || "";

    const orderColumnIndex = body.get("order[0][column]") as string;
    const orderDir = ((body.get("order[0][dir]") as string) || "ASC").toUpperCase();

    const columns = ["Code", "Description", "Location"];
    const orderBy = columns[parseInt(orderColumnIndex)] || "Code";

    let filtered = data;
    if (search) {
      filtered = data.filter((item: any) =>
        (item.Code?.toLowerCase().includes(search) ||
          item.Description?.toLowerCase().includes(search) ||
          item.Location?.toLowerCase().includes(search))
      );
    }

    filtered.sort((a: any, b: any) => {
      const valA = a[orderBy] || "";
      const valB = b[orderBy] || "";
      if (valA === valB) return 0;
      return orderDir === "ASC"
        ? valA.localeCompare(valB)
        : valB.localeCompare(valA);
    });

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


