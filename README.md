# SCOOP! — Dance & Shoot

사진 속 아이스크림 캐릭터가 춤추는 PC용 3D 사격 게임입니다. React, TypeScript, Vite, Three.js로 구현했습니다.

## 실행 (Windows PowerShell)

```powershell
npm.cmd install
npm.cmd run dev
```

Chrome 또는 Edge에서 http://127.0.0.1:5173/ 를 열고 **게임 시작하기**를 누르세요. 내장 미리보기 브라우저는 마우스 잠금 기능을 제한할 수 있으므로 실제 플레이에는 일반 브라우저를 사용하세요.

- WASD 이동 / 마우스 조준 / 왼쪽 클릭 단발 사격
- R 재장전 / Esc 일시정지 / 이어하기 버튼으로 재개
- 60초 경기, 과녁 5개, 명중당 100점, 탄창 30발
- 1.5초 재장전, 무제한 예비탄 / 과녁은 명중 후 0.7초 뒤 재등장
- 창 전환 시 자동 일시정지 / 최고 점수만 해당 브라우저에 저장

## 빌드와 테스트

```powershell
npm.cmd run build
npm.cmd test
```

배포용 정적 파일은 `dist/`에 생성됩니다. 별도 서버나 로그인은 필요하지 않습니다. 폰트는 Google Fonts에서 가져오며 연결할 수 없으면 시스템 폰트를 사용합니다.

## 안무 참고 및 재추출

현재 안무는 `image/` 폴더의 사진 22장(006–022, 025–029)을 기준으로 자세를 맞췄습니다. 교차 스텝 → 벌려 서서 몸통 회전 → 얼굴 앞으로 팔 접기·무릎 들기 → 숙인 교차 스텝 → 이마로 손 올리기로 이어집니다. 기존 7.2초 반복을 유지하며, 원본 타임스탬프가 없는 사진의 시간은 파일 번호 간격으로 추정했습니다. 누락된 023/024는 앞뒤 사진 사이를 길게 보간합니다. 손과 발의 3D 위치를 보간하고 팔꿈치·무릎을 계산하며 캐릭터들은 같은 박자로 춤춥니다. 모션 캡처나 정확한 원본 안무 복제는 아니며 원곡은 포함하지 않습니다.

```powershell
npm.cmd run frames -- '.\새로운_보드_-P5aou1mc90giFMXDfIR_Dropshot.mp4'
```

원본 영상은 변경하지 않습니다. `artifacts/dance/contact-sheet.jpg`에서 분석용 프레임을 볼 수 있습니다. 게임은 영상 파일 없이 실행됩니다. 안무 데이터는 `src/game/dance.ts`, 입체 캐릭터는 `src/game/character.ts`에 있습니다.

## 캐릭터 모델 내보내기

참고 사진의 둥근 얼굴·안경·귀·표정·와플 콘·말랑한 팔다리를 Three.js 메시로 구성했습니다. 게임용 절차적 안무는 `src/game/character.ts`에서 계속 적용되고, 재사용 가능한 정적 모델은 아래 명령으로 내보냅니다.

```powershell
npm.cmd run model
```

결과물은 `artifacts/model/scoop-character.glb`입니다. GLB는 0초 기준의 정적 포즈이며, 게임에서의 춤은 별도 절차 애니메이션으로 재생됩니다.

게임에 아직 연결하지 않은 독립형 춤 애셋은 아래 명령으로 내보냅니다.

```powershell
npm.cmd run model:dance
```

결과물은 `artifacts/model/scoop-character-dance.glb`이며, `Dance`라는 7.2초 반복 애니메이션을 포함합니다. `scoop-character-dance.json`에 임포트용 메타데이터도 함께 생성됩니다. 이 파일은 게임 코드와 분리된 모델·애니메이션 애셋입니다.

## 검증 범위

빌드 및 자동 테스트로 시간·점수·탄약·재장전·일시정지·루프 연결과 실제 Three.js 캐릭터의 광선 충돌을 검증합니다. 내장 브라우저에서 시작 화면과 3D 렌더링을 확인했습니다. Chrome·Edge에서의 실제 포인터 잠금, 이동 사격, 브라우저 저장 복원 및 장치별 성능은 수동 확인이 필요합니다.

