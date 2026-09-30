---
title: "부팅을 ftrace 로 들여다보기"
description: "커널 커맨드라인만 바꿔 initcall 과 모듈 로딩을 추적한다. 보드 없이 virtme-ng 로 먼저 연습했다"
date: 2026-09-30
tags: [ftrace, kprobe, virtme-ng, 부팅, 디버깅]
kernel: "7.3.0-rc1 (media-committers), 6.8 (호스트)"
toc: true
---

dmesg 만 봐서는 커널이 부팅하면서 안에서 무엇을 했는지 알 수 없다. 어떤 초기화 함수가
오래 걸렸는지, 어떤 모듈이 언제 올라왔는지는 로그에 남지 않는다. ftrace 를 부팅 시점부터
켜면 그게 보인다.

보드에 바로 손대기 전에 PC 에서 같은 실습을 할 수 있게 환경을 만들었다. virtme-ng 로
커널을 띄우고, 나온 로그에서 느린 initcall 을 골라내는 스크립트까지 붙였다.

## 커맨드라인으로 켜는 트레이싱

부팅 과정을 보려면 커널이 뜨기 전에 트레이서가 켜져 있어야 한다. 커널 커맨드라인으로 지정한다.

| 파라미터 | 뜻 |
|---|---|
| `trace_event=initcall:*` | initcall 시작·종료를 기록 |
| `trace_event=module:module_load` | 모듈 로딩 기록 |
| `trace_event=sched:sched_process_exec` | 실행된 프로그램 |
| `trace_event=syscalls:sys_enter_openat` | 열린 파일 |
| `ftrace=function` | 함수 트레이서를 부팅 초기부터 |
| `ftrace=function_graph` + `ftrace_graph_filter=<함수>` | 호출 그래프, 대상 한정 |
| `trace_buf_size=8M` | CPU 당 링버퍼 크기 |
| `tp_printk` | 트레이스를 커널 로그로도 출력 |

`trace_buf_size` 를 키우지 않으면 기본 버퍼가 작아서 부팅 초반 기록이 뒤 내용에 덮인다.

라즈베리파이는 `/boot/firmware/cmdline.txt` 를 고친다. 이 파일은 한 줄이어야 하고 옵션 사이는
공백 하나로 띄운다. 줄바꿈이 들어가면 그 뒤가 통째로 무시된다.

## virtme-ng 로 먼저 연습

보드가 없어도 된다. 빌드해 둔 커널 트리를 그대로 부팅할 수 있다. 여기서는
linux-media 의 media-committers 트리(7.3.0-rc1, 커밋 `391e6244`)를 썼다.

```bash
vng --run ~/linux-media/media-committers \
    --rwdir=$HOME/kea-debug-practice/out \
    --append 'trace_event=initcall:*,module:module_load trace_buf_size=8M' \
    --exec 'cp /sys/kernel/tracing/trace $HOME/kea-debug-practice/out/vng-initcall.log'
```

`--rwdir` 는 `--rwdir=경로` 또는 `--rwdir=게스트경로=호스트경로` 형식이다. 처음에
`경로:경로` 로 적었다가 `invalid --rwdir parameter` 를 봤다.

`--exec` 로 비대화식으로 돌릴 때 tty 가 없으면 아래 경고가 나오고 출력이 사라진다.

```
WARNING: stdin/stdout/stderr not accessible via /proc/self/fd,
falling back to limited redirection (stderr may be lost).
```

`script -q -c '<vng 명령>' /dev/null` 로 감싸면 된다. tmux 안에서 돌려도 된다.

{{< note measured >}}
이렇게 부팅한 결과 트레이스 1398 줄, initcall 688 건이 잡혔다.
{{< /note >}}

## 느린 initcall 골라내기

`initcall_start` 와 `initcall_finish` 의 타임스탬프 차이가 그 함수의 실행 시간이다.
로그를 눈으로 훑는 대신 짝을 맞춰 계산하는 스크립트를 만들었다.

