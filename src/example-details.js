// Concept stories for the design; user-created descriptions are kept separately.
const descriptions = {
 r1: ['충주역을 이용하는 이웃을 위해 편히 쉴 수 있는 공간과 편의시설을 함께 생각해 봅니다.', 'Imagine more comfortable waiting areas and amenities for people using Chungju Station.'],
 r2: ['마을 진입로의 어두운 구간을 더 안전하게 걸을 방법을 함께 살펴봅니다.', 'Consider ways to make a dark village entrance road safer to walk along.'],
 r3: ['야간 교차로에서 보행자와 운전자가 안전하게 이동할 수 있는 방법을 생각해 봅니다.', 'Consider how pedestrians and drivers can travel safely through an intersection at night.'],
 r4: ['터미널에서 시내버스를 기다리는 시간과 더 편리한 이동 방법을 함께 살펴봅니다.', 'Explore how bus waiting times and travel from the terminal could be improved.'],
 r5: ['학생들이 지나는 통학로 주변의 안전한 보행 환경을 함께 생각해 봅니다.', 'Explore safer walking conditions along a route used by students.'],
 r6: ['강변 산책로를 깨끗하고 편안하게 이용할 수 있는 방법을 살펴봅니다.', 'Consider ways to keep a riverside path clean and comfortable.'],
 r7: ['시장 주변을 방문할 때 주차 공간을 편리하게 이용할 방법을 생각해 봅니다.', 'Consider more convenient parking options around the market area.'],
 r8: ['충주천 산책로의 보행 환경과 안전하게 걷는 방법을 함께 살펴봅니다.', 'Explore a safer walking environment along the Chungjucheon path.'],
 r9: ['호암지 산책로에서 밤에도 안심하고 걸을 수 있는 조명을 생각해 봅니다.', 'Consider lighting that would help people feel safer on the Hoamji path at night.']
};
export function exampleDetail(id, language) { return descriptions[id]?.[language === 'en' ? 1 : 0] || ''; }
