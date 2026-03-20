#include <ctype.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

typedef struct {
    const char* data;
    size_t count;
} String_View;

String_View sv(const char* cstr) {
    return (String_View){
        .data = cstr,
        .count = strlen(cstr),
    };
}

void sv_chop_left(String_View* sv, size_t n) {
    if (n > sv->count) n = sv->count;
    sv->count -= n;
    sv->data += n;
}

void sv_chop_right(String_View* sv, size_t n) {
    if (n > sv->count) n = sv->count;
    sv->count -= n;
}

void sv_trim_left(String_View* sv) {
    while (sv->count > 0 && isspace(sv->data[0])) {
        sv_chop_left(sv, 1);
    }
}

void sv_trim_right(String_View* sv) {
    while (sv->count > 0 && isspace(sv->data[sv->count - 1])) {
        sv_chop_right(sv, 1);
    }
}

void sv_trim(String_View* sv) {
    sv_trim_left(sv);
    sv_trim_right(sv);
}

String_View sv_chop_by_delim(String_View* sv, char delim) {
    size_t i = 0;
    while (i < sv->count && sv->data[i] != delim) {
        i += 1;
    }

    if (i < sv->count) {
        String_View result = {
            .data = sv->data,
            .count = i,
        };
        sv_chop_left(sv, i + 1);
        return result;
    }

    String_View result = *sv;
    sv_chop_left(sv, sv->count);
    return result;
}

String_View sv_chop_by_type(String_View* sv, int (*istype)(int c)) {
    size_t i = 0;
    while (i < sv->count && !istype(sv->data[i])) {
        i += 1;
    }

    if (i < sv->count) {
        String_View result = {
            .data = sv->data,
            .count = i,
        };
        sv_chop_left(sv, i + 1);
        return result;
    }

    String_View result = *sv;
    sv_chop_left(sv, sv->count);
    return result;
}

#define SV_Fmt "%.*s"
#define SV_Arg(s) (s).count, (s).data

int main() {
    FILE* f = fopen(__FILE__, "rb");
    size_t capacity = 1024 * 1024;
    char* buffer = malloc(capacity);
    size_t size = fread(buffer, 1, capacity, f);

    String_View s = {
        .data = buffer,
        .count = size,
    };

    size_t word_count = 0;
    while (s.count > 0) {
        sv_trim_left(&s);
        if (s.count == 0) break;
        String_View word = sv_chop_by_type(&s, isspace);
        printf(SV_Fmt "\n", SV_Arg(word));
        word_count += 1;
    }

    printf("word_count = %zu\n", word_count);

    return 0;
}
