import { expect, test } from "@playwright/test";

test("account, private set, cards, study, edit, and logout", async ({ page }) => {
  const email = `learner-${Date.now()}@example.com`;
  await page.goto("/signup");
  await page.getByLabel("Email address").fill(email);
  await page.getByLabel("Password").fill("learning123");
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page.getByRole("heading", { name: "My study sets" })).toBeVisible();

  await page.getByRole("button", { name: "+ Create a set" }).click();
  await page.getByLabel("Set title").fill("Planet facts");
  await page.getByRole("button", { name: "Create set" }).click();
  await expect(page.getByRole("heading", { name: "Planet facts" })).toBeVisible();

  await page.getByPlaceholder("What do you want to remember?").fill("Earth");
  await page.getByPlaceholder("Write the answer in your own words").fill("Third planet from the Sun");
  await page.getByRole("button", { name: "Add card" }).click();
  await expect(page.getByText("Third planet from the Sun")).toBeVisible();

  await page.getByRole("link", { name: "Study cards" }).click();
  await expect(page.getByRole("button", { name: "Show definition" })).toContainText("Earth");
  await page.getByRole("button", { name: "Show definition" }).click();
  await expect(page.getByRole("button", { name: "Show term" })).toContainText("Third planet from the Sun");

  await page.getByRole("link", { name: /Back to Planet facts/ }).click();
  await page.getByRole("button", { name: "Edit" }).click();
  await page.getByLabel("Definition").fill("Our home planet");
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page.getByText("Our home planet")).toBeVisible();

  await page.getByRole("button", { name: "Log out" }).click();
  await expect(page.getByRole("link", { name: "Get started" })).toBeVisible();
  await page.goto("/login");
  await page.getByLabel("Email address").fill(email);
  await page.getByLabel("Password").fill("learning123");
  await page.getByRole("button", { name: "Log in" }).click();
  await expect(page.getByText("Planet facts")).toBeVisible();
});
