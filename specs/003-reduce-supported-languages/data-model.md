# Data Model: 精简支持语言范围（移除德语/日语/葡萄牙语/繁体中文）

本功能不改变数据库 schema，也不引入新的持久化实体（见 spec.md 的 Assumptions：用户生成内容不与语言字段绑定）。
涉及的"数据"均为静态配置/内容，随代码一起部署，因此本文档记录的是**配置形态**而非数据库表结构。

## 配置实体：受支持语言集合（`src/lib/language.ts`）

| 字段/常量 | 变更前 | 变更后 |
| ----------- | -------- | -------- |
| `LangKey`（联合类型） | `en \| es \| fr \| de-DE \| pt-PT \| ja \| zh \| zh-TW` | `en \| es \| fr \| zh` |
| `supportedLanguages`（数组，`{ key, name }[]`） | 8 项 | 4 项：`en`（English）、`es`（Español）、`fr`（Français）、`zh`（简体中文） |
| `defaultLanguage` | `en` | 不变（`en`） |

**校验规则（不变，依赖数组内容自动生效）**：

- `isValidLang(lang)`：`supportedKeys.includes(lang)`；集合收缩后，`de-DE`/`ja`/`pt-PT`/`zh-TW` 自动判定为无效。
- `getTargetLang(rawLang, fallback)`：`accept-language` 库仅在 `supportedKeys` 范围内匹配；不在范围内时返回调用方传入的 `fallback`（根路径固定传入 `defaultLanguage`）。

**状态转换**：

```text
[语言常量存在于 supportedLanguages] --本功能移除 de-DE/ja/pt-PT/zh-TW--> [语言常量不存在]
  → isValidLang() 对应返回 false → 所有 /{lang}/... 路由的 notFound() 守卫触发 → 标准 404
  → generateStaticParams() 不再为其生成静态页面
  → LanguageSelector 下拉框不再渲染其选项
  → getTargetLang() 不再匹配到它，回退到 defaultLanguage（en）
```

## 配置实体：翻译文案文件（`src/locales/*.json`）

| 文件 | 操作 |
|------|------|
| `en.json`、`es.json`、`fr.json`、`zh.json` | 保留，不变更内容 |
| `de-DE.json`、`ja.json`、`pt-PT.json`、`zh-TW.json` | 删除 |

`src/lib/i18n.ts` 中的 `locales: Record<LangKey, LocaleMessages>` 会因 `LangKey` 收缩而在 TypeScript 编译期自动要求移除对应的
`import`/映射条目（否则 `Record<LangKey, LocaleMessages>` 与实际提供的 key 集合不匹配，产生类型错误），起到强制清理的编译期校验作用。

## 配置实体：工具/隐私政策的多语言内容（`src/data/tools.ts`、`src/data/privacy.ts`）

这两个文件中的多语言字段（如 `name: { en, es, fr, "de-DE", "pt-PT", ja, zh, "zh-TW" }`）目前未被 `LangKey` 类型强约束为必须
覆盖全部键（否则新增语言时会破坏历史数据结构），因此移除操作不会触发编译期报错，需要通过全文搜索手动逐一删除对应字段，
详见 [research.md](./research.md) 第 4 节的清理范围盘点。

## 配置实体：日期本地化映射（`src/components/NotesTreeTable.tsx` 的 `DATE_LOCALE`）

`DATE_LOCALE: Record<LangKey, string>` 同样因 `LangKey` 收缩而在编译期自动要求移除 `de-DE`/`pt-PT`/`ja`/`zh-TW` 4 个条目。
