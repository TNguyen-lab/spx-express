import { expect, test, type Page } from '@playwright/test';

const demoUser = {
  id: 'user-1',
  name: 'Admin User',
  email: 'admin@spx.com',
  role: 'ADMIN',
};

async function mockWarehouseApis(page: Page) {
  await page.route('**/api/auth/login', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ token: 'demo-token', user: demoUser }),
    });
  });

  const dashboardResponses: Array<[string, unknown]> = [
    ['**/api/orders/orders**', { total: 3, orders: [] }],
    ['**/api/inbounds/inbounds**', { total: 2, inbounds: [] }],
    ['**/api/outbounds/outbounds**', { total: 4, outbounds: [] }],
    ['**/api/packings/packings**', { total: 1, packings: [] }],
    ['**/api/sortings/sortings**', { total: 0, sortings: [] }],
    ['**/api/shipments/shipments**', { total: 5, shipments: [] }],
    ['**/api/inventory**', { inventory: [{ quantity: 2, product: { minStock: 5 } }] }],
  ];

  for (const [url, payload] of dashboardResponses) {
    await page.route(url, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(payload),
      });
    });
  }
}

test('user can log in and land on the dashboard', async ({ page }) => {
  await mockWarehouseApis(page);
  await page.goto('/login');

  await page.getByRole('button', { name: 'admin@spx.com' }).click();
  await page.getByRole('button', { name: 'Đăng nhập' }).click();

  await expect(page).toHaveURL('/');
  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
  await expect(page.getByText('Chờ duyệt đơn đặt hàng')).toBeVisible();
  await expect(page.getByText('Đang vận chuyển')).toBeVisible();
});

test('dashboard navigation and logout work for the critical flows', async ({ page }) => {
  await mockWarehouseApis(page);
  await page.addInitScript((user) => {
    localStorage.setItem('token', 'demo-token');
    localStorage.setItem('user', JSON.stringify(user));
  }, demoUser);

  await page.goto('/');

  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
  await expect(page.getByText('Chờ nhập kho')).toBeVisible();
  await expect(page.getByRole('navigation').getByRole('link', { name: 'Nhập kho', exact: true })).toHaveAttribute('href', '/inbounds');

  await page.getByRole('navigation').getByRole('link', { name: 'Xuất kho', exact: true }).click();
  await expect(page).toHaveURL('/outbounds');

  await page.getByRole('button', { name: 'Đăng xuất' }).click();
  await expect(page).toHaveURL('/login');
});
