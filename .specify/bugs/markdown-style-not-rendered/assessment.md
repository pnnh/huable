# Bug Assessment: 笔记公开阅读页面 Markdown 渲染无样式、无代码高亮

- **Slug**: markdown-style-not-rendered
- **Created**: 2026-09-23
- **Source**: pasted text
- **Verdict**: valid
- **Severity**: medium

## Report（原文）

> 我发现在类似/en/notes/CfJ5YN5nSb7w234MwkrG8笔记公开阅读页面，原本通过marked渲染的markdown格式笔记，没有正确渲染样式。仅仅是将markdown格式转换成了HTML，但是完全不会显示格式化的样式信息，也没有源代码高亮等内容。分析原因，给出解决方案。

## Symptom

笔记公开阅读页（`/{lang}/notes/[id]`，如 `/en/notes/CfJ5YN5nSb7w234MwkrG8`）中，`marked` 正确地把 Markdown 转成了 HTML 标签（`<h1>`、`<ul>`、`<pre><code>` 等），但页面上看不到任何排版样式（标题大小、列表缩进、引用块、表格边框、代码块背景等），代码块也没有语法高亮着色。预期：标题、列表、引用、表格、代码块应有清晰的视觉层级，代码块应有语法高亮。

## Reproduction

1. 打开任意已发布（`approved`）笔记的公开阅读页，例如 `/en/notes/CfJ5YN5nSb7w234MwkrG8`。
2. 笔记正文中包含标题、列表、代码块等 Markdown 语法。
3. 观察渲染结果：HTML 结构正确（可在 DevTools 中看到 `<h1>`/`<pre><code class="language-xxx">` 等标签），但视觉上与纯文本几乎无异，代码块内没有 token 高亮。

## Suspected Code Paths

