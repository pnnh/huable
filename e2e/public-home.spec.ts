import { test, expect } from "@playwright/test";

test.describe("公开首页", () => {
    test("访问 / 会重定向到受支持语言的首页", async ({ page }) => {
        await page.goto("/");
        await expect(page).toHaveURL(/\/(en|es|fr|zh)\/?$/);
        await expect(page.getByRole("heading", { level: 1 })).toHaveText("Huable");
    });

    test("/en 首页关键内容正常渲染", async ({ page }) => {
        await page.goto("/en");

        // 顶部导航
        const header = page.locator("header");
        await expect(header.getByRole("link", { name: "Huable" })).toBeVisible();
        await expect(header.getByRole("link", { name: "Home" })).toBeVisible();
        await expect(header.getByRole("link", { name: "Channels" })).toBeVisible();

        // 页面标题与搜索框
        await expect(page.getByRole("heading", { level: 1, name: "Huable" })).toBeVisible();
        await expect(page.getByPlaceholder("Search notes…")).toBeVisible();

        // 笔记列表或空状态提示二选一必须可见
        const emptyState = page.getByText("No published notes yet.");
        const noteLinks = page.locator("main ul li a").first();
        await expect(emptyState.or(noteLinks)).toBeVisible();

        await expect(page.locator("footer")).toBeVisible();
    });

    test("/zh 首页以简体中文关键内容正常渲染", async ({ page }) => {
        await page.goto("/zh");

        const header = page.locator("header");
        await expect(header.getByRole("link", { name: "首页" })).toBeVisible();
        await expect(header.getByRole("link", { name: "频道" })).toBeVisible();

        await expect(page.getByPlaceholder("搜索笔记…")).toBeVisible();

        const emptyState = page.getByText("暂无已发布笔记。");
        const noteLinks = page.locator("main ul li a").first();
        await expect(emptyState.or(noteLinks)).toBeVisible();
    });

    test("访问不支持的语言返回 404", async ({ page }) => {
        const response = await page.goto("/xx");
        expect(response?.status()).toBe(404);
    });
});
