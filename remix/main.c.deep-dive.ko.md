# `remix/main.c` 상세 해설

이 문서는 [`main.c`](./main.c)를 "C를 이미 잘 아는 사람"이 아니라, `std::string_view`, Rust slice, Julia 문자열 추상화에 익숙한 개발자 기준으로 읽는다. 따라서 C 기본 문법 설명보다는 이 코드가 어떤 **데이터 모델**, **불변식**, **파싱 스타일**을 택하는지에 초점을 둔다.

## 한 문장 요약

이 프로그램은 자기 자신의 소스 파일을 통째로 읽고, `String_View`라는 **non-owning byte slice**를 앞에서부터 줄여 가면서 공백 기준으로 토큰을 잘라 출력한 뒤 총 개수를 센다.

즉, 핵심은 "문자열을 복사하지 않고, 포인터와 길이만 움직여 파싱 상태를 진행시키는 방식"이다.

## 먼저 큰 그림부터

`main()`의 실제 흐름은 짧다.

1. `__FILE__`로 현재 소스 파일 경로를 얻는다.
2. 그 파일을 바이너리 모드로 열고 최대 1 MiB를 읽는다.
3. 읽은 버퍼 전체를 `String_View` 하나로 감싼다.
4. 앞쪽 공백을 제거한다.
5. 다음 공백이 나올 때까지를 하나의 토큰으로 잘라 출력한다.
6. 버퍼가 빌 때까지 반복한다.

이 과정에서 **버퍼 내용은 절대 복사되지 않는다.** 바뀌는 것은 오직 `String_View`의 `data` 포인터와 `count` 길이뿐이다.

## `String_View`의 정신모형

코드의 중심은 다음 구조체다.

```c
typedef struct {
    const char* data;
    size_t count;
} String_View;
```

이것은 사실상 다음과 같은 계열에 속한다.

- C++: `std::string_view`
- Rust: `&[u8]`에 더 가깝고, 의도상 문자열 취급을 한다는 점만 `&str`를 연상시킨다
- Julia: `SubString`처럼 원본을 소유하지 않고 일부를 가리키는 뷰라는 점은 비슷하지만, 이 코드는 UTF-8/문자 경계 의미론이 전혀 없다

중요한 차이는 다음과 같다.

- `std::string_view`처럼 **소유권이 없다**
- Rust `&str`와 달리 **UTF-8 불변식이 없다**
- Rust borrow checker 같은 **수명 검증이 없다**
- Julia 문자열처럼 **문자 단위 추상화가 아니라 바이트 단위**다

즉, 이 타입은 "읽을 수 있는 메모리 구간 `[data, data + count)`"을 나타낼 뿐이다.

### 이 타입이 지키는 불변식

`String_View`가 유효하려면 최소한 아래가 성립해야 한다.

- `data`는 최소 `count`바이트를 읽을 수 있는 메모리를 가리켜야 한다
- 원본 버퍼의 수명은 뷰보다 길어야 한다
- 문자열 끝을 나타내는 `'\0'`는 필요 없다

세 번째 항목이 핵심이다. 이 프로그램은 `fread()`로 파일을 읽기 때문에, 버퍼는 자동으로 NUL 종료되지 않는다. 그래서 `strlen`류 API가 아니라 `(pointer, length)` 모델이 필요하다.

## 왜 `const char*`인가

`buffer`는 `malloc()`으로 할당했으므로 실제 메모리는 가변이다. 그런데 `String_View`는 `const char*`를 사용한다.

이 선택은 "원본을 수정하지 않는 파서"라는 의도를 타입 수준에서 약하게 드러낸다. `String_View`의 연산은 **문자를 바꾸지 않고**, 오직 "어디서부터 몇 바이트를 본다"는 메타데이터만 바꾼다.

Rust 식으로 보면 `&mut &[u8]`에 가까운 운용이다. 바이트 배열 자체를 바꾸는 것이 아니라, "현재 남은 slice"를 줄여 나간다.

## 함수별 해설

아래 줄 번호는 현재 [`main.c`](./main.c)를 기준으로 한다.

### 1. `sv(const char* cstr)` (`main.c:11-16`)

```c
String_View sv(const char* cstr) {
    return (String_View){
        .data = cstr,
        .count = strlen(cstr),
    };
}
```

이 함수는 전형적인 C 문자열(`'\0'` 종료)에 대한 편의 어댑터다.

- 입력: NUL-terminated 문자열
- 출력: 그 문자열 전체를 가리키는 `String_View`

