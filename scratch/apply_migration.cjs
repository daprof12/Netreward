/**
 * Apply the 00083 migration directly via Supabase service role
 * (workaround for CLI auth issues)
 */
const { createClient } = require("@supabase/supabase-js");
const fs = require("fs");
const path = require("path");

// Use service role key for admin DDL operations
const supabase = createClient(
  "https://pmpeyfkbqipfnhokfksl.supabase.co",
  // service_role key – must be kept secret, used only server-side
  process.env.SUPABASE_SERVICE_ROLE_KEY || ""
);

async function applyMigration() {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error("❌ SUPABASE_SERVICE_ROLE_KEY env var not set.");
    console.log("   Run: SUPABASE_SERVICE_ROLE_KEY=your_key node scratch/apply_migration.cjs");
    process.exit(1);
  }

  const sql = fs.readFileSync(
    path.join(__dirname, "../supabase/migrations/00083_fix_tracking_session_writes.sql"),
    "utf8"
  );

  console.log("Applying 00083 migration...");
  const { error } = await supabase.rpc("exec_sql", { sql }).catch(() => ({ error: { message: "exec_sql not available" } }));

  if (error) {
    // exec_sql not available — use the Postgres REST API directly
    console.log("Trying direct REST API...");
    const res = await fetch(
      "https://pmpeyfkbqipfnhokfksl.supabase.co/rest/v1/rpc/exec_sql",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "apikey": process.env.SUPABASE_SERVICE_ROLE_KEY,
          "Authorization": `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
        },
        body: JSON.stringify({ sql }),
      }
    );
    const body = await res.text();
    console.log("Response:", res.status, body);
  } else {
    console.log("✅ Migration applied successfully!");
  }
}

applyMigration().catch(err => { console.error(err); process.exit(1); });
