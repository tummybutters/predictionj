import Link from "next/link";

import { PageHeader } from "@/components/app/page-header";
import { Panel } from "@/components/ui/panel";
import { ensureUser } from "@/services/auth/ensure-user";
import { createSupabaseServerClient } from "@/db/supabase/server";
import { cn } from "@/lib/cn";

type TruthObjectType = "note" | "belief" | "prediction" | "framework" | "data";
type LinkRelation = "supports" | "contradicts" | "derived_from" | "uses" | "related";

const RANGE_OPTIONS = [
  { key: "7d", label: "7d", days: 7 },
  { key: "30d", label: "30d", days: 30 },
  { key: "90d", label: "90d", days: 90 },
  { key: "all", label: "All", days: null },
] as const;

type RangeKey = (typeof RANGE_OPTIONS)[number]["key"];

function formatCount(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return "0";
  return Math.max(0, value).toLocaleString();
}

function formatDate(value: string | null | undefined): string {
  if (!value) return "—";
  const t = Date.parse(value);
  if (!Number.isFinite(t)) return "—";
  return new Date(t).toISOString().slice(0, 10);
}

function parseRangeKey(value: string | string[] | undefined): RangeKey {
  const raw = Array.isArray(value) ? value[0] : value;
  const match = RANGE_OPTIONS.find((o) => o.key === raw);
  return match?.key ?? "30d";
}

function withinRange(value: string | null | undefined, start: number | null): boolean {
  if (!start) return true;
  if (!value) return false;
  const t = Date.parse(value);
  return Number.isFinite(t) && t >= start;
}

