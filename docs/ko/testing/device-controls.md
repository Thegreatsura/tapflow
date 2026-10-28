---
title: 기기 조작
description: QA 세션의 기기를 마우스와 키보드로 다루는 방법입니다. 터치와 제스처, 키 입력, 앱 실행, 기기 버튼, 소프트웨어 키보드, 회전, 접기, 재시작, 클립보드를 다룹니다.
---

# 기기 조작

<Badge type="info" text="iOS" /> <Badge type="info" text="Android" />

[QA 세션](/ko/testing/qa-session)의 기기는 마우스와 키보드로 실제 폰처럼 다룹니다. 따로 켤 설정은 없고 세션을 시작하면 바로 쓸 수 있습니다. 버튼은 기기 오른쪽 툴바에 있고 마우스를 올리면 이름과 단축키가 보입니다.

## 화면 조작 {#touch-and-gestures}

- **터치**: 기기 화면을 클릭합니다.
- **스와이프**: 클릭한 채로 드래그합니다.
- **핀치**: Option(Alt) 키를 누른 채 드래그합니다. 키를 누르면 두 손가락 위치가 화면에 표시되고 드래그하는 동안 두 손가락이 벌어지거나 모입니다. 키를 떼면 핀치가 끝납니다.

## 키 입력 {#typing}

기기 화면을 한 번 클릭하면 그때부터 키 입력이 기기로 갑니다. 정보 카드의 **Focus** 표시가 초록색으로 바뀌면 입력을 받는 상태입니다. 기기 밖의 대시보드 영역을 클릭하면 입력 전달이 멈춥니다.

## 앱 실행 {#launch-the-app}

기기가 켜지면 빌드가 자동으로 설치됩니다. 설치가 끝나면 툴바 맨 위에 재생 아이콘의 **Launch app** 버튼이 나타납니다. 이 버튼을 누르면 앱이 실행됩니다. 앱을 닫은 뒤 다시 실행할 때도 이 버튼을 씁니다.

## 기기 버튼 {#device-buttons}

| 플랫폼 | 버튼 |
|---|---|
| iOS | 툴바의 **Home**(<kbd>⌘</kbd> <kbd>⇧</kbd> <kbd>U</kbd>), 기기 테두리에 그려진 측면 버튼 |
| Android | 툴바의 **Home**, **Back**, **Recent Apps**, **Volume Up**, **Volume Down**, **Power** |

iOS는 기기 테두리에 그려진 측면 버튼(전원, 볼륨 등)을 클릭하면 그 버튼이 눌립니다.

## 소프트웨어 키보드 {#software-keyboard}

<Badge type="info" text="iOS" />

툴바의 키보드 버튼(**Software keyboard**, <kbd>⌘</kbd> <kbd>⇧</kbd> <kbd>K</kbd>)을 누르면 iOS 시뮬레이터의 화면 키보드가 올라오거나 내려갑니다. 화면 키보드가 가린 레이아웃을 확인할 때 씁니다. 기기가 응답하지 않으면 키보드 상태가 바뀌지 않았다는 알림이 뜹니다.

## 회전 {#rotate}

**Rotate**(<kbd>⌘</kbd> <kbd>⇧</kbd> <kbd>O</kbd>)를 누를 때마다 기기가 가로와 세로로 번갈아 돌아갑니다. 단축키를 누르고 있어도 한 번만 돌아갑니다. 가로로 둔 채 세션을 떠나면 기기를 세로로 되돌린 뒤 종료합니다.

세션은 세로로 시작합니다. 페이지를 새로 고쳤거나 에이전트가 재시작해서 기기가 가로로 남아 있었다면 세션을 시작할 때 세로로 세웁니다. 예외는 자동 회전이 켜진 Android 에뮬레이터를 tapflow 밖에서 돌린 경우로, 이때는 그대로 둡니다. iPhone Duo도 예외이며 아래에서 따로 설명합니다.

