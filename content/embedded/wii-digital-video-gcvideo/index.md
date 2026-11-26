---
title: "Wii 비디오 인코더를 건너뛰다: GCVideo 와 BitBuilt 의 디지털 영상 개조"
description: "GPU 가 만든 디지털 영상을 아날로그 인코더 앞에서 FPGA 로 받아 HDMI 로 내보내는 개조"
date: 2026-11-26
tags: [fpga, 영상 파이프라인, 리버스 엔지니어링, wii, gcvideo, bitbuilt]
cover: "img/01-shank-first-post.jpg"
target: "Wii"
toc: true
---

누워서 휴식 겸 폰으로 BitBuilt 를 보다가 재밌는 개조를 발견했다. BitBuilt 는 거치형 콘솔을
손바닥만 한 휴대기로 바꾸는 사람들이 모인 커뮤니티다.

Wii 의 GPU 가 만든 디지털 영상 신호를 아날로그 비디오 인코더에 들어가기 전에 FPGA 로
가로채서 HDMI 로 바로 출력하는 방식이다. 한마디로 영상 파이프라인에서 불필요한 변환
단계를 걷어내는 작업이다.

직접 해 본 것은 아니다. 포럼 글과 저장소 문서를 읽고 정리했다.

## 왜 인코더가 문제였나

Wii 와 게임큐브 시절의 TV 는 대부분 아날로그 브라운관이었다. 그래서 신호 흐름이 이랬다.

```text
GPU (디지털 픽셀) → 비디오 인코더 (DAC) → 컴포지트/컴포넌트 (아날로그)
        → 요즘 TV·LCD (ADC 로 다시 디지털화) → 화면
```

지금 기준으로 보면 디지털 → 아날로그 → 디지털로 한 바퀴 도는 셈이다. 그 과정에서 생기는
손해는 세 가지다.

| 문제 | 원인 |
|---|---|
| 화질 저하 | DAC 와 ADC 를 거치며 생기는 잡음과 번짐, 컴포지트의 색 번짐 |
| 입력 지연 | TV 가 아날로그를 샘플링하고 디인터레이스하는 데 드는 프레임 지연 |
| 휴대기에서의 낭비 | LCD 도 디지털인데 변환 칩, 전력, 기판 면적을 쓴다 |

당시에는 반드시 필요했던 단계가, 화면이 전부 디지털이 되면서 군더더기가 된 것이다.

## 원조: 게임큐브용 GCVideo