여기서 중요한 점은, 이 함수는 `strlen()`을 호출하므로 **O(n)** 이고, 입력이 반드시 NUL 종료여야 한다는 것이다. 다시 말해 `fread()`로 읽은 일반 버퍼에는 바로 쓰면 안 된다.

이 함수가 `main()`에서 사용되지 않는 이유도 바로 그것이다. `main()`은 이미 길이(`size`)를 알고 있으므로 직접 `String_View`를 구성한다.

### 2. `sv_chop_left(String_View* sv, size_t n)` (`main.c:18-22`)

```c
void sv_chop_left(String_View* sv, size_t n) {
    if (n > sv->count) n = sv->count;
    sv->count -= n;
    sv->data += n;
}
```

이 함수는 뷰의 앞쪽 `n`바이트를 버린다.

- `std::string_view::remove_prefix(n)`와 거의 같은 역할
- Rust로 치면 `*sv = &sv[n..]` 같은 효과

좋은 점은 **saturating behavior**를 가진다는 것이다. `n > count`면 자동으로 `count`까지 줄여서 빈 뷰로 만든다. 따라서 underflow가 없다.

예를 들어:

```text
before: data -> "hello world", count = 11
chop 6
after : data -> "world",       count = 5
```

실제 바이트가 이동하는 것이 아니라, 시작 포인터만 앞으로 민다.

### 3. `sv_chop_right(String_View* sv, size_t n)` (`main.c:24-27`)

```c
void sv_chop_right(String_View* sv, size_t n) {
    if (n > sv->count) n = sv->count;
    sv->count -= n;
}
```

이 함수는 뒤쪽 `n`바이트를 버린다.

- `std::string_view::remove_suffix(n)`와 유사
- 포인터는 그대로 두고 길이만 줄인다

현재 `main()`에서는 사용되지 않지만, `trim_right`와 일반적인 suffix 제거 도구를 제공하기 위해 존재한다.

### 4. `sv_trim_left(String_View* sv)` (`main.c:29-33`)

```c
void sv_trim_left(String_View* sv) {
    while (sv->count > 0 && isspace(sv->data[0])) {
        sv_chop_left(sv, 1);
    }
}
```

앞쪽 공백을 모두 제거한다. 구현은 단순하지만, `main()`의 제어 흐름에서 매우 중요하다.

왜 필요한가?

`sv_chop_by_type(&s, isspace)`는 "다음 공백이 나올 때까지"를 잘라 주는 함수다. 그런데 현재 맨 앞이 이미 공백이면 빈 토큰을 반환할 수 있다. 그 문제를 피하려면 루프 시작 시 **leading whitespace를 먼저 제거**해야 한다.

즉, 이 코드는 다음과 같이 역할 분담을 한다.

- `sv_trim_left`: 구분자 구간 스킵
- `sv_chop_by_type`: 다음 토큰 추출 + 구분자 1개 소비

이 조합은 단순하지만 매우 실용적이다.

### 5. `sv_trim_right(String_View* sv)` (`main.c:35-39`)

뒤쪽 공백을 모두 제거한다.

```c
while (sv->count > 0 && isspace(sv->data[sv->count - 1])) {
    sv_chop_right(sv, 1);
}
```

현재 예제에서는 호출되지 않는다. 하지만 `String_View`를 일반 유틸리티로 생각하면 좌우 trim 연산을 대칭적으로 제공하는 것이 자연스럽다.

### 6. `sv_trim(String_View* sv)` (`main.c:41-44`)

`sv_trim_left`와 `sv_trim_right`를 연달아 호출하는 합성 함수다.

이 역시 현재 `main()`에는 필요 없지만, 문자열 전처리 계층을 라이브러리처럼 구성하려는 흔적이라고 볼 수 있다.

### 7. `sv_chop_by_delim(String_View* sv, char delim)` (`main.c:46-64`)

이 함수는 특정 문자 하나를 구분자로 삼아 왼쪽에서 자른다.

동작은 다음과 같다.

1. `delim`이 나올 때까지 선형 스캔
2. 찾으면 그 앞부분을 결과로 반환
3. 원본 뷰는 `delim`까지 포함해서 앞으로 전진
4. 못 찾으면 현재 전체 뷰를 반환하고 원본은 빈 뷰가 됨

핵심 포인트는 **구분자도 소비한다**는 것이다.

```c
sv_chop_left(sv, i + 1);
```

따라서 반환값은 "prefix", 수정된 `*sv`는 "remainder after delimiter"가 된다. 이는 Rust의 `split_once`보다는, 반복 가능한 destructive tokenizer에 더 가깝다.

