// 문구만 번역하며 신고 ID, 필터 값, 입력한 내용은 변경하지 않습니다.
const translations = {
 '우리 동네 이야기 지도':'Neighborhood story map',
 '지금 주목받는 이야기':'Stories people care about',
 '공감 모집 중 TOP 3':'TOP 3 open for support',
 '공감 TOP 3':'Top 3','다른 상태':'Other statuses','지도에서 보기':'View on map',

 '공감이 모이는 이야기':'Stories gathering support',
 '우리 동네에서 관심을 받고 있는 신고를 만나보세요.':'Discover the issues your community cares about.',
 '회차 보기':'View rounds','안내':'Note','예시 안내':'Example data',
 '아래 순위는 이 기기의 예시·테스트 데이터로 계산돼요. 시청에 자동 전달되지 않습니다.':'Rankings use example and test data on this device. Nothing is automatically sent to City Hall.',
 '지금 가장 공감하는 신고':'Most supported right now',
 '공감 모집 중인 신고의 누적 공감 순위입니다.':'Open reports ranked by their total accumulated support.',
 '공감 모집 중인 신고가 없습니다.':'There are no reports open for support.',
 '한눈에 보는 공감 순위':'Community support ranking',
 '마음이 닿은 신고에 공감을 더해 주세요.':'Show support for the issues that matter to you.',
 '전체 신고':'All reports','공감':'Support',
 '신고의 변화를 살펴봐요':'Follow report progress',
 '목소리가 모인 이후의 단계를 한눈에 확인하세요.':'See the example stages at a glance.',
 '이 기기의 예시와 테스트 신고':'Examples and test reports on this device',
 '함께 관심을 모으는 이야기':'Stories gathering support','처리 완료':'Resolved',
 '예시 상태 기준':'Based on example statuses','단계별 신고 보기':'Browse by stage',
 '단계를 선택하면 해당 신고만 모아볼 수 있어요.':'Select a stage to see matching reports.',
 '신고 보러가기 →':'View reports →','진행 상황':'Progress',
 '표시된 단계는 테스트 신고의 상태이며 실제 처리 이력이 아닙니다.':'This is the test report status, not an actual processing history.',
 '표시된 단계는 예시 신고의 상태이며 실제 처리 이력이 아닙니다.':'This is an example status, not an actual processing history.',
 '현재 단계':'Current stage','단계 안내':'Stage',
 '내 프로필':'My profile','게스트로 로그인':'Guest sign in','표시명 변경':'Change display name',
 '어떻게 불러드릴까요?':'What should we call you?','반가워요, 충주 이웃님!':'Welcome, Chungju neighbor!',
 '이 기기에서 사용할 이름을 정해 주세요.':'Choose a name to use on this device.',
 '실제 계정 인증이 아닌 이 브라우저의 게스트 세션입니다. 비밀번호나 개인정보를 입력하지 마세요.':'This is a local guest session, not account authentication. Do not enter passwords or personal information.',
 '이 브라우저에서 로그인 유지':'Keep me signed in on this browser',
 '체크하지 않으면 브라우저 탭을 닫을 때 로그아웃됩니다.':'If unchecked, the session ends when this browser tab is closed.',
 '변경사항 저장':'Save changes','게스트로 시작하기':'Continue as a guest',
 '로그아웃해도 이 기기의 신고와 공감 기록은 삭제되지 않습니다.':'Signing out does not delete reports or support on this device.',
 '이 브라우저의 게스트':'Guest on this browser',
 '실제 계정이 아니며 다른 기기와 연동되지 않습니다.':'This is not a real account and does not sync across devices.',
 '나의 활동은 이 기기에 보관돼요':'Your activity stays on this device',
 '표시명과 관계없이 같은 브라우저의 신고와 공감 기록을 함께 사용합니다.':'Reports and support are shared on this browser regardless of display name.',
 '로그아웃':'Sign out','표시명을 변경했어요.':'Display name updated.',
 '게스트 세션에서 로그아웃했어요. 데이터는 이 기기에 남아 있어요.':'Signed out of the guest session. Data remains on this device.',
 '게스트로 시작했지만 브라우저 설정 때문에 로그인 상태가 유지되지 않을 수 있어요.':'Guest session started, but browser settings may prevent it from persisting.',

 '충주시민이 함께 만드는 생활불편 개선 플랫폼':'A better Chungju, built together by its residents',
 '충주잇다':'Chungju Itda','충주잇다 홈':'Chungju Itda home','시민 생활불편 공감신고':'Community issue reports',
 '민원지도':'Issue map','공감순위':'Top supported','처리현황':'Status','자료조사':'Resources','이용안내':'How it works',
 '닫기':'Close','글자 크기 키우기':'Increase text size','기본 글자 크기':'Default text size',
 '글자 크기를 키웠습니다.':'Text size increased.','기본 글자 크기입니다.':'Default text size restored.',
 '테스트 환경':'Test environment',
 '신고와 공감은 이 기기에만 저장돼요.':'Reports and support are saved only on this device.',
 '내용 복사':'Copy text','자동 복사가 차단되었습니다. 아래 내용을 직접 선택해 복사해 주세요.':'Automatic copying was blocked. Select and copy the text below.',
 '마감 결과는 브라우저에만 저장되었습니다.':'Results are stored only in this browser.',
 '주 메뉴':'Main menu','민원 목록':'Issue list','로그인':'Guest profile','민원 신고':'New report','언어 선택':'Language',
 '브라우저 모의 집계':'Local simulation','모의 마감까지':'Ends in','회차 보기 →':'Rounds →',
 '시청에 자동 전달되지 않습니다.':'Nothing is automatically sent to City Hall.', '집계 기간':'Period',
 '우리 동네를 더 좋게':'A better neighborhood','작은 불편을 잇고, 함께 변화를 만들어요.':'Small voices can create meaningful change.',
 '불편을 함께 나눠요':'Share a local issue',
 '건':' reports',
 '전체 이야기':'All reports','공감 모집 중':'Open for support','나의 관심':'Saved',
 '동네, 장소, 키워드 검색':'Search neighborhood, place or keyword','검색':'Search','카테고리 필터':'Category filter',
 '전체':'All','가로등':'Streetlights','신호등':'Traffic lights','시내버스':'City buses','보도·도로':'Sidewalks & roads',
 '주차':'Parking','안전·유해환경':'Safety','청결':'Cleanliness','공공시설':'Public facilities',
 '전체 상태':'All statuses','공감모집':'Open for support','시청전달':'Sent to City Hall (example)','처리중':'In progress (example)','처리완료':'Resolved (example)',
 '처리 상태':'Status','정렬':'Sort','공감순':'Most supported','최신순':'Newest',
 '관심 신고':'Saved','내 신고':'My reports','내 공감':'My support','시민 공감 민원':'Community reports',
 '카드를 눌러 지도에서 확인하세요':'Select a card to see it on the map','자세히 보기':'View details',
 '관심 신고 저장':'Save report','관심 해제':'Remove saved report','목록':'List','지도':'Map',
 '충주시 민원 지도':'Chungju issue map','위치는 예시이며 실제 신고 지점과 다를 수 있습니다':'Example locations may differ from actual locations',
 '지도 확대':'Zoom in','지도 축소':'Zoom out','충주시 중심으로 이동':'Return to central Chungju',
 '처리 현황':'Other statuses','지도를 불러올 수 없어요':'Unable to load the map','지도를 준비하고 있어요':'Preparing the map',
 '실제 지도 데이터를 불러오고 있습니다.':'Loading map data.','잠시만 기다려 주세요.':'Please wait.',
 '다시 시도':'Try again','목록과 공감 기능은 계속 이용할 수 있어요.':'The list and support features are still available.',
 '지도 데이터에 연결하지 못했습니다. 인터넷 연결이나 브라우저의 콘텐츠 차단 설정을 확인하고 다시 시도해 주세요.':'Could not connect to the map. Check your internet connection or content blocker and try again.',
 '지도 제공 서비스가 요청을 제한했습니다. 잠시 후 다시 시도해 주세요.':'The map provider limited requests. Please try again later.',
 '지도 응답이 지연되고 있습니다. 인터넷 연결을 확인하고 다시 시도해 주세요.':'The map is taking too long to respond. Check your connection and try again.',
 '지도를 시작하지 못했습니다. 브라우저의 WebGL 지원과 인터넷 연결을 확인하고 다시 시도해 주세요.':'Could not start the map. Check WebGL support and your connection.',
 '표시할 신고가 없어요':'No reports to show','다른 검색어나 필터로 다시 찾아보세요.':'Try a different search or filter.','필터 초기화':'Clear filters',
 '시민의 공감이 모여 우리 동네를 바꿉니다.':'Community support can make our neighborhoods better.',
 '공감 모집 중인 신고의 상위 3건을 보여드립니다. 현재 데이터는 예시이며 실제 시청에 전달되지 않습니다.':'Top three open reports by support. These examples are not sent to City Hall.',
 '전체 공감 순위':'All reports by support','시민의 목소리가 어떻게 이어지는지 확인해보세요.':'See how community issues are progressing.',
 '표시된 처리 상태는 서비스 이용을 위한 예시입니다. 실제 민원 접수 및 처리 현황이 아닙니다.':'These statuses are examples, not actual official cases.','전체 민원':'All reports',
 '더 나은 충주를 위한 자료를 함께 살펴보세요.':'Explore resources for a better Chungju.','01 / 지역 정보':'01 / LOCAL INFORMATION',
 '충주시를 알아보세요':'Get to know Chungju','충주시의 정책과 생활 정보를 확인하고 지역 문제를 살펴볼 수 있습니다.':'Explore local policies, services and community issues.',
 '충주시청 바로가기 ↗':'Chungju City Hall ↗','02 / 공공 데이터':'02 / OPEN DATA','데이터로 살펴보기':'Explore public data',
 '공공데이터포털에서 교통, 안전, 환경 등과 관련된 공개 자료를 찾아보세요.':'Find public data on transportation, safety and the environment.',
 '공공데이터포털 바로가기 ↗':'Public Data Portal ↗','03 / 시민 제안':'03 / PUBLIC PETITIONS','공식 민원 접수':'Submit an official petition',
 '행정기관의 답변이나 처리가 필요하다면 공식 민원 창구를 이용해 주세요.':'For an official response or action, use an official petition channel.','국민신문고 바로가기 ↗':'e-People ↗',
 '작은 불편을 이야기하고, 함께 공감해요.':'Share local issues and support each other.','동네의 불편을 찾아요':'Find local issues',
 '민원지도에서 동네, 장소, 키워드로 검색하거나 카테고리를 선택해 보세요.':'Search the map by neighborhood, place or keyword, or choose a category.',
 '마음에 공감을 더해요':'Show your support','공감하는 신고의 하트 버튼을 눌러주세요. 같은 브라우저에서는 한 번만 공감할 수 있어요.':'Tap the heart to support a report. You can support each report once per browser.',
 '새로운 이야기를 남겨요':'Share an issue','민원 신고 버튼으로 불편을 작성하세요. 지금은 이 브라우저에만 저장되는 테스트 신고입니다.':'Use New report to describe an issue. Test reports are saved only in this browser.',
 '꼭 확인해 주세요.':'Please note','충주잇다는 공식 민원 접수 창구가 아닙니다. 긴급 상황은 119 또는 112, 일반 민원은 110 또는 국민신문고를 이용해 주세요.':'Chungju Itda is not an official petition channel. In an emergency call 119 or 112; for general inquiries call 110 or use e-People.',
 '개인정보처리방침':'Privacy policy','이용약관':'Terms of use','충주시청 ↗':'Chungju City Hall ↗','안전신문고 ↗':'Safety Report ↗','국민신문고 ↗':'e-People ↗',
 '시민의 일상을 잇다':'Connecting our community','충주잇다는 시민 참여 플랫폼이며 공식 민원 접수 창구가 아닙니다.':'Chungju Itda is a civic participation platform, not an official petition service.',
 '문의':'Contact','긴급 신고 119 · 112':'Emergency: 119 · 112','일반 민원 상담 110':'General inquiries: 110',
 '우리의 작은 관심이':'Small acts of care','더 나은 충주를 만듭니다.':'make a better Chungju.',
 '게스트로 참여하기':'Join as a guest','공감과 신고에 사용할 이름을 정해주세요.':'Choose a name for your support and reports.',
 '별도의 회원가입 없이 이 브라우저에 저장됩니다.':'It is saved in this browser; no account is required.','게스트 표시명':'Guest display name','표시명을 입력해 주세요':'Enter a display name','저장하기':'Save',
 '우리 동네의 불편을 자세히 알려주세요.':'Tell us about an issue in your neighborhood.',
 '테스트 신고는 이 브라우저에만 저장되며 시청에 접수되지 않습니다.':'Test reports are saved only in this browser and are not submitted to City Hall.',
 '카테고리':'Category','카테고리를 선택해 주세요':'Choose a category','제목':'Title','어떤 불편이 있나요?':'What is the issue?',
 '상세 내용':'Details','불편한 상황을 자세히 적어주세요':'Describe the issue in detail','위치 설명':'Location description','예: 충주시 호암동 호암지 산책로':'e.g. Hoamji walking path, Chungju',
 '지도에서 위치 지정':'Choose a location','지도를 눌러 위치를 선택해 주세요':'Tap the map to set the location',
 '신고 위치 선택 지도':'Map for choosing the report location','지도를 불러오는 중이에요. 아래 좌표를 직접 입력할 수도 있어요.':'Loading the map. You can also enter coordinates below.',
 '지도를 불러오지 못했어요. 아래 좌표를 직접 입력해 주세요.':'Could not load the map. Enter coordinates below.',
 '위도':'Latitude','경도':'Longitude','기본 좌표는 충주시 중심입니다. 저장 전 실제 위치를 확인하세요.':'Default location is central Chungju. Please check before saving.',
 '기본 좌표는 현재 지도 중심입니다. 저장 전 실제 위치를 확인하세요.':'Default location is the map center. Please check before saving.',
 '기본 좌표는 기존 신고 위치입니다. 저장 전 실제 위치를 확인하세요.':'The existing report location is selected. Please check before saving.',
 '사진':'Photo','선택 · 1MB 이하':'Optional · up to 1MB','사진은 이 브라우저에만 저장됩니다.':'Photos are stored only in this browser.',
 '새 사진을 선택하지 않으면 기존 사진이 유지됩니다.':'The existing photo is kept unless you choose a new one.','선택한 신고 사진 미리보기':'Selected report photo preview',
 '테스트 신고 저장하기':'Save test report','수정 내용 저장':'Save changes','테스트 신고 수정':'Edit test report',
 '신고 상세':'Report details','테스트 신고':'Test report','테스트':'Test','지도 보기':'View on map','신고 내용 복사':'Copy report',
 '☆ 관심 저장':'☆ Save','★ 관심 저장됨':'★ Saved','신고 내용':'Description',
 '시민들이 공감한 생활불편 예시입니다. 상세 내용은 제공되지 않았습니다.':'This is an example community issue. No further details are available.',
 '이 신고와 처리 상태는 이해를 돕기 위한 예시입니다. 실제 접수 내역이 아닙니다.':'This report and status are examples, not official records.',
 '이 브라우저에 저장된 테스트 신고입니다. 실제 민원으로 접수되지 않았습니다.':'This test report is saved in this browser. It has not been officially submitted.',
 '신고 수정':'Edit report','신고 삭제':'Delete report','나의 메모':'My notes','다른 사람에게 공유되지 않고 이 브라우저에만 저장됩니다.':'Private notes are saved only in this browser.',
 '이 신고에 대한 메모를 남겨보세요.':'Add a private note about this report.','나만 볼 수 있는 메모를 입력하세요':'Write a private note','저장':'Save','삭제':'Delete','메모 삭제':'Delete note',
 '시민 공감 회차':'Community round','LOCAL SIMULATION · 모의 운영':'LOCAL SIMULATION',
 '현재 브라우저에서만 집계됩니다. 시청에 접수되거나 전달되지 않습니다.':'Results exist only in this browser and are not sent to City Hall.',
 '모의 마감까지 · 한국시간 기준':'Until the simulated deadline · Korea time','시작':'Start','종료':'End','현재 공감 TOP 3':'Current top 3',
 '공감모집 상태의 누적 공감 수 기준':'Based on total support for open reports','집계 내용 복사':'Copy results','다음 모의 회차 기간':'Next simulated round duration',
 '모의 회차 지금 종료':'End simulation now','브라우저가 열려 있을 때 또는 다음에 열 때 종료를 기록합니다. 기간 변경은 다음 회차부터 적용됩니다. 종료 후 상위 3건이 이 브라우저에만 보관되며 실제 전달은 하지 않습니다.':'The round closes while this page is open or when you next visit. Duration changes apply to the next round. Results stay in this browser and are not sent anywhere.',
 '종료된 모의 회차':'Past simulated rounds','아직 종료된 회차가 없습니다.':'No completed rounds yet.','집계 대상 신고가 없습니다.':'No eligible reports.',
 '회차 저장이 차단되어 새로고침 후 유지되지 않을 수 있어요.':'Round storage is blocked; changes may not persist.',
 '저장 공간이 부족하거나 사용할 수 없습니다. 브라우저 저장 설정을 확인해주세요.':'Storage is unavailable or full. Check your browser settings.',
 '다음 모의 회차 기간을 저장했어요.':'Next-round duration saved.','모의 회차가 종료되었습니다. 시청에는 전달되지 않았습니다.':'Simulation ended. Nothing was sent to City Hall.',
 '모의 회차가 종료되어 상위 신고를 기록했습니다. 시청에는 전달되지 않았습니다.':'The simulated round ended and results were saved locally. Nothing was sent to City Hall.',
 '이미 공감한 신고입니다.':'You have already supported this report.','공감해 주셔서 감사합니다.':'Thank you for your support.',
 '관심 신고에 저장했어요.':'Report saved.','관심 신고에서 삭제했어요.':'Report removed from saved items.',
 '테스트 신고가 저장되었습니다.':'Test report saved.','테스트 신고가 수정되었습니다.':'Test report updated.','테스트 신고를 삭제했어요.':'Test report deleted.',
 '나의 메모가 저장되었습니다.':'Private note saved.','메모를 삭제했어요.':'Note deleted.','내용을 복사했어요.':'Copied.',
 '표시명을 입력해 주세요.':'Please enter a display name.','필수 항목과 올바른 위치 좌표를 입력해 주세요.':'Complete all required fields and enter valid coordinates.',
 '1MB 이하의 이미지 파일을 선택해 주세요.':'Please choose an image no larger than 1MB.','사진 미리보기가 준비될 때까지 기다려 주세요.':'Please wait for the photo preview.',
 '지도를 먼저 연결해 주세요.':'Please connect to the map first.','지도를 불러온 후 위치를 확인할 수 있어요.':'The location will be available when the map loads.',
 '이 테스트 신고를 삭제할까요? 이 브라우저에서 복구할 수 없습니다.':'Delete this test report? It cannot be recovered in this browser.',
 '현재 모의 회차를 지금 종료하고 상위 3건을 이 브라우저에 기록할까요? 시청에는 전달되지 않습니다.':'End this simulated round now and save the top three in this browser? Nothing will be sent to City Hall.',
 '이 테스트 서비스는 회원가입 서버를 운영하지 않습니다. 게스트 이름, 공감 기록, 테스트 신고와 사진은 사용자의 브라우저 localStorage에 저장됩니다.':'This test service has no account server. Guest names, support, test reports and photos are stored in your browser.',
 '브라우저 데이터를 삭제하면 기록이 삭제됩니다. 민감한 개인정보를 입력하지 마세요.':'Clearing browser data removes these records. Do not enter sensitive personal information.',
 '충주잇다는 시민 참여를 위한 테스트 플랫폼이며 공식 민원 접수 창구가 아닙니다. 게시된 예시와 처리 상태는 실제 접수 내역이 아닙니다.':'Chungju Itda is a test platform, not an official petition service. The examples and statuses are not actual submissions.',
 '타인의 권리를 침해하는 내용이나 개인정보를 작성하지 말아 주세요. 실제 처리가 필요한 신고는 공식 민원 창구를 이용하세요.':'Do not submit personal information or infringe others’ rights. Use an official channel when action is needed.',
 '새로 지은 충주역사에 편의시설이 없어요':'The new Chungju Station lacks amenities',
 '외곽 마을 길 가로등 깨진 채 방치':'Broken streetlight left on a village road',
 '밤 10시 이후 꺼지는 교차로 신호등':'Intersection traffic lights turn off after 10 p.m.',
 '터미널 출발 시내버스 배차간격이 너무 깁니다':'Long waits between buses leaving the terminal',
 '통학로 주변 유해업소 밀집으로 학생 안전 우려':'Student safety concerns near the school route',
 '달천강변 쓰레기 무단투기 방치':'Dumped waste left along the Dalcheon riverbank',
 '구 중앙어울림시장 무료주차장 폐쇄로 주차난':'Parking shortage after the market lot closed',
 '성서동 충주천 인도 보도블록 파손':'Damaged paving along the Chungju stream path',
 '호암지 산책로 가로등 여러 개 꺼짐':'Several lights are out on the Hoamji walking path',
 '봉방동 충주역':'Chungju Station, Bongbang-dong','주덕읍 마을 진입로':'Village entrance, Judeok-eup',
 '대소원면 교차로':'Intersection, Daesowon-myeon','칠금동 충주공용버스터미널 앞':'Chungju bus terminal, Chilgeum-dong',
 '지현동 통학로 일대':'School route, Jihyeon-dong','달천동 달천강변':'Dalcheon riverbank, Dalcheon-dong',
 '성서동 구 중앙어울림시장 부지':'Former Jungang market site, Seongseo-dong','성서동 충주천 산책로':'Chungju stream path, Seongseo-dong',
 '호암동 호암지 산책로':'Hoamji walking path, Hoam-dong',
};

