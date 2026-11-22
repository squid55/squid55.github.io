---
title: "Business Process Automation"
description: "대기열 파일 하나, 러너 스크립트 하나, 검증 게이트 하나. 세 가지 회사 업무를 세션 없이 계속 진행시키기 위해 만든 자동화의 설계와 첫날 결과"
date: 2026-11-23T01:35:00+09:00
tags: ["bpa", "ai", "에이전트", "자동화", "claude code", "systemd", "업무"]
toc: true
---

모회사 일 세 가지를 AI 에이전트에게 맡겨 두고 있었다. 해외 영업용 자료와 리드 목록을 만드는 일, 검색과 AI 답변에 회사 제품이 잡히게 하는 인바운드 자료를 만드는 일, 경쟁사 공개 자료를 기준선으로 삼아 자사 제품의 완성도 점검표를 만드는 일이다. 각각 터미널 세션 하나씩을 열어 두고 돌렸는데, 세션이 닫히면 멈추고, 다음 할 일은 매번 내가 「계속해」라고 쳐야 이어졌다.

이 글은 그 세 가지를 세션 없이 계속 돌아가게 하려고 만든 구조를 정리한 것이다. 에이전트가 프로그램을 만들고, 그 프로그램이 다시 에이전트를 부르는 모양이다. 회사 이름과 리드 데이터, 제품 수치는 이 글에 쓰지 않았다.

## 출발점: CTF 풀이 스크립트에서 본 것

Layer7 CTF 2026의 Pipecake라는 웹 문제가 있었다. Nix 기반 CI 플랫폼에서 모든 러너 컨테이너가 쓰기 가능한 `/nix` 볼륨을 공유한다는 설계 결함을 쓰는 문제였다. 참가자 한 분이 Discord에 풀이 스크립트와 라이트업을 공유했는데, 흥미로운 것은 문제 자체보다 그 스크립트가 처음부터 끝까지 자동으로 돌도록 짜여 있던 점이었다. 그분은 일정이 있어서 자동화 봇을 휴대폰 리모트컨트롤로 돌려 풀었다고 했다.

스크립트에서 가져올 만한 것은 여섯 가지였다.

- 단계를 함수로 나누고, 계정과 토큰 같은 중간 상태를 `state.json`에 저장한다. 다시 실행해도 있는 값은 건너뛴다.
- `--watch` 플래그로 세팅을 생략하고 회수 단계만 재개한다. 주최측이 인스턴스를 리셋했을 때 2분 만에 복구한 비결이었다.
- 단계별 산출물을 `stage1/`부터 `stage5/`까지 폴더로 남기고, 라이트업의 모든 주장을 그 파일로 뒷받침한다.
- 요청 간격, 실행 생성 제한, 타임아웃 같은 제약을 코드 안에 박는다.
- 다른 사용자가 심은 잘못된 래퍼가 플랫폼 전체를 멈춘 것을 보고, 자기 래퍼는 `--version`이 정상일 때만 설치하는 검증 게이트를 넣었다.
- 플래그가 잡히는 순간 자기 저장소로 push 하고, 그 파일 하나만 폴링한다. 큐 전체를 기다리지 않는다.

같은 분이 「자동화보다 직접 개입하면서 푸는 게 속도나 풀이 능력에서는 더 좋다」고 덧붙인 것도 기억해 둘 만했다. 아래 구조에서 「다음에 무엇을 할지」를 자동화하지 않은 이유다.

## 전체 구조

{{< svg src="architecture.svg" caption="대기열 세 개, 러너 하나, 타이머와 INBOX 감시. 바깥으로 나가는 행동은 없다" wide=true >}}

작업공간마다 `BACKLOG.md`와 `LOG.md`가 있다. 러너 `tick.sh`는 타이머가 부를 때마다 대기열에서 체크 안 된 첫 항목 하나를 골라 `claude -p`로 수행시키고, 끝나면 검증 게이트를 돌린 뒤 상태 파일과 알림을 갱신한다. 회사가 확인해 줘야 하는 값은 `INBOX/` 폴더에 파일로 넣으면 path 유닛이 감지해 세 작업공간을 한 번씩 돌린다.

