"use client";

import Image from "next/image";
import { useEffect, useState, useTransition } from "react";
import {
  AlertTriangle,
  ArrowUpRight,
  BadgeCheck,
  ClipboardList,
  ExternalLink,
  Flag,
  Gauge,
  LoaderCircle,
  Search,
  ShieldAlert,
} from "lucide-react";

import type { AuditIssue, AuditReport, AuditTab } from "@/lib/audit/types";

const tabMeta: Record<
  AuditTab,
  { label: string; icon: typeof ShieldAlert; empty: string; tone: string }
> = {
  critical: {
    label: "Critical Issues",
    icon: ShieldAlert,
    empty: "No automated failures were returned for this page.",
    tone: "border-[rgba(200,101,91,0.28)] bg-[rgba(200,101,91,0.08)] text-[var(--rose)]",
  },
  passed: {
    label: "Passed Audits",
    icon: BadgeCheck,
    empty: "No successful rules were returned. This usually means the scan did not complete cleanly.",
    tone: "border-[rgba(90,143,115,0.28)] bg-[rgba(90,143,115,0.08)] text-[var(--moss)]",
  },
  manual: {
    label: "Required Manual Audits",
    icon: ClipboardList,
    empty: "No manual checks configured.",
    tone: "border-[rgba(185,133,44,0.28)] bg-[rgba(185,133,44,0.08)] text-[var(--amber)]",
  },
  not_applicable: {
    label: "Not Applicable",
    icon: Flag,
    empty: "Every tracked rule applied to the current page.",
    tone: "border-[rgba(96,98,90,0.24)] bg-[rgba(96,98,90,0.07)] text-[rgba(55,59,52,0.86)]",
  },
};

const loadingMessages = [
  "Fetching the page HTML and normalizing the URL.",
  "Running automated accessibility checks against the document structure.",
  "Generating the report summary, counts, and manual review checklist.",
  "Capturing a screenshot preview when the site allows it.",
];

function scoreTone(score: number) {
  if (score >= 90) {
    return "text-[var(--moss)]";
  }

  if (score >= 75) {
    return "text-[var(--amber)]";
  }

  return "text-[var(--rose)]";
}

function issueTone(status: AuditIssue["status"]) {
  if (status === "critical") {
    return "bg-[rgba(200,101,91,0.12)] text-[var(--rose)]";
  }

  if (status === "passed") {
    return "bg-[rgba(90,143,115,0.12)] text-[var(--moss)]";
  }

  if (status === "manual") {
    return "bg-[rgba(185,133,44,0.12)] text-[var(--amber)]";
  }

  return "bg-[rgba(79,88,79,0.08)] text-[rgba(43,51,43,0.78)]";
}

