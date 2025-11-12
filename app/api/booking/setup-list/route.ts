import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export async function GET() {
  try {
    const cacheFile = path.join(process.cwd(), "app/api/auth/cache/token_cache.json");
    if (!fs.existsSync(cacheFile)) {
      return NextResponse.json({ error: "No valid access token found" }, { status: 401 });
    }

    const cache = JSON.parse(fs.readFileSync(cacheFile, "utf-8"));
    const accessToken = cache.access_token;
    if (!accessToken) {
      return NextResponse.json({ error: "No valid access token found" }, { status: 401 });
    }

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

    if (!res.ok) {
      const text = await res.text();
      return NextResponse.json({ error: "Failed request", status: res.status, response: text }, { status: res.status });
    }

    const json = await res.json();

    if (!json || !json.value) {
      return NextResponse.json({ error: "Invalid JSON from Business Central", raw: json }, { status: 500 });
    }

    let data: any[] = [];
    const value = json.value;
    if (typeof value === "string") {
      try {
        data = JSON.parse(value);
      } catch {
        data = [];
      }
    } else if (Array.isArray(value)) {
      data = value;
    }

    return NextResponse.json({ value: data });
  } catch (err: any) {
    return NextResponse.json({ error: "Server error", message: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const cacheFile = path.join(process.cwd(), "app/api/auth/cache/token_cache.json");
    if (!fs.existsSync(cacheFile)) {
      return NextResponse.json({ error: "No valid access token found" }, { status: 401 });
    }

    const cache = JSON.parse(fs.readFileSync(cacheFile, "utf-8"));
    const accessToken = cache.access_token;

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

    if (!res.ok) {
      const text = await res.text();
      return NextResponse.json({ error: "Failed request", status: res.status, response: text }, { status: res.status });
    }

    const json = await res.json();
    if (!json || !json.value) {
      return NextResponse.json({ error: "Invalid JSON from Business Central", raw: json }, { status: 500 });
    }

    let data: any[] = [];
    const value = json.value;
    if (typeof value === "string") {
      try {
        data = JSON.parse(value);
      } catch {
        data = [];
      }
    } else if (Array.isArray(value)) {
      data = value;
    }

    // === DataTables logic ===
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
      filtered = data.filter((item) =>
        (item.Code?.toLowerCase().includes(search) ||
          item.Description?.toLowerCase().includes(search) ||
          item.Location?.toLowerCase().includes(search))
      );
    }

    // === Sort ===
    filtered.sort((a, b) => {
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