| 작업공간 | 하는 일 | 타이머 |
|---|---|---|
| outbound | 해외 영업 리드 수집기, 메일 초안 렌더러, 랜딩과 스펙시트 | 08~22시 2시간마다 :00 |
| inbound | 정적 제품 사이트 생성기, AI 실사 모의 점검, 기사와 대본 | 같은 간격 :40 |
| completeness | 경쟁사 공개 매뉴얼 파서, 점검표 생성기, 자사 코드 정적 감사 | 같은 간격 :20 |

세 작업공간 안의 프로그램은 모두 에이전트가 세션 안에서 만든 것이다. 아웃바운드 쪽은 수집기와 병합·렌더·추적 도구가 열아홉 개, 약 3,600줄이다. 인바운드 쪽은 사이트 생성기와 검증기, 점검기가 여섯 개, 약 1,100줄이고, 이것이 252쪽짜리 정적 사이트를 만든다. 완성도 쪽은 매뉴얼·뉴스레터·릴리스노트·지원 문서 파서와 점검표 생성기가 일곱 개, 약 580줄이고, 문서 38편을 낸다. 러너 자체는 셸과 파이썬 합쳐 345줄이다.

## 대기열 문법

대기열은 마크다운 체크리스트다. 사람이 읽고 고치기 쉬운 쪽을 골랐다.

```markdown
- [ ] C2. 출입통제 단말·경보 패널 공개 데이터시트 수집 → docs/19 보강
- [ ] R4. every:7d last:2026-11-22 코드 레포 변경 감지, 있으면 정적 감사 재실행
- [ ] D1. blocked: 봇 차단된 문서 5종 — 사용자가 브라우저로 받아 INBOX에 넣으면 분석
```

규칙은 세 가지다. `blocked:`로 시작하면 건너뛴다. `every:Nd last:날짜`가 있으면 반복 항목이고, 체크 대신 `last:` 날짜만 갱신한다. 나머지는 끝나면 `[x]`가 된다. 파서 `queue.py`는 이 세 줄을 읽어 지금 실행할 항목 하나를 돌려주거나, 없으면 종료 코드 1을 낸다.

```python
def due(item, today):
    if item["every"] is None:
        return not item["done"]
    if item["done"]:
        return False
    if not item["last"]:
        return True
    return (today - date.fromisoformat(item["last"])).days >= item["every"]
```

대기열 머리에는 규칙 문단이 있다. 메일을 보내지 않는다, 개인 이름과 개인 메일을 저장하지 않는다, 외부 수집은 robots.txt를 확인하고 초당 1회 이하로 한다, 코드 레포는 읽기만 한다. 이 문단이 매 틱의 프롬프트와 함께 에이전트에게 들어간다.

## 틱 한 번의 흐름

{{< svg src="tick-pipeline.svg" caption="tick.sh 한 번의 흐름. 대기열이 비어 있으면 모델을 부르지 않는다" >}}

```bash
exec 9>"$ROOT/state/$WS.lock"; flock -n 9 || exit 0        # 같은 작업공간 중복 실행 금지
next="$(python3 -I queue.py "$WSPATH/BACKLOG.md" --next)" || next=""
[ -z "$next" ] && [ "$inbox_new" = 0 ] && exit 0            # 할 일 없음: 토큰 0

cp BACKLOG.md LOG.md "$RUN/"; touch "$RUN/start"             # 되돌릴 기준점
timeout 50m claude -p "$PROMPT" --permission-mode auto \
  --max-budget-usd 5 --output-format json < /dev/null > "$RUN/result.json"

python3 -I guard.py "$WS" "$WSPATH" --before "$RUN/BACKLOG.md" --since "$RUN/start" \
  || { cp "$RUN/BACKLOG.md" "$WSPATH/BACKLOG.md"; echo "- $(date '+%F %H:%M') guard 실패" >> LOG.md; }
```

CTF 스크립트에서 가져온 것이 그대로 보인다. `state/<작업공간>.json`이 상태 파일이고, `runs/<작업공간>-<시각>/`이 단계별 산출물 폴더다. 거기에 틱 시작 직전의 BACKLOG와 LOG 사본, 모델 응답 전문, 표준 오류, 게이트 결과가 남는다. 틱당 비용 상한과 시간 상한은 제약을 코드에 박은 것이고, `flock`은 타이머와 INBOX 트리거가 겹칠 때를 막는다.

