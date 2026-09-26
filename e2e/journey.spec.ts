import { expect, test } from "@playwright/test";

/** Export Letterboxd minimal : cinq films bien notés, reconnus par le TMDB factice. */
const RATINGS = [
  "Date,Name,Year,Letterboxd URI,Rating",
  "2025-01-01,Les Évadés,1994,https://boxd.it/1,5",
  "2025-01-02,Le Parrain,1972,https://boxd.it/2,4.5",
  "2025-01-03,Les Affranchis,1990,https://boxd.it/3,4.5",
  "2025-01-04,Inception,2010,https://boxd.it/4,4",
  "2025-01-05,Heat,1995,https://boxd.it/5,4",
].join("\n");

test("inscription, import d'un export Letterboxd, puis recommandations", async ({ page }) => {
  const email = `e2e-${Date.now()}@watchnext.test`;

  // 1. Inscription : on arrive sur l'import.
  await page.goto("/register");
  await page.getByLabel("Prénom (optionnel)").fill("Camille");
  await page.getByLabel("Email").fill(email);
  await page.locator('input[name="password"]').fill("un-mot-de-passe-de-test");
  await page.getByRole("button", { name: "Créer mon compte" }).click();
  await expect(page).toHaveURL(/\/import/);

  // 2. Import complet : on dépose ratings.csv et on lance l'import.
  await page.getByRole("tab", { name: /Import complet/ }).click();
  await page.locator('input[type="file"]').setInputFiles({
    name: "ratings.csv",
    mimeType: "text/csv",
    buffer: Buffer.from(RATINGS, "utf8"),
  });
  await page.getByRole("button", { name: "Lancer l'import" }).click();
  await expect(page.getByText(/recommandations prêtes/)).toBeVisible({ timeout: 60_000 });

  // 3. Accueil : un film à l'affiche sur son ticket, avec sa raison et sa plateforme.
  await page.goto("/dashboard");
  const feature = page.locator("section[aria-label^='Ta séance']");
  await expect(feature.getByText("Ta séance", { exact: true })).toBeVisible();
  await expect(feature.getByText(/Parce que tu as aimé/)).toBeVisible();
  await expect(feature.getByText(/Netflix/)).toBeVisible();
  await expect(page.getByRole("heading", { name: /Le programme/i })).toBeVisible();

  // 4. En anglais, les titres et les raisons suivent.
  await page.context().addCookies([{ name: "wn_locale", value: "en", url: page.url() }]);
  await page.reload();
  await expect(page.getByText(/Because you liked/).first()).toBeVisible();
});
