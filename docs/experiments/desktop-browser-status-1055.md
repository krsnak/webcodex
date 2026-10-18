# Desktop Browser runtime status — #1055 implementation gate

Status: source-based implementation design; **not an implemented UI or an approved shutdown path**.

## Verified existing boundaries

- `observe_browser(action=browsers, client_id=...)` goes through `src/tool_runtime/browser_tools.rs` to the exact Runner `browser_list_browsers` operation, with `BrowserObserve` admission.
- `control_browser(action=close_browser, ...)` goes through the Browser control path and its separate `BrowserControl` authorization. Listing is not shutdown authority.
- `RunnerBrowserOperationKind` in `crates/webcodex-core/src/runner_operation.rs` distinguishes `ListBrowsers` from `CloseBrowser`.
- The Desktop overview in `apps/desktop/src/features/dashboard/Dashboard.tsx` has no Browser inventory data source today. Browser state belongs to a Runner, not a global Desktop singleton.
- #966 already addressed idle-runtime cleanup; this issue must not alter those timers or adopt external Chrome processes.

## Narrow proposal

1. Add an authenticated Desktop-facing **read-only snapshot adapter** that reuses the same Runner visibility, BrowserObserve capability and operation dispatch as the canonical Browser tool. Query only the selected accessible Runner(s) on explicit refresh or while opening the panel; do not add permanent polling. Cap Runner count, Browser IDs and response sizes. Return a timestamp and `fresh`, `partial`, or `unavailable` per Runner; aggregate only known counts. An offline Runner must never appear as zero active browsers.
2. Show one lightweight indicator in Desktop (`0`, `N active`, `Partial`, `Unavailable`) with accessible labels and a per-Runner count. Keep page addresses, profiles, tab titles, cookies, logs and CDP endpoints out of the normal UI. Do not imply a global total when any Runner is unreachable.
3. Add **Close all** only for exact, currently known WebCodex-owned Browser identities. Require confirmation showing selected Runner, count and possible interruption of active automation. Route **each** close through the existing BrowserControl authorization and Runner ownership checks; never expose direct process termination or skip the canonical specialized governance. Exclude extension-shared, user-owned or ambiguous instances, even if they appear in observation. Do not interpret `close_browser` as permission to close arbitrary browsers.
4. On confirmation, use a bounded per-Runner worklist and stop/mark uncertain effects on connection loss or unclear completion. Report known closed / known failed / unknown outcome separately. Refresh after the operation rather than optimistically setting the active count to zero. No implicit retry on uncertain outcomes.

## Required focused tests before enabling the button

- Multiple visible Runners: a failed/offline Runner produces partial/unavailable state, never a misleading zero.
- Missing observe permission, missing control permission, and stale client selection all fail closed.
- List responses with truncated IDs, ambiguous ownership or unsupported Runner capability cannot authorize Close all.
- User cancellation causes no Browser effect; user-owned and extension-shared browsers are never passed to the close operation.
- One successful close followed by a failure or unknown outcome reports accurate partial results without retrying the uncertain close.
- A Browser closing independently during confirmation does not cause a different Browser to be targeted.
- No production default, idle reaper or unattended Desktop background poll changes.

## Open implementation question

Before writing the Desktop action, identify the existing authenticated Desktop-to-Server adapter and its exact permission/identity propagation contract. If Desktop does not yet have an authorized way to execute those Browser domain operations, the read-only UI must remain unavailable rather than introduce a privileged shortcut. A direct Tauri-to-Runner kill command is out of scope.
