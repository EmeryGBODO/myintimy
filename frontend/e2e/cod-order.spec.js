import { expect, test } from "@playwright/test";
import { adminEmail, adminPassword, apiBaseUrl } from "./env.mjs";

function pickSellableProduct(items) {
  for (const product of items) {
    if (product.category?.slug === "couple") continue;
    const variant = product.variants?.find((item) => item.in_stock && item.available_quantity >= 1);
    if (variant) return { product, variant };
  }
  throw new Error("Le seed ne contient aucun produit vendable hors catégorie couple.");
}

async function gotoApp(page, url) {
  await page.goto(url, {
    waitUntil: "domcontentloaded",
    timeout: 30_000,
  });
}

async function transitionOrder(page, orderId, label, expectedStatus) {
  page.once("dialog", (dialog) => dialog.accept("Recette E2E Myintimy"));
  const responsePromise = page.waitForResponse(
    (response) => response.url().includes(`/api/v1/admin/orders/${orderId}/status`)
      && response.request().method() === "PATCH",
  );
  await page.getByRole("button", { name: label, exact: true }).click();
  const response = await responsePromise;
  expect(response.ok()).toBeTruthy();
  const payload = await response.json();
  expect(payload.status).toBe(expectedStatus);
  await expect(page.getByText(label, { exact: true }).first()).toBeVisible();
}

