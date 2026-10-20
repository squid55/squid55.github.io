---
title: "부트로더란 무엇인가"
description: "QEMU virt에서 OpenSBI, U-Boot, Linux로 이어지는 부팅을 직접 따라가며"
date: 2026-10-21T00:45:00+09:00
tags: ["부트로더", "u-boot", "opensbi", "risc-v", "qemu"]
pdf: "bootloader-20261021.pdf"
---

전원 직후의 기계를 커널이 기대하는 상태로 바꾸는 단계를 QEMU virt에서 하나씩 멈춰 세워 봤다. gdb로 OpenSBI가 U-Boot로 넘어가는 순간의 레지스터를 잡고, U-Boot에서 `booti`로 Linux를 띄워 `/init`까지 갔다.

함께 볼 글: [디바이스트리란 무엇인가](../devicetree/index.md)

- U-Boot v2024.10: <https://github.com/u-boot/u-boot/tree/v2024.10>
- Linux v6.12.59: <https://github.com/gregkh/linux/tree/v6.12.59>
