import { NextResponse } from "next/server";
import * as mariadb from "mariadb";

export const dynamic = "force-dynamic";

export async function GET() {
  const databaseUrl = process.env.DATABASE_URL;
  const results: Record<string, unknown> = {
    timestamp: new Date().toISOString(),
    hasDbUrl: !!databaseUrl,
    dbUrlFormat: databaseUrl ? databaseUrl.replace(/:[^:@]+@/, ':***@') : null,
  };

  if (!databaseUrl) {
    return NextResponse.json({ ...results, error: "No DATABASE_URL" });
  }

  try {
    const url = new URL(databaseUrl);
    results.parsedHost = url.hostname;
    results.parsedPort = url.port || "3306";
    results.parsedDb = url.pathname.slice(1);
    results.parsedUser = url.username;

    // Try direct connection (not pool)
    const conn = await mariadb.createConnection({
      host: url.hostname,
      port: parseInt(url.port || "3306"),
      user: decodeURIComponent(url.username),
      password: decodeURIComponent(url.password),
      database: url.pathname.slice(1),
      ssl: { rejectUnauthorized: false },
      connectTimeout: 15000,
    });

    results.connected = true;

    const rows = await conn.query("SELECT COUNT(*) as cnt FROM wb_mod_topics");
    results.topicCount = Number(rows[0].cnt);

    const sslStatus = await conn.query("SHOW STATUS LIKE 'Ssl_cipher'");
    results.sslCipher = sslStatus[0]?.Value || "none";

    await conn.end();
    results.success = true;
  } catch (err: unknown) {
    const error = err as Error;
    results.error = error.message;
    results.errorName = error.name;
    results.stack = error.stack?.split('\n').slice(0, 5);
  }

  return NextResponse.json(results);
}