프롬프트는 다섯 문장이다. INBOX부터 확인할 것, 이번 틱의 항목 하나만 할 것, 끝나면 LOG에 한 줄 쓸 것, 발송과 개인정보 저장 금지, 사용자에게 묻지 말고 가정을 LOG에 적고 진행할 것. 할 수 없으면 항목 앞에 `blocked: 이유`를 붙이게 했다.

## 검증 게이트

CTF 스크립트의 `--version` 검사에 해당하는 부분이다. 에이전트가 끝낸 뒤 `guard.py`가 네 가지를 본다.

| 검사 | 내용 | 실패하면 |
|---|---|---|
| G1 | BACKLOG 형식이 맞는지, 완료 수가 줄지 않았는지, INBOX 처리 없이 `blocked:`가 풀리지 않았는지 | 되돌림 |
| G2 | 이번 틱에 바뀐 파일에 개인 메일, 휴대폰 번호, 키나 토큰 패턴이 없는지 | 되돌림 |
| G3 | 파이썬과 셸에 `smtplib`, `sendmail` 같은 발송 코드가 없는지 | 되돌림 |
| G4 | LOG.md에 줄이 늘었는지 | 되돌림 |

실패하면 BACKLOG만 틱 전 사본으로 되돌리고, 산출물은 그대로 둔 채 LOG에 사유를 적는다. 다음 틱이 같은 항목을 다시 집는다. 산출물을 지우지 않는 것은, 게이트가 잡은 것이 패턴 오탐일 수도 있어서 사람이 보고 판단하게 두려는 것이다.

## 타이머와 INBOX

systemd 사용자 유닛이다. 서비스 템플릿 하나를 세 인스턴스로 쓰고, 분 오프셋만 drop-in으로 다르게 준다.

```ini
# ~/.config/systemd/user/wisecon-tick@.service
[Service]
Type=oneshot
ExecStart=%h/wisecon/automation/tick.sh %i
TimeoutStartSec=3600

# ~/.config/systemd/user/wisecon-tick@completeness.timer.d/schedule.conf
[Timer]
OnCalendar=
OnCalendar=*-*-* 08..22/2:20
```

INBOX는 path 유닛이다. 폴더에 파일이 들어오면 60초 뒤 세 작업공간을 차례로 돌린다. 처리된 파일은 `processed/`로 옮기고, 그 이동이 다시 path 유닛을 깨우지만 두 번째 틱은 새 파일이 없어 바로 끝난다. 로그인 세션 없이도 돌게 `loginctl enable-linger`를 켰다.

알림은 Discord 웹훅 한 줄이다. 환경 변수 파일이 비어 있으면 아무것도 보내지 않는다. 비용과 턴 수, LOG에 새로 적힌 마지막 줄이 들어간다.

## 첫날 결과

{{< note measured >}}
2026-11-22 08:20부터 14:20까지 여섯 틱이 돌았다. 전부 검증 게이트를 통과했고 발송이나 배포는 없었다. 합계 11.22 USD, 틱당 1~4분.
{{< /note >}}

| 시각 | 작업공간 | 한 일 | 비용 |
|---|---|---|---|
| 08:20 | completeness | 인터콤 매뉴얼 82쪽 분석, 접점 문서에 두 절 추가, 설계 원칙 8개 신설 | 1.77 |
| 08:40 | inbound | 가이드 40쪽의 내부 링크 점검, 생성기에 자동 연결 규칙과 검사 추가 | 0.99 |
| 10:20 | completeness | 출입통제·경보 패널 공개 PDF 12종 수집, 접점 문서 보강 | 2.26 |
| 10:40 | inbound | 주차 유도·열화상 요구사항 비교표 6쪽 생성 | 2.21 |
| 12:20 | completeness | 점검표 143항목에 검증 방법 보강, 문서 재생성 | 1.76 |
| 14:20 | completeness | 미충족 106항목을 P0~P3로 분류, 로드맵과 대조 | 2.23 |

16:20 이후는 대기열이 비어 모델을 부르지 않고 끝났다. 아웃바운드는 반복 항목 기한 전이라 하루 종일 비어 있었다.

10:40 틱의 비교표에서 눈에 띄는 것이 있었다. 요구사항 89개 중 회사 공개 사실로 확인되는 것이 1개뿐이고 나머지 88개는 `[회사 확인]` 자리표시자로 남았다. 자동화가 할 수 있는 것과 회사가 결정해야 하는 것의 경계가 그 숫자로 드러났다.

