export const categories = ['전체','가로등','신호등','시내버스','보도·도로','주차','안전·유해환경','청결','공공시설'];
export const statuses = ['전체 상태','공감모집','시청전달','처리중','처리완료'];
// 좌표는 안내를 위한 지역 대표 위치이며, 실제 신고 지점을 의미하지 않습니다.
export const initialReports = [
 {id:'r1',category:'공공시설',status:'시청전달',title:'새로 지은 충주역사에 편의시설이 없어요',location:'봉방동 충주역',likes:412,image:'station.jpg',lat:36.975991,lng:127.909171},
 {id:'r2',category:'가로등',status:'공감모집',title:'외곽 마을 길 가로등 깨진 채 방치',location:'주덕읍 마을 진입로',likes:342,image:'streetlight.jpg',lat:36.9754,lng:127.7796},
 {id:'r3',category:'신호등',status:'공감모집',title:'밤 10시 이후 꺼지는 교차로 신호등',location:'대소원면 교차로',likes:298,image:'traffic.jpg',lat:36.9701,lng:127.8226},
 {id:'r4',category:'시내버스',status:'공감모집',title:'터미널 출발 시내버스 배차간격이 너무 깁니다',location:'칠금동 충주공용버스터미널 앞',likes:276,image:'bus.jpg',lat:36.98199,lng:127.91457},
 {id:'r5',category:'안전·유해환경',status:'공감모집',title:'통학로 주변 유해업소 밀집으로 학생 안전 우려',location:'지현동 통학로 일대',likes:251,image:'school.jpg',lat:36.9563,lng:127.9347},
 {id:'r6',category:'청결',status:'처리중',title:'달천강변 쓰레기 무단투기 방치',location:'달천동 달천강변',likes:233,image:'river.jpg',lat:36.9552,lng:127.9008},
 {id:'r7',category:'주차',status:'공감모집',title:'구 중앙어울림시장 무료주차장 폐쇄로 주차난',location:'성서동 구 중앙어울림시장 부지',likes:189,image:'parking.jpg',lat:36.9723,lng:127.9364},
 {id:'r8',category:'보도·도로',status:'처리완료',title:'성서동 충주천 인도 보도블록 파손',location:'성서동 충주천 산책로',likes:156,image:'sidewalk.jpg',lat:36.9693,lng:127.9391},
 {id:'r9',category:'가로등',status:'공감모집',title:'호암지 산책로 가로등 여러 개 꺼짐',location:'호암동 호암지 산책로',likes:134,image:'streetlight.jpg',lat:36.962431,lng:127.9218675}
];
export const imageFor = {'가로등':'streetlight.jpg','신호등':'traffic.jpg','시내버스':'bus.jpg','보도·도로':'sidewalk.jpg','주차':'parking.jpg','안전·유해환경':'school.jpg','청결':'river.jpg','공공시설':'station.jpg'};

// Migrate only unmodified default coordinates; never overwrite user-created reports.
const oldSeedCoordinates = {
 r1: [36.9718, 127.9121],
 r4: [36.9789, 127.9251],
 r9: [36.9508, 127.9294]
};
export function correctSeedCoordinates(report) {
 const old = oldSeedCoordinates[report.id];
 const seed = old && initialReports.find(item => item.id === report.id);
 if (!old || !seed || report.test || report.lat !== old[0] || report.lng !== old[1]) return report;
 return { ...report, lat: seed.lat, lng: seed.lng };
}
