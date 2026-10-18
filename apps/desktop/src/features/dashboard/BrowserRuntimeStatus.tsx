import { useEffect, useState } from "react";
import { Button } from "@mantine/core";
import { workspaceQuery } from "../workspace/WorkspaceContext";
import type { DesktopState } from "../../models/topology";

interface BrowserStatus {
  client_id: string;
  state: "fresh" | "partial" | "unavailable";
  count: number | null;
}

/** On-demand only. An unavailable Runner is never silently interpreted as zero. */
export function BrowserRuntimeStatus({ state }: { state: DesktopState }) {
  const clientId = state.workspace_runner?.client_id;
  const ready = state.readiness.runtime_ready && !state.current_operation;
  const [status, setStatus] = useState<BrowserStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    setStatus(null);
    if (!ready || !clientId) return;
    let cancelled = false;
    setLoading(true);
    workspaceQuery<BrowserStatus>({ kind: "browser_status" })
      .then(value => {
        if (!cancelled) setStatus(value.client_id === clientId && value.state === "fresh"
          && Number.isInteger(value.count) && value.count! >= 0 && value.count! <= 4
          ? value : { client_id: clientId, state: "unavailable", count: null });
      })
      .catch(() => {
        if (!cancelled) setStatus({ client_id: clientId, state: "unavailable", count: null });
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [clientId, ready, revision]);

  if (!clientId) return null;
  const available = ready && status?.state === "fresh";
  return <section className="dashboard-handoff" aria-label="Browser runtime status">
    <div>
      <h2>Browser runtimes</h2>
      <p role="status">
        {!ready ? "Unavailable while the Runtime is stopped or busy"
          : loading ? "Checking Browser runtimes…"
          : available ? `${status.count} active on this Runner`
          : "Unavailable — the active Browser count is unknown"}
      </p>
    </div>
    <Button className="secondary-button" variant="default" disabled={!ready || loading}
      onClick={() => setRevision(value => value + 1)}>Refresh</Button>
  </section>;
}
