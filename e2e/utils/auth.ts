import type { Page } from "@playwright/test";

/**
 * 使用开发环境的模拟登录表单登录（仅 NODE_ENV=development 下 /signin 页面可用）。
 * 提交后会重定向到 /{lang}/console。
 */
export async function devSignIn(page: Page, lang: string, email: string, name?: string) {
    await page.goto(`/${lang}/signin`);
    await page.getByLabel(/email|邮箱/i).fill(email);
    if (name) {
        await page.getByLabel(/username|用户名/i).fill(name);
    }
    await page.getByRole("button", { name: /sign in|登录/i }).click();
    await page.waitForURL(`**/${lang}/console`);
}
