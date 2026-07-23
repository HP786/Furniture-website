"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";

import { getAnalyticsShop } from "../lib/analytics";

declare global {
  interface Window {
    __analyticsEvents?: Array<{ event: string; payload: Record<string, unknown> }>;
  }
}

type CustomerPrivacy = {
  analyticsProcessingAllowed?: () => boolean;
  config?: Record<string, unknown>;
};

const MONORAIL_URL_PATTERN = /monorail.*produce_batch/i;
const TRACKED_COOKIES = ["_shopify_y", "_shopify_s"] as const;
const MAX_LOGGED_EVENTS = 20;
const MAX_LOGGED_MONORAIL_CALLS = 10;

type LoggedEvent = { event: string; at: number };
type MonorailCall = { status: number | "error"; url: string; events: string[]; at: number };

function requestUrl(input: Parameters<typeof fetch>[0]): string {
  if (typeof input === "string") return input;
  if (input instanceof URL) return input.toString();
  return input.url;
}

// Best-effort: monorail batches events as { events: [{ schema_id, payload }, ...] }.
// Read the body without consuming the real request (clone Request objects; the
// init.body string form used by fetch(url, { body }) is already ours to read).
async function extractEventNames(args: Parameters<typeof fetch>): Promise<string[]> {
  try {
    const [input, init] = args;
    const bodyText =
      typeof init?.body === "string"
        ? init.body
        : input instanceof Request
          ? await input.clone().text()
          : null;
    if (!bodyText) return [];
    const parsed = JSON.parse(bodyText);
    const events: unknown[] = Array.isArray(parsed?.events)
      ? parsed.events
      : Array.isArray(parsed)
        ? parsed
        : [parsed];
    return events.map((e) => {
      const record = e != null && typeof e === "object" ? (e as Record<string, unknown>) : null;
      const name = record?.schema_id ?? record?.event_name ?? record?.event;
      return typeof name === "string" ? name : JSON.stringify(e).slice(0, 60);
    });
  } catch {
    return ["(unparseable body)"];
  }
}

function readCookie(name: string): string {
  if (typeof document === "undefined") return "(unavailable)";
  const match = document.cookie.split("; ").find((row) => row.startsWith(`${name}=`));
  return match ? decodeURIComponent(match.slice(name.length + 1)) : "(not set)";
}

function formatTime(at: number): string {
  return new Date(at).toLocaleTimeString(undefined, { hour12: false, minute: "2-digit", second: "2-digit" });
}

const noopSubscribe = () => () => {};

// The canonical hydration-safe "are we on the client yet" read: no store to
// subscribe to, so the snapshot never changes once true, but it lets the
// server/first-client-paint agree (false) before diverging (true) post-mount.
function useMounted(): boolean {
  return useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  );
}

