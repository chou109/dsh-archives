# dsh-archives

English | [中文](README.zh.md)

**Archived-session drawer at the bottom of the DSH web sidebar** — grouped by workspace, one-click restore & open, fork, or unarchive.

---

## 👤 If you are a human, read this

dsh-archives is a plugin for the [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) web app. By default, DSH archives sessions into a hidden limbo with **no way to view or restore them**; this plugin adds an **"Archived (n)"** button at the bottom of the sidebar that lists every archived session, organized by workspace.

### Screenshots

![dsh-archives — the archived panel at the sidebar foot](docs/screenshot_en.png)

### What you get

- **"Archived (n)" seat at the sidebar foot** — auto-hides when nothing is archived
- Panel **grouped by workspace**, groups collapsed by default
- **Click a row** → restore & open the original session
- **⿻** → fork a copy as a new session (the original stays archived)
- **↻** → move back to the sidebar without opening
- Bilingual UI (zh/en), inline error messages, click-outside to close

### Quick start (3 steps)

```bash
cp -r dsh-archives "$DSH_HOME/profiles/node_modules/"
# then append to $DSH_HOME/profiles/web/cordis.patch.yml:
#   - insert:
#       - id: archives
#         name: 'dsh-archives'
dsh web
```

### License

MIT — see [LICENSE](LICENSE).

---

## 🤖 If you are an AI agent, read this

You can deploy this plugin **by executing the steps below as-is** — paths and commands are exact, do not improvise them. If you were handed this repo and asked to "install/deploy it", follow the **TL;DR** block, then the verification checks.

### TL;DR — deploy with one command

**Linux / macOS (bash):**

```bash
DSH_HOME="${DSH_HOME:-$HOME/.dsh}"
cp -r ./dsh-archives "$DSH_HOME/profiles/node_modules/"
mkdir -p "$DSH_HOME/profiles/web"
cat >> "$DSH_HOME/profiles/web/cordis.patch.yml" <<'EOF'

# dsh-archives: archived sessions at the sidebar foot
- insert:
    - id: archives
      name: 'dsh-archives'
EOF
```

**Windows (PowerShell):**

```powershell
$dsh = if ($env:DSH_HOME) { $env:DSH_HOME } else { "$env:USERPROFILE\.dsh" }
Copy-Item -Recurse .\dsh-archives "$dsh\profiles\node_modules\"
Add-Content "$dsh\profiles\web\cordis.patch.yml" @"

# dsh-archives: archived sessions at the sidebar foot
- insert:
    - id: archives
      name: 'dsh-archives'
"@
```

After copying, **restart the dsh web server** (stop the running `dsh web` process, then run `dsh web` again) and verify below.

### Full procedure (exact paths)

1. **Locate DSH home** — `$DSH_HOME` (default `~/.dsh`, e.g. `C:\Users\<user>\.dsh` on Windows).
2. **Copy the plugin** into the profile dependency directory. Note: for the `web` profile the deps live **one level above** the profile dir (`$DSH_HOME/profiles/node_modules/`, flat hoisted layout), not inside `profiles/web/node_modules`:
   ```bash
   cp -r dsh-archives "$DSH_HOME/profiles/node_modules/"
   ```
3. **Enable the plugin** — append to `$DSH_HOME/profiles/web/cordis.patch.yml` (create the file with the block below if it does not exist):
   ```yaml
   # Your patch layer for this dsh profile.
   - insert:
       - id: archives
         name: 'dsh-archives'
   ```
   `id` is an arbitrary loader row name; `name` **must** equal the package name (`dsh-archives`).
4. **Restart** — stop the running `dsh web` process, then `dsh web`, and open `http://127.0.0.1:3080`.

### Verification checklist (run these yourself)

```bash
# Linux/macOS
curl -s -o /dev/null -w "bundle=%{http_code}\n" http://127.0.0.1:3080/plugins/dsh-archives/client.js  # expect bundle=200
curl -s -o /dev/null -w "route=%{http_code}\n"  http://127.0.0.1:3080/archives/unarchive             # expect route=405
```

```powershell
# Windows PowerShell
(Invoke-WebRequest http://127.0.0.1:3080/plugins/dsh-archives/client.js -UseBasicParsing).StatusCode  # 200
(Invoke-WebRequest http://127.0.0.1:3080/archives/unarchive -UseBasicParsing).StatusCode              # 405
```

Also confirm `window.__DSH_BOOT__` in the served page source contains `dsh-archives`, and the "Archived (n)" button appears at the sidebar foot. All four must pass.

### Troubleshooting (if a check fails)

- **bundle 404** → the package is not in `$DSH_HOME/profiles/node_modules/`, or `name:` in `cordis.patch.yml` does not match the directory/package name. Fix and restart.
- **route 404/500** → the host half did not load; check the `archives` row exists in the composed config: `dsh --profile web --dump-config`.
- **button missing after a 200 bundle** → open the browser console (F12): a component render crash is *silently abdicated* by the slot machinery, so the console error is the only clue. Then verify you are on the refreshed page.
- **code edits not taking effect** → client bundle is read per request, so UI changes only need a page refresh; host changes (`lib/index.js`) need a server restart.

### What the plugin is / how it works (contract)

A DSH **dual-half client plugin** — no build step, no third-party runtime dependencies:

- `lib/index.js` — **host half**: `POST /archives/unarchive` removes a session from the registry-global archive set via the registry's own write path (`enqueueOperation → requireState → setState`, i.e. `workspace.domain.global.set`), which writes `$DSH_HOME/storages/workspace.json`, updates memory, and emits `domain/changed`; the api-proxy then pushes `host/archived-sessions-changed` to every client — live sync, survives restarts.
- `lib/client.js` — **browser half**: registers an "Archived" seat into the `sidebar.footer.action` slot and renders the panel.

### Agent notes (do / don't)

- ✅ The client bundle id in `window.__ModuleLoader__.load({id, ...})` **must equal** `package.json` `name`.
- ✅ `useSessions` / `useWorkspaces` **require a selector** — the engine's `bindSnapshotSelector` does not default a missing one (a missing selector crashes with `w is not a function`).
- ✅ `host/archived-sessions-changed` is a **framework constant** — never rename it.
- ✅ The restore flow subscribes to `ctx.workspaces.list` and waits for the archive set to drop the id before `open()`, so the runtime's projection sweep cannot clear the freshly restored selection.
- ❌ Do not `open()` a still-archived session directly — the runtime clears any selection that lands in the archive set.

### Testing

```bash
node tests/smoke-test.cjs   # client: bundle load → apply registration → SSR render (9 assertions); needs real React from a DSH profile — set DSH_PROFILE_NODE_MODULES
node tests/host-test.mjs    # host: route → unarchive → idempotence → validation; no external dependencies
```

### Known limitations

- Direct `open()` of an archived session is cleared by the runtime (by design); use **restore & open** or **fork**.
- Archived sessions are excluded from sidebar content search (framework behavior).
- Rail (collapsed) sidebar shows the icon only.
- The panel is a fixed-position overlay; it overlaps the Cordis plugin panel if both are open.
- Built and verified against dsh **0.1.0-rc.6**.

---

## License

MIT — see [LICENSE](LICENSE).
