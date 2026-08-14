# dsh-archives

English | [中文](README.zh.md)

A DeepSeek Harness web plugin that surfaces archived sessions at the **bottom of the sidebar**, grouped by workspace and collapsed by default, with one-click **restore & open**, **fork**, and **unarchive-only** actions.

## Why

DSH 0.1.0-rc.6's archive feature has a known limitation: **archived sessions have no viewing or unarchive surface** (per the official ui-workspace README: *"archived sessions have no viewing or unarchive surface"*). Archiving only hides a session from the sidebar grouping views — the session log and its accounting slot remain — but users can neither see the sessions nor restore them.

This plugin fills that gap:

- **View**: a persistent "Archived (n)" seat at the sidebar foot; the panel lists archived sessions grouped by workspace (groups collapsed by default);
- **Restore**: one click unarchives and opens the original session, taking effect live — it goes through the runtime's own persistence write path plus the official frame push, exactly like built-in operations.

## Screenshots

<!--
  Screenshot: docs/screenshot_en.png (English UI, PNG, width ≥ 640px
  recommended). To replace it, swap the file or edit the path below.
-->

![dsh-archives — the archived panel at the sidebar foot](docs/screenshot_en.png)

## Features

- "Archived (n)" trigger at the sidebar foot (above Settings): label + count when wide, icon-only in the collapsed rail; auto-hides when nothing is archived
- Panel grouped by workspace; group headers show name + count; **all groups collapsed by default**; expansion state persisted to localStorage
- Each session row shows its title + relative time (just now / Xm ago / Xh ago / Xd ago)
- Three clearly-labeled actions:
  - **Click the row = Restore & open**: unarchive → wait for the client archive set to sync → open the original session
  - **⿻ Fork**: fork as a new session and open it (the original stays archived)
  - **↻ Unarchive only**: move back to the sidebar without opening
- Inline error message in the panel on failure (one key per action)
- Bilingual copy (zh/en, follows the app locale)
- Click outside the panel to close it

## Architecture

A standard DSH **dual-half** package: one package providing both the host (Node) half and the browser (client) half.

```
dsh-archives/
├── package.json          # dsh.client declaration (platform: web) + exports["./client"]
├── lib/
│   ├── index.js          # host half: unarchive HTTP endpoint
│   └── client.js         # browser half: sidebar UI (client bundle)
```

### Host half (lib/index.js)

- Registers `POST /archives/unarchive` (body `{"sessionId":"session-..."}`)
- Performs the unarchive through the **workspace registry's own write path**: `registry.enqueueOperation → requireState → setState` (i.e. `workspace.domain.global.set`)
- Why this way: `setState` writes to disk, updates memory, and emits `domain/changed` through storage-domain; the api-proxy observes the event and pushes a `host/archived-sessions-changed` frame to every client — so **unarchive is sourced identically to built-in operations**, stays in sync across tabs, and survives restarts
- Validation: POST only, JSON body, `sessionId` must be a valid session id; unknown or already-unarchived ids answer `{ok:true, changed:false}` (idempotent)

### Browser half (lib/client.js)

