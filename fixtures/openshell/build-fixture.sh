#!/bin/sh
# Invoked only inside the separately authorized, pinned build container.
# Source arrives on stdin; stdout contains only the ELF, stderr tool identity.
set -eu
umask 077
export PATH=/usr/bin:/bin HOME=/build TMPDIR=/build
export LC_ALL=C LANG=C TZ=UTC SOURCE_DATE_EPOCH=0
cd /build
ulimit -f 8192
ulimit -t 30
cat > fake-app-server.c
gcc -dumpfullversion -dumpversion >&2
ld --version >&2
gcc -x c -std=c11 -Os -Wall -Wextra -Werror -nostdlib -static -no-pie \
    -ffreestanding -fno-builtin -fno-stack-protector -fno-ident \
    -fno-asynchronous-unwind-tables -fno-unwind-tables \
    -ffile-prefix-map=/build=. -fdebug-prefix-map=/build=. \
    -frandom-seed=roost-synthetic-stdio-v2 \
    -Wl,--build-id=none,-z,noexecstack,-e,_start,-s \
    fake-app-server.c -o fake-app-server
# This reads bytes; it never invokes the result or any loader.
cat fake-app-server
