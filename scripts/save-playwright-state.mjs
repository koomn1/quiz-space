import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline/promises';
import { chromium } from '@playwright/test';

const baseURL = (process.env.PLAYWRIGHT_BASE_URL || 'https://koomn1.github.io/quiz-space/').replace(/\/?$/, '/');
const profileId = process.env.E2E_PROFILE_ID;
const outputPath = process.env.PLAYWRIGHT_STORAGE_STATE || 'playwright/.auth/profile.json';

fs.mkdirSync(path.dirname(outputPath), { recursive: true });

const browser = await chromium.launch({ headless: false });
const context = await browser.newContext({ locale: 'ar-EG', colorScheme: 'light' });
const page = await context.newPage();
await page.goto(profileId ? new URL(`#/profile/${profileId}`, baseURL).toString() : baseURL, { waitUntil: 'domcontentloaded' });

const prompt = readline.createInterface({ input: process.stdin, output: process.stdout });
await prompt.question('سجّل الدخول بحساب الاختبار في النافذة المفتوحة، ثم اضغط Enter هنا لحفظ الجلسة: ');
await prompt.close();

await context.storageState({ path: outputPath });
await browser.close();
console.log(`Saved Playwright storage state to ${outputPath}`);