현재 `main()`은 이 버전 대신 더 일반화된 `sv_chop_by_type`을 사용한다.

### 8. `sv_chop_by_type(String_View* sv, int (*istype)(int c))` (`main.c:66-84`)

```c
String_View sv_chop_by_type(String_View* sv, int (*istype)(int c)) {
    size_t i = 0;
    while (i < sv->count && !istype(sv->data[i])) {
        i += 1;
    }
    ...
}
```

이 함수는 이 파일의 핵심 추상화다. `sv_chop_by_delim`의 "구분자 한 글자"를 "판정 함수"로 일반화했다.

여기서 `int (*istype)(int c)`는 C에서의 고전적인 함수 포인터 문법이다. 현대 언어 감각으로 번역하면 대략 다음과 같다.

- C++: `Predicate<char>`를 런타임 함수 포인터로 받는 버전
- Rust: `fn(i32) -> bool`에 가까운 단순 함수 포인터
- Julia: 함수를 인자로 받는 패턴

이 예제에서는 `isspace`를 넘겨서 "공백을 만나기 전까지"를 토큰으로 취급한다.

#### 왜 함수 포인터가 괜찮은가

이 파일은 파서 프레임워크가 아니다. 목적은 "문자열 뷰 위에서 tokenizer를 짧게 구현하는 법"을 보여 주는 것이다. 함수 포인터는 매크로나 중복 함수보다 읽기 쉽고, C99 수준에서도 충분히 표현력이 있다.

#### 반환 계약

이 함수의 계약은 다음과 같다.

- 반환값: 현재 뷰의 앞쪽 토큰
- 부작용: 입력 뷰 `*sv`는 그 토큰 뒤로 전진한다
- 구분 문자를 찾았으면 그것까지 소비한다
- 못 찾았으면 남은 전체를 반환하고 입력 뷰를 비운다

이 API는 "토큰 하나 꺼내고 진행 상태 업데이트"라는 점에서 iterator pair보다 parser cursor에 가깝다.

## `SV_Fmt` / `SV_Arg` 매크로 (`main.c:86-87`)

```c
#define SV_Fmt "%.*s"
#define SV_Arg(s) (s).count, (s).data
```

이 패턴은 C에서 매우 흔하다. 이유는 `String_View`가 NUL 종료 문자열이 아니기 때문이다.

`printf("%s", data)`는 쓸 수 없다. `printf`는 `'\0'`를 만날 때까지 출력하기 때문이다. 대신 `%.*s`를 써서 "최대 몇 글자까지 출력할지"를 precision으로 전달한다.

의도는 정확하다. 하지만 현재 구현에는 중요한 함정이 있다.

`%.*s`의 precision 인자는 `int`여야 하는데, `SV_Arg`는 `size_t`를 넘긴다. GCC/Clang 계열에서는 경고가 발생할 수 있다.

예를 들어 `gcc -std=c99 -Wall -Wextra -pedantic`로 빌드하면 다음 취지의 경고가 나온다.

```text
field precision specifier '.*' expects argument of type 'int',
but argument 2 has type 'size_t'
```

실전 코드라면 최소한 다음처럼 맞추는 편이 낫다.

```c
#define SV_Arg(s) (int)(s).count, (s).data
```

물론 아주 긴 문자열에서 `size_t -> int` 축소가 생길 수 있으므로, 더 엄밀하게는 범위를 점검하는 보조 함수를 두는 쪽이 안전하다. 다만 이 예제의 입력은 최대 1 MiB라 실용상 문제는 드물다.

## `main()` 단계별 해설 (`main.c:89-112`)

### 1. 자기 자신의 소스 파일 열기

```c
FILE* f = fopen(__FILE__, "rb");
```

`__FILE__`는 전처리기가 넣어 주는 현재 소스 파일 경로 문자열이다.

이 줄의 의미는 "실행 파일 자신"을 여는 것이 아니라 **컴파일 시점의 현재 소스 파일 경로**를 여는 것이다. 즉, 이 프로그램은 자기 자신의 소스 코드를 입력 데이터로 삼는다.

이 방식은 장난감 예제로서 꽤 좋다.

- 별도 입력 파일이 필요 없다
- 파서 대상이 언제나 존재한다
- 출력 결과가 소스 내용에 따라 재현 가능하다

