import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";
import type { DesktopState } from "../../models/topology";
import { DesktopMantineProvider } from "../../components/DesktopMantineProvider";
import { BrowserRuntimeStatus } from "./BrowserRuntimeStatus";

const query = vi.hoisted(() => vi.fn());
vi.mock("../workspace/WorkspaceContext", () => ({ workspaceQuery: query }));
const state = {
  workspace_runner: { client_id: "runner-one" },
  readiness: { runtime_ready: true },
  current_operation: null,
} as DesktopState;

beforeEach(() => { vi.resetAllMocks(); });
const show = (value: DesktopState) => render(<DesktopMantineProvider><BrowserRuntimeStatus state={value}/></DesktopMantineProvider>);

it("shows a verified Runner-scoped Browser count", async () => {
  query.mockResolvedValue({ client_id: "runner-one", state: "fresh", count: 2 });
  show(state);
  expect(await screen.findByText("2 active on this Runner")).toBeInTheDocument();
  expect(query).toHaveBeenCalledWith({ kind: "browser_status" });
});

it("never represents denied or invalid responses as zero", async () => {
  query.mockResolvedValue({ client_id: "another-runner", state: "fresh", count: 0 });
  show(state);
  expect(await screen.findByText(/count is unknown/)).toBeInTheDocument();
  query.mockRejectedValue({ code: "workspace_permission_denied" });
  fireEvent.click(screen.getByRole("button", { name: "Refresh" }));
  await waitFor(() => expect(query).toHaveBeenCalledTimes(2));
  expect(screen.getByText(/count is unknown/)).toBeInTheDocument();
});

it("disables observations when the Runtime is not ready", () => {
  show({
    ...state, readiness: { ...state.readiness, runtime_ready: false },
  });
  expect(screen.getByText(/Runtime is stopped or busy/)).toBeInTheDocument();
  expect(query).not.toHaveBeenCalled();
  expect(screen.getByRole("button", { name: "Refresh" })).toBeDisabled();
});