### iPhone Duo 회전 {#rotate-iphone-duo}

<Badge type="info" text="iOS" />

iPhone Duo는 **Rotate**를 누를 때마다 시계 방향으로 90°씩 돌아갑니다. 네 번 누르면 처음 방향으로 돌아옵니다. 기기 테두리가 먼저 돌고 화면이 뒤따릅니다.

손에 든 기기를 돌릴 때처럼 화면도 기기와 함께 돕니다. 앱이 그 방향을 지원하면 앱 화면이 다시 바로 서고 지원하지 않으면 옆으로 누운 채 보입니다.

Xcode의 DeviceHub에서 돌린 방향도 최대 6초쯤 뒤에 tapflow 화면에 반영됩니다. 기기 방향은 그 기기를 보는 모든 사람이 함께 쓰므로 세션을 시작하거나 떠날 때 tapflow가 방향을 바꾸지 않습니다.

## 접기와 펼치기 {#fold}

폴더블 Android 에뮬레이터와 iPhone Duo 시뮬레이터에서는 툴바에 접기·펼치기 버튼이 나타납니다. 누를 때마다 접힌 상태(**Folded**)와 펼친 상태(**Unfolded**)가 바뀌고 버튼 이름은 **Unfold**나 **Fold** 뒤에 현재 상태와 바뀔 상태를 붙여 표시합니다. 상태가 바뀌는 동안에는 버튼에 로딩 아이콘이 돕니다.

### iPhone Duo 접기 {#fold-iphone-duo}

<Badge type="info" text="iOS" />

iPhone Duo는 접거나 펼치는 데 4~6초가 걸립니다. 그동안 기기 화면에 **Folding...** 또는 **Unfolding...**이 표시되고 새 화면이 켜지면 서서히 나타납니다. 펼치면 완전히 편 상태(180°)가 됩니다.

Xcode의 DeviceHub에서 접거나 펼쳐도 tapflow 화면이 따라갑니다. 새 화면이 켜진 뒤 4초 넘게 유지돼야 반영하므로 보통 4~6초 뒤에 바뀌고 기기를 30초 넘게 그대로 두었다면 최대 10초쯤 걸립니다. 기기가 켜지는 도중 잠깐 켜졌다 꺼지는 화면을 따라가지 않기 위해서입니다.

iPhone Duo 시뮬레이터를 쓰려면 운영자의 Mac에 Xcode 27.1 이상이 있어야 하고 Mac이 Apple silicon이어야 합니다. iPhone Duo의 입력은 tapflow가 시뮬레이터 안에서 실행하는 보조 프로그램을 거칩니다. 이 프로그램을 쓸 수 없는 Mac에서는 iPhone Duo가 기기 목록에 나오지 않거나 골랐을 때 오류가 납니다.

## 기기 재시작 {#restart}

**Restart the device** 버튼을 누르면 확인 창(**Restart this device?**)이 뜹니다. **Restart**를 누르면 기기가 꺼졌다 다시 켜집니다.

- 열려 있던 앱과 화면에 띄워 둔 상태는 사라집니다.
- 테스트 중인 빌드는 기기가 다시 켜진 뒤 새로 설치되므로 그 앱의 데이터는 지워집니다.
- 다른 앱과 그 데이터는 남습니다.