다만 `__FILE__`의 값은 컴파일 명령에서 파일을 어떻게 적었는지에 따라 달라진다. `main.c`일 수도 있고 `remix/main.c`일 수도 있고 절대 경로일 수도 있다.

### 2. 버퍼 할당과 파일 읽기

```c
size_t capacity = 1024 * 1024;
char* buffer = malloc(capacity);
size_t size = fread(buffer, 1, capacity, f);
```

여기서는 최대 1 MiB를 읽는다. 버퍼는 고정 크기이며, 추가 재할당은 없다.

의미상 다음과 같다.

- `capacity`: 읽을 수 있는 최대 바이트 수
- `buffer`: 실제 저장소
- `size`: 실제로 읽은 바이트 수

이후의 모든 문자열 연산은 `size`를 신뢰하며 진행한다. 즉, 버퍼에 `'\0'`가 없어도 안전하게 다룰 수 있게 설계되어 있다.

### 3. 파일 전체를 하나의 `String_View`로 감싸기

```c
String_View s = {
    .data = buffer,
    .count = size,
};
```

이 시점의 `s`는 "파일 전체"를 바라보는 뷰다.

```text
buffer: [ entire file bytes ........................................ ]
s.data -> first byte
s.count = size
```

이후 파싱은 `s`를 점점 줄이는 방식으로 진행된다.

### 4. 토큰 루프

```c
size_t word_count = 0;
while (s.count > 0) {
    sv_trim_left(&s);
    if (s.count == 0) break;
    String_View word = sv_chop_by_type(&s, isspace);
    printf(SV_Fmt "\n", SV_Arg(word));
    word_count += 1;
}
```

이 루프를 높은 수준에서 다시 쓰면 거의 이렇게 된다.

```text
while (remaining is not empty) {
    drop leading whitespace
    if empty: stop
    take bytes until next whitespace
    print token
    increment counter
}
```

#### 상태 변화 예시

입력이 다음과 같다고 하자.

```text
"  alpha beta"
```

초기 상태:

```text
s = "  alpha beta"
```

`sv_trim_left(&s)` 후:

```text
s = "alpha beta"
```

`sv_chop_by_type(&s, isspace)` 결과:

```text
word = "alpha"
s    = "beta"
```

다시 반복하면 `beta`가 나온다.

#### 왜 공백 기준 "단어"인가

이 프로그램의 `word`는 자연어 의미의 단어도 아니고, C 토큰도 아니다. 정확히는 **whitespace-delimited token**이다.

그래서 다음 같은 문자열은:

```c
printf("word_count = %zu\n", word_count);
```

대략 이런 식으로 쪼개진다.

- `printf("word_count`
- `=`
- `%zu\n",`
- `word_count);`

즉, 구두점은 분리되지 않고 공백만 구분자로 쓰인다.

### 5. 최종 집계 출력

```c
printf("word_count = %zu\n", word_count);
```

이 부분은 `size_t` 출력에 맞는 `%zu`를 올바르게 사용하고 있다. 실제 현재 파일 기준으로 실행하면 마지막 줄은 다음과 같다.

```text
word_count = 295
```

## 이 코드가 "모던 C"처럼 보이는 이유

이 파일은 오래된 C 스타일보다 훨씬 값 지향적이고 선언적이다.

### 1. 지정 초기화자 (designated initializer)

```c
String_View s = {
    .data = buffer,
    .count = size,
};
```

필드 이름을 명시하는 초기화는 C99에서 이미 가능했고, 오늘날 C++의 designated initializer 감각과도 닿아 있다. 읽는 사람 입장에서는 순서 의존성이 줄어들고, 구조체 의미가 명확해진다.

### 2. 복합 리터럴 (compound literal)

```c
return (String_View){
    .data = cstr,
    .count = strlen(cstr),
};
```

이 패턴은 "임시 구조체 값을 만들어 반환"하는 스타일이다. 현대 언어 사용자의 눈에는 자연스럽다. C에서도 작은 POD 구조체는 값으로 주고받는 편이 오히려 명확할 때가 많다.

### 3. 비소유 뷰 + destructive cursor

이 코드는 새 문자열을 생성하지 않는다. 슬라이스를 돌려주고, 원본 뷰는 앞으로 전진한다.

이는 다음 조합을 닮았다.

- C++ `std::string_view` + `remove_prefix`
- Rust slice splitting + 남은 slice 갱신
- parser combinator에서 input cursor를 전진시키는 패턴

### 4. 고차 함수의 최소 형태

```c
int (*istype)(int c)
```

