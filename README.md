# workbench-tsoding-c99

Tsoding 관련 C99 예제와 브라우저 그래픽스 실습을 모은 워크벤치다. 로컬 작업 폴더는 `G:\dev\workbench-tsoding-c99`이고, 상위 원격 저장소는 [five2nine/tsoding-c99](https://github.com/five2nine/tsoding-c99)다.

## 예제와 저장소 구조

| 폴더 | 내용 | Git 관리 |
| --- | --- | --- |
| [remix](remix/README.md) | C99 `String_View`와 소스 텍스트의 단어 세기 | 상위 저장소의 기존 파일 |
| [Tsoding-3d-demystified](Tsoding-3d-demystified/index.html) | JavaScript와 Canvas로 구현한 3D 투영 실습 | 상위 저장소의 일반 폴더 |
| `Tsoding-ppm-ex` | C++ 렌더러와 PNG 프레임 생성 실습 | 비공개 `five2nine/ppm-ex`의 정식 서브모듈 |

공개 상위 저장소에는 PPM 저장소의 주소와 고정 커밋만 기록한다. PPM 소스와 실행 파일, 렌더링 결과 및 비공개 Git 이력은 하위 저장소에 유지한다. 연결 정보는 [.gitmodules](.gitmodules)에 있다.

## 가져오기와 동기화

상위 저장소만 가져오면 C99 예제와 브라우저 예제를 사용할 수 있다.

```powershell
git clone https://github.com/five2nine/tsoding-c99.git G:\dev\workbench-tsoding-c99
Set-Location G:\dev\workbench-tsoding-c99
```

PPM 저장소에 접근 권한이 있는 계정은 다음 명령으로 서브모듈을 초기화한다.

```powershell
git submodule sync --recursive
git submodule update --init --recursive
```

기존 작업 폴더에서 상위 저장소를 갱신할 때는 `git pull --ff-only`를 사용한다. 서브모듈을 갱신하기 전에는 `git -C Tsoding-ppm-ex status --short`로 하위 작업의 변경을 확인한다. 상위 저장소가 기록한 PPM 버전은 `git submodule update --init --recursive`로 맞춘다.

## 실행

C99 예제는 [remix의 빌드와 실행 안내](remix/README.md)를 따른다. `__FILE__`로 원본 `main.c`를 읽으므로, 안내대로 `remix` 폴더에서 빌드하고 실행한다.

브라우저 예제는 `Tsoding-3d-demystified/index.html`을 브라우저에서 연다. 같은 폴더의 `index.js`를 사용한다.

PPM 예제의 빌드 방법은 `Tsoding-ppm-ex/README.md`에 있다. 현재 프로그램은 실행 한 번에 240개 프레임을 생성한다. 기존 `outputs-*` 폴더와 MP4, 실행 파일은 로컬 이동 때 바이트를 보존했다.

## 2026년 10월 20일 이동 기록

이동 전 736개 파일과 약 1.05GB의 해시를 기록하고, 새 위치에서 모두 일치하는지 확인했다. 상위 원격의 기존 `remix` 파일과 이력을 가져왔고, 독립 저장소였던 PPM 예제를 Git 서브모듈로 등록했다.

PPM의 `master` 브랜치와 기존 이력을 유지했다. 하위 `.git` 데이터는 상위 `.git/modules/ppm-ex`로 정식 흡수했으며, 하위 폴더의 `.git` 파일이 그 위치를 연결한다. 디렉터리 안에 등록되지 않은 독립 Git 저장소가 중첩된 상태를 해소했다.

이동 전부터 수정돼 있던 PPM의 `main.exe`도 그대로 보존했다. 이 변경을 새로 커밋하거나 공개 저장소에 업로드하지 않았으므로, 상위 `git status`에는 해당 서브모듈의 수정 표시가 남을 수 있다. 상위 원격과 하위 원격의 공개 범위는 각각 기존의 공개와 비공개를 유지한다.