## 자동화하지 않은 것

- 메일과 메시지 발송, 사이트 배포, 보도자료 송고, 디렉토리 등록, 코드 레포 수정과 푸시. 전부 사람이 한다. 게이트 G3는 에이전트가 발송 코드를 만드는 것 자체를 막는다.
- 대기열이 비었을 때 다음 일을 정하는 것. 주 1회 휴대폰에서 BACKLOG에 서너 줄을 적는 것으로 남겼다.
- 회사 확인값. INBOX에 들어오기 전까지 `blocked:` 항목은 건드리지 않는다.

Anthropic의 「Building effective agents」 글은 정해진 코드 경로로 LLM을 엮는 것을 워크플로, LLM이 스스로 과정을 정하는 것을 에이전트라고 나눈다. 이 구조는 바깥이 워크플로이고 안쪽이 에이전트다. 타이머, 잠금, 대기열 선택, 게이트, 되돌림은 전부 셸과 파이썬이 정해진 대로 하고, 항목 하나를 어떻게 끝낼지만 모델이 정한다.

## 클라우드 스케줄을 쓰지 않은 이유

Claude Code에는 클라우드에서 cron으로 도는 루틴이 있다. 노트북이 꺼져도 돌지만, 작업공간을 GitHub 저장소로 올려야 하고 리드 목록과 API 키가 같이 올라간다. 헤드리스 Chrome으로 PDF를 만드는 단계도 거기서는 못 한다. 리드 데이터가 없는 인바운드 월간 재측정 정도만 올릴 만하다고 보고, 일단 로컬 타이머로 갔다.

한 세션 안에서 Stop 훅으로 종료를 막아 계속 돌리는 방법도 있다. 설정 한 곳으로 끝나지만 세션이 닫히면 같이 끝나는 한계는 같아서, 타이머로 가기 전 과도기용으로만 봤다.

## 참고 자료

공식 문서와 저장소.

- [Claude Code 헤드리스(print) 모드](https://code.claude.com/docs/en/headless) — `-p`, `--output-format json`, `--bare`. 러너가 쓰는 인터페이스다.
- [Claude Code 훅](https://code.claude.com/docs/en/hooks) — `Stop` 훅과 `stop_hook_active` 플래그. 세션 안 루프의 대안.
- [Claude Agent SDK (Python)](https://github.com/anthropics/claude-agent-sdk-python) — 셸 대신 파이썬에서 같은 일을 하려면 이것. `query()`가 CLI를 stdio로 감싼다.
- [Building effective agents](https://www.anthropic.com/engineering/building-effective-agents) — 워크플로와 에이전트의 구분.
- [systemd.timer](https://www.freedesktop.org/software/systemd/man/latest/systemd.timer.html), [systemd.path](https://www.freedesktop.org/software/systemd/man/latest/systemd.path.html) — 사용자 유닛의 `OnCalendar`와 `PathChanged`.

같은 생각으로 만든 다른 프로젝트. 이름은 Geoffrey Huntley가 붙인 「Ralph Wiggum 루프」에서 왔고, 같은 프롬프트를 끝날 때까지 반복해서 넣는 방식이다. 별 수가 적은 것도 있으니 돌리기 전에 코드를 읽어야 한다.

- [Th0rgal/open-ralph-wiggum](https://github.com/Th0rgal/open-ralph-wiggum) — Claude Code, Codex, Copilot CLI 등 여러 에이전트를 반복 루프로 감싼다.
- [frankbria/ralph-claude-code](https://github.com/frankbria/ralph-claude-code) — 진행 상황을 추적하며 안전 한도까지 반복 실행.
- [flowglad/ralph](https://github.com/flowglad/ralph) — 구현 계획에서 작업을 집어 구현, 검증, 커밋을 반복. Docker 샌드박스 지원.

이 글의 러너와 이들 프로젝트의 차이는, 반복 단위가 「프롬프트 다시 넣기」가 아니라 「대기열 항목 하나」이고, 끝났는지를 모델이 아니라 체크박스와 게이트가 정한다는 점이다. 어느 쪽이 나은지는 아직 모른다. 첫날 여섯 틱으로는 판단하기 이르다.
