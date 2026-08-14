/**
 * dsh-archives — browser half (client bundle).
 *
 * Registers an "Archived" seat into the sidebar's `sidebar.footer.action`
 * list slot (the foot of the left column, beside Settings). The seat is a
 * trigger row with a count badge; it opens a panel that lists archived
 * sessions grouped by workspace, every group collapsed by default.
 *
 * Per session:
 *   - click the row  -> fork the archived session and open the child
 *     (direct open is blocked by the runtime: the projection sweep clears any
 *     current selection that lands in the archive set);
 *   - click the ↻ button -> unarchive (POST /archives/unarchive);
 *     the host's domain write comes back as `host/archived-sessions-changed`,
 *     so the sidebar list and this panel update live.
 *
 * The bundle follows the shipped client-bundle contract:
 * `window.__ModuleLoader__.load({ id, factory })` where factory is a CJS
 * factory receiving the shell's `require` (react, react/jsx-runtime and
 * @deepseek-ai/dsh-client-ui-primitives are provided by the shell's static
 * module table).
 */
window.__ModuleLoader__.load({
	id: "dsh-archives",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		var react = require("react");
		var jsxRuntime = require("react/jsx-runtime");
		var primitives = require("@deepseek-ai/dsh-client-ui-primitives");

		//#region styles
		var css = [
			".dsh-arch-layer{flex:none;align-items:center;width:100%;height:49px;margin:8px 0 0;display:flex;position:relative}",
			".dsh-arch-footerButtons{align-items:center;width:100%;display:flex}",
			".dsh-arch-badge{width:100%;height:49px;color:var(--dsw-alias-label-primary);cursor:pointer;background:0 0;border:none;border-radius:12px;align-items:center;gap:8px;padding:0 8px 0 6px;font-family:inherit;font-size:14px;display:inline-flex;overflow:hidden}",
			".dsh-arch-badge:hover{background:var(--dsw-alias-interactive-bg-hover-solid)}",
			".dsh-arch-badge[data-active]{background:var(--dsw-alias-interactive-bg-hover)}",
			".dsh-arch-badgeLabel{text-overflow:ellipsis;white-space:nowrap;min-width:0;overflow:hidden}",
			".dsh-arch-badgeCount{color:var(--dsw-alias-label-tertiary);font-variant-numeric:tabular-nums;flex:none;margin-left:auto;font-size:12px;line-height:16px}",
			".dsh-arch-layer.dsh-arch-rail{width:36px;height:36px;margin:0}",
			".dsh-arch-rail .dsh-arch-badge{border-radius:50%;justify-content:center;gap:0;width:36px;height:36px;padding:0}",
			".dsh-arch-rail .dsh-arch-footerButtons{flex-direction:column;gap:2px}",
			".dsh-arch-panel{z-index:30;border:1px solid var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-base);width:420px;max-width:calc(100vw - 24px);max-height:60vh;box-shadow:var(--dsw-shadow-lv2);--dsh-scrollbar-thumb:var(--dsw-alias-scrollbar-bg-l2);--dsh-scrollbar-thumb-hover:var(--dsw-alias-scrollbar-hover-l2);border-radius:12px;flex-direction:column;display:flex;position:fixed;bottom:128px;left:12px;overflow:hidden}",
			".dsh-arch-header{box-sizing:border-box;border-bottom:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-base);flex:none;justify-content:space-between;align-items:center;min-height:44px;padding:10px 12px;display:flex}",
			".dsh-arch-title{color:var(--dsw-alias-label-primary);font-size:13px;font-weight:500;line-height:20px}",
			".dsh-arch-count{color:var(--dsw-alias-label-tertiary);font-variant-numeric:tabular-nums;font-size:12px;line-height:16px}",
			".dsh-arch-body{flex:1;min-height:0;padding:4px 8px 12px;overflow-y:auto}",
			".dsh-arch-error{color:var(--dsw-alias-state-error-primary);margin:4px 12px;font-size:12px;line-height:18px}",
			".dsh-arch-group{border-top:1px solid var(--dsw-alias-border-l2)}",
			".dsh-arch-group:first-child{border-top:none}",
			".dsh-arch-groupHeader{width:100%;min-height:36px;display:flex;align-items:center;gap:6px;padding:0 8px;border:none;background:0 0;color:var(--dsw-alias-label-primary);font-family:inherit;font-size:13px;cursor:pointer;border-radius:8px}",
			".dsh-arch-groupHeader:hover{background:var(--dsw-alias-interactive-bg-hover-solid)}",
			".dsh-arch-chevron{color:var(--dsw-alias-label-tertiary);flex:none;display:inline-flex}",
			".dsh-arch-groupTitle{text-overflow:ellipsis;white-space:nowrap;min-width:0;overflow:hidden}",
			".dsh-arch-groupCount{color:var(--dsw-alias-label-tertiary);font-variant-numeric:tabular-nums;font-size:12px;line-height:16px;margin-left:auto}",
			".dsh-arch-rows{list-style:none;margin:0;padding:0 0 4px}",
			".dsh-arch-row{display:flex;align-items:center;gap:4px;padding:0 4px 0 24px;border-radius:8px}",
			".dsh-arch-row:hover{background:var(--dsw-alias-interactive-bg-hover-solid)}",
			".dsh-arch-rowMain{flex:1;min-width:0;display:flex;flex-direction:column;gap:1px;padding:6px 4px;border:none;background:0 0;color:var(--dsw-alias-label-primary);font-family:inherit;text-align:left;cursor:pointer}",
			".dsh-arch-rowTitle{text-overflow:ellipsis;white-space:nowrap;overflow:hidden;font-size:13px;line-height:18px}",
			".dsh-arch-rowTime{color:var(--dsw-alias-label-tertiary);font-size:11px;line-height:14px}",
			".dsh-arch-rowActions{flex:none;display:flex;gap:2px}",
			".dsh-arch-rowAction{width:26px;height:26px;display:inline-flex;align-items:center;justify-content:center;border:none;border-radius:6px;background:0 0;color:var(--dsw-alias-label-tertiary);cursor:pointer}",
			".dsh-arch-rowAction:hover{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary)}",
			".dsh-arch-rowAction:disabled{opacity:.4;cursor:default}"
		].join("");
		var tagId = "dsh-archives/archived.module.css";
		if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId) + "]") === null) {
			var tag = document.createElement("style");
			tag.dataset.plugin = "dsh-archives";
			tag.dataset.pluginCss = tagId;
			tag.textContent = css;
			document.head.appendChild(tag);
		}
		var C = {
			layer: "dsh-arch-layer",
			rail: "dsh-arch-rail",
			footerButtons: "dsh-arch-footerButtons",
			badge: "dsh-arch-badge",
			badgeLabel: "dsh-arch-badgeLabel",
			badgeCount: "dsh-arch-badgeCount",
			panel: "dsh-arch-panel",
			header: "dsh-arch-header",
			title: "dsh-arch-title",
			count: "dsh-arch-count",
			body: "dsh-arch-body",
			error: "dsh-arch-error",
			group: "dsh-arch-group",
			groupHeader: "dsh-arch-groupHeader",
			chevron: "dsh-arch-chevron",
			groupTitle: "dsh-arch-groupTitle",
			groupCount: "dsh-arch-groupCount",
			rows: "dsh-arch-rows",
			row: "dsh-arch-row",
			rowMain: "dsh-arch-rowMain",
			rowTitle: "dsh-arch-rowTitle",
			rowTime: "dsh-arch-rowTime",
			rowActions: "dsh-arch-rowActions",
			rowAction: "dsh-arch-rowAction"
		};
		//#endregion

		//#region locales
		var NS = "dsh-archives";
		var EXPANDED_KEY = "dsh.archived.panel.expanded.v1";
		var zh = {
			"panel.title": "已归档会话",
			"panel.count": "共 {count} 个",
			"panel.trigger": "已归档",
			"panel.trigger.aria": "已归档会话（{count} 个）",
			"panel.empty": "暂无已归档会话",
			"group.ungrouped": "未分组",
			"action.restore": "恢复 {title}（移回侧边栏并打开）",
			"action.restore.tip": "移回侧边栏并打开",
			"action.fork": "复制 {title} 为新会话并打开",
			"action.fork.tip": "复制为新会话并打开（原会话保留在已归档）",
			"action.unarchive": "仅移回侧边栏（{title}）",
			"action.unarchive.tip": "仅移回侧边栏，不打开",
			"action.restoreFailed": "恢复会话失败：{message}",
			"action.forkFailed": "复制会话失败：{message}",
			"action.unarchiveFailed": "取消归档失败：{message}",
			"time.justNow": "刚刚",
			"time.minutesAgo": "{n} 分钟前",
			"time.hoursAgo": "{n} 小时前",
			"time.daysAgo": "{n} 天前"
		};
		var en = {
			"panel.title": "Archived Sessions",
			"panel.count": "{count} total",
			"panel.trigger": "Archived",
			"panel.trigger.aria": "Archived sessions ({count})",
			"panel.empty": "No archived sessions",
			"group.ungrouped": "Ungrouped",
			"action.restore": "Restore {title} (unarchive and open)",
			"action.restore.tip": "Unarchive and open",
			"action.fork": "Fork {title} as a new session and open it",
			"action.fork.tip": "Fork and open (the original stays archived)",
			"action.unarchive": "Only unarchive {title}",
			"action.unarchive.tip": "Unarchive without opening",
			"action.restoreFailed": "Restore failed: {message}",
			"action.forkFailed": "Fork failed: {message}",
			"action.unarchiveFailed": "Unarchive failed: {message}",
			"time.justNow": "just now",
			"time.minutesAgo": "{n}m ago",
			"time.hoursAgo": "{n}h ago",
			"time.daysAgo": "{n}d ago"
		};
		//#endregion

		//#region component
		var jsx = jsxRuntime.jsx;
		var jsxs = jsxRuntime.jsxs;
		var Fragment = jsxRuntime.Fragment;

		function relativeTime(ts, now, t) {
			var diff = now - ts;
			if (diff < 60 * 1000) return t("time.justNow");
			var minutes = Math.floor(diff / (60 * 1000));
			if (minutes < 60) return t("time.minutesAgo", { n: minutes });
			var hours = Math.floor(minutes / 60);
			if (hours < 24) return t("time.hoursAgo", { n: hours });
			var days = Math.floor(hours / 24);
			if (days < 30) return t("time.daysAgo", { n: days });
			var date = new Date(ts);
			return date.toLocaleDateString();
		}

		function loadExpanded() {
			try {
				var raw = window.localStorage.getItem(EXPANDED_KEY);
				return raw ? JSON.parse(raw) : {};
			} catch (error) {
				return {};
			}
		}

		function saveExpanded(value) {
			try {
				window.localStorage.setItem(EXPANDED_KEY, JSON.stringify(value));
			} catch (error) {
				/* storage unavailable: expansion state is per-session only */
			}
		}

		/**
		 * Sidebar foot seat: "Archived (n)" trigger + panel listing archived
		 * sessions grouped by workspace, each group collapsed by default.
		 * @param {object} props - composed slot props: owner share `wide`, the
		 * global standard hooks `useSessions`/`useWorkspaces`, the locale `t`
		 * seat, and the injected `onFork`/`onUnarchive` actions.
		 */
		function ArchivedSessionsPanel(props) {
			var wide = props.wide;
			var useSessions = props.useSessions;
			var useWorkspaces = props.useWorkspaces;
			var onFork = props.onFork;
			var onUnarchive = props.onUnarchive;
			var onRestore = props.onRestore;
			var t = props.t;

			var sessions = useSessions(function (s) { return s; });
			var archived = useWorkspaces(function (s) { return s.archivedSessionIds; });
			var workspaceItems = useWorkspaces(function (s) { return s.items; });

			var openState = react.useState(false);
			var open = openState[0];
			var setOpen = openState[1];
			var expandedState = react.useState(loadExpanded);
			var expandedByWorkspace = expandedState[0];
			var setExpandedByWorkspace = expandedState[1];
			var busyState = react.useState(null);
			var busyId = busyState[0];
			var setBusyId = busyState[1];
			var errorState = react.useState(null);
			var errorText = errorState[0];
			var setErrorText = errorState[1];
			var layerRef = react.useRef(null);

			// Close the panel on an outside click.
			react.useEffect(function () {
				if (!open) return;
				var onPointerDown = function (event) {
					var node = layerRef.current;
					if (node !== null && node.contains(event.target)) return;
					setOpen(false);
				};
				document.addEventListener("pointerdown", onPointerDown);
				return function () {
					document.removeEventListener("pointerdown", onPointerDown);
				};
			}, [open]);

			// Derive workspace groups over the archived set.
			var groups = react.useMemo(function () {
				var set = new Set(archived);
				var byId = sessions.byId || {};
				var out = [];
				var seen = new Set();
				for (var i = 0; i < workspaceItems.length; i++) {
					var ws = workspaceItems[i];
					var members = [];
					for (var j = 0; j < ws.sessionIds.length; j++) {
						var id = ws.sessionIds[j];
						var summary = byId[id];
						if (set.has(id) && summary !== void 0) members.push(summary);
					}
					if (members.length > 0) {
						members.sort(function (a, b) { return b.updatedAt - a.updatedAt; });
						for (var m = 0; m < members.length; m++) seen.add(members[m].id);
						out.push({ key: "ws:" + ws.workspaceId, title: ws.title, path: ws.path, sessions: members });
					}
				}
				var ungrouped = [];
				for (var k = 0; k < archived.length; k++) {
					var id2 = archived[k];
					var s2 = byId[id2];
					if (!seen.has(id2) && s2 !== void 0) ungrouped.push(s2);
				}
				if (ungrouped.length > 0) {
					ungrouped.sort(function (a, b) { return b.updatedAt - a.updatedAt; });
					out.push({ key: "ungrouped", title: t("group.ungrouped"), path: void 0, sessions: ungrouped });
				}
				return out;
			}, [archived, sessions.byId, workspaceItems, t]);

			var count = archived.length;
			// No archived sessions: render nothing (the seat disappears entirely).
			if (count === 0) return null;

			var toggleWorkspace = function (key) {
				setExpandedByWorkspace(function (prev) {
					var next = {};
					for (var k in prev) next[k] = prev[k];
					next[key] = !prev[key];
					saveExpanded(next);
					return next;
				});
			};

			var runAction = function (sessionId, action, errorKey) {
				if (busyId !== null) return;
				setBusyId(sessionId);
				setErrorText(null);
				action(sessionId).catch(function (error) {
					setErrorText(t(errorKey, {
						message: String(error && error.message || error)
					}));
				}).finally(function () {
					setBusyId(null);
				});
			};

			var handleRestore = function (sessionId) {
				runAction(sessionId, onRestore, "action.restoreFailed");
			};
			var handleFork = function (sessionId) {
				runAction(sessionId, onFork, "action.forkFailed");
			};
			var handleUnarchive = function (sessionId) {
				runAction(sessionId, onUnarchive, "action.unarchiveFailed");
			};

			return jsxs("div", {
				ref: layerRef,
				className: wide ? C.layer : C.layer + " " + C.rail,
				children: [
					open && jsxs("section", {
						className: C.panel,
						"data-archived-panel": true,
						"aria-label": t("panel.title"),
						children: [
							jsxs("header", {
								className: C.header,
								children: [
									jsx("span", { className: C.title, children: t("panel.title") }),
									jsx("span", { className: C.count, children: t("panel.count", { count: count }) })
								]
							}),
							errorText !== null && jsx("p", { className: C.error, role: "alert", children: errorText }),
							jsx("div", {
								className: C.body,
								children: groups.map(function (group) {
									var isOpen = expandedByWorkspace[group.key] === true;
									return jsxs("section", {
										key: group.key,
										className: C.group,
										children: [
											jsx("button", {
												type: "button",
												className: C.groupHeader,
												"aria-expanded": isOpen,
												onClick: function () { toggleWorkspace(group.key); },
												children: [
													jsx(isOpen ? primitives.IconChevronDownOutline14 : primitives.IconChevronRightOutline14, {
														className: C.chevron,
														size: 14
													}),
													jsx("span", { className: C.groupTitle, title: group.path, children: group.title }),
													jsx("span", { className: C.groupCount, children: String(group.sessions.length) })
												]
											}),
											isOpen && jsx("ul", {
												className: C.rows,
												children: group.sessions.map(function (summary) {
													return jsxs("li", {
														key: summary.id,
														className: C.row,
														"data-session": summary.id,
														children: [
															jsx("button", {
																type: "button",
																className: C.rowMain,
																title: t("action.restore.tip"),
																onClick: function () { handleRestore(summary.id); },
																children: [
																	jsx("span", { className: C.rowTitle, children: summary.displayTitle }),
																	jsx("span", { className: C.rowTime, children: relativeTime(summary.updatedAt, Date.now(), t) })
																]
															}),
															jsx("div", {
																className: C.rowActions,
																children: [
																	jsx("button", {
																		type: "button",
																		className: C.rowAction,
																		"aria-label": t("action.fork", { title: summary.displayTitle }),
																		title: t("action.fork.tip"),
																		onClick: function () { handleFork(summary.id); },
																		disabled: busyId !== null,
																		children: jsx(primitives.IconBranchOutline16, { size: 14 })
																	}),
																	jsx("button", {
																		type: "button",
																		className: C.rowAction,
																		"aria-label": t("action.unarchive", { title: summary.displayTitle }),
																		title: t("action.unarchive.tip"),
																		onClick: function () { handleUnarchive(summary.id); },
																		disabled: busyId !== null,
																		children: jsx(primitives.IconRefreshOutline14, { size: 14 })
																	})
																]
															})
														]
													});
												})
											})
										]
									});
								})
							})
						]
					}),
					jsx("div", {
						className: C.footerButtons,
						children: jsxs("button", {
							type: "button",
							className: C.badge,
							"data-archived-count": count,
							"aria-label": t("panel.trigger.aria", { count: count }),
							"aria-expanded": open,
							onClick: function () { setOpen(!open); },
							children: [
								jsx(primitives.IconArchiveOutline20, { size: 18 }),
								wide && jsxs(Fragment, {
									children: [
										jsx("span", { className: C.badgeLabel, children: t("panel.trigger") }),
										jsx("span", { className: C.badgeCount, children: String(count) })
									]
								})
							]
						})
					})
				]
			});
		}
		//#endregion

		//#region entry
		var inject = ["slots", "sessions", "workspaces", "locale"];

		/**
		 * Register the Archived seat once the sidebar's footer-action slot is
		 * declared. Actions close over the client root ctx: fork goes through
		 * the sessions service; unarchive/restore call the host endpoint this
		 * package's node half mounts.
		 * @param {object} ctx - client root context.
		 */
		function apply(ctx) {
			ctx.effect(function () {
				return ctx.locale.register(NS, { zh: zh, en: en });
			}, "dsh-archives: dictionaries");
			ctx.slots.inject("sidebar.footer.action", function () {
				return ctx.slots.register({
					name: "sidebar.footer.action",
					id: "dsh-archives",
					locale: NS,
					inject: function () {
						/** POST the unarchive request; throws on a non-ok payload. */
						var requestUnarchive = function (sessionId) {
							return fetch("/archives/unarchive", {
								method: "POST",
								headers: { "content-type": "application/json" },
								body: JSON.stringify({ sessionId: sessionId })
							}).then(function (response) {
								return response.json();
							}).then(function (payload) {
								if (!payload.ok) throw new Error(payload.error || "unarchive failed");
								return payload;
							});
						};
						/**
						 * Wait until the client's archive set actually dropped the id
						 * (the host frame round-trip), so a follow-up open() cannot be
						 * cleared by the projection sweep running against a stale set.
						 */
						var waitArchivedDropped = function (sessionId, timeoutMs) {
							return new Promise(function (resolve) {
								var current = ctx.workspaces.list.getSnapshot().archivedSessionIds;
								if (!current.includes(sessionId)) {
									resolve();
									return;
								}
								var unsub = ctx.workspaces.list.subscribe(function () {
									if (!ctx.workspaces.list.getSnapshot().archivedSessionIds.includes(sessionId)) {
										unsub();
										resolve();
									}
								});
								setTimeout(function () {
									unsub();
									resolve();
								}, timeoutMs);
							});
						};
						return {
							onFork: function (sessionId) {
								return ctx.sessions.fork({ sessionId: sessionId, increaseTitle: true }).then(function (childId) {
									ctx.sessions.open(childId);
								});
							},
							onUnarchive: function (sessionId) {
								return requestUnarchive(sessionId);
							},
							onRestore: async function (sessionId) {
								await requestUnarchive(sessionId);
								await waitArchivedDropped(sessionId, 5000);
								ctx.sessions.open(sessionId);
							}
						};
					}
				}, ArchivedSessionsPanel);
			});
		}
		//#endregion

		exports.apply = apply;
		exports.inject = inject;
		return module.exports;
	}
});
