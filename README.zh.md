# dsh-archives

[English](README.md) | 中文

在 DeepSeek Harness Web 侧边栏**底部**显示已归档会话的插件：按工作区分组、默认折叠，支持一键「恢复并打开」「复制为新会话」「仅移回侧边栏」。

## 为什么需要它

DSH 0.1.0-rc.6 的归档功能有个已知限制：**归档后的会话没有任何查看或取消归档的界面**（官方 ui-workspace README 原文：*"archived sessions have no viewing or unarchive surface"*）。归档只是把会话从侧边栏分组视图中隐藏——日志和记账槽位都还在——但用户既看不到它们，也找不到恢复入口。

本插件补齐了这个缺口：
- **查看**：侧边栏底部常驻「已归档 (n)」入口，面板按工作区分组列出所有归档会话（组默认折叠）；
- **恢复**：一键取消归档并打开原会话，实时生效（走运行时自身的持久化写路径 + 官方帧推送，与界面内其他操作完全一致）。

## 效果展示

<!--
  效果截图：docs/screenshot_zh.png（中文界面，建议宽度 ≥ 640px、PNG 格式）。
  如需更换，替换该文件或修改下方路径。
-->

![dsh-archives 效果展示：侧边栏底部的已归档面板](docs/screenshot_zh.png)

## 功能特性

- 侧边栏底部（Settings 上方）「已归档 (n)」触发按钮，宽栏显示文字 + 计数，收起为图标；无归档会话时入口自动隐藏
- 面板按工作区分组，组头显示工作区名 + 数量，**默认全部折叠**，展开状态持久化到 localStorage
- 每条会话显示标题 + 相对时间（刚刚 / X 分钟前 / X 小时前 / X 天前）
- 三个操作，语义明确：
  - **点击行 = 恢复并打开**：取消归档 → 等客户端归档集合同步 → 打开原会话
  - **⿻ 复制**：fork 为新会话并打开（原会话保留在已归档）
  - **↻ 仅移回**：取消归档，不打开
- 操作失败时面板内联显示错误（区分三种操作）
- 中英双语文案（跟随应用 locale）
- 点击面板外部自动关闭

## 架构

插件是 DSH 标准的**双 half** 包：一个包同时提供 host（Node）端与 browser（客户端）端。

```
dsh-archives/
├── package.json          # dsh.client 声明（platform: web）+ exports["./client"]
├── lib/
│   ├── index.js          # host half：取消归档 HTTP 端点
│   └── client.js         # browser half：侧边栏 UI（客户端 bundle）
```

### host half（lib/index.js）

- 注册 `POST /archives/unarchive`（入参 `{"sessionId":"session-..."}`）
- 通过 **workspace registry 自身的写路径**执行取消归档：`registry.enqueueOperation → requireState → setState`（即 `workspace.domain.global.set`）
- 为什么这样写：registry 的 `setState` 会写盘、更新内存，并通过 storage-domain 发出 `domain/changed`；api-proxy 监听到该事件后向所有客户端推送 `host/archived-sessions-changed` 帧——**取消归档与界面内置操作完全同源**，多标签页实时同步，重启后也不会回退
- 校验：仅 POST、JSON body、sessionId 必须为合法会话 id；未知/未归档 id 返回 `{ok:true, changed:false}` 幂等成功

### browser half（lib/client.js）

- 按官方客户端 bundle 契约编写（`window.__ModuleLoader__.load({id, factory})`），仅依赖 shell 静态注册表提供的 `react` / `react/jsx-runtime` / `@deepseek-ai/dsh-client-ui-primitives`
- 注册进 `sidebar.footer.action` 槽位（`id: "dsh-archives"`），跟随 ui-cordis 的底部动作面板几何（`.layer` + 徽标按钮 + 浮层面板）
- 数据全部来自框架标准 props：`useSessions` / `useWorkspaces`（注意：**必须传选择器**，引擎的 `bindSnapshotSelector` 不兜底缺省选择器——这是本插件修过的一个真实崩溃点）
- 「恢复并打开」的时序处理：先取消归档，再**订阅 `ctx.workspaces.list` 等待归档集合同步**（host 帧往返），最后才 `open()`——避免打开动作被运行时的投影清理（selection 落在归档集合时会被清空）误伤

## 部署

本插件是 **DSH Web 的本地插件**（不是 npm 发布的包）：部署 = 把插件放进 profile 的依赖目录 + 在 `cordis.patch.yml` 启用 + 重启，核心三步。

### 第 1 步：把插件放进 profile 的依赖目录

DSH profile 从自己的 `node_modules`（`nodeLinker: hoisted` 扁平布局）解析插件包。把整个 `dsh-archives` 目录拷贝过去即可：

