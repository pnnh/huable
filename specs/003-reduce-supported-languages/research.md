# Research: 精简支持语言范围（移除德语/日语/葡萄牙语/繁体中文）

## 1. 语言路由与静态生成机制现状

**Decision**: 确认 `src/lib/language.ts` 的 `supportedLanguages`（及派生的 `LangKey` 联合类型）是唯一的语言集合权威来源；`LanguageSelector.tsx`（下拉框选项）、`[lang]/layout.tsx`、`privacy/page.tsx`、`tools/[tool]/page.tsx` 的 `generateStaticParams`、根路径 `page.tsx` 的 `getTargetLang` 自动检测均直接遍历/查询该数据源，未硬编码语言列表。因此只需收缩 `src/lib/language.ts` 中的常量与数组，其余路由生成与 UI 入口会自动收敛为 4 种语言，无需逐个修改。

**Rationale**: 避免在多处重复维护语言集合，验证了"改一处、处处生效"的现状架构，符合精准手术式修改原则（Constitution III）。

**Alternatives considered**: 逐个页面硬编码移除已下线语言的分支判断 — 拒绝，因为现状本就是数据驱动，额外分支属于不必要的复杂度。

## 2. 已下线语言旧 URL 的处理

**Decision**: 不新增任何重定向或自定义错误页面逻辑。各 `/{lang}/...` 页面组件已在入口处执行 `if (!isValidLang(lang)) notFound();`；一旦 `de-DE`/`ja`/`pt-PT`/`zh-TW` 从 `LangKey`/`supportedLanguages` 中移除，`isValidLang` 对这 4 个值自动返回 `false`，触发 Next.js 标准 404，与访问任意其他不支持的语言前缀（如 `/xx/`）完全一致。

**Rationale**: 与 Clarify 阶段确认的"返回标准 404，不做重定向"结论完全吻合，且零新增代码，符合简洁优先原则（Constitution IV）。

**Alternatives considered**: 新增 301 重定向中间件 — 已在 Clarify 阶段被用户否决，不再重复评估。

## 3. 浏览器语言自动检测的降级行为

**Decision**: 不修改 `getTargetLang`/`acceptLanguage.languages(supportedKeys)` 的实现。该函数已通过 `accept-language` 库的 `.get()` 匹配，若匹配结果不在 `supportedKeys` 中则返回调用方传入的 `fallback`（根路径 `page.tsx` 传入 `defaultLanguage`，即 `en`）。语言集合收缩后，`de-DE`/`ja`/`pt-PT`/`zh-TW` 自动不再出现在 `supportedKeys` 中，因此这 4 种浏览器偏好语言会自然回退到英语，无需额外分支。

**Rationale**: 现状实现已经是"未匹配到支持语言则回退默认语言"的通用逻辑，天然覆盖 FR-006/US3，无需新增代码。

**Alternatives considered**: 为这 4 种已下线语言单独编写显式回退映射（如 de-DE→en 硬编码规则）— 拒绝，因为通用回退机制已完全覆盖该需求，属于不必要的冗余实现。

## 4. 待清理内容的范围盘点

**Decision**: 需要清理的位置汇总（通过 `grep` 全仓库确认）：

- `src/lib/language.ts`：`langDe`/`langPt`/`langJa`/`langZhTW` 常量、`LangKey` 联合类型分支、`supportedLanguages` 数组条目。
- `src/lib/i18n.ts`：`deDe`/`ptPt`/`ja`/`zhTW` 的 import 与 `locales` 映射条目。
- `src/locales/de-DE.json`、`ja.json`、`pt-PT.json`、`zh-TW.json`：整个文件删除。
- `src/data/tools.ts`：每个工具条目（`name`/`description`/`features`/`detail` 等）中对应 4 种语言的字段。
- `src/data/privacy.ts`：对应 4 种语言的内容块。
- `src/components/NotesTreeTable.tsx`：`DATE_LOCALE` 映射中的 4 个条目。
- 测试：`src/lib/language.test.ts`、`src/lib/i18n.test.ts`、`src/components/ToolGrid.test.tsx` 中引用这 4 种语言的断言/测试数据。
- `README.md`："8 languages" 相关描述更新为 4 种。

**Rationale**: 通过全仓库 `grep` 而非凭经验猜测，确保覆盖完整，避免遗漏导致 TypeScript 类型报错（`LocaleMessages` 结构不一致）或运行时引用不存在的 JSON 文件。

**Alternatives considered**: 无（这是穷举式盘点，非设计选择）。

## 5. 与项目宪法（constitution.md）的冲突处理

**Decision**: 本功能与 `constitution.md`「技术栈与依赖约束」章节中"支持 8 种语言"的表述冲突。按 plan.md 的 Constitution Check 记录，本次实现照常推进，冲突记录在 Complexity Tracking 中，实现完成后作为独立收尾项运行 `/speckit.constitution` 做 MINOR 版本修订。

**Rationale**: 用户已通过显式的 `/speckit.specify` 请求授权此次变更（满足 Constitution 第 VI 条"经明确授权"的例外），治理文档修订与功能代码实现分属不同性质的变更，不强行耦合在同一工作流中。

**Alternatives considered**: 先阻塞本计划、要求用户先修订宪法 — 拒绝，因为会增加不必要的流程摩擦，且用户意图已经明确、无歧义。
