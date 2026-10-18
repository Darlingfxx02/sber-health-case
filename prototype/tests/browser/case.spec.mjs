import { test, expect } from "@playwright/test";

test("late iframe load recovers automatically and preserves the current intro scene", async ({
  page,
}) => {
  let release;
  const blocked = new Promise((resolve) => (release = resolve));
  await page.route("**/app.bundle.*.js", async (route) => {
    await blocked;
    await route.continue();
  });
  await page.goto("", { waitUntil: "domcontentloaded" });
  await page
    .getByRole("button", { name: "Следующий этап", exact: true })
    .click();
  await page.waitForTimeout(6500); // Reproduces the former hard six-second failure.
  await expect(page.locator(".case-error")).toBeHidden();
  release();
  await expect(
    page.getByRole("button", { name: "Исследовать макет", exact: true }),
  ).toBeEnabled();
  await expect(page.locator("#case")).toHaveAttribute(
    "data-scene",
    "hypotheses",
  );
  await expect(page.locator(".demo-gesture-layer")).toHaveCount(1);
});

test("tour, free prototype and pulse periods work with one persistent iframe", async ({
  page,
}) => {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("");
  await expect(
    page.getByRole("button", { name: "Исследовать макет", exact: true }),
  ).toBeEnabled();
  const frame = page.locator("iframe");
  await frame.evaluate((node) => (node.dataset.testIdentity = "original"));
  for (let i = 0; i < 3; i++)
    await page
      .getByRole("button", { name: "Следующий этап", exact: true })
      .click();
  await expect(page.locator(".demo-gesture-layer")).toHaveCount(0);
  await page
    .getByRole("button", { name: "Исследовать макет", exact: true })
    .click();
  const app = page.frameLocator("iframe");
  await app.getByRole("tab", { name: "Виджеты", exact: true }).click();
  await app.locator(".pulse-tile").click();
  for (const name of ["Неделя", "Месяц", "Год", "День"]) {
    await app.getByRole("button", { name, exact: true }).click();
    await expect(
      app.getByRole("button", { name, exact: true }),
    ).toHaveAttribute("aria-pressed", "true");
  }
  await app.getByRole("button", { name: "Назад", exact: true }).click();
  await expect(app.locator(".pulse-panel")).toHaveCount(0);
  await page.getByRole("button", { name: "К кейсу", exact: true }).click();
  await expect(frame).toHaveAttribute("data-test-identity", "original");
  expect(errors).toEqual([]);
});

test("music uses small PCM buffers, reverses, resumes and stops on close", async ({
  page,
}) => {
  await page.addInitScript(() => {
    window.decodedAudioLengths = [];
    const decode = AudioContext.prototype.decodeAudioData;
    AudioContext.prototype.decodeAudioData = function (...args) {
      return decode.apply(this, args).then((buffer) => {
        window.decodedAudioLengths.push(buffer.duration);
        return buffer;
      });
    };
  });
  await page.goto("");
  await page.getByRole("button", { name: "Читать", exact: true }).click();
  const player = page.locator(".agent-epilogue");
  await expect(player).toHaveAttribute("data-phase", "open");
  await expect(player).toHaveAttribute("data-audio-playing", "true");
  await page.waitForTimeout(8500); // Cross a real eight-second audio chunk boundary.
  await expect(player).toHaveAttribute("data-audio-playing", "true");
  await page.locator(".agent-crawl-window").press("PageDown");
  await page.locator(".agent-crawl-window").press("ArrowUp");
  await expect(player).toHaveAttribute("data-audio-direction", "-1");
  await expect(player).toHaveAttribute("data-audio-direction", "1", {
    timeout: 6000,
  });
  const lengths = await page.evaluate(() => window.decodedAudioLengths);
  expect(lengths.length).toBeGreaterThan(0);
  expect(Math.max(...lengths)).toBeLessThan(8.1);
  await page
    .getByRole("button", { name: "Закрыть титры", exact: true })
    .click();
  await expect(player).not.toBeVisible();
  await expect(player).toHaveAttribute("data-audio-playing", "false");
});