- Written to the official client-bundle contract (`window.__ModuleLoader__.load({id, factory})`), depending only on the shell's static module table: `react` / `react/jsx-runtime` / `@deepseek-ai/dsh-client-ui-primitives`
- Registers into the `sidebar.footer.action` slot (`id: "dsh-archives"`), following ui-cordis's footer-action geometry (`.layer` + badge button + floating panel)
- Data comes from framework standard props: `useSessions` / `useWorkspaces` (note: **a selector is mandatory** — the engine's `bindSnapshotSelector` does not default a missing selector; this was a real crash fixed during development)
- Restore timing: unarchive first, then **subscribe to `ctx.workspaces.list` until the archive set drops the id** (the host frame round-trip), and only then `open()` — so the open cannot be cleared by the runtime's projection sweep, which clears any selection still landing in a stale archive set

## Deployment

This is a **local plugin for DSH Web** (not an npm-published package): deploying means placing the plugin into the profile's dependency directory, enabling it in `cordis.patch.yml`, and restarting — three steps.

### Step 1: Put the plugin into the profile's dependency directory

DSH profiles resolve plugins from their own `node_modules` (flat `nodeLinker: hoisted` layout). Copy the whole `dsh-archives` directory there:

```bash
# The `dsh web` profile is $DSH_HOME/profiles/web; its deps live one level up:
cp -r dsh-archives "$DSH_HOME/profiles/node_modules/"
```

If the profile deps are pnpm-managed, declare it as a local dependency instead:

```bash
# Add to the dependencies of $DSH_HOME/profiles/web/package.json:
#   "dsh-archives": "file:<absolute path to this repo>"
dsh plugin --profile web install
```

### Step 2: Enable the plugin in cordis.patch.yml

Edit `$DSH_HOME/profiles/web/cordis.patch.yml` and append one entry:

```yaml
- insert:
    - id: archives
      name: 'dsh-archives'
```

> `id` is the loader row name (arbitrary, feel free to change); `name` **must match the package name** (`dsh-archives`) — the loader resolves the package by it.

### Step 3: Restart dsh web

```bash
dsh web   # then open http://127.0.0.1:3080 in the browser
```

### Verify the deployment

| Check | How | Expected |
|---|---|---|
| Client bundle is served | Open `http://127.0.0.1:3080/plugins/dsh-archives/client.js` | 200 + JS content |
| Boot manifest includes the plugin | Open `http://127.0.0.1:3080/` source, `window.__DSH_BOOT__` entries | Contains `dsh-archives` |
| Unarchive endpoint mounted | `GET http://127.0.0.1:3080/archives/unarchive` | 405 (method gate — the route is live) |
| UI entry appears | Sidebar foot | "Archived (n)" button |

### Troubleshooting

- **No button after refresh**: open the browser console (F12) — a component crash is silently abdicated, so the console error is the most direct clue; double-check the directory/package name spelling from steps 1–2; `dsh --profile web --dump-config` shows whether the `archives` row is in the composed config
- **Code changes do not take effect**: the client bundle is read per request, so **UI changes only need a page refresh**; host changes (`lib/index.js`) need a restart
- **Broken after upgrading DSH**: built against 0.1.0-rc.6; adapt if slot or service names change

## Usage

1. Click "Archived (n)" at the sidebar foot (n = total archived)
2. Expand the workspace group you want (groups are collapsed by default)
3. Pick an action: click the row to restore & open / ⿻ fork / ↻ unarchive only

## How it works

```
User clicks "Restore"
  └─ client: POST /archives/unarchive {sessionId}
       └─ host: registry.enqueueOperation → setState
            ├─ workspace.domain.global.set (disk + memory + domain/changed event)
            │    └─ api-proxy observes the event → pushes host/archived-sessions-changed
            │         └─ client: installArchived → useWorkspaces updates → the panel drops the session
            └─ response {ok:true}
  └─ client: after the archive set syncs, ctx.sessions.open(sessionId) → session opens
```

- The archive set persists at `global.archivedSessionIds` in `$DSH_HOME/storages/workspace.json` (no manual editing needed)
- "Fork as new session" uses the framework's built-in `sessions.fork`, then opens the child

## Known limitations

- Directly `open()`ing a session that is **still archived** is immediately cleared by the runtime (by design), so there is no "open while keeping archived" action; use **Restore & open** or **Fork** to view content
- Archived sessions are excluded from sidebar content search (framework behavior); this plugin does not integrate search yet
- Rail (collapsed sidebar) mode shows the icon only
- The panel is a fixed-position overlay (same geometry as the ui-cordis panel); it overlaps if both are open (same z-index, later registrant on top)
- Built and verified against dsh **0.1.0-rc.6** (web app); adapt slot/service names when upgrading

## Tests

Two zero-dependency smoke tests ship in `tests/`. The client test renders the component with real React from a DSH profile's `node_modules`; point `DSH_PROFILE_NODE_MODULES` at the profile's node_modules when it differs from the default (the dev machine path):

```bash
node tests/smoke-test.cjs   # client half: bundle load → apply registration → SSR render (9 assertions)
node tests/host-test.mjs    # host half: route registration → unarchive → idempotence → validation (no external deps)
```

End-to-end verification (measured, passing):

- `POST /archives/unarchive` → `{ok:true, changed:true}`
- Connecting to `/api/events.host` over WebSocket delivers a live `host/archived-sessions-changed` frame carrying the full updated archive set

## License

MIT, see [LICENSE](LICENSE).
