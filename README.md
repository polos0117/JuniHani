# JuniHani — 아이들 주간 계획

아이별로 병원, 어린이집 등 주간 일정을 정리하고 PNG 이미지로 저장하는 웹앱입니다. 일정 종류와 아이 이름을 직접 관리할 수 있습니다. AI가 꾸민 동화풍 일정표도 만들 수 있습니다.

## 실행

Node.js 22.13 이상이 필요합니다.

```bash
npm ci
npm run build
npx wrangler d1 execute site-creator-d1 --local --file drizzle/0000_gifted_secret_warriors.sql --config dist/server/wrangler.json --persist-to .wrangler/state
npm run dev
```

Git에 올리지 않는 `.env.local` 파일에 20자 이상의 무작위 `FAMILY_ACCESS_CODE`를 설정해야 가족 일정에 접속할 수 있습니다. 터미널에 표시된 로컬 주소(기본값 `http://localhost:5173`)에서 열 수 있습니다. `npm run test:image`는 실제 API 호출 없이 이미지 요청과 오류 처리를 확인합니다.

## AI 추천 설정

AI 준비물 추천과 동화풍 배경 생성은 OpenAI API를 사용합니다. 프로젝트 루트에 Git에 올리지 않는 `.env.local` 파일을 만들고 `OPENAI_API_KEY`를 설정하세요. API 결제 잔액이 없으면 일정 입력과 기본 PNG 저장은 되지만 AI 기능은 작동하지 않습니다. ChatGPT 월 구독만으로는 API 호출을 사용할 수 없습니다.

**AI로 새 배경 만들기**는 입력한 꾸밈 분위기를 반영해 GPT 이미지 모델로 글자가 없는 PNG 배경을 만든 뒤 브라우저에서 아이 이름·일정을 작은 말풍선에 정확한 한글로 합성합니다. 배경 생성 요청에는 아이 이름이나 일정 내용을 보내지 않습니다. **기본 일러스트 사용**은 API 크레딧 없이 작동합니다. 완성된 이미지는 화면에서 미리 보고 PNG로 저장할 수 있습니다. 준비할 일 목록은 화면에서만 보이며 저장 이미지에는 포함되지 않습니다.
완성 이미지 미리보기를 누르면 큰 보기 창이 열립니다. 창에서 한 번 더 확대하거나 Esc 키로 닫을 수 있습니다.

## 데이터와 배포

아이, 일정 종류, 일정은 D1에 저장됩니다. 가족은 별도 계정 없이 같은 공유 코드를 입력해 여러 기기에서 조회·수정할 수 있습니다. 다른 기기의 변경 내용은 화면이 열려 있을 때 약 20초마다 반영됩니다. 공유 코드는 운영 사이트의 비밀 환경 변수에만 저장하며 GitHub 저장소에는 포함하지 않습니다.

### 휴대폰 홈 화면에 설치

[GitHub Pages 앱](https://polos0117.github.io/JuniHani/)을 휴대폰에서 열어 공유 코드를 입력하세요. Android Chrome에서는 브라우저 메뉴의 **앱 설치** 또는 **홈 화면에 추가**를, iPhone Safari에서는 공유 메뉴의 **홈 화면에 추가**를 선택하면 됩니다. 설치된 앱도 인터넷 연결이 필요합니다.

로그인 화면이나 일정 화면의 **화면 색상**에서 포근한 민트, 연한 핑크, 맑은 하늘 중 하나를 고를 수 있습니다. 선택은 현재 기기에 저장되며, 일반 주간 계획 PNG에도 적용됩니다.

GitHub Actions가 `main`에 푸시된 정적 PWA 화면을 GitHub Pages에 배포합니다. 일정 데이터와 AI 요청은 기존 [운영 서버](https://kids-week-planner.jjshsin.chatgpt.site/)로 전달합니다. GitHub Pages에는 API 키나 공유 코드가 배포되지 않습니다. GitHub Pages 화면은 공유 코드를 현재 브라우저 탭 세션에만 보관하며, 운영 서버 화면은 HTTP 전용 세션 쿠키를 사용합니다. GitHub 저장소에 푸시하는 것만으로 운영 서버의 API가 자동 배포되지는 않습니다.
