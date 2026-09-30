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

  await page.getByPlaceholder("What do you want to remember?").fill("Mars");
  await page.getByPlaceholder("Write the answer in your own words").fill("Fourth planet from the Sun");
  await page.getByRole("button", { name: "Add card" }).click();
  await expect(page.getByText("Fourth planet from the Sun")).toBeVisible();
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Delete", exact: true }).click();
  await expect(page.getByText("Fourth planet from the Sun")).toHaveCount(0);

  await page.getByPlaceholder("What do you want to remember?").fill("Jupiter");
  await page.getByPlaceholder("Write the answer in your own words").fill("Fifth planet from the Sun");
  await page.getByRole("button", { name: "Add card" }).click();

  await page.goto("/");
  await expect(page.getByRole("heading", { name: "My study sets" })).toBeVisible();
  await page.getByRole("link", { name: /Planet facts/ }).click();

  await page.getByRole("link", { name: "Study cards" }).click();
  await expect(page.getByRole("button", { name: "Show definition" })).toContainText("Earth");
  await page.getByRole("button", { name: "Show definition" }).click();
  await expect(page.getByRole("button", { name: "Show term" })).toContainText("Third planet from the Sun");

  await page.getByRole("link", { name: /Back to Planet facts/ }).click();
  await page.getByRole("button", { name: "Edit" }).click();
  await page.getByLabel("Definition").fill("Our home planet");
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page.getByText("Our home planet")).toBeVisible();

  await page.getByRole("link", { name: "Learn mode" }).click();
  await page.getByRole("button", { name: "Our home planet" }).click();
  await expect(page.getByText("Correct — now type it.")).toBeVisible();
  await page.getByRole("button", { name: "Type the answer" }).click();
  await page.reload();
  await expect(page.getByText("Step 2 / Write")).toBeVisible();
  await page.getByLabel("Your answer").fill("our home planet");
  await page.getByRole("button", { name: "Check answer" }).click();
  await expect(page.getByText("Correct — card learned!")).toBeVisible();
  await page.getByRole("button", { name: "Next card" }).click();
  await expect(page.getByRole("heading", { name: "Jupiter" })).toBeVisible();
  await page.getByRole("link", { name: "Back to set" }).click();

  await page.getByRole("button", { name: "Make public" }).click();
  await expect(page.getByRole("link", { name: /View public page/ })).toBeVisible();

  await page.getByRole("button", { name: "Log out" }).click();
  await expect(page.getByRole("link", { name: "Get started" })).toBeVisible();
  await page.getByRole("link", { name: "Explore" }).click();
  await page.getByLabel("Search public sets").fill("Planet facts");
  await page.getByRole("button", { name: "Search" }).click();
  await page.getByRole("link", { name: /Planet facts/ }).click();
  await expect(page.getByRole("button", { name: "Show definition" })).toContainText("Earth");
  await page.getByRole("button", { name: "Show definition" }).click();
  await expect(page.getByRole("button", { name: "Show term" })).toContainText("Our home planet");

  await page.goto("/login");
  await page.getByLabel("Email address").fill(email);
  await page.getByLabel("Password").fill("learning123");
  await page.getByRole("button", { name: "Log in" }).click();
  await expect(page.getByText("Planet facts")).toBeVisible();
  await page.getByRole("link", { name: /Planet facts/ }).click();
  await page.getByRole("button", { name: "Make private" }).click();
  await expect(page.getByText("Only you can see and study these cards.")).toBeVisible();
});
