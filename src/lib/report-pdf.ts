/**
 * Client-side readiness report export (PDF).
 * Pure presentation — reads the same data the report page renders.
 */

import { jsPDF } from "jspdf";
import { COMPETENCIES } from "@/config/competencies";

export interface ReportExplain {
  id: string;
  score: number;
  reason: string;
  evidence: string;
  recommendation: string;
}

export interface ReportPdfInput {
  roleLabel: string;
  scenarioTitle: string;
  createdAt?: string | null;
  readiness: number;
  scores: Record<string, number>;
  explain: ReportExplain[];
  strengths: string[];
  missed: string[];
  suggestions: string[];
  coachingFeedback: string;
  projection: { trust_30d?: number; team_morale_90d?: number; promotion_readiness_365d?: number };
}

export function downloadReadinessReportPdf(input: ReportPdfInput) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const M = 48;
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  let y = M;

  const page = (needed = 0) => {
    if (y + needed > H - M) {
      doc.addPage();
      y = M;
    }
  };

  const text = (s: string, size = 10, style: "normal" | "bold" | "italic" = "normal", gap = 6) => {
    doc.setFont("helvetica", style);
    doc.setFontSize(size);
    const lines = doc.splitTextToSize(s, W - M * 2) as string[];
    page(lines.length * (size + 3));
    doc.text(lines, M, y);
    y += lines.length * (size + 3) + gap;
  };

  const heading = (s: string) => {
    page(30);
    y += 6;
    text(s, 14, "bold", 8);
  };

  text("Leadership Readiness Report", 20, "bold", 4);
  text(
    `${input.roleLabel} · ${input.scenarioTitle}${
      input.createdAt ? ` · ${new Date(input.createdAt).toLocaleDateString()}` : ""
    }`,
    10,
    "italic",
    12,
  );

  text(`Readiness score: ${input.readiness}/100`, 16, "bold", 10);

  heading("Competency scores");
  for (const c of COMPETENCIES) {
    text(
      `${c.label} — ${input.scores[c.id] ?? 0}/100 (weight ${Math.round(c.weight * 100)}%)`,
      10,
      "normal",
      2,
    );
  }

  if (input.explain.length) {
    heading("Why you scored this way");
    for (const c of COMPETENCIES) {
      const e = input.explain.find((x) => x.id === c.id);
      if (!e) continue;
      text(`${c.label} — ${e.score}`, 11, "bold", 2);
      text(e.reason, 10, "normal", 2);
      text(`Evidence: ${e.evidence}`, 10, "italic", 2);
      text(`Recommendation: ${e.recommendation}`, 10, "normal", 8);
    }
  }

  const list = (title: string, items: string[]) => {
    if (!items?.length) return;
    heading(title);
    for (const i of items) text(`• ${i}`, 10, "normal", 2);
  };

  list("Strengths", input.strengths);
  list("Development areas", input.missed);
  list("Suggested next actions", input.suggestions);

  heading("Coaching feedback");
  text(input.coachingFeedback, 10);

  heading("Outcome projection");
  text(`Trust (30 days): +${input.projection.trust_30d ?? 0}`, 10, "normal", 2);
  text(`Team morale (90 days): +${input.projection.team_morale_90d ?? 0}`, 10, "normal", 2);
  text(`Promotion readiness (365 days): +${input.projection.promotion_readiness_365d ?? 0}`, 10);

  doc.save(
    `readiness-report-${input.roleLabel.toLowerCase().replace(/\s+/g, "-")}-${
      new Date().toISOString().slice(0, 10)
    }.pdf`,
  );
}