출발점은 Ingo Korb(닉네임 Unseen) 의 오픈소스 프로젝트 [GCVideo](https://github.com/ikorb/gcvideo) 다.

저장소 설명에 따르면 GCVideo 는 게임큐브의 디지털 비디오 포트 신호를, 정품 컴포넌트
케이블에 들어 있는 전용 칩 없이 표준 영상 신호로 바꾸는 FPGA 보드와 VHDL 프로젝트다.
DVI 로 내보내는 판과 컴포넌트/RGB 로 내보내는 판이 있다.

게임큐브는 디지털 포트가 밖으로 나와 있었기 때문에 비교적 접근이 쉬웠다.

## BitBuilt 의 측정: Wii 안에도 같은 버스가 있다

Wii 에는 디지털 포트가 없다. 그래서 BitBuilt 포럼에서는 비디오 인코더 칩(AVE) 주변의
신호를 오실로스코프로 직접 찍어 보는 작업이 있었다. 과정은 작업 기록
[Analyzing the Wii's Video Encoder](https://bitbuilt.net/forums/threads/analyzing-the-wiis-video-encoder.206/)
에 남아 있다. 아래에 옮긴 글들은 전부 2016년 4월 7일 하루에 올라왔다.

### 안 된다는 말은 받아들이기 싫어서

글머리에 따르면 당시에는 게임큐브용 비디오 인코더가 Wii 에서 동작하기 어렵다고 여겨졌다.
모더레이터 Shank 는 "안 된다는 답을 받아들이는 걸 별로 좋아하지 않는다" 며 오실로스코프로
기판의 비아 16개를 하나씩 측정했다. 글 맨 위에는 확인되지 않은 정보이니 시도는 본인
책임이라고 크게 적어 두었다.

![Shank 의 첫 글. 비아 16개에 번호를 붙인 기판 사진과 측정값](img/01-shank-first-post.jpg "출처: BitBuilt 포럼, Shank (#1)")

측정값을 보면 여러 비아에서 0V~1.8V 의 디지털 데이터가 나왔고, 9번 비아에서 54MHz 가
나왔다. Shank 의 결론은 게임큐브 인코더와 마찬가지로 디지털 영상선 8개와 54MHz 클럭이
있다는 것이다. 글은 "물고기라고 말하는 건 아니지만 비린내가 난다" 로 끝난다.

### 이미 알려진 내용이었다

Noah 는 1년 전에 신용카드 크기의 Wii 가 나올 거냐고 물었다면 절대 아니라고 했을 거라며
기대를 적었다. 관리자 Aurelio 는 GCVideo 를 만든 사람이 이미 확인한 내용이라고 답했다.
차이는 Wii 의 인코더가 1.8V 로직을 쓰고 게임큐브는 3.3V 로직을 쓴다는 점이다.

![Noah 와 Aurelio 의 답글](img/02-noah-aurelio.jpg "출처: BitBuilt 포럼, Noah (#2) · Aurelio (#3)")

Aurelio 가 이어서 붙인 GCVideo 문서의 해당 대목은 이렇다. Wii 기판을 측정해 보면 게임큐브의
디지털 비디오 포트와 같은 신호를 쓰는 내부 영상 데이터 버스가 있는 것으로 보이고, Wii 는
3.3V 가 아니라 1.8V 신호를 쓰므로 하드웨어를 고쳐야 할 수 있다는 내용이다.

Shank 의 답글은 이렇다. 이론이 맞아서 기쁘지만, 새로운 걸 찾은 줄 알았는데 아니어서
아쉽다고 했다. 이 이야기를 꺼낼 때마다 완전히 다르게 동작하니 그만 물어보라는 말을
들었다고도 적었다. 마지막 줄은 Wii 의 디지털 출력에 밝은 미래가 보인다는 말이다.

![이론이 맞았다는 Shank 의 답글](img/03-shank-reply.jpg "출처: BitBuilt 포럼, Shank (#4)")

### 첫 시도는 흑백으로 깨진 화면

같은 날 JacksonS 는 이 정보를 바탕으로 게임큐브 인코더를 Wii 에 연결해 봤고, 흑백으로
깨진 화면을 얻었다. 데이터 핀의 위치는 추측으로 정했고, Wii 의 54MHz 신호를 인코더의
27MHz 핀에 연결해야 했다고 한다. 컴포넌트 케이블에 들어가는 칩으로도 시도했지만 출력이
없었다.

Aurelio 가 짚은 문제는 Wii 의 GPU 가 1.8V 로직 신호를 낸다는 것이다. 입출력 핀마다
54MHz 까지 동작하는 레벨 시프터가 필요하다고 했다.

![JacksonS 의 첫 시도와 Aurelio 의 답](img/04-jacksons-attempt.jpg "출처: BitBuilt 포럼, JacksonS (#8) · Aurelio (#9). 깨진 화면 사진은 지금 열리지 않는다")

### 정리

- 게임큐브 인코더처럼 디지털 영상선 8개와 54MHz 클럭이 있다.
- 로직 전압이 다르다. 게임큐브는 3.3V, Wii 는 1.8V 다.
- 밖으로 나온 커넥터가 없어서 기판의 비아에 직접 납땜해야 한다.

## 결과물: Wii 용 HDMI 보드

### fujiflex

[fujiflex](https://github.com/mackieks/fujiflex) 는 Wii 에 넣는 GCVideo 보드다. 저장소
문서에 적힌 사양은 이렇다.

- 28×30mm 2층 플렉스 PCB, 부품값 약 10달러
- 3.3V 와 1.8V 전원을 받고, 1.2V 는 1.8V 에서 만든다
- 소비 전력 225mW
- 4층 Wii 메인보드의 디지털 A/V 비아에 직접 납땜한다
- GCVideo 비트스트림을 SPI 플래시에 써서 쓴다. CH341A 같은 SPI 프로그래머와 flashrom 을 쓸 수 있다

### Short Stack

[Short Stack](https://github.com/loopj/short-stack) 은 잘라낸 Wii 메인보드와 직접 만든
기판을 쌓아 만든 초소형 Wii 다. 저장소는 실제 비율을 유지한 Wii 중 가장 작다고 소개한다.
USB-C 로 전원을 받고, 영상과 소리는 GCVideo 기반의 HDMI 로 내보낸다. 디지털 A/V 출력에
fujiflex 를 쓴다.

## 마치며

화면이 디지털이면 중간에 아날로그를 거칠 이유가 없다. 변환 단계를 하나 없애면 화질, 지연,
전력이 함께 나아진다.

## 참고 자료

- GCVideo (Ingo Korb): <https://github.com/ikorb/gcvideo>
- GCVideo Wii 설치 문서: <https://github.com/ikorb/gcvideo/blob/main/HDL/gcvideo_dvi/README-Wii.md>
- BitBuilt 작업 기록, Analyzing the Wii's Video Encoder: <https://bitbuilt.net/forums/threads/analyzing-the-wiis-video-encoder.206/>
- fujiflex: <https://github.com/mackieks/fujiflex>
- Short Stack: <https://github.com/loopj/short-stack>
- The Definitive Wii Trimming Guide: <https://bitbuilt.net/forums/threads/the-definitive-wii-trimming-guide.198/>
