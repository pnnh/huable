# Bug Fix: 笔记公开阅读页面 Markdown 渲染无样式、无代码高亮

- **Slug**: markdown-style-not-rendered
- **Fixed**: 2026-09-23
- **Assessment**: ./assessment.md
- **Status**: applied

## Summary

按评估中的 Preferred 方案，注册了 `@tailwindcss/typography` 插件使 `prose` 类真正生效，并通过 `marked-highlight` + `highlight.js` 在服务端为代码块生成语法高亮 token，同步收紧 `sanitize-html` 白名单以放行高亮输出（`span`/`hljs-*`/`language-*` class）同时阻止任意 class 注入。

## Changes

| File | Change | Notes |
|------|--------|-------|
| `package.json` / `pnpm-lock.yaml` | modified | 新增依赖 `@tailwindcss/typography@^0.5.20`、`marked-highlight@^2.2.4`、`highlight.js@^11.12.0` |
| `src/app/globals.css` | modified | 新增 `@plugin "@tailwindcss/typography";`（注册插件，使 `prose` 类生效）与 `@import "highlight.js/styles/github.css";`（引入高亮主题） |
| `src/components/MarkdownContent.tsx` | modified | 改用 `new Marked(markedHighlight({...}))` 实例，在服务端渲染时用 `highlight.js` 对代码块 token 上色；`SANITIZE_OPTIONS` 新增 `span` 到 `allowedTags`/`allowedAttributes`，并新增 `allowedClasses`（`code`: `["hljs", "language-*"]`，`span`: `["hljs-*"]`）限制可通过的 class 前缀 |
| `src/components/MarkdownContent.test.tsx` | modified | 更新原有安全测试（原先断言任意 `class="lang-ts"` 会被保留，现在改为断言不在白名单内的 class 会被剥离，并新增对恶意 `<span onclick>` 的拦截断言）；新增一条测试验证围栏代码块能生成 `hljs`/`language-ts` class 及 `hljs-*` token span |

## Diff Highlights

```tsx
// src/components/MarkdownContent.tsx
const marked = new Marked(
    markedHighlight({
        emptyLangClass: "hljs",
        langPrefix: "hljs language-",
        highlight(code, lang) {
            const language = hljs.getLanguage(lang) ? lang : "plaintext";
            return hljs.highlight(code, { language }).value;
        },
    })
);
// ...
allowedTags: [..., "code", "pre", "span", ...],
allowedAttributes: { ..., span: ["class"] },
allowedClasses: {
    code: ["hljs", "language-*"],
    span: ["hljs-*"],
},
```

```css
/* src/app/globals.css */
@import "tailwindcss";
@import "highlight.js/styles/github.css";
@plugin "@tailwindcss/typography";
```

## Tests Added or Updated

- `src/components/MarkdownContent.test.tsx::sanitizes dangerous content and only allows configured tags/attrs` — 更新为断言不在白名单内的 class（`lang-ts`、`evil-tracker`）被剥离，并新增对恶意 `<span onclick>` 的拦截断言。
- `src/components/MarkdownContent.test.tsx::applies syntax highlighting classes to fenced code blocks` — 新增：验证 ```ts 围栏代码块渲染出 `code.hljs.language-ts`，且内部存在 `span[class*="hljs-"]` token。

## Local Verification

- `pnpm vitest run src/components/MarkdownContent.test.tsx` → 5 passed
- `pnpm test`（全量 vitest）→ 11 files / 56 tests passed，无回归
- `pnpm exec tsc --noEmit` → 无类型错误
- `pnpm build`（`next build`）→ 编译成功，84 页面全部生成成功
- 手动核查构建产物 CSS（`.next/static/chunks/*.css`）：修复前该文件不含任何 `.prose`/`.hljs-*` 规则；修复后包含 152 条 `.prose*` 规则及完整的 `.hljs-*` token 调色板（`hljs-keyword`、`hljs-string`、`hljs-comment` 等），证实 Typography 插件与高亮主题都已被正确打包进最终样式表。

## Deviations from Assessment

无实质偏离。评估中列为"可选"的暗色模式适配（`dark:prose-invert`）未纳入本次修复范围，已在下方 Follow-ups 中记录，与评估的 Open Questions 保持一致。

## Follow-ups

- 评估中标记的 `[NEEDS CLARIFICATION]` 暗色模式适配仍未解决：当前只引入了浅色版 `highlight.js/styles/github.css` 主题，且 `prose` 未加 `dark:prose-invert`。若后续启用暗色模式，需要补充 `dark:prose-invert` 及一份适配暗色的 highlight.js 主题（如 `github-dark.css`，配合 `prefers-color-scheme`/`[data-theme]` 切换）。
- `README.md` 中 `MarkdownContent.tsx` 一行的注释写的是 "renders Markdown with remark/rehype"，与实际实现（`marked` + `marked-highlight`）不符，属于遗留的文档漂移，建议后续单独提一个文档更新任务同步修正（未在本次修复范围内直接修改文档）。
