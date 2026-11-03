// 민원 신고는 지도에서 위치(좌표)를 지정해야 접수됩니다.
// 폼을 연 뒤 신고 위치를 지정해 두는 테스트 도우미입니다.
export async function pickReportPosition(page, { lat = '36.9912', lng = '127.9255' } = {}) {
  const form = page.locator('#report-form');
  await form.waitFor();
  await form.locator('[name=lat]').fill(String(lat));
  await form.locator('[name=lng]').fill(String(lng));
  await page.waitForFunction(() => document.querySelector('#picker-status')?.classList.contains('is-set'));
  return { lat: Number(lat), lng: Number(lng) };
}
