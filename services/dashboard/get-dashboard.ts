import "server-only";

import { ensureUser } from "@/services/auth/ensure-user";
import {
  countAll as countAllJournal,
  countSince as countJournalSince,
  listRecent as listRecentJournal,
} from "@/db/journal_entries";
import {
  countByStatus as countPredictionsByStatus,
  listDueSoon,
  listRecentlyResolved,
} from "@/db/predictions";

function toIsoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export type DashboardData = {
  quick_stats: {
    journal_entries: {
      last_7_days: number;
      last_30_days: number;
      all_time: number;
    };
    predictions: {
      open: number;
      resolved: number;
    };
  };
  due_soon: Array<{
    id: string;
    question: string;
    confidence_percent: number;
    resolve_by: string;
  }>;
  recently_resolved: Array<{
    id: string;
    question: string;
    confidence_percent: number;
    resolution: boolean;
    resolved_at: string;
  }>;
  recent_journal: Array<{
    id: string;
    title: string;
    created_at: string;
  }>;
};

export async function getDashboard(): Promise<DashboardData> {
  const ensured = await ensureUser();

  const now = new Date();
  const since7 = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const since30 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const dueTo = toIsoDate(new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000));

  const [
    journalLast7,
    journalLast30,
    journalAllTime,
    predictionCounts,
    dueSoonRows,
    recentlyResolvedRows,
    recentJournalRows,
  ] = await Promise.all([
    countJournalSince(ensured.user_id, since7),
    countJournalSince(ensured.user_id, since30),
    countAllJournal(ensured.user_id),
    countPredictionsByStatus(ensured.user_id),
    listDueSoon(ensured.user_id, dueTo, 10),
    listRecentlyResolved(ensured.user_id, 10),
    listRecentJournal(ensured.user_id, 10),
  ]);

  return {
    quick_stats: {
      journal_entries: {
        last_7_days: journalLast7,
        last_30_days: journalLast30,
        all_time: journalAllTime,
      },
      predictions: {
        open: predictionCounts.open,
        resolved: predictionCounts.resolved,
      },
    },
    due_soon: dueSoonRows.map((p) => ({
      id: p.id,
      question: p.claim,
      confidence_percent: Math.round(Number(p.confidence) * 100),
      resolve_by: p.resolution_date,
    })),
    recently_resolved: recentlyResolvedRows
      .filter((p) => p.outcome === "true" || p.outcome === "false")
      .map((p) => ({
        id: p.id,
        question: p.claim,
        confidence_percent: Math.round(Number(p.confidence) * 100),
        resolution: p.outcome === "true",
        resolved_at: p.resolved_at ?? "",
      })),
    recent_journal: recentJournalRows.map((e) => {
      const fallback = e.body.trim().slice(0, 60);
      const title = e.title?.trim() ? e.title.trim() : fallback;
      return {
        id: e.id,
        title: title.length === 60 ? `${title}…` : title,
        created_at: e.created_at,
      };
    }),
  };
}

