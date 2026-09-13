/* Synthetic one-request stdio fixture. Linux x86-64, freestanding, no libc.
 * Never a production App Server. RF-HOST-039 builds but does not execute it.
 * Only read/write/poll/fcntl/exit syscalls; no files, sockets, exec or fork.
 */
typedef unsigned long usize;
struct pollfd { int fd; short events; short revents; };

static long call3(long number, long a, long b, long c) {
    long result;
    __asm__ volatile ("syscall" : "=a" (result)
                      : "a" (number), "D" (a), "S" (b), "d" (c)
                      : "rcx", "r11", "memory");
    return result;
}

static int nonblocking(int fd) {
    long flags = call3(72, fd, 3, 0); /* fcntl F_GETFL */
    return flags >= 0 && call3(72, fd, 4, flags | 2048) >= 0;
}

/* Shared finite wait budget for input and output. No unbounded retry loop.
 * 100 polls * 20 ms requested waits; scheduler time needs an external deadline.
 * Caller must supply dedicated pipes: fcntl changes their open-file flags.
 */
static int ready(int fd, short events, unsigned *budget) {
    while (*budget) {
        struct pollfd item = {fd, events, 0};
        --*budget;
        long result = call3(7, (long)&item, 1, 20);
        if (result > 0) return (item.revents & events) != 0;
        if (result < 0 && result != -4) return 0;
    }
    return 0;
}

__attribute__((used, noreturn)) void fixture_main(void) {
    static const char request[] = "{\"id\":1,\"method\":\"initialize\"}\n";
    static const char response[] =
        "{\"id\":1,\"result\":{\"fixture\":\"synthetic-stdio-v2\",\"ok\":true}}\n";
    char input[128];
    usize count = 0, sent = 0;
    unsigned budget = 100;
    int status = 2;
    if (!nonblocking(0) || !nonblocking(1)) goto done;
    while (count < sizeof(input)) {
        if (!ready(0, 1, &budget)) goto done; /* POLLIN */
        long size = call3(0, 0, (long)&input[count], 1);
        if (size == -4 || size == -11) continue; /* EINTR / EAGAIN */
        if (size != 1) goto done;
        if (input[count++] == '\n') break;
    }
    if (count != sizeof(request) - 1) goto done;
    for (usize i = 0; i < count; ++i)
        if (input[i] != request[i]) goto done;
    while (sent < sizeof(response) - 1) {
        if (!ready(1, 4, &budget)) goto done; /* POLLOUT */
        long size = call3(1, 1, (long)response + sent,
                          sizeof(response) - 1 - sent);
        if (size == -4 || size == -11) continue;
        if (size <= 0) goto done;
        sent += (usize)size;
    }
    status = 0;
done:
    call3(60, status, 0, 0);
    __builtin_unreachable();
}

/* Establish the SysV stack alignment without a C runtime or startup objects. */
__asm__(".global _start\n"
        "_start:\n"
        "xor %ebp,%ebp\n"
        "and $-16,%rsp\n"
        "call fixture_main\n"
        "ud2\n");
