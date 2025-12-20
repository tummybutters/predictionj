import { createClient } from "@supabase/supabase-js";

function requireEnv(name) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env var: ${name}`);
  return v;
}

function shortId(uuid) {
  return String(uuid).replace(/-/g, "").slice(0, 10);
}

function safeString(v) {
  return typeof v === "string" ? v : "";
}

function safeNumber(v) {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}

function normalize01(v) {
  const n = safeNumber(v);
  if (n == null) return null;
  if (n > 1) return Math.max(0, Math.min(1, n / 100));
  return Math.max(0, Math.min(1, n));
}

function handleFrom(prefix, id) {
  const base = `${prefix}-${shortId(id)}`.toLowerCase();
  // Must match: ^[a-z0-9][a-z0-9-]{1,39}$
  return base.slice(0, 40);
}

async function tableExists(supabase, table) {
  const { error } = await supabase.from(table).select("id", { head: true, count: "exact" }).limit(1);
  if (!error) return true;
  const code = error.code ?? "";
  const msg = String(error.message ?? "");
  if (code === "42P01" || msg.toLowerCase().includes("does not exist")) return false;
  throw error;
}

async function* fetchAll(supabase, table, pageSize = 1000) {
  let from = 0;
  while (true) {
    const { data, error } = await supabase.from(table).select("*").range(from, from + pageSize - 1);
    if (error) throw error;
    if (!data?.length) break;
    yield data;
    from += data.length;
    if (data.length < pageSize) break;
  }
}

async function upsertTruthObjects(supabase, rows) {
  if (!rows.length) return;
  const { error } = await supabase
    .from("truth_objects")
    .upsert(rows, { onConflict: "id", ignoreDuplicates: true });
  if (error) throw error;
}

async function migrateJournalEntries(supabase) {
  if (!(await tableExists(supabase, "journal_entries"))) return { migrated: 0 };

  let migrated = 0;
  for await (const batch of fetchAll(supabase, "journal_entries")) {
    const rows = batch
      .map((r) => {
        const id = r.id;
        const user_id = r.user_id;
        if (!id || !user_id) return null;
        const title = safeString(r.title);
        const body = safeString(r.body);
        return {
          id,
          user_id,
          type: "note",
          handle: handleFrom("note", id),
          title,
          body,
          confidence: null,
          source_url: null,
          metadata: { legacy: { table: "journal_entries", id }, ...("metadata" in r ? { legacy_row: r } : {}) },
          created_at: r.created_at ?? undefined,
          updated_at: r.updated_at ?? undefined,
        };
      })
      .filter(Boolean);

    await upsertTruthObjects(supabase, rows);
    migrated += rows.length;
    process.stdout.write(`journal_entries: migrated ${migrated}\n`);
  }

  return { migrated };
}

async function migrateBeliefs(supabase) {
  if (!(await tableExists(supabase, "beliefs"))) return { migrated: 0 };

  let migrated = 0;
  for await (const batch of fetchAll(supabase, "beliefs")) {
    const rows = batch
      .map((r) => {
        const id = r.id;
        const user_id = r.user_id;
        if (!id || !user_id) return null;
        const statement = safeString(r.statement);
        const confidence = normalize01(r.confidence);
        return {
          id,
          user_id,
          type: "belief",
          handle: handleFrom("belief", id),
          title: statement ? statement.slice(0, 120) : safeString(r.title),
          body: safeString(r.body),
          confidence,
          source_url: null,
          metadata: { statement, legacy: { table: "beliefs", id }, legacy_row: r },
          created_at: r.created_at ?? undefined,
          updated_at: r.updated_at ?? undefined,
        };
      })
      .filter(Boolean);

    await upsertTruthObjects(supabase, rows);
    migrated += rows.length;
    process.stdout.write(`beliefs: migrated ${migrated}\n`);
  }

  return { migrated };
}

function outcomesFromLegacy(r) {
  const outcome = safeString(r.outcome).toUpperCase();
  if (outcome === "YES" || outcome === "NO") return [{ key: "YES", label: "Yes" }, { key: "NO", label: "No" }];
  return [{ key: "YES", label: "Yes" }, { key: "NO", label: "No" }];
}

async function migratePredictions(supabase) {
  if (!(await tableExists(supabase, "predictions"))) return { migrated: 0 };

  let migrated = 0;
  for await (const batch of fetchAll(supabase, "predictions")) {
    const rows = batch
      .map((r) => {
        const id = r.id;
        const user_id = r.user_id;
        if (!id || !user_id) return null;

        const title = safeString(r.title);
        const question = safeString(r.question) || title || safeString(r.claim);
        const p = normalize01(r.probability);
        const closeAt = safeString(r.resolution_date) || safeString(r.resolve_by);

        const metadata = {
          market: { question, outcomes: outcomesFromLegacy(r) },
          position: {
            initial_probability: p ?? 0.5,
            current_probability: p ?? 0.5,
          },
          timing: { close_at: closeAt },
          resolution: {
            criteria: safeString(r.resolution_note) || safeString(r.criteria),
            source_urls: [],
            ...(r.resolved_at ? { resolved_at: r.resolved_at } : {}),
            ...(r.outcome ? { outcome: r.outcome } : {}),
          },
          legacy: { table: "predictions", id },
          legacy_row: r,
        };

        return {
          id,
          user_id,
          type: "prediction",
          handle: handleFrom("prediction", id),
          title: title || (question ? question.slice(0, 120) : "Prediction"),
          body: safeString(r.body) || safeString(r.notes),
          confidence: null,
          source_url: null,
          metadata,
          created_at: r.created_at ?? undefined,
          updated_at: r.updated_at ?? undefined,
        };
      })
      .filter(Boolean);

    await upsertTruthObjects(supabase, rows);
    migrated += rows.length;
    process.stdout.write(`predictions: migrated ${migrated}\n`);
  }

  return { migrated };
}

async function main() {
  const url = requireEnv("SUPABASE_URL");
  const key = requireEnv("SUPABASE_SERVICE_ROLE_KEY");
  const supabase = createClient(url, key, { auth: { persistSession: false } });

  process.stdout.write("Migrating legacy tables into truth_objects…\n");

  const results = {
    notes: await migrateJournalEntries(supabase),
    beliefs: await migrateBeliefs(supabase),
    predictions: await migratePredictions(supabase),
  };

  process.stdout.write(`Done.\n${JSON.stringify(results, null, 2)}\n`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

