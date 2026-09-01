# Quickstart: 精简支持语言范围（移除德语/日语/葡萄牙语/繁体中文）验证指南

本指南用于端到端验证本功能，不包含实现代码。详细配置变更见 [data-model.md](./data-model.md)，技术决策见 [research.md](./research.md)。

## 前置条件

```bash
pnpm install
pnpm test    # 确认基线测试通过后再开始改动
```

## 场景一：语言切换下拉框只展示 4 种语言（对应 User Story 1）

```bash
pnpm dev
```

1. 打开 `http://localhost:7500/en/`，点击页头语言切换下拉框。
2. **预期**：下拉框中只出现 4 个选项——English、Français、Español、简体中文，不再出现 Deutsch、日本語、Português、繁體中文。
3. 依次切换到 `fr`、`es`、`zh`，确认页面正确跳转且文案均为对应语言，无德语/日语/葡萄牙语/繁体中文文案残留。
4. 打开工具详情页（如 `/en/tools/basex`）与隐私政策页（`/en/privacy`），重复步骤 2-3，确认这些页面同样只有 4 个语言选项。

## 场景二：已下线语言的旧 URL 返回标准 404（对应 User Story 2）

```bash
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:7500/de-DE/
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:7500/ja/tools/basex
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:7500/pt-PT/privacy
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:7500/zh-TW/channels
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:7500/xx/   # 对照组：从未支持过的语言前缀
```

**预期**：以上 5 个请求全部返回 `404`，且已下线语言与对照组 `xx` 的返回结果完全一致。

## 场景三：浏览器语言自动检测优雅降级（对应 User Story 3）

```bash
curl -s -D - -o /dev/null -H "Accept-Language: de-DE" http://localhost:7500/ | grep -i location
curl -s -D - -o /dev/null -H "Accept-Language: ja" http://localhost:7500/ | grep -i location
curl -s -D - -o /dev/null -H "Accept-Language: pt-PT" http://localhost:7500/ | grep -i location
curl -s -D - -o /dev/null -H "Accept-Language: zh-TW" http://localhost:7500/ | grep -i location
```

**预期**：`de-DE`/`ja`/`pt-PT` 的重定向目标均为 `/en/`；`zh-TW` 因与 `zh`（简体中文）共享主语言子标签，被现有 `accept-language` 库回退到 `/zh/`，不是 `/en/`（已与用户确认为预期行为）。

## 场景四：保留语言与既有功能不受影响（对应 FR-007、SC-003）

```bash
pnpm test
pnpm build
```

**预期**：

- `pnpm test` 全部通过（含更新后的 `language.test.ts`、`i18n.test.ts`、`ToolGrid.test.tsx`）。
- `pnpm build` 成功，构建输出的静态页面数量随语言数减少而下降（工具详情页、隐私政策页数量从 8 语言版本降为 4 语言版本），且不出现 TypeScript 类型错误（`LangKey`/`LocaleMessages` 收缩后的一致性由编译期检查保证）。

## 验证通过标准

以上四个场景全部符合预期，即视为本功能实现满足 spec.md 的 Success Criteria（SC-001 ～ SC-004）。