```bash
# dsh web 的 profile 是 $DSH_HOME/profiles/web，依赖目录在上级：
cp -r dsh-archives "$DSH_HOME/profiles/node_modules/"
```

若 profile 依赖由 pnpm 管理，也可以声明为本地依赖后安装：

```bash
# 在 $DSH_HOME/profiles/web/package.json 的 dependencies 中加入：
#   "dsh-archives": "file:<本仓库的绝对路径>"
dsh plugin --profile web install
```

### 第 2 步：在 cordis.patch.yml 启用插件

编辑 `$DSH_HOME/profiles/web/cordis.patch.yml`，追加一行：

```yaml
- insert:
    - id: archives
      name: 'dsh-archives'
```

> `id` 是加载器行名（自定义，可改）；`name` **必须与包名一致**（`dsh-archives`），加载器靠它解析包。

### 第 3 步：重启 dsh web

```bash
dsh web   # 重启后浏览器访问 http://127.0.0.1:3080
```

### 验证部署是否成功

| 检查项 | 方法 | 期望 |
|---|---|---|
| 客户端 bundle 可访问 | 浏览器打开 `http://127.0.0.1:3080/plugins/dsh-archives/client.js` | 200 + JS 内容 |
| 启动清单包含插件 | 打开 `http://127.0.0.1:3080/` 查看源码，`window.__DSH_BOOT__` 的 entries | 包含 `dsh-archives` |
| 取消归档端点已挂载 | `GET http://127.0.0.1:3080/archives/unarchive` | 405（方法门禁，说明路由已注册） |
| 界面出现入口 | 侧边栏底部 | 「已归档 (n)」按钮 |

### 常见问题

- **刷新后没有按钮**：F12 看控制台是否报错（组件崩溃会被静默摘除，报错是最直接线索）；确认第 1、2 步的目录名/包名拼写一致；可用 `dsh --profile web --dump-config` 检查组合配置里有没有 `archives` 行
- **改代码后不生效**：client bundle 按请求实时读取，**UI 改动只需刷新页面**；host 改动（`lib/index.js`）需要重启
- **升级 DSH 后失效**：本插件针对 0.1.0-rc.6 开发，若槽位或服务名变更需适配

## 使用

1. 侧边栏底部点击「已归档 (n)」（n 为归档总数）
2. 展开对应工作区组（组默认折叠）
3. 选择操作：点击行恢复并打开 / ⿻ 复制 / ↻ 仅移回

## 工作原理速览

```
用户点击「恢复」
  └─ client: POST /archives/unarchive {sessionId}
       └─ host: registry.enqueueOperation → setState
            ├─ workspace.domain.global.set（写盘 + 内存 + 发 domain/changed）
            │    └─ api-proxy 收到事件 → 推送 host/archived-sessions-changed 帧
            │         └─ client: installArchived → useWorkspaces 更新 → 面板自动移除该会话
            └─ 响应 {ok:true}
  └─ client: 等待归档集合同步后 ctx.sessions.open(sessionId) → 会话打开
```

- 归档集合的持久化位置：`$DSH_HOME/storages/workspace.json` 的 `global.archivedSessionIds`（无需手动编辑）
- 「复制为新会话」走框架自带的 `sessions.fork`，fork 后打开子会话

## 已知限制

- 直接 `open()` 一个**仍处于归档状态**的会话会被运行时立即清除选中（设计如此），因此本插件不提供「打开但保持归档」的动作；想查看内容请用「恢复并打开」或「复制」
- 归档会话不参与侧边栏内容搜索（框架行为），本插件暂未自行接入搜索
- 侧边栏收起（rail）模式下只有图标，无文字
- 面板为固定定位浮层（与 ui-cordis 插件面板同款几何），与 Cordis 面板同时打开时会重叠（z-index 相同，后注册者在上）
- 已针对 dsh **0.1.0-rc.6**（web 应用）开发验证；升级 DSH 后如槽位或服务名变更需同步适配

## 测试

仓库内附带两个零依赖冒烟测试（`tests/`）。client 测试使用 DSH profile 里真实的 react 渲染组件，可用 `DSH_PROFILE_NODE_MODULES` 指定 profile 的 node_modules（默认指向开发机路径）：

```bash
node tests/smoke-test.cjs   # client half：bundle 加载 → apply 注册 → 组件 SSR 渲染（9 项断言）
node tests/host-test.mjs    # host half：路由注册 → 取消归档 → 幂等 → 参数/方法校验（无外部依赖）
```

端到端验证记录（已实测通过）：
- `POST /archives/unarchive` → `{ok:true, changed:true}`
- 通过 WebSocket 连接 `/api/events.host` 可实时收到 `host/archived-sessions-changed` 帧，负载为更新后的完整归档集合

## 许可

MIT，见 [LICENSE](LICENSE)。