export function translateText(value, language = 'ko') {
 if (language !== 'en' || !value) return value;
 const raw=String(value); const text=raw.trim(); if(!text)return raw;
 let result=translations[text];
 if (!result) {
  let match;
  if ((match=text.match(/^제 (\d+)회 시민 공감$/))) result=`Community round ${match[1]}`;
  else if ((match=text.match(/^(.*?)님, 반가워요!$/))) result=`Welcome, ${match[1]}!`;
  else if ((match=text.match(/^제 (\d+)회$/))) result=`Round ${match[1]}`;
  else if ((match=text.match(/^(\d+)위$/))) result=`#${match[1]}`;
  else if ((match=text.match(/^공감 (\d+)위$/))) result=`Top ${match[1]}`;
  else if ((match=text.match(/^(\d+)일 (\d+)시간 (\d+)분 (\d+)초$/))) result=`${match[1]}d ${match[2]}h ${match[3]}m ${match[4]}s`;
  else if ((match=text.match(/^(\d+)일$/))) result=`${match[1]} days`;
  else if ((match=text.match(/^총 (\d+)건$/))) result=`${match[1]} reports`;
  else if ((match=text.match(/^(\d+)건 참여 중$/))) result=`${match[1]} open reports`;
  else if ((match=text.match(/^(.*) 자세히 보기$/))) result=`View ${translateText(match[1],language)} details`;
  else if ((match=text.match(/^(\d+)건 표시$/))) result=`${match[1]} shown`;
  else if ((match=text.match(/^공감 ([\d,]+)$/))) result=`Support ${match[1]}`;
  else if ((match=text.match(/^([\d,]+) 공감$/))) result=`${match[1]} support`;
  else if ((match=text.match(/^(.*) 공감 ([\d,]+)건$/))) result=`${translateText(match[1],language)}: ${match[2]} supports`;
  else if ((match=text.match(/^(.*) 위치 보기$/))) result=`View ${translateText(match[1],language)} on map`;
  else if ((match=text.match(/^(.*) 관련 (예시|신고) 사진$/))) result=`${translateText(match[1],language)} ${match[2]==='예시'?'example':'report'} photo`;
  else if (text.includes(' · ')) result=text.split(' · ').map(part=>translateText(part,language)).join(' · ');
 }
 if(!result) return raw;
 return raw.replace(text,result);
}

export function translateElement(root, language) {
 if(language!=='en'||!root)return;
 const translateNode=node=>{
  if(node.nodeType===Node.TEXT_NODE){
   const parent=node.parentElement;
   if(!parent||parent.closest('[data-no-translate], textarea, script, style, .maplibregl-ctrl-attrib'))return;
   const next=translateText(node.nodeValue,language);if(next!==node.nodeValue)node.nodeValue=next;
  } else if(node.nodeType===Node.ELEMENT_NODE){
   if(node.closest('[data-no-translate], .maplibregl-ctrl-attrib'))return;
   for(const attr of ['placeholder','aria-label','alt','title']){const value=node.getAttribute(attr);if(value){const next=translateText(value,language);if(next!==value)node.setAttribute(attr,next);}}
  }
 };
 translateNode(root);
 const walker=document.createTreeWalker(root,NodeFilter.SHOW_ELEMENT|NodeFilter.SHOW_TEXT);while(walker.nextNode())translateNode(walker.currentNode);
}
