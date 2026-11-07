export async function chooseOption(page, field, label) {
  await field.click();
  await page.getByRole('option', { name: label, exact: true }).click();
}

export async function chooseDate(page, field, day) {
  await field.click();
  const calendar = page.locator('.date-picker-menu');
  if (!day) return calendar.getByRole('button', { name: 'Clear date', exact: true }).click();
  const month = day.slice(0, 7);
  for (let attempts = 0; attempts < 2400; attempts++) {
    const shown = await calendar.locator('[data-calendar-month]').getAttribute('data-calendar-month');
    if (shown === month) return calendar.locator(`button[data-value="${day}"]`).click();
    await calendar.getByRole('button', { name: shown > month ? 'Previous month' : 'Next month', exact: true }).click();
  }
  throw new Error(`Could not navigate the date picker to ${day}.`);
}