export function AuditWorkbench() {
  const [url, setUrl] = useState("");
  const [report, setReport] = useState<AuditReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<AuditTab>("critical");
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [isPending, startTransition] = useTransition();

  const filteredIssues = report ? report.issues.filter((issue) => issue.status === activeTab) : [];

  useEffect(() => {
    if (!isLoading) {
      setLoadingStep(0);
      return;
    }

    const interval = window.setInterval(() => {
      setLoadingStep((current) => (current + 1) % loadingMessages.length);
    }, 1800);

    return () => window.clearInterval(interval);
  }, [isLoading]);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsLoading(true);
    setLoadingStep(0);

    void (async () => {
      try {
        const response = await fetch("/api/scan", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ url }),
        });

        const data = (await response.json()) as AuditReport | { error: string };

        if (!response.ok || "error" in data) {
          throw new Error("error" in data ? data.error : "Scan failed.");
        }

        startTransition(() => {
          setReport(data);
          setActiveTab("critical");
        });
      } catch (scanError) {
        const message = scanError instanceof Error ? scanError.message : "Scan failed.";
        setError(message);
      } finally {
        setIsLoading(false);
      }
    })();
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-4 py-6 text-[var(--foreground)] sm:px-6 lg:px-8">
      <section className="grid-pattern glass-panel relative overflow-hidden rounded-[32px] border border-[var(--line)] px-6 py-8 shadow-[0_24px_80px_rgba(44,57,41,0.08)] sm:px-8 lg:px-10">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[rgba(39,75,56,0.24)] to-transparent" />
        <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-[rgba(39,75,56,0.12)] bg-[rgba(255,255,255,0.6)] px-3 py-1 font-mono text-xs uppercase tracking-[0.28em] text-[var(--moss)]">
              <Gauge className="h-3.5 w-3.5" />
              WCAG Audit Workbench
            </div>
            <div className="max-w-3xl space-y-4">
              <h1 className="max-w-2xl text-4xl leading-none font-semibold tracking-[-0.04em] text-[var(--foreground)] sm:text-5xl">
                Scan any public URL and turn raw accessibility rules into a usable compliance report.
              </h1>
              <p className="max-w-2xl text-base leading-7 text-[rgba(31,36,31,0.72)] sm:text-lg">
                This MVP runs automated WCAG checks on a rendered page, groups the results into critical issues,
                passed audits, manual checks, and not-applicable rules, then scores the page conservatively.
              </p>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-[rgba(31,36,31,0.72)]">Website URL</span>
                <div className="flex flex-col gap-3 sm:flex-row">
                  <div className="relative flex-1">
                    <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[rgba(31,36,31,0.45)]" />
                    <input
                      value={url}
                      onChange={(event) => setUrl(event.target.value)}
                      placeholder="https://your-site.com"
                      className="h-14 w-full rounded-2xl border border-[var(--line)] bg-[var(--panel-strong)] pl-11 pr-4 text-sm outline-none transition focus:border-[rgba(39,75,56,0.36)] focus:ring-4 focus:ring-[rgba(90,143,115,0.12)]"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={isLoading || isPending}
                    className="inline-flex h-14 items-center justify-center gap-2 rounded-2xl bg-[var(--moss)] px-6 text-sm font-medium text-white transition hover:bg-[#1f3c2d] disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {isLoading || isPending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <ArrowUpRight className="h-4 w-4" />}
                    {isLoading || isPending ? "Scanning page" : "Run audit"}
                  </button>
                </div>
              </label>
              <p className="text-sm text-[rgba(31,36,31,0.62)]">
                Automated results are not a legal compliance certification. Manual review is still required.
              </p>
              {error ? (
                <div className="rounded-2xl border border-[rgba(200,101,91,0.2)] bg-[rgba(200,101,91,0.08)] px-4 py-3 text-sm text-[var(--rose)]">
                  {error}
                </div>
              ) : null}
            </form>

            {isLoading ? (
              <div className="rounded-[24px] border border-[rgba(39,75,56,0.12)] bg-[rgba(255,255,255,0.66)] p-4 shadow-[0_14px_40px_rgba(44,57,41,0.06)]">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 rounded-full bg-[rgba(39,75,56,0.08)] p-2 text-[var(--moss)]">
                    <LoaderCircle className="h-5 w-5 animate-spin" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-[rgba(31,36,31,0.9)]">Audit in progress</p>
                    <p className="mt-1 text-sm leading-6 text-[rgba(31,36,31,0.68)]">
                      {loadingMessages[loadingStep]}
                    </p>
                    <div className="mt-4 h-2 overflow-hidden rounded-full bg-[rgba(39,75,56,0.08)]">
                      <div
                        className="h-full rounded-full bg-[linear-gradient(90deg,rgba(39,75,56,0.85)_0%,rgba(90,143,115,0.65)_100%)] transition-all duration-500"
                        style={{ width: `${((loadingStep + 1) / loadingMessages.length) * 100}%` }}
                      />
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {loadingMessages.map((message, index) => (
                        <span
                          key={message}
                          className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                            index === loadingStep
                              ? "bg-[rgba(39,75,56,0.12)] text-[var(--moss)]"
                              : "bg-[rgba(39,75,56,0.05)] text-[rgba(31,36,31,0.5)]"
                          }`}
                        >
                          {index + 1}. {message}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ) : null}
          </div>

          <div className="glass-panel rounded-[28px] border border-[var(--line)] p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="font-mono text-xs uppercase tracking-[0.22em] text-[rgba(31,36,31,0.52)]">Output model</p>
                <h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em]">How this is built</h2>
              </div>
            </div>
            <div className="mt-6 grid gap-3">
              {[
                "Fetch the page HTML with a normal browser-like user agent and parse it server-side.",
                "Run deterministic checks for titles, language, labels, landmarks, headings, links, buttons, iframes, viewport settings, and duplicate IDs.",
                "Inject your own manual audit checklist because automation cannot verify keyboard flow, screen reader behavior, or captions quality.",
                "Optionally use OpenAI to summarize findings, not to act as the compliance verdict itself.",
              ].map((step, index) => (
                <div key={step} className="flex gap-3 rounded-2xl border border-[var(--line)] bg-white/70 px-4 py-4">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[rgba(90,143,115,0.12)] font-mono text-xs text-[var(--moss)]">
                    {index + 1}
                  </div>
                  <p className="text-sm leading-6 text-[rgba(31,36,31,0.74)]">{step}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {report ? (
        <section className="section-anchor mt-6 grid gap-6 lg:grid-cols-[300px_minmax(0,1fr)]">
          <aside className="glass-panel h-fit rounded-[28px] border border-[var(--line)] p-5">
            <div className="overflow-hidden rounded-[24px] border border-[var(--line)] bg-[linear-gradient(180deg,rgba(28,49,38,1)_0%,rgba(15,30,24,1)_100%)] text-white">
              <div className="relative aspect-[16/10] w-full bg-[rgba(255,255,255,0.06)]">
                {report.screenshotDataUrl ? (
                  <Image
                    src={report.screenshotDataUrl}
                    alt={`Screenshot preview of ${report.pageTitle}`}
                    fill
                    unoptimized
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-sm text-white/60">
                    Screenshot unavailable
                  </div>
                )}
              </div>
              <div className="p-5">
                <p className="font-mono text-xs uppercase tracking-[0.22em] text-white/70">Scanned page</p>
                <h2 className="mt-3 text-xl font-semibold leading-tight">{report.pageTitle}</h2>
                <a
                  href={report.normalizedUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-4 inline-flex items-center gap-2 text-sm text-white/80 underline decoration-white/30 underline-offset-4"
                >
                  {report.normalizedUrl}
                  <ExternalLink className="h-4 w-4" />
                </a>
              </div>
            </div>

            <div className="mt-5 space-y-3">
              <div className="rounded-2xl border border-[var(--line)] bg-white/70 p-4">
                <p className="font-mono text-xs uppercase tracking-[0.2em] text-[rgba(31,36,31,0.52)]">Automated status</p>
                <p className="mt-2 text-lg font-semibold">{report.status}</p>
                <p className="mt-2 text-sm leading-6 text-[rgba(31,36,31,0.68)]">{report.summary}</p>
              </div>
              {report.aiSummary ? (
                <div className="rounded-2xl border border-[var(--line)] bg-white/70 p-4">
                  <p className="font-mono text-xs uppercase tracking-[0.2em] text-[rgba(31,36,31,0.52)]">AI summary</p>
                  <p className="mt-2 text-sm leading-6 text-[rgba(31,36,31,0.68)]">{report.aiSummary}</p>
                </div>
              ) : null}
              <div className="rounded-2xl border border-[var(--line)] bg-white/70 p-4">
                <p className="font-mono text-xs uppercase tracking-[0.2em] text-[rgba(31,36,31,0.52)]">Scan timestamp</p>
                <p className="mt-2 text-sm font-medium">{new Date(report.scannedAt).toLocaleString()}</p>
              </div>
            </div>
          </aside>

          <div className="space-y-6">
            <section className="glass-panel rounded-[28px] border border-[var(--line)] p-6">
              <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
                <div className="rounded-[24px] border border-[rgba(39,75,56,0.08)] bg-[linear-gradient(135deg,rgba(225,241,231,0.9)_0%,rgba(243,246,234,0.9)_100%)] p-6">
                  <p className="font-mono text-xs uppercase tracking-[0.22em] text-[var(--moss)]">Audit score</p>
                  <div className="mt-4 flex items-end gap-4">
                    <div className={`text-6xl font-semibold tracking-[-0.06em] ${scoreTone(report.score)}`}>{report.score}</div>
                    <div className="pb-2 text-sm text-[rgba(31,36,31,0.62)]">out of 100</div>
                  </div>
                  <p className="mt-4 max-w-xl text-sm leading-6 text-[rgba(31,36,31,0.72)]">
                    The score is weighted toward serious automated violations. It is intentionally conservative and does
                    not replace manual testing with assistive technology.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {(Object.keys(tabMeta) as AuditTab[]).map((tab) => {
                    const meta = tabMeta[tab];
                    const Icon = meta.icon;

                    return (
                      <button
                        key={tab}
                        type="button"
                        onClick={() => setActiveTab(tab)}
                        className={`rounded-2xl border px-4 py-4 text-left transition ${meta.tone} ${
                          activeTab === tab ? "ring-2 ring-[rgba(39,75,56,0.14)]" : ""
                        }`}
                      >
                        <div className="flex items-center gap-2 text-sm font-medium">
                          <Icon className="h-4 w-4" />
                          {meta.label}
                        </div>
                        <div className="mt-3 text-3xl font-semibold tracking-[-0.05em]">{report.counts[tab]}</div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </section>

            <section className="glass-panel rounded-[28px] border border-[var(--line)] p-4 sm:p-6">
              <div className="flex flex-wrap gap-2">
                {(Object.keys(tabMeta) as AuditTab[]).map((tab) => {
                  const meta = tabMeta[tab];

                  return (
                    <button
                      key={tab}
                      type="button"
                      onClick={() => setActiveTab(tab)}
                      className={`rounded-full border px-4 py-2 text-sm font-medium transition ${
                        activeTab === tab ? meta.tone : "border-[var(--line)] bg-white/70 text-[rgba(31,36,31,0.68)]"
                      }`}
                    >
                      {meta.label} ({report.counts[tab]})
                    </button>
                  );
                })}
              </div>

              <div className="mt-5 overflow-hidden rounded-[24px] border border-[var(--line)] bg-[var(--panel-strong)]">
                <div className="grid grid-cols-[minmax(0,1.8fr)_130px_180px_180px] gap-4 border-b border-[var(--line)] px-5 py-4 text-xs font-mono uppercase tracking-[0.18em] text-[rgba(31,36,31,0.52)] max-lg:hidden">
                  <div>Issue</div>
                  <div>Elements</div>
                  <div>Disabilities affected</div>
                  <div>WCAG criteria</div>
                </div>

                {filteredIssues.length === 0 ? (
                  <div className="px-5 py-10 text-sm text-[rgba(31,36,31,0.66)]">{tabMeta[activeTab].empty}</div>
                ) : (
                  <div className="divide-y divide-[var(--line)]">
                    {filteredIssues.map((issue) => (
                      <article
                        key={issue.id}
                        className="grid gap-4 px-5 py-5 lg:grid-cols-[minmax(0,1.8fr)_130px_180px_180px]"
                      >
                        <div className="space-y-3">
                          <div className="flex items-start gap-3">
                            {issue.status === "critical" ? (
                              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-[var(--rose)]" />
                            ) : (
                              <BadgeCheck className="mt-0.5 h-4 w-4 shrink-0 text-[var(--moss)]" />
                            )}
                            <div>
                              <h3 className="text-sm font-semibold leading-6">{issue.title}</h3>
                              <p className="mt-1 text-sm leading-6 text-[rgba(31,36,31,0.68)]">{issue.description}</p>
                            </div>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <span className={`rounded-full px-3 py-1 text-xs font-medium ${issueTone(issue.status)}`}>
                              {issue.status === "critical"
                                ? issue.severity
                                : issue.status === "manual"
                                  ? "Manual review"
                                  : issue.status === "passed"
                                    ? "Passed"
                                    : "Not applicable"}
                            </span>
                            {issue.helpUrl ? (
                              <a
                                href={issue.helpUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 rounded-full border border-[var(--line)] px-3 py-1 text-xs font-medium text-[rgba(31,36,31,0.7)]"
                              >
                                Learn more
                                <ExternalLink className="h-3 w-3" />
                              </a>
                            ) : null}
                          </div>
                          {issue.selectors.length > 0 ? (
                            <div className="rounded-2xl border border-[var(--line)] bg-white/80 p-3">
                              <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-[rgba(31,36,31,0.5)]">
                                Sample selectors
                              </p>
                              <div className="mt-2 flex flex-wrap gap-2">
                                {issue.selectors.map((selector, index) => (
                                  <code
                                    key={`${issue.id}-selector-${index}-${selector}`}
                                    className="rounded-lg bg-[rgba(39,75,56,0.06)] px-2 py-1 font-mono text-[11px] text-[rgba(31,36,31,0.72)]"
                                  >
                                    {selector}
                                  </code>
                                ))}
                              </div>
                            </div>
                          ) : null}
                          <p className="text-sm leading-6 text-[rgba(31,36,31,0.66)]">
                            <span className="font-medium text-[rgba(31,36,31,0.84)]">Recommended action:</span>{" "}
                            {issue.fixRecommendation}
                          </p>
                        </div>

                        <div className="text-sm leading-6 text-[rgba(31,36,31,0.74)]">
                          {issue.failingElementsCount > 0 ? `${issue.failingElementsCount} elements` : "0"}
                        </div>

                        <div className="flex flex-wrap gap-2">
                          {issue.disabilitiesAffected.map((item, index) => (
                            <span
                              key={`${issue.id}-disability-${index}-${item}`}
                              className="h-fit rounded-full bg-[rgba(39,75,56,0.08)] px-3 py-1 text-xs font-medium text-[rgba(31,36,31,0.74)]"
                            >
                              {item}
                            </span>
                          ))}
                        </div>

                        <div className="flex flex-wrap gap-2">
                          {issue.wcagCriteria.length > 0 ? (
                            issue.wcagCriteria.map((criterion, index) => (
                              <span
                                key={`${issue.id}-criterion-${index}-${criterion}`}
                                className="h-fit rounded-full bg-[rgba(185,133,44,0.1)] px-3 py-1 text-xs font-medium text-[rgba(90,67,17,0.86)]"
                              >
                                {criterion}
                              </span>
                            ))
                          ) : (
                            <span className="text-sm text-[rgba(31,36,31,0.54)]">Best practice</span>
                          )}
                        </div>
                      </article>
                    ))}
                  </div>
                )}
              </div>
            </section>
          </div>
        </section>
      ) : null}
    </main>
  );
}