test("COD : catalogue → panier → checkout → admin → préparation → expédition → livraison", async ({ page, request }) => {
  // Les polices Google ne font pas partie du comportement métier testé.
  // Les bloquer évite qu'un proxy/VPN/pare-feu d'entreprise retarde l'événement window.load.
  await page.route("https://fonts.googleapis.com/**", (route) => route.abort());
  await page.route("https://fonts.gstatic.com/**", (route) => route.abort());

  const catalogResponse = await request.get(`${apiBaseUrl}/products?limit=200`);
  expect(catalogResponse.ok()).toBeTruthy();
  const catalog = await catalogResponse.json();
  const { product, variant } = pickSellableProduct(catalog.items);
  const initialStock = variant.stock_quantity;

  // Ne pas attendre une URL catalogue précise : CatalogProvider peut modifier pagination/paramètres.
  // La preuve utile est le rendu de la fiche produit réelle.
  await gotoApp(page, `/#/produit/${encodeURIComponent(product.public_id)}`);
  await expect(
    page.getByRole("heading", { name: product.name, level: 1 }),
  ).toBeVisible({ timeout: 30_000 });

  if (variant.color?.name) {
    await page.getByRole("button", { name: variant.color.name, exact: true }).click();
  }
  if (variant.size?.code) {
    await page.getByRole("button", { name: variant.size.code, exact: true }).click();
  }

  await page.getByRole("button", { name: "Ajouter au panier", exact: true }).click();
  await expect(page.getByRole("complementary", { name: "Panier" })).toBeVisible();
  await page.getByRole("link", { name: "Commander", exact: true }).click();

  await page.getByLabel("Prénom et nom").fill("Client Recette E2E");
  await page.getByLabel("Téléphone").fill("+22997000001");
  await page.getByLabel("E-mail (facultatif)").fill("client-e2e@myintimy.local");
  await page.getByLabel("Ville").selectOption({ label: "Cotonou" });
  await page.getByLabel("Quartier").fill("Ganhi");
  await page.getByLabel("Adresse ou point de repère").fill("Recette automatique Myintimy");
  const codPayment = page.getByRole("radio", { name: /^Paiement à la livraison/ });
  await expect(codPayment).toBeVisible();
  await expect(codPayment).toBeChecked();

  const orderResponsePromise = page.waitForResponse(
    (response) => response.url().endsWith("/api/v1/orders") && response.request().method() === "POST",
  );
  await page.getByRole("button", { name: /^Confirmer ·/ }).click();
  const orderResponse = await orderResponsePromise;
  expect(orderResponse.status()).toBe(201);
  const order = await orderResponse.json();

  expect(order.status).toBe("confirmed");
  expect(order.payment_method).toBe("cash_on_delivery");
  expect(order.items).toHaveLength(1);
  expect(order.items[0].variant_id).toBe(variant.id);
  await expect(page.getByText("Commande enregistrée", { exact: true })).toBeVisible();
  await expect(page.getByText(order.reference, { exact: true })).toBeVisible();

  // Le panier doit être vidé seulement après la création réussie de la commande.
  // Checkout conserve volontairement l'état `order` pour afficher la confirmation ; un simple
  // changement de hash vers la même route peut donc garder cet écran en mémoire.
  await expect.poll(
    async () => page.evaluate(() => {
      try {
        return JSON.parse(window.localStorage.getItem("myi-cart") || "[]").length;
      } catch {
        return -1;
      }
    }),
    { message: "Le panier local doit être vidé après la création réussie de la commande." },
  ).toBe(0);

  await gotoApp(page, "/#/commande");
  await page.reload({ waitUntil: "domcontentloaded", timeout: 30_000 });
  await expect(page.getByRole("heading", { name: "Votre panier est vide" })).toBeVisible();

  // Administration réelle via l'interface, avec cookie HttpOnly + CSRF gérés par l'application.
  await gotoApp(page, "/#/admin/login");
  await page.getByLabel("Email").fill(adminEmail);
  await page.getByLabel("Mot de passe").fill(adminPassword);
  const loginResponsePromise = page.waitForResponse(
    (response) => response.url().endsWith("/api/v1/admin/auth/login") && response.request().method() === "POST",
  );
  await page.getByRole("button", { name: "Se connecter", exact: true }).click();
  const loginResponse = await loginResponsePromise;
  expect(loginResponse.ok()).toBeTruthy();
  const loginPayload = await loginResponse.json();
  expect(loginPayload.access_token).toBeTruthy();

  await gotoApp(page, "/#/admin/orders");
  await page.getByText("Commandes", { exact: true }).first().waitFor();
  await page.getByLabel("Recherche").fill(order.reference);
  await expect(page.getByRole("link", { name: order.reference, exact: true })).toBeVisible();
  await page.getByRole("link", { name: order.reference, exact: true }).click();

  await expect(page.getByText(order.reference, { exact: true }).first()).toBeVisible();
  await expect(page.getByText("Confirmée", { exact: true }).first()).toBeVisible();
  await transitionOrder(page, order.id, "Préparation", "preparing");
  await transitionOrder(page, order.id, "Expédiée", "shipped");
  await transitionOrder(page, order.id, "Livrée", "delivered");

  // Vérifications serveur finales avec le Bearer explicite retourné par le login admin.
  const headers = { Authorization: `Bearer ${loginPayload.access_token}` };
  const finalOrderResponse = await request.get(`${apiBaseUrl}/admin/orders/${order.id}`, { headers });
  expect(finalOrderResponse.ok()).toBeTruthy();
  const finalOrder = await finalOrderResponse.json();
  expect(finalOrder.status).toBe("delivered");
  expect(finalOrder.history.map((item) => item.to_status)).toEqual(
    expect.arrayContaining(["confirmed", "preparing", "shipped", "delivered"]),
  );

  const productAfterResponse = await request.get(`${apiBaseUrl}/products/${encodeURIComponent(product.public_id)}`);
  expect(productAfterResponse.ok()).toBeTruthy();
  const productAfter = await productAfterResponse.json();
  const variantAfter = productAfter.variants.find((item) => item.id === variant.id);
  expect(variantAfter).toBeTruthy();
  expect(variantAfter.stock_quantity).toBe(initialStock - 1);
  expect(variantAfter.reserved_quantity).toBe(0);

  const movementsResponse = await request.get(`${apiBaseUrl}/admin/variants/${variant.id}/movements`, { headers });
  expect(movementsResponse.ok()).toBeTruthy();
  const movements = await movementsResponse.json();
  expect(movements).toEqual(expect.arrayContaining([
    expect.objectContaining({
      movement_type: "order_shipment",
      quantity_delta: -1,
      reference: order.reference,
    }),
  ]));
});