기기의 데이터를 모두 지우고 싶다면 기기를 고르기 전에 **Full reset**을 켭니다([QA 세션](/ko/testing/qa-session#select-device) 참고).

## 클립보드 {#clipboard}

기기 화면을 클릭해 키 입력이 기기로 가는 상태에서 동작합니다.

- **기기 → 내 컴퓨터**: 기기에서 텍스트를 선택하고 <kbd>⌘</kbd> <kbd>C</kbd>(또는 <kbd>Ctrl</kbd> <kbd>C</kbd>)를 누르면 내 컴퓨터 클립보드에 복사됩니다. <kbd>X</kbd>를 쓰면 잘라내기입니다.
- **내 컴퓨터 → 기기**: 내 컴퓨터에서 복사한 텍스트는 <kbd>⌘</kbd> <kbd>V</kbd>(또는 <kbd>Ctrl</kbd> <kbd>V</kbd>)로 기기의 입력란에 붙여 넣습니다.

대시보드를 HTTP로 열었다면 기기에서 복사한 텍스트는 기기 안에만 남고 **Copied on the device. Serving the dashboard over HTTPS also brings it to your clipboard.** 알림이 뜹니다. 브라우저는 보안 연결(HTTPS 또는 `localhost`)에서만 이런 클립보드 쓰기를 허용하기 때문입니다. HTTPS 설정은 운영자에게 요청하세요.

## 플랫폼 지원 {#platform-support}

| 기능 | iOS | Android |
|---|---|---|
| 터치, 스와이프, 핀치, 키 입력 | 지원 | 지원 |
| 기기 버튼 | Home, 기기 테두리의 측면 버튼 | Home, Back, Recent Apps, Volume Up, Volume Down, Power |
| 소프트웨어 키보드 버튼 | 지원 | 없음 |
| 회전 | 지원(iPhone Duo는 시계 방향 90°씩) | 지원 |
| 접기와 펼치기 | iPhone Duo(Xcode 27.1 이상) | 접힘 상태가 둘인 폴더블 에뮬레이터 |
| 기기 재시작, 클립보드 | 지원 | 지원 |

## 제한 사항 {#limits}

- 단축키는 <kbd>⌘</kbd>(Command) 키 기준입니다. 클립보드만 <kbd>Ctrl</kbd>도 받습니다.
- 대시보드의 입력창에 커서가 있을 때는 단축키가 동작하지 않습니다.
- 대시보드에서 텍스트를 선택한 상태로 누른 <kbd>⌘</kbd> <kbd>C</kbd>는 기기가 아니라 브라우저의 일반 복사로 처리됩니다.
- 기기로 붙여 넣는 텍스트는 1MB까지입니다. 넘으면 **That text is too large to send to the device** 알림이 뜹니다.

## 문제 해결 {#troubleshooting}

- **키를 눌러도 기기에 입력되지 않습니다.** 기기 화면을 한 번 클릭하고 **Focus**가 초록색인지 확인합니다.
- **기기에서 복사한 텍스트가 내 클립보드에 없습니다.** 대시보드 주소가 `http://`로 시작하면 위 [클립보드](#clipboard) 설명처럼 복사가 기기 안에 머뭅니다.
- **The device is taking too long — try again** 알림이 뜹니다. 기기가 제시간에 응답하지 않았으므로 다시 시도합니다.
- **기기 목록에 iPhone Duo가 없습니다.** 운영자의 Mac에 Xcode 27.1 이상이 설치되어 있는지 확인합니다. 에이전트 로그에 `not offering` 줄이 있으면 그 줄에 이유가 적혀 있습니다.
- **iPhone Duo를 고르면 `cannot be used on this Mac` 오류가 납니다.** 시뮬레이터가 tapflow의 입력 보조 프로그램을 거부한 경우입니다. 오류 뒤에 붙은 이유를 운영자에게 전달합니다.
- **스트림이 느리거나 입력이 늦게 반영됩니다.** [스트림과 세션](/ko/troubleshooting/streaming#stream-lag)을 참고하세요.

## 관련 문서 {#related}

- [QA 세션](/ko/testing/qa-session): 세션 시작과 기능 목록, 키보드 단축키
- [딥 링크](/ko/testing/deep-links): URL로 앱의 특정 화면을 여는 방법
- [HTTPS 보안 컨텍스트](/ko/reference/configuration#https-secure-context): 클립보드와 Smooth 프로파일에 필요한 HTTPS 설정
