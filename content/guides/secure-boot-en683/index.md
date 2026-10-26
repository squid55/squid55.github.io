---
title: "Secure Boot on EN683: From Root of Trust to Kernel"
description: "시큐어 부트 이론과 EN683 부트 흐름: OTP, 신뢰 체인, 키 계층, SDK 서명과 검증 과정"
date: 2026-10-27T02:30:00+09:00
tags: ["secure boot", "en683", "risc-v", "u-boot", "otp"]
pdf: "secure-boot-en683-20261027.pdf"
---

EN683 SDK의 빌드 스크립트와 U-Boot 소스를 따라가며, 전원이 켜진 뒤 BootROM부터 커널까지 서명이 어떻게 검증되는지 정리했다. 앞부분은 해시, 서명, OTP, 신뢰 체인 같은 이론이고, 뒷부분은 EN683에서 실제로 무엇이 어디서 검증되는지와 소스에서 확인하지 못한 부분이다.
