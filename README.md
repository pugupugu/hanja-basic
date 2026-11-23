# 한자 놀이터 (hanja-basic)

아이와 함께 퀴즈·게임으로 배우는 초급 한자 웹 서비스. 서버·로그인 없이 브라우저에서만 동작한다.

- 한자 289자 (3단계, 한자능력검정 8급~6급 수준), 한자 단어 약 136개, 기초 다지기 7주제(숫자·요일·방향·가족 등), 사자성어 33개
- 카드 학습, 5종 퀴즈, 짝 맞추기, 오답 노트, 점수·칭호·연속 학습일
- 학습 기록은 각자 브라우저(localStorage)에만 저장된다.

## 수정 방법
- 한자·단어·사자성어: `js/data.js` (줄 형식은 파일 맨 위 주석 참고)
- 화면: `css/style.css`, `js/app.js`
- 로컬 확인: `index.html`을 정적 서버로 열기 (예: `npx serve`)

## 배포
main에 push하면 GitHub Actions가 Pages로 배포한다.
저장소 Settings → Pages → Source를 **GitHub Actions**로 한 번만 설정한다.
주소: https://pugupugu.github.io/hanja-basic/

> 급수 배정은 공식 급수표를 기준으로 정리했으나 일부 한자는 실제 급수와 다를 수 있다.