```
initcall 688개, 합계 16727.0 ms

 순위     소요(ms)      끝난 시각(s)  함수
  1  15608.941     16.606694  virtio_pci_driver_init
  2    398.772      0.798171  acpi_init
  3    143.389     16.758518  virtio_console_init
  4    142.904     17.031419  param_sysfs_builtin_init
  5     94.432      0.958351  svm_init
```

1 위가 15.6 초다. QEMU 위에서 virtio 장치를 붙이는 과정이라 실제 보드와는 다른 값일
가능성이 크다. 왜 이렇게 오래 걸렸는지는 아직 확인하지 못했다.

레벨 전환도 같이 찍힌다. `console` → `early` → `pure` → `core` → `postcore` 순으로 10 회
나왔다. initcall 은 레벨 순서대로 실행되므로, 어느 단계에서 시간이 쏠렸는지 볼 때 쓴다.

## 유저스페이스 쪽

부팅이 끝난 뒤 무엇이 실행되고 어떤 파일을 여는지도 같은 방식으로 볼 수 있다. 커널을
고치지 않고도 이미 있는 것으로 된다.

- 실행된 프로그램: `sched:sched_process_exec` 트레이스포인트
- 열린 파일: `vfs_open` 에 kprobe 를 붙인다

```bash
echo 'p:vfsopen vfs_open' > /sys/kernel/tracing/kprobe_events
echo 1 > /sys/kernel/tracing/events/kprobes/vfsopen/enable
echo 1 > /sys/kernel/tracing/events/sched/sched_process_exec/enable
```

부트타임에 하려면 커맨드라인에 `trace_event=sched:sched_process_exec,syscalls:sys_enter_openat`
를 넣으면 된다. 라이브러리 경로가 틀려서 로딩이 안 되는 상황을 쫓을 때 쓸 만하다.

{{< note todo >}}
kprobe 쪽 스크립트는 root 권한이 필요해서 아직 돌려보지 못했다. 라즈베리파이에
cmdline 을 넣는 스크립트도 파이에서 검증하지 않았다.
{{< /note >}}

## 환경 확인

실습 전에 커널에 관련 설정이 켜져 있는지 본다. 우분투 22.04 의 6.8 커널과
media-committers 7.3.0-rc1 둘 다 아래가 모두 `y` 였다.

```
CONFIG_FTRACE, CONFIG_FUNCTION_TRACER, CONFIG_FUNCTION_GRAPH_TRACER,
CONFIG_FTRACE_SYSCALLS, CONFIG_KPROBE_EVENTS, CONFIG_UPROBE_EVENTS
```

tracefs 가 마운트되어 있지 않으면 먼저 붙인다.

```bash
sudo mount -t tracefs nodev /sys/kernel/tracing
```

## 스크립트

여기서 쓴 스크립트는 저장소에 올려 두었다. 환경 점검, virtme-ng 실행, initcall 분석,
strace · gdb · uprobe · kprobe 실습, 라즈베리파이 cmdline 편집이 들어 있다.

<https://github.com/squid55/linux-boot-debug-practice>

```bash
git clone https://github.com/squid55/linux-boot-debug-practice
cd linux-boot-debug-practice
./00-setup/check-env.sh
KDIR=~/linux ./01-boot-ftrace/run-vng.sh initcall
```

## 참고

실습 주제는 아래 공개 영상을 보고 따라 하면서 잡았다. 영상에서는 라즈베리파이 5 에서
cmdline 을 고쳐 부트타임 ftrace 를 켜고, 유저스페이스 추적에는 커널 패치를 쓴다.
여기서는 패치 없이 기존 트레이스포인트와 kprobe 로 같은 정보를 얻는 쪽으로 바꿨다.

- Austin Kim, KEA (part1) Boot-time ftrace 설정 및 실습 — <https://www.youtube.com/watch?v=C79JWmxnWHo>
- Austin Kim, KEA (part2) userspace 동작 디버깅 실습 — <https://www.youtube.com/watch?v=U5_5nR8OqME>

커널 문서도 같이 본다.

- `Documentation/trace/ftrace.rst`
- `Documentation/trace/kprobetrace.rst`
- `Documentation/admin-guide/kernel-parameters.txt`
