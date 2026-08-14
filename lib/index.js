/**
 * dsh-archives — host half.
 *
 * rc.6 has no unarchive RPC and no UI to view archived sessions. This plugin
 * adds one: the browser half renders an "Archived" seat at the sidebar foot;
 * this half owns the only missing primitive — removing a session from the
 * registry-global archive set — and exposes it as a small HTTP endpoint.
 *
 * Unarchive writes through the workspace registry's OWN write path
 * (enqueueOperation -> setState), so:
 *   - the durable domain write emits `domain/changed` (workspace, table ""),
 *     which the api-proxy observes and pushes back to clients as
 *     `host/archived-sessions-changed` — the sidebar list and this panel
 *     update live, no refresh needed;
 *   - the registry's in-memory state stays consistent, so later archives and
 *     reconnect baselines (workspace.list) keep the correct set.
 */
const name = "dsh-archives";
const inject = ["webServer", "workspaceRegistry"];

const MAX_BODY_BYTES = 64 * 1024;

/** Collect a small JSON request body. */
async function readJsonBody(req) {
	let body = "";
	for await (const chunk of req) {
		body += chunk;
		if (body.length > MAX_BODY_BYTES) throw new Error("request body too large");
	}
	return JSON.parse(body);
}

function json(res, status, value) {
	res.writeHead(status, { "content-type": "application/json; charset=utf-8" });
	res.end(JSON.stringify(value));
}

function apply(ctx) {
	ctx.effect(() => ctx.webServer.register({
		kind: "exact",
		path: "/archives/unarchive",
		handler: async (req, res) => {
			if (req.method !== "POST") {
				json(res, 405, { ok: false, error: "method not allowed" });
				return;
			}
			let sessionId;
			try {
				const payload = await readJsonBody(req);
				sessionId = payload.sessionId;
			} catch (error) {
				json(res, 400, { ok: false, error: "invalid JSON body: " + String(error && error.message || error) });
				return;
			}
			if (typeof sessionId !== "string" || !sessionId.startsWith("session-")) {
				json(res, 400, { ok: false, error: "sessionId must be a session id string" });
				return;
			}
			try {
				const registry = ctx.workspaceRegistry;
				// TS-private but runtime-public registry write path; serialized on
				// the registry's own operation tail so it cannot interleave with
				// an in-flight archive/reorder mutation.
				const changed = await registry.enqueueOperation(async () => {
					const state = registry.requireState();
					if (!state.archivedSessionIds.includes(sessionId)) return false;
					await registry.setState({
						...state,
						archivedSessionIds: state.archivedSessionIds.filter((id) => id !== sessionId)
					});
					return true;
				});
				json(res, 200, { ok: true, changed });
			} catch (error) {
				ctx.logger.error("[dsh-archives] unarchive failed:", error);
				json(res, 500, { ok: false, error: String(error && error.message || error) });
			}
		}
	}), "dsh-archives: unarchive route");
}

export { apply, inject, name };
