# dsh-archives — retired (superseded by DSH 0.2)

English | [中文](README.zh.md)

> **Status: retired.** DeepSeek Harness 0.2 ships a complete archived-session feature in
> `@deepseek-ai/dsh-client-ui-workspace`. This plugin is **not adapted** for 0.2.x and
> must not be installed there. It is kept only as a reference for DSH 0.1.x.

## Why it is retired

`dsh-archives` existed because DSH 0.1.0-rc.6 had no unarchive RPC and no UI for
archived sessions. It added:

- an "Archived" seat at the sidebar foot with a count badge,
- a panel grouping archived sessions by workspace,
- `POST /archives/unarchive` writing through the workspace registry's own write path.

DSH 0.2.1-rc.2 provides all of that natively:

| Need | Built-in 0.2.x |
|---|---|
| Archive a session | Session row menu → **Archive**; stop-and-archive dialog when work is running |
| See archived sessions | View options → **All conversations** / **Archived only** |
| Restore | **Unarchive** in the row menu or the search result |
| Fork from archive | **Fork** remains available on archived rows |
| Live updates | Workspace follow stream (`workspaceController.follow`) |
| Programmatic API | Client `ctx.workspaces.archiveSession/unarchiveSession`, host `ctx.workspaceRegistry.archiveSession/unarchiveSession` |

Adding a second archive surface would duplicate the built-in one and risk
divergent state, so the 0.2 migration deliberately stops here.

## What to do instead

- Use the built-in archive controls; nothing to install.
- If you need a custom archive view, build it on the documented slots
  (`sidebar.workspaces` view options) and the public `uiWorkspace` /
  `workspaces` services rather than writing the registry directly.

## Historical use (DSH 0.1.x only)

```powershell
# 0.1.x: copy the package into profiles/node_modules and add the cordis row
```

See the git history of this file for the full 0.1.x instructions, verification
checklist, and host-route details. The source in `lib/` is unchanged and remains
a working reference for that release.

## License

MIT.
