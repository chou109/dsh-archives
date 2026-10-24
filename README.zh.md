# dsh-archives — 已退役（被 DSH 0.2 内置功能取代）

[English](README.md) | 中文

> **状态：已退役。** DeepSeek Harness 0.2 已在 `@deepseek-ai/dsh-client-ui-workspace`
> 中内置完整的会话归档功能。本插件**不再适配** 0.2.x，也不应安装到 0.2.x 上；仅作为
> DSH 0.1.x 的历史参考保留。

## 为什么退役

`dsh-archives` 存在的原因是 DSH 0.1.0-rc.6 没有取消归档的 RPC，也没有查看归档会话的界面。它提供了：

- 侧边栏底部的“已归档”入口与数量角标；
- 按工作区分组列出归档会话的面板；
- `POST /archives/unarchive`，通过工作区注册表自身的写入路径实现取消归档。

DSH 0.2.1-rc.2 已原生提供这些能力：

| 需求 | 0.2.x 内置能力 |
|---|---|
| 归档会话 | 会话行菜单 → **归档**；有任务运行时弹出“停止并归档”对话框 |
| 查看归档 | 视图选项 → **全部会话** / **仅已归档** |
| 恢复 | 行菜单或搜索结果里的 **取消归档** |
| 从归档 Fork | 归档行仍保留 **Fork** |
| 实时刷新 | 工作区 follow 流（`workspaceController.follow`） |
| 编程接口 | 客户端 `ctx.workspaces.archiveSession/unarchiveSession`，宿主 `ctx.workspaceRegistry.archiveSession/unarchiveSession` |

再加一套归档界面只会与内置功能重复，并可能造成状态不一致，因此 0.2 迁移到此为止。

## 应该怎么做

- 直接使用内置归档功能，无需安装任何插件。
- 如果需要自定义归档视图，请基于官方 slot（`sidebar.workspaces` 的视图选项）以及公开的 `uiWorkspace` / `workspaces` 服务实现，不要直接写工作区注册表。

## 历史用法（仅 DSH 0.1.x）

0.1.x 的完整安装步骤、验证清单与宿主路由说明见本文件的 git 历史。`lib/` 下的源码保持原样，可作为那个版本的可用参考。

## 许可证

MIT。
