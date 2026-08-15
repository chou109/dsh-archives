# dsh-archives

[English](README.md) | 中文

**DSH Web 侧边栏底部的归档会话抽屉** —— 按工作区分组折叠，一键恢复并打开、复制为新会话或移回侧边栏。

**仓库镜像**

- GitHub：<https://github.com/chou109/dsh-archives>
- Gitee（中国大陆仓库，国内访问更快）：<https://gitee.com/chill109/dsh-archives>

---

## 👤 如果你是人类，请看这里

dsh-archives 是 [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) Web 的插件。DSH 默认把归档会话藏进一个**没有任何查看或恢复入口**的角落；本插件在侧边栏底部加了一个 **「已归档 (n)」按钮**，按工作区列出所有归档会话。

### 效果展示

![dsh-archives 效果展示：侧边栏底部的已归档面板](docs/screenshot_zh.png)

### 你能得到什么

- 侧边栏底部常驻 **「已归档 (n)」入口** —— 没有归档会话时自动隐藏
- 面板**按工作区分组**，组默认折叠
- **点击会话行** → 恢复并打开原会话
- **⿻** → 复制为新会话并打开（原会话保留在已归档）
- **↻** → 仅移回侧边栏，不打开
- 中英双语文案、操作失败内联报错、点击面板外部自动关闭

### 快速上手（三步）

```bash
cp -r dsh-archives "$DSH_HOME/profiles/node_modules/"
# 然后在 $DSH_HOME/profiles/web/cordis.patch.yml 末尾追加：
#   - insert:
#       - id: archives
#         name: 'dsh-archives'
dsh web
```

完整的部署细节、验证与排障在下方 AI 部分——或者把整个文件读完也行，不长。

### 许可

MIT，见 [LICENSE](LICENSE)。

---

## 🤖 如果你是 AI，请读这里

**直接照抄下面的步骤就能完成部署**——路径和命令都是精确的，不要自行发挥。如果别人把本仓库丢给你并让你"装一下/部署一下"，执行 **TL;DR** 一段，再跑验证检查。

### TL;DR —— 一条命令部署

**Linux / macOS（bash）：**

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

**Windows（PowerShell）：**

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

复制完成后**重启 dsh web 服务器**（停掉正在运行的 `dsh web` 进程，再执行 `dsh web`），然后按下述清单验证。

### 完整步骤（精确路径）

1. **定位 DSH 主目录** —— `$DSH_HOME`（默认 `~/.dsh`，Windows 上如 `C:\Users\<用户名>\.dsh`）。
2. **把插件拷进 profile 依赖目录**。注意：`web` profile 的依赖在**上级目录**（`$DSH_HOME/profiles/node_modules/`，扁平的 hoisted 布局），不是 `profiles/web/node_modules`：
   ```bash
   cp -r dsh-archives "$DSH_HOME/profiles/node_modules/"
   ```
3. **启用插件** —— 在 `$DSH_HOME/profiles/web/cordis.patch.yml` 末尾追加（文件不存在就按下面内容新建）：
   ```yaml
   # Your patch layer for this dsh profile.
   - insert:
       - id: archives
         name: 'dsh-archives'
   ```
   `id` 是加载器行名（可自定义）；`name` **必须**与包名一致（`dsh-archives`）。
4. **重启** —— 停掉运行中的 `dsh web`，重新执行 `dsh web`，浏览器打开 `http://127.0.0.1:3080`。

### 验证清单（自己跑一遍）

```bash
# Linux/macOS
curl -s -o /dev/null -w "bundle=%{http_code}\n" http://127.0.0.1:3080/plugins/dsh-archives/client.js  # 期望 bundle=200
curl -s -o /dev/null -w "route=%{http_code}\n"  http://127.0.0.1:3080/archives/unarchive             # 期望 route=405
```

```powershell
# Windows PowerShell
(Invoke-WebRequest http://127.0.0.1:3080/plugins/dsh-archives/client.js -UseBasicParsing).StatusCode  # 200
(Invoke-WebRequest http://127.0.0.1:3080/archives/unarchive -UseBasicParsing).StatusCode              # 405
```

另外确认：服务页面源码里的 `window.__DSH_BOOT__` 包含 `dsh-archives`；侧边栏底部出现「已归档 (n)」按钮。四项全部通过才算部署成功。

### 排障（哪项失败查哪条）

- **bundle 404** → 插件不在 `$DSH_HOME/profiles/node_modules/`，或 `cordis.patch.yml` 的 `name:` 与目录/包名不一致。修正后重启。
- **路由 404/500** → host half 没加载；用 `dsh --profile web --dump-config` 确认组合配置里有 `archives` 行。
- **bundle 200 但没有按钮** → 打开浏览器控制台（F12）：组件渲染崩溃会被槽位机制**静默摘除**，控制台报错是唯一线索；再确认页面已刷新。
- **改代码不生效** → 客户端 bundle 按请求实时读取，UI 改动只需刷新页面；host 改动（`lib/index.js`）需要重启。

### 插件是什么 / 工作原理（契约）

DSH 标准**双 half** 客户端插件，无构建步骤、无第三方运行时依赖：

- `lib/index.js` —— **host half**：`POST /archives/unarchive` 通过 registry 自身的写路径（`enqueueOperation → requireState → setState`，即 `workspace.domain.global.set`）把会话从归档集合移除；该操作写 `$DSH_HOME/storages/workspace.json`、更新内存、发出 `domain/changed`，api-proxy 随后向所有客户端推送 `host/archived-sessions-changed` 帧——实时同步，重启不丢。
- `lib/client.js` —— **browser half**：注册进 `sidebar.footer.action` 槽位并渲染面板。

### 给 AI 的注意事项（要做 / 不要做）

- ✅ `window.__ModuleLoader__.load({id, ...})` 里的客户端 bundle id **必须等于** `package.json` 的 `name`。
- ✅ `useSessions` / `useWorkspaces` **必须传选择器**——引擎的 `bindSnapshotSelector` 不兜底缺省选择器（缺选择器会以 `w is not a function` 崩溃）。
- ✅ `host/archived-sessions-changed` 是**框架常量**，永远不要改名。
- ✅ 恢复流程会订阅 `ctx.workspaces.list` 等待归档集合移除该 id 后才 `open()`，避免运行时的投影清理误清新恢复的选中。
- ❌ 不要直接 `open()` 仍处于归档状态的会话——运行时会把落在归档集合里的选中立即清掉。

### 测试

```bash
node tests/smoke-test.cjs   # client：bundle 加载 → apply 注册 → SSR 渲染（9 项断言）；需要 DSH profile 里的真实 react——设置 DSH_PROFILE_NODE_MODULES
node tests/host-test.mjs    # host：路由 → 取消归档 → 幂等 → 校验；无外部依赖
```

### 已知限制

- 直接 `open()` 归档会话会被运行时清除选中（设计如此）；请用「恢复并打开」或「复制」。
- 归档会话不参与侧边栏内容搜索（框架行为）。
- 侧边栏收起（rail）模式只显示图标。
- 面板是固定定位浮层，与 Cordis 插件面板同时打开会重叠。
- 针对 dsh **0.1.0-rc.6** 开发验证。

---

## 许可

MIT，见 [LICENSE](LICENSE)。
