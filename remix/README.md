# C 문자열 뷰 (String_View) 예제

이 프로젝트는 C언어에서 끝을 알리는 널 문자(`\0`)에 의존하지 않고, 메모리를 복사하지 않으면서도(Zero-copy) 효율적으로 문자열을 부분적으로 참조하고 자를 수 있는 `String_View` 패턴의 구현체입니다.

예시 프로그램인 `main.c`는 실행될 때 자기 자신의 소스 코드를 통째로 읽어 들여와서 텍스트 스캔을 진행하고, 파일 내부에 있는 총 '단어(word)'의 개수를 세어 출력합니다.

## 핵심 기능 구현
* **의존성 없는 참조**: 포인터(`data`)와 길이(`count`)만을 통해 동작합니다.
* **불필요한 공백 제거**: `sv_trim_left`, `sv_trim_right`
* **문자열 파싱 및 자르기**: `sv_chop_by_delim` (구분자로 자르기), `sv_chop_by_type` (특정 조건으로 자르기)

## 컴파일 요구 사항
* **지원 표준**: 이 소스 코드는 지정 초기화자(`.data = ...`), 복합 리터럴 지원 등을 위해 **최소 C99 표준** 이상을 요구합니다. (현대의 컴파일러는 모두 지원합니다.)
* **C23 호환성**: 폐지된 K&R 함수 선언이나 새로운 키워드(`bool`, `true` 등)와의 충돌이 전혀 없으므로, 가장 최신 표준인 **C23(`-std=c23`) 환경에서도 아무런 경고나 오류 없이 완벽하게 빌드 및 동작**합니다.

---

## 빌드 방법 (Windows 중심)

`main.c`는 외부 라이브러리 없이 C 표준 라이브러리만 사용합니다. 환경에 맞게 아래 방법 중 하나를 선택하세요.

### 1. GCC 또는 Clang 사용 (MinGW, MSYS2 등)
일반 명령 프롬프트(CMD)나 PowerShell 환경에서 다음 명령어를 실행합니다:
```powershell
gcc -o main main.c

# Clang의 경우:
# clang -o main main.c
```

### 2. MSVC(Visual Studio C++) 사용
Windows 시작 메뉴에서 **x64 Native Tools Command Prompt for VS** (또는 Developer PowerShell)를 실행하여 터미널을 연 뒤 다음 명령어를 실행합니다:
```powershell
cl main.c /Femain.exe
```
*(주의: C++ 컴파일러인 `cl.exe`는 출력 파일명을 지정할 때 `-o` 대신 `/Fe`를 사용합니다.)*

---

## 실행 방법

컴파일이 완료되면 폴더에 `main.exe` 파일이 생성됩니다. 

이 프로그램은 코드 내부 로직에 의해 현재 위치에 있는 원본 파일(`main.c`)을 읽어들이기 때문에, 반드시 소스 파일과 함께 있는 위치에서 실행해야 합니다.

```powershell
.\main.exe
```

## 출력 결과 예시
소스 코드를 구성하는 각각의 단어가 한 줄씩 나열되며, 마지막에 다 합친 단어의 정상 개수가 산출됩니다.

```text
#include
<ctype.h>
#include
<stdio.h>
...
printf("word_count
=
%zu\n",
word_count);
return
0;
}
word_count = 295
```

## 추가 문서

`main.c`의 설계 의도, `String_View` 정신모형, C99 문법 포인트, 그리고 실전 코드 관점의 함정을 자세히 설명한 문서는 [`main.c.deep-dive.ko.md`](./main.c.deep-dive.ko.md)에서 볼 수 있습니다.