export function AnalyticsDebugOverlay() {
  // This component is only ever mounted client-side by a server-read env flag,
  // but Next still does an SSR pass over it (no `document`/`window`) followed by
  // client hydration — so nothing that reads those globals can be evaluated
  // during render. Everything live is gated behind `mounted` and only computed
  // inside effects, keeping the pre-hydration render identical on both sides.
  const mounted = useMounted();
  const [collapsed, setCollapsed] = useState(false);
  const [, forceTick] = useState(0);
  const [loggedEvents, setLoggedEvents] = useState<LoggedEvent[]>([]);
  const [monorailCalls, setMonorailCalls] = useState<MonorailCall[]>([]);
  const seenEventCount = useRef(0);

  // Wrap fetch once to observe Customer Privacy / analytics POSTs, and poll
  // window globals that only exist client-side (customerPrivacy, event tap).
  useEffect(() => {
    const originalFetch = window.fetch.bind(window);
    window.fetch = async (...args: Parameters<typeof fetch>) => {
      const url = requestUrl(args[0]);
      const isMonorail = MONORAIL_URL_PATTERN.test(url);
      const events = isMonorail ? await extractEventNames(args) : [];
      try {
        const response = await originalFetch(...args);
        if (isMonorail) {
          const entry: MonorailCall = { status: response.status, url, events, at: Date.now() };
          setMonorailCalls((prev) => [...prev, entry].slice(-MAX_LOGGED_MONORAIL_CALLS));
        }
        return response;
      } catch (error) {
        if (isMonorail) {
          const entry: MonorailCall = { status: "error", url, events, at: Date.now() };
          setMonorailCalls((prev) => [...prev, entry].slice(-MAX_LOGGED_MONORAIL_CALLS));
        }
        throw error;
      }
    };
    return () => {
      window.fetch = originalFetch;
    };
  }, []);

  useEffect(() => {
    const id = window.setInterval(() => {
      const events = window.__analyticsEvents ?? [];
      if (events.length > seenEventCount.current) {
        const newlySeen = events.slice(seenEventCount.current).map((entry) => ({
          event: entry.event,
          at: Date.now(),
        }));
        seenEventCount.current = events.length;
        setLoggedEvents((prev) => [...prev, ...newlySeen].slice(-MAX_LOGGED_EVENTS));
      }
      forceTick((t) => t + 1);
    }, 1000);
    return () => window.clearInterval(id);
  }, []);

  const shop = mounted ? getAnalyticsShop() : null;
  const customerPrivacy = mounted ? (window.Shopify?.customerPrivacy as CustomerPrivacy | undefined) : undefined;
  let analyticsProcessingAllowed = "…";
  if (mounted) {
    try {
      analyticsProcessingAllowed = customerPrivacy?.analyticsProcessingAllowed
        ? String(customerPrivacy.analyticsProcessingAllowed())
        : "(unavailable — customerPrivacy not loaded)";
    } catch (error) {
      analyticsProcessingAllowed = `(threw: ${error instanceof Error ? error.message : String(error)})`;
    }
  }
  const customerPrivacyConfig = customerPrivacy?.config;

  return (
    <div
      style={{
        position: "fixed",
        bottom: 12,
        right: 12,
        zIndex: 2147483647,
        width: collapsed ? "auto" : 380,
        maxHeight: collapsed ? "auto" : "70vh",
        overflowY: collapsed ? "visible" : "auto",
        background: "rgba(17, 17, 17, 0.94)",
        color: "#e8e8e8",
        fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
        fontSize: 11,
        lineHeight: 1.5,
        borderRadius: 8,
        border: "1px solid #444",
        boxShadow: "0 4px 16px rgba(0,0,0,0.4)",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "8px 10px",
          borderBottom: collapsed ? "none" : "1px solid #333",
          cursor: "pointer",
          fontWeight: 700,
        }}
        onClick={() => setCollapsed((c) => !c)}
      >
        <span>Analytics Debug</span>
        <span>{collapsed ? "▲" : "▼"}</span>
      </div>

      {collapsed ? null : (
        <div style={{ padding: "8px 10px" }}>
          <Section title="Shop (createStorefrontAnalytics)">
            <Row k="shopId" v={shop?.shopId ?? "(not configured yet)"} />
            <Row k="hydrogenSubchannelId" v={shop?.hydrogenSubchannelId ?? "-"} />
            <Row k="currency" v={shop?.currency ?? "-"} />
            <Row k="acceptedLanguage" v={shop?.acceptedLanguage ?? "-"} />
          </Section>

          <Section title="customerPrivacy">
            <Row k="analyticsProcessingAllowed()" v={analyticsProcessingAllowed} />
            <Row
              k="config"
              v={customerPrivacyConfig ? JSON.stringify(customerPrivacyConfig, null, 2) : "(unavailable)"}
              pre
            />
          </Section>

          <Section title="Cookies">
            {TRACKED_COOKIES.map((name) => (
              <Row key={name} k={name} v={mounted ? readCookie(name) : "…"} />
            ))}
          </Section>

          <Section title={`Monorail POSTs (${monorailCalls.length})`}>
            {monorailCalls.length === 0 ? (
              <div style={{ opacity: 0.6 }}>none observed yet</div>
            ) : (
              [...monorailCalls]
                .reverse()
                .map((call, i) => (
                  <Row
                    key={i}
                    k={formatTime(call.at)}
                    v={`${call.status} — [${call.events.join(", ") || "no events parsed"}]`}
                    color={call.status === "error" || (typeof call.status === "number" && call.status >= 400) ? "#ff8080" : "#8fdc8f"}
                  />
                ))
            )}
          </Section>

          <Section title={`window.__analyticsEvents (${loggedEvents.length})`}>
            {loggedEvents.length === 0 ? (
              <div style={{ opacity: 0.6 }}>none observed yet</div>
            ) : (
              [...loggedEvents].reverse().map((entry, i) => (
                <Row key={i} k={formatTime(entry.at)} v={entry.event} />
              ))
            )}
          </Section>
        </div>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ opacity: 0.6, textTransform: "uppercase", fontSize: 10, marginBottom: 4 }}>{title}</div>
      {children}
    </div>
  );
}

function Row({ k, v, pre, color }: { k: string; v: string; pre?: boolean; color?: string }) {
  return (
    <div style={{ display: "flex", gap: 6, marginBottom: 2 }}>
      <span style={{ opacity: 0.7, flexShrink: 0 }}>{k}:</span>
      <span style={{ whiteSpace: pre ? "pre-wrap" : "nowrap", overflow: "hidden", textOverflow: "ellipsis", color }}>
        {v}
      </span>
    </div>
  );
}