C에는 제네릭 클로저가 없지만, 이 정도 함수 포인터만으로도 "분류 규칙을 주입 가능한 tokenizer"를 만들 수 있다. 단순 예제에 비해 설계가 한 단계 일반화되어 있다.

## 복잡도와 성능 관점

이 프로그램의 토큰화는 전체적으로 **O(n)** 이다.

- 각 바이트는 trimming 또는 scanning 과정에서 많아야 상수 번 수만큼 관찰된다
- 토큰 자체를 복사하지 않는다
- 힙 할당은 버퍼 1회뿐이다

즉, 성능 감각은 "원본 버퍼 하나를 잡고, 그 위에서 zero-copy parsing"이다.

## 이 예제가 실전 코드가 아닌 이유

예제로는 훌륭하지만, production code로 가져가려면 보강할 부분이 분명하다.

### 1. 오류 처리가 없다

아래 연산들이 모두 unchecked다.

- `fopen`
- `malloc`
- `fread`

실패 시 널 포인터 역참조나 잘못된 동작으로 이어질 수 있다.

### 2. 자원 해제가 없다

- `fclose(f)`가 없다
- `free(buffer)`가 없다

짧게 끝나는 예제 프로그램이라 운영체제가 회수하긴 하지만, 습관으로는 좋지 않다.

### 3. 입력 크기 상한이 고정이다

1 MiB를 넘는 파일은 잘릴 수 있다. 현재 예제의 목적에는 충분하지만 일반적인 파일 리더는 아니다.

### 4. `isspace` 사용이 일반 바이트 입력에는 엄밀하지 않다

표준 C에서 `isspace` 류 함수는 `unsigned char`로 승격 가능한 값이나 `EOF`를 기대한다. 따라서 일반적인 바이트 스트림에는 보통 다음처럼 쓰는 편이 안전하다.

```c
isspace((unsigned char)sv->data[i])
```

현재 입력은 ASCII 소스 코드라 큰 문제가 드러나지 않을 뿐이다.

### 5. `%.*s` 인자 타입이 정확하지 않다

앞에서 설명한 대로, `SV_Arg`는 예제 의도는 좋지만 엄밀한 타입 일치는 아니다.

## 이 파일을 읽을 때 잡으면 좋은 관점

이 코드는 "C에서 문자열을 어떻게 다뤄야 하나?"보다 더 정확히는 다음 질문에 대한 짧은 답이다.

> NUL 종료에 의존하지 않고, 복사 없이, 파싱 상태를 명시적으로 전진시키는 텍스트 처리 코드를 C99로 얼마나 간결하게 쓸 수 있는가?

그 질문에 대한 답이 바로 이 `String_View` 패턴이다.

`main.c`는 작은 예제지만, 다음 아이디어를 압축해서 보여 준다.

- 소유권 없는 뷰 타입 정의
- 값 반환과 지정 초기화자를 활용한 깔끔한 API
- 포인터/길이 조작만으로 zero-copy tokenizer 구현
- 함수 포인터를 이용한 약한 형태의 고차 추상화

이런 관점으로 보면, 이 코드는 "고전적인 C 문자열 처리"보다 오히려 현대적 slice 기반 프로그래밍에 훨씬 가깝다.

## 개선한다면 어떤 방향이 자연스러운가

원문 코드를 유지하면서도 품질을 높이고 싶다면 보통 다음 순서가 자연스럽다.

1. `fopen` / `malloc` / `fread` 오류 처리 추가
2. `fclose` / `free` 추가
3. `SV_Arg`의 precision 타입 문제 해결
4. `isspace` 인자에 `unsigned char` 캐스트 추가
5. 파일 크기에 따라 동적으로 버퍼를 키우는 로직 도입

그 다음 단계에서는 `String_View`를 별도 헤더/구현 파일로 분리해 재사용 가능한 미니 라이브러리로 키울 수 있다.

## 요약

`remix/main.c`는 "자기 자신의 소스 파일을 읽는 장난감 프로그램"으로 보이지만, 실제로는 다음 내용을 짧게 데모하는 코드다.

- `const char* + size_t` 기반의 non-owning string/byte view
- zero-copy 파싱
- destructive cursor 스타일의 상태 전진
- C99의 지정 초기화자와 복합 리터럴
- 함수 포인터를 이용한 일반화된 분류 기반 split

C++/Rust/Julia 감각으로 보면, 이 파일은 낡은 C 문자열 API의 연장이 아니라, **현대적인 slice 사고방식을 C99 문법으로 직접 구현한 예제**라고 보는 편이 정확하다.
