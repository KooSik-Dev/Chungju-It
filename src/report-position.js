// 민원 신고는 지도에서 고른 위치(좌표)가 있어야 저장됩니다.
// 화면 검증과 저장 직전 검증이 같은 규칙을 쓰도록 한곳에 모았습니다.
export const POSITION_MESSAGE = '민원 접수를 위해 지도에서 신고 위치를 먼저 지정해 주세요.';

const hasValue = value => value !== null && value !== undefined && String(value).trim() !== '';

export function validReportPosition(lat, lng) {
  if (!hasValue(lat) || !hasValue(lng)) return false;
  const la = Number(lat), ln = Number(lng);
  return Number.isFinite(la) && Number.isFinite(ln) && la >= 33 && la <= 39 && ln >= 124 && ln <= 132;
}

export function positionFrom(value) {
  const lat = value?.lat, lng = value?.lng;
  if (!validReportPosition(lat, lng)) return null;
  return { lat: Number(lat), lng: Number(lng) };
}

// 저장 단계(서버 요청 직전)에서도 같은 규칙으로 막습니다.
export function assertReportPosition(value) {
  const position = positionFrom(value);
  if (!position) throw new Error(POSITION_MESSAGE);
  return position;
}
