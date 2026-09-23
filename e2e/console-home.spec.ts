import { test, expect } from "@playwright/test";
import { devSignIn } from "./utils/auth";

test.describe("控制台首页", () => {
    test("未登录访问 /en/console 会跳转到登录页", async ({ page }) => {
        await page.goto("/en/console");
        await expect(page).toHaveURL(/\/en\/signin$/);
        await expect(page.getByRole("heading", { name: "Developer Sign In" })).toBeVisible();
        await expect(page.getByLabel("Email")).toBeVisible();
    });

    test("开发环境模拟登录后可正常访问控制台首页", async ({ page }) => {
        const email = `e2e-${Date.now()}@example.com`;
        const name = "E2E Tester";

        await devSignIn(page, "en", email, name);

        await expect(page).toHaveURL(/\/en\/console$/);
        await expect(page.getByRole("heading", { name: "Console" })).toBeVisible();

        // 欢迎信息中包含登录用户名，并链接到个人资料页
        const profileLink = page.getByRole("link", { name });
        await expect(profileLink).toBeVisible();
        await expect(profileLink).toHaveAttribute("href", "/en/console/profile");

        // 退出登录链接
        await expect(page.getByRole("link", { name: "Sign out" })).toBeVisible();

        // 频道数 / 笔记数统计卡片（用 main 限定范围，避免与顶部导航的同名链接冲突）
        const main = page.locator("main");
        await expect(main.getByText("Channels", { exact: true })).toBeVisible();
        await expect(main.getByText("Notes", { exact: true })).toBeVisible();

        // 管理入口按钮
        await expect(page.getByRole("link", { name: "Manage Channels" })).toBeVisible();
        await expect(page.getByRole("link", { name: "Manage Notes" })).toBeVisible();

        await expect(page.locator("header")).toBeVisible();
        await expect(page.locator("footer")).toBeVisible();
    });
});
