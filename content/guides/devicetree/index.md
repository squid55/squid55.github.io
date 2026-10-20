---
title: "디바이스트리란 무엇인가"
description: "QEMU virt의 DTB를 꺼내 읽고, 고치고, 부팅 단계마다 따라가며"
date: 2026-10-21T00:46:00+09:00
tags: ["디바이스트리", "linux", "u-boot", "risc-v", "qemu"]
pdf: "devicetree-20261021.pdf"
---

QEMU virt 보드의 디바이스트리를 `dumpdtb`로 꺼내 문법과 바이너리 구조를 뜯어 보고, OpenSBI와 U-Boot가 부팅 중에 무엇을 덧붙이는지, 커널이 노드를 장치로 만들어 드라이버를 붙이는 과정을 따라갔다. 마지막에는 DTS를 직접 고쳐 부팅해 봤다.

함께 볼 글: [부트로더란 무엇인가](../bootloader/index.md)

- 디바이스트리 명세: <https://www.devicetree.org/specifications/>
- Linux v6.12.59: <https://github.com/gregkh/linux/tree/v6.12.59>