- [src/components/MarkdownContent.tsx:37-45](src/components/MarkdownContent.tsx#L37-L45) — 用 `marked.parse()` 生成 HTML 后经 `sanitize-html` 过滤，再包一层 `className="prose max-w-none ..."` 并 `dangerouslySetInnerHTML` 注入。样式完全依赖 Tailwind Typography 插件生成的 `.prose` 系列工具类。
- [src/app/globals.css:1](src/app/globals.css#L1) — 只有 `@import "tailwindcss";`，**没有** `@plugin "@tailwindcss/typography";`（Tailwind v4 加载插件的方式）。
- [package.json](package.json) — `dependencies`/`devDependencies` 中不存在 `@tailwindcss/typography` 包，`marked` (`^18.0.4`) 和 `sanitize-html` (`^2.17.4`) 存在，但没有任何语法高亮相关依赖（`marked-highlight`、`highlight.js`、`prismjs`、`shiki` 均未安装），也没有对应的高亮主题 CSS。
- [src/app/[lang]/notes/[id]/page.tsx:51](src/app/[lang]/notes/[id]/page.tsx#L51) 与 [src/app/[lang]/channels/[id]/page.tsx:41](src/app/[lang]/channels/[id]/page.tsx#L41) — 两处均直接复用 `MarkdownContent`，因此频道简介页也受到同样影响。

## Root Cause Hypothesis

**信心：高。**

两个独立但同时生效的问题共同导致了症状：

1. **`.prose` 类是"死"的工具类**：`MarkdownContent.tsx` 给渲染容器加了 Tailwind Typography 插件提供的 `prose` 类，但项目既没有安装 `@tailwindcss/typography`，也没有在 `globals.css` 里通过 `@plugin "@tailwindcss/typography";`（Tailwind v4 的插件注册方式）启用它。Tailwind v4 是按需生成 CSS 的，没有注册插件时 `prose`/`prose-lg` 等类不会生成任何样式规则，浏览器只应用极少的默认 UA 样式，于是标题、列表、引用块、表格、代码块等在视觉上和普通文本几乎没有区别——这正是"HTML 转换正确但完全没有格式化样式"的直接原因。测试文件 [MarkdownContent.test.tsx:21](src/components/MarkdownContent.test.tsx#L21) 中断言 `div` 拥有 `prose` class，但这只验证了类名存在，没有验证该类名产生了实际样式，因而测试没能发现问题。

2. **从未集成语法高亮**：`marked` 从 v5 起移除了内置的 `highlight` 选项，需要显式接入 `marked-highlight` 扩展并配合 `highlight.js`/`prismjs`/`shiki` 等库才能对代码块 token 上色，并且还需要引入对应的高亮主题 CSS。当前代码里 `marked.parse(content)` 是裸调用，没有配置任何高亮扩展，`sanitize-html` 的白名单也只允许 `code`/`pre` 的 `class` 属性透传（用于承载 `language-xxx` class），但没有任何东西真正生成 token 级别的 `<span class="hljs-...">` 或对应 CSS，所以代码块最多只是等宽字体的纯文本块，没有配色。

## Proposed Remediation

**Preferred：**

1. 安装 `@tailwindcss/typography` 并在 [globals.css](src/app/globals.css) 顶部加入 `@plugin "@tailwindcss/typography";`（紧跟 `@import "tailwindcss";` 之后），使 `MarkdownContent.tsx` 中已经在用的 `prose`/`prose max-w-none` 类真正生效，恢复标题层级、列表、引用块、表格、链接等排版样式。可选：为暗色模式追加 `dark:prose-invert`（若站点后续支持暗色主题）。
2. 为代码块接入语法高亮：安装 `marked-highlight` + 一个轻量高亮器（推荐 `highlight.js`，与现有 `marked` v18 兼容良好），在 `MarkdownContent.tsx` 中通过 `marked.use(markedHighlight({ ... }))` 在服务端渲染阶段直接生成带 `hljs-*` token class 的 HTML，再引入一份 highlight.js 主题 CSS（全局引入或按需引入到 `globals.css`）。
3. 同步检查 `sanitize-html` 的 `SANITIZE_OPTIONS`：目前 `allowedAttributes.code`/`pre` 只允许 `class`，若 highlight.js 的输出结构里 token 是 `<span class="hljs-keyword">` 等，需要确认 `span` 标签及其 `class` 属性在白名单中（当前 `allowedTags` 里**没有 `span`**，会被 sanitize-html 直接剥离，需要追加 `span` 到 `allowedTags` 并在 `allowedAttributes` 里为 `span` 放开 `class`）。

**Alternatives（可选）：**

- 用 `rehype-highlight`/`rehype-pretty-code` 搭配 `remark`/`rehype` 管线替换 `marked`（README 中 `src/components/MarkdownContent.tsx` 的注释写的是"renders Markdown with remark/rehype"，与实际用 `marked` 的实现不一致，说明该组件可能是从 remark/rehype 迁移到 marked 时遗漏了收尾工作）。如果团队倾向统一到 remark 生态，可以借此机会一并替换，但改动面更大，需要单独确认范围。
- 不引入完整的 highlight.js 主题，仅用少量自定义 CSS 给 `pre code` 加背景色/等宽字体，作为不依赖第三方主题包的轻量方案，但没有真正的语法着色。

**Files likely to change**：
- `src/app/globals.css`（注册 `@tailwindcss/typography` 插件，可能新增高亮主题 CSS 引入）
- `src/components/MarkdownContent.tsx`（接入 `marked-highlight` + highlighter，调整 `SANITIZE_OPTIONS` 放行 `span`/`class`）
- `package.json` / `pnpm-lock.yaml`（新增 `@tailwindcss/typography`、`marked-highlight`、`highlight.js` 依赖）
- `src/components/MarkdownContent.test.tsx`（补充断言）

**Tests to add or update**：
- 断言代码块渲染出的 `<code>`/`<span>` 携带语法高亮 class（如 `hljs-keyword`），验证高亮扩展被正确调用。
- 断言 `sanitize-html` 放行 `span.hljs-*` 之后仍然拦截恶意 `<script>`/`on*` 属性（回归现有安全测试）。
- 若引入 `dark:prose-invert` 或其他 `prose` 修饰符，补充对 `className` 组合的快照/DOM 断言。
- 建议补充一个"视觉冒烟"性质的检查：确认 `.prose h1` 等选择器在构建产物 CSS 中确实存在规则（可通过构建后检查生成的 CSS 文件是否包含 `.prose` 相关规则，防止插件配置回归）。

## Risks & Considerations

- 引入 Tailwind Typography 的 `.prose` 默认样式会同时影响所有使用 `MarkdownContent` 的页面（笔记详情页 + 频道详情页的简介），需要人工检查是否与现有 `max-w-none`、页面留白等样式冲突。
- `sanitize-html` 白名单新增 `span`/`class` 后要确保不会意外放行恶意注入的 class（如利用 CSS 做 UI 伪装攻击）；建议限制 `span` 的 `class` 仅允许 `hljs-` 前缀（`sanitize-html` 的 `allowedClasses` 选项可配合正则实现）。
- 新增 `highlight.js` 之类依赖会增加 bundle/构建产物体积，公开阅读页是 SSR（`dynamic = "force-dynamic"`），高亮在服务端完成不会增加客户端 JS 体积，但要确认没有引入客户端 bundle。
- README 中对 `MarkdownContent.tsx` 的描述（"renders Markdown with remark/rehype"）与实现不符，修复时如未选择替换 remark/rehype 方案，建议顺带提醒（不在本次修复范围内直接修改文档，除非被要求）。

## Open Questions

- [NEEDS CLARIFICATION: 是否需要支持暗色模式下的 `prose-invert`？当前 `globals.css` 已有 `prefers-color-scheme: dark` 变量，但 `MarkdownContent` 组件未做暗色适配。]
- [NEEDS CLARIFICATION: 语法高亮主题偏好（light/dark、具体配色方案）由谁决定？]