export default async function OverviewPage({
  searchParams,
}: {
  searchParams?: { [key: string]: string | string[] | undefined };
}) {
  const ensured = await ensureUser();
  const rangeKey = parseRangeKey(searchParams?.range);
  const range = RANGE_OPTIONS.find((r) => r.key === rangeKey) ?? RANGE_OPTIONS[1];
  const rangeStart = range.days ? Date.now() - range.days * 86_400_000 : null;

  const supabase = createSupabaseServerClient();
  let objects: Array<{
    id: string;
    type: TruthObjectType;
    confidence: number | null;
    source_url: string | null;
    metadata: Record<string, unknown>;
    created_at: string;
    updated_at: string;
  }> = [];
  let links: Array<{
    id: string;
    relation: LinkRelation;
    from_object_id: string;
    to_object_id: string;
    updated_at: string;
  }> = [];

  let dbReady = true;
  const { data: objectsData, error: objectsError } = await supabase
    .from("truth_objects")
    .select("id, type, confidence, source_url, metadata, created_at, updated_at")
    .eq("user_id", ensured.user_id);
  if (objectsError) dbReady = false;
  if (objectsData) objects = objectsData as typeof objects;

  const { data: linksData, error: linksError } = await supabase
    .from("truth_object_links")
    .select("id, relation, from_object_id, to_object_id, updated_at")
    .eq("user_id", ensured.user_id);
  if (linksError) dbReady = false;
  if (linksData) links = linksData as typeof links;

  if (!dbReady) {
    return (
      <main className="mx-auto max-w-6xl space-y-6 px-6 pb-16 pt-8">
        <PageHeader
          title="Overview"
          subtitle="Apply `db/schema_v2/*` in Supabase to enable stats inventory."
        />
        <Panel className="p-6">
          <div className="text-sm font-semibold text-text/90">Database schema not applied</div>
          <div className="mt-2 text-sm text-muted">
            Run `db/schema_v2/0001_core.sql` then `db/schema_v2/0002_truth_objects.sql`.
          </div>
        </Panel>
      </main>
    );
  }

  const types: TruthObjectType[] = ["note", "belief", "prediction", "framework", "data"];
  const countsByType = Object.fromEntries(
    types.map((type) => [
      type,
      { total: 0, created: 0, updated: 0, lastUpdated: null as string | null },
    ]),
  ) as Record<
    TruthObjectType,
    { total: number; created: number; updated: number; lastUpdated: string | null }
  >;

  for (const obj of objects) {
    const bucket = countsByType[obj.type];
    bucket.total += 1;
    if (withinRange(obj.created_at, rangeStart)) bucket.created += 1;
    if (withinRange(obj.updated_at, rangeStart)) bucket.updated += 1;
    if (!bucket.lastUpdated || obj.updated_at > bucket.lastUpdated) bucket.lastUpdated = obj.updated_at;
  }

  const linkCounts: Record<LinkRelation, { total: number; updated: number }> = {
    supports: { total: 0, updated: 0 },
    contradicts: { total: 0, updated: 0 },
    derived_from: { total: 0, updated: 0 },
    uses: { total: 0, updated: 0 },
    related: { total: 0, updated: 0 },
  };

  const linkedIds = new Set<string>();
  let lastLinkUpdated: string | null = null;
  for (const link of links) {
    linkedIds.add(link.from_object_id);
    linkedIds.add(link.to_object_id);
    const rel = linkCounts[link.relation];
    rel.total += 1;
    if (withinRange(link.updated_at, rangeStart)) rel.updated += 1;
    if (!lastLinkUpdated || link.updated_at > lastLinkUpdated) lastLinkUpdated = link.updated_at;
  }

  const orphanCount = objects.filter((obj) => !linkedIds.has(obj.id)).length;

  const beliefs = objects.filter((o) => o.type === "belief");
  const beliefHigh = beliefs.filter((b) => (b.confidence ?? 0) >= 0.8).length;
  const beliefLow = beliefs.filter((b) => (b.confidence ?? 1) <= 0.3).length;

  const frameworks = objects.filter((o) => o.type === "framework");
  const frameworkUsed = frameworks.filter((f) => linkedIds.has(f.id)).length;
  const frameworkUnused = Math.max(0, frameworks.length - frameworkUsed);

  const dataObjects = objects.filter((o) => o.type === "data");
  const dataLinked = dataObjects.filter((d) => linkedIds.has(d.id)).length;
  const dataUnlinked = Math.max(0, dataObjects.length - dataLinked);
  const dataWithSource = dataObjects.filter((d) => (d.source_url ?? "").trim()).length;

  const predictions = objects.filter((o) => o.type === "prediction");
  const now = Date.now();
  const soon = now + 7 * 86_400_000;
  let predWithDate = 0;
  let predWithoutDate = 0;
  let predOverdue = 0;
  let predDueSoon = 0;
  let predFuture = 0;
  let predWithSources = 0;

  for (const p of predictions) {
    const meta = p.metadata ?? {};
    const timing = (meta as Record<string, unknown>).timing;
    const resolution = (meta as Record<string, unknown>).resolution;
    const closeAt =
      timing && typeof timing === "object" && typeof (timing as Record<string, unknown>).close_at === "string"
        ? String((timing as Record<string, unknown>).close_at).trim()
        : "";
    const sources =
      resolution && typeof resolution === "object"
        ? (resolution as Record<string, unknown>).source_urls
        : null;
    if (Array.isArray(sources) && sources.length) predWithSources += 1;

    if (!closeAt) {
      predWithoutDate += 1;
      continue;
    }
    const closeMs = Date.parse(closeAt);
    if (!Number.isFinite(closeMs)) {
      predWithoutDate += 1;
      continue;
    }
    predWithDate += 1;
    if (closeMs < now) predOverdue += 1;
    else if (closeMs <= soon) predDueSoon += 1;
    else predFuture += 1;
  }

  const { data: polyAccount } = await supabase
    .from("polymarket_accounts")
    .select("user_id")
    .eq("user_id", ensured.user_id)
    .maybeSingle();

  const { data: kalshiAccount } = await supabase
    .from("kalshi_accounts")
    .select("user_id")
    .eq("user_id", ensured.user_id)
    .maybeSingle();

  async function countTrading(table: string, provider?: "polymarket" | "kalshi") {
    let query = supabase.from(table).select("user_id", { count: "exact", head: true }).eq("user_id", ensured.user_id);
    if (provider) query = query.eq("provider", provider);
    const { count } = await query;
    return count ?? 0;
  }

  async function latestSync(provider: "polymarket" | "kalshi") {
    const { data } = await supabase
      .from("trading_sync_runs")
      .select("finished_at")
      .eq("user_id", ensured.user_id)
      .eq("provider", provider)
      .order("finished_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    return data?.finished_at ?? null;
  }

  const [
    polyPositions,
    kalshiPositions,
    polyOrders,
    kalshiOrders,
    polyActions,
    kalshiActions,
    polySync,
    kalshiSync,
  ] = await Promise.all([
    countTrading("trading_positions_current", "polymarket").catch(() => 0),
    countTrading("trading_positions_current", "kalshi").catch(() => 0),
    countTrading("trading_orders_current", "polymarket").catch(() => 0),
    countTrading("trading_orders_current", "kalshi").catch(() => 0),
    countTrading("trading_actions", "polymarket").catch(() => 0),
    countTrading("trading_actions", "kalshi").catch(() => 0),
    latestSync("polymarket").catch(() => null),
    latestSync("kalshi").catch(() => null),
  ]);

  const latestObjectUpdated =
    objects.reduce((max, o) => (o.updated_at > max ? o.updated_at : max), "") || null;

  const statsRows = [
    {
      category: "Truth Objects",
      metric: "Notes",
      total: countsByType.note.total,
      created: countsByType.note.created,
      updated: countsByType.note.updated,
      lastUpdated: countsByType.note.lastUpdated,
    },
    {
      category: "Truth Objects",
      metric: "Beliefs",
      total: countsByType.belief.total,
      created: countsByType.belief.created,
      updated: countsByType.belief.updated,
      lastUpdated: countsByType.belief.lastUpdated,
    },
    {
      category: "Truth Objects",
      metric: "Predictions",
      total: countsByType.prediction.total,
      created: countsByType.prediction.created,
      updated: countsByType.prediction.updated,
      lastUpdated: countsByType.prediction.lastUpdated,
    },
    {
      category: "Truth Objects",
      metric: "Frameworks",
      total: countsByType.framework.total,
      created: countsByType.framework.created,
      updated: countsByType.framework.updated,
      lastUpdated: countsByType.framework.lastUpdated,
    },
    {
      category: "Truth Objects",
      metric: "Data",
      total: countsByType.data.total,
      created: countsByType.data.created,
      updated: countsByType.data.updated,
      lastUpdated: countsByType.data.lastUpdated,
    },
    {
      category: "Prediction Tracking",
      metric: "With close date",
      total: predWithDate,
      created: predDueSoon,
      updated: predOverdue,
      lastUpdated: countsByType.prediction.lastUpdated,
    },
    {
      category: "Prediction Tracking",
      metric: "Without close date",
      total: predWithoutDate,
      created: 0,
      updated: 0,
      lastUpdated: countsByType.prediction.lastUpdated,
    },
    {
      category: "Prediction Tracking",
      metric: "Due soon (7d)",
      total: predDueSoon,
      created: 0,
      updated: 0,
      lastUpdated: countsByType.prediction.lastUpdated,
    },
    {
      category: "Prediction Tracking",
      metric: "Overdue",
      total: predOverdue,
      created: 0,
      updated: 0,
      lastUpdated: countsByType.prediction.lastUpdated,
    },
    {
      category: "Prediction Tracking",
      metric: "Future close dates",
      total: predFuture,
      created: 0,
      updated: 0,
      lastUpdated: countsByType.prediction.lastUpdated,
    },
    {
      category: "Prediction Tracking",
      metric: "With sources",
      total: predWithSources,
      created: 0,
      updated: 0,
      lastUpdated: countsByType.prediction.lastUpdated,
    },
    {
      category: "Belief Dynamics",
      metric: "High confidence (>=0.8)",
      total: beliefHigh,
      created: 0,
      updated: 0,
      lastUpdated: countsByType.belief.lastUpdated,
    },
    {
      category: "Belief Dynamics",
      metric: "Low confidence (<=0.3)",
      total: beliefLow,
      created: 0,
      updated: 0,
      lastUpdated: countsByType.belief.lastUpdated,
    },
    {
      category: "Framework Usage",
      metric: "Referenced frameworks",
      total: frameworkUsed,
      created: 0,
      updated: 0,
      lastUpdated: countsByType.framework.lastUpdated,
    },
    {
      category: "Framework Usage",
      metric: "Unused frameworks",
      total: frameworkUnused,
      created: 0,
      updated: 0,
      lastUpdated: countsByType.framework.lastUpdated,
    },
    {
      category: "Data/Evidence",
      metric: "Linked data objects",
      total: dataLinked,
      created: 0,
      updated: 0,
      lastUpdated: countsByType.data.lastUpdated,
    },
    {
      category: "Data/Evidence",
      metric: "Unlinked data objects",
      total: dataUnlinked,
      created: 0,
      updated: 0,
      lastUpdated: countsByType.data.lastUpdated,
    },
    {
      category: "Data/Evidence",
      metric: "Data with source URL",
      total: dataWithSource,
      created: 0,
      updated: 0,
      lastUpdated: countsByType.data.lastUpdated,
    },
    {
      category: "Link Graph",
      metric: "Total links",
      total: links.length,
      created: links.filter((l) => withinRange(l.updated_at, rangeStart)).length,
      updated: links.filter((l) => withinRange(l.updated_at, rangeStart)).length,
      lastUpdated: lastLinkUpdated,
    },
    {
      category: "Link Graph",
      metric: "Supports",
      total: linkCounts.supports.total,
      created: linkCounts.supports.updated,
      updated: linkCounts.supports.updated,
      lastUpdated: lastLinkUpdated,
    },
    {
      category: "Link Graph",
      metric: "Contradicts",
      total: linkCounts.contradicts.total,
      created: linkCounts.contradicts.updated,
      updated: linkCounts.contradicts.updated,
      lastUpdated: lastLinkUpdated,
    },
    {
      category: "Link Graph",
      metric: "Derived from",
      total: linkCounts.derived_from.total,
      created: linkCounts.derived_from.updated,
      updated: linkCounts.derived_from.updated,
      lastUpdated: lastLinkUpdated,
    },
    {
      category: "Link Graph",
      metric: "Uses",
      total: linkCounts.uses.total,
      created: linkCounts.uses.updated,
      updated: linkCounts.uses.updated,
      lastUpdated: lastLinkUpdated,
    },
    {
      category: "Link Graph",
      metric: "Related",
      total: linkCounts.related.total,
      created: linkCounts.related.updated,
      updated: linkCounts.related.updated,
      lastUpdated: lastLinkUpdated,
    },
    {
      category: "Link Graph",
      metric: "Orphan objects",
      total: orphanCount,
      created: 0,
      updated: 0,
      lastUpdated: latestObjectUpdated,
    },
    {
      category: "Market Accounts",
      metric: "Polymarket connected",
      total: polyAccount ? 1 : 0,
      created: 0,
      updated: 0,
      lastUpdated: polySync,
    },
    {
      category: "Market Accounts",
      metric: "Kalshi connected",
      total: kalshiAccount ? 1 : 0,
      created: 0,
      updated: 0,
      lastUpdated: kalshiSync,
    },
    {
      category: "Market Accounts",
      metric: "Polymarket positions",
      total: polyPositions,
      created: 0,
      updated: 0,
      lastUpdated: polySync,
    },
    {
      category: "Market Accounts",
      metric: "Kalshi positions",
      total: kalshiPositions,
      created: 0,
      updated: 0,
      lastUpdated: kalshiSync,
    },
    {
      category: "Market Accounts",
      metric: "Polymarket open orders",
      total: polyOrders,
      created: 0,
      updated: 0,
      lastUpdated: polySync,
    },
    {
      category: "Market Accounts",
      metric: "Kalshi open orders",
      total: kalshiOrders,
      created: 0,
      updated: 0,
      lastUpdated: kalshiSync,
    },
    {
      category: "Market Accounts",
      metric: "Polymarket actions",
      total: polyActions,
      created: 0,
      updated: 0,
      lastUpdated: polySync,
    },
    {
      category: "Market Accounts",
      metric: "Kalshi actions",
      total: kalshiActions,
      created: 0,
      updated: 0,
      lastUpdated: kalshiSync,
    },
  ];

  return (
    <main className="mx-auto max-w-6xl space-y-6 px-6 pb-16 pt-8">
      <PageHeader
        title="Overview"
        subtitle="Stats inventory: raw counts for every tracked object."
        actions={
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 rounded-xl border border-border/20 bg-panel/45 p-1">
              {RANGE_OPTIONS.map((option) => {
                const active = option.key === rangeKey;
                return (
                  <Link
                    key={option.key}
                    href={`/overview?range=${option.key}`}
                    className={cn(
                      "rounded-lg px-3 py-1 text-xs font-semibold transition",
                      active
                        ? "bg-panel/80 text-text shadow-plush"
                        : "text-muted hover:text-text",
                    )}
                  >
                    {option.label}
                  </Link>
                );
              })}
            </div>
            <Link
              href="/overview/portfolio"
              className="inline-flex items-center gap-2 rounded-xl border border-border/20 bg-panel/45 px-4 py-2.5 text-sm font-semibold text-text/80 shadow-plush hover:bg-panel/60"
            >
              View Portfolio
            </Link>
          </div>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {types.map((type) => {
          const row = countsByType[type];
          const label = type[0]!.toUpperCase() + type.slice(1);
          return (
            <Panel key={type} className="p-5">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-muted">
                {label}
              </div>
              <div className="mt-2 text-2xl font-semibold text-text/90">
                {formatCount(row.total)}
              </div>
              <div className="mt-2 text-xs text-muted">
                New {range.label}: <span className="font-mono text-text/70">{formatCount(row.created)}</span>
              </div>
              <div className="mt-1 text-xs text-muted">
                Edited {range.label}: <span className="font-mono text-text/70">{formatCount(row.updated)}</span>
              </div>
            </Panel>
          );
        })}
      </div>

      <Panel className="p-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-sm font-semibold text-text/90">Stats Inventory</div>
            <div className="mt-1 text-sm text-muted">
              Raw counts of everything tracked. Zero values are shown.
            </div>
          </div>
          <div className="text-xs text-muted">
            Range: <span className="font-mono text-text/70">{range.label}</span>
          </div>
        </div>

        <div className="mt-4 overflow-x-auto">
          <div className="min-w-[980px]">
            <div className="grid grid-cols-[180px_1.5fr_0.6fr_0.6fr_0.6fr_0.7fr] gap-3 rounded-xl border border-border/15 bg-panel2/40 px-4 py-2 text-[11px] font-semibold uppercase tracking-wider text-muted">
              <div>Category</div>
              <div>Metric</div>
              <div className="text-right">Total</div>
              <div className="text-right">New {range.label}</div>
              <div className="text-right">Updated {range.label}</div>
              <div className="text-right">Last Updated</div>
            </div>

            <div className="divide-y divide-border/15">
              {statsRows.map((row) => (
                <div
                  key={`${row.category}-${row.metric}`}
                  className="grid grid-cols-[180px_1.5fr_0.6fr_0.6fr_0.6fr_0.7fr] items-center gap-3 px-4 py-3 text-sm text-text/70"
                >
                  <div className="text-xs font-semibold uppercase tracking-wider text-muted">
                    {row.category}
                  </div>
                  <div className="text-sm font-medium text-text/85">{row.metric}</div>
                  <div className="text-right font-mono text-[12px]">{formatCount(row.total)}</div>
                  <div className="text-right font-mono text-[12px]">{formatCount(row.created)}</div>
                  <div className="text-right font-mono text-[12px]">{formatCount(row.updated)}</div>
                  <div className="text-right font-mono text-[12px] text-muted">
                    {formatDate(row.lastUpdated)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Panel>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel className="p-5">
          <div className="text-sm font-semibold text-text/90">Prediction Health</div>
          <div className="mt-3 space-y-2 text-sm text-muted">
            <div>
              With close date:{" "}
              <span className="font-mono text-text/80">{formatCount(predWithDate)}</span>
            </div>
            <div>
              Due soon (7d):{" "}
              <span className="font-mono text-text/80">{formatCount(predDueSoon)}</span>
            </div>
            <div>
              Overdue:{" "}
              <span className="font-mono text-text/80">{formatCount(predOverdue)}</span>
            </div>
            <div>
              With sources:{" "}
              <span className="font-mono text-text/80">{formatCount(predWithSources)}</span>
            </div>
          </div>
        </Panel>

        <Panel className="p-5">
          <div className="text-sm font-semibold text-text/90">Link Graph Coverage</div>
          <div className="mt-3 space-y-2 text-sm text-muted">
            <div>
              Total links:{" "}
              <span className="font-mono text-text/80">{formatCount(links.length)}</span>
            </div>
            <div>
              Orphan objects:{" "}
              <span className="font-mono text-text/80">{formatCount(orphanCount)}</span>
            </div>
            <div>
              Supports:{" "}
              <span className="font-mono text-text/80">{formatCount(linkCounts.supports.total)}</span>
            </div>
            <div>
              Contradicts:{" "}
              <span className="font-mono text-text/80">{formatCount(linkCounts.contradicts.total)}</span>
            </div>
          </div>
        </Panel>
      </div>

      <Panel className="p-5">
        <div className="text-sm font-semibold text-text/90">Audit & Sync</div>
        <div className="mt-3 grid gap-3 text-sm text-muted sm:grid-cols-2">
          <div>
            Truth objects last updated:{" "}
            <span className="font-mono text-text/80">{formatDate(latestObjectUpdated)}</span>
          </div>
          <div>
            Link graph last updated:{" "}
            <span className="font-mono text-text/80">{formatDate(lastLinkUpdated)}</span>
          </div>
          <div>
            Polymarket last sync:{" "}
            <span className="font-mono text-text/80">{formatDate(polySync)}</span>
          </div>
          <div>
            Kalshi last sync:{" "}
            <span className="font-mono text-text/80">{formatDate(kalshiSync)}</span>
          </div>
        </div>
      </Panel>
    </main>
  );
}
