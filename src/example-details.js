// 실제 민원 내용이 아닌 예시 설명입니다.
const descriptions = {
 r1: ['새로 지어진 충주역을 이용할 때 시민들이 쉴 수 있는 공간과 편의시설이 부족하다는 의견을 담은 예시입니다.', 'An example of concerns about a lack of waiting areas and amenities at the new Chungju Station.'],
 r2: ['마을 진입로에 있는 가로등이 파손된 상태로 방치되어 야간 통행이 불편하다는 내용을 담은 예시입니다.', 'An example about a broken streetlight on a village entrance road making travel difficult at night.'],
 r3: ['밤 10시 이후 신호등이 꺼지는 교차로에서 보행자와 운전자의 안전이 우려된다는 내용을 담은 예시입니다.', 'An example about pedestrian and driver safety at an intersection where traffic lights turn off after 10 p.m.'],
 r4: ['터미널 앞에서 시내버스를 기다리는 시간이 길어 이동에 불편을 겪는다는 내용을 담은 예시입니다.', 'An example about long waiting times for city buses at the terminal.'],
 r5: ['학생들이 다니는 통학로 주변 환경을 살펴보고 안전한 보행 여건을 마련해 달라는 예시입니다.', 'An example asking for a safer environment along a route used by students.'],
 r6: ['달천강변에 버려진 쓰레기로 산책과 주변 환경 관리에 불편이 있다는 내용을 담은 예시입니다.', 'An example about discarded waste affecting the riverside environment and walking paths.'],
 r7: ['구 시장 부지의 무료 주차장 폐쇄 이후 주변 주차 공간이 부족하다는 의견을 담은 예시입니다.', 'An example about limited parking after the former market parking lot closed.'],
 r8: ['충주천 산책로의 파손된 보도블록 때문에 보행에 불편이 있다는 내용을 담은 예시입니다.', 'An example about damaged paving blocks affecting pedestrians on a streamside path.'],
 r9: ['호암지 산책로의 여러 조명이 켜지지 않아 야간 산책이 불편하다는 내용을 담은 예시입니다.', 'An example about several unlit lamps along the Hoamji walking path.']
};
export function exampleDetail(id, language) { return descriptions[id]?.[language === 'en' ? 1 : 0] || ''; }
