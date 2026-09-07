# 릴리스 공지 작성

공지 주소: https://sioaeko.github.io/scriptplayer-plus-docs/releases/

기존 사용 설명서와 별도로 관리하는 한국어 공지입니다. `releases/posts/`의 Markdown 파일로 목록과 개별 HTML을 생성합니다. 브라우저에서는 JavaScript나 GitHub API 없이 읽을 수 있습니다.

## 최초 준비

Python 3.11 이상을 사용합니다. 저장소 루트에서 실행하세요.

```powershell
python -m pip install -r tools/releases/requirements.txt
```

## 공지 추가

1. 작성 양식을 복사합니다. 파일 이름이 개별 공지 주소가 되므로, 게시 후에는 이름을 유지하세요.

   ```powershell
   Copy-Item tools/releases/announcement.md releases/posts/v1.2.3.md
   ```

2. 복사한 파일의 제목, 날짜, 버전, 요약과 본문을 작성합니다.

   - `title`: 공지 제목. 본문에 같은 제목을 다시 쓰지 않습니다.
   - `date`: 게시 날짜. `2026-09-08`처럼 따옴표 없이 적습니다.
   - `version`: `"v1.2.3"`처럼 적습니다. 버전과 무관한 안내는 이 줄을 지워도 됩니다.
   - `summary`: 목록과 본문 상단에 표시할 짧은 요약.
   - `draft`: 작성 중에는 `true`, 게시할 때는 `false`.
   - 본문: Markdown 문단, `##` 제목, 목록, 링크, 이미지, 코드 블록을 사용할 수 있습니다. 이미지 경로는 생성된 `/releases/파일이름.html`을 기준으로 적습니다.

3. 게시할 글의 `draft = false`를 설정한 뒤 HTML을 생성합니다.

   ```powershell
   python tools/releases/build.py
   python -m http.server 8765 --bind 127.0.0.1
   ```

   http://localhost:8765/releases/ 에서 목록과 본문을 확인하세요. 예시 파일의 본문 주소는 `/releases/v1.2.3.html`입니다.

4. 원본 Markdown과 생성된 HTML을 함께 커밋하고 `main`에 푸시하면 GitHub Pages에 반영됩니다. HTML은 생성 결과이므로 수정은 Markdown에서 진행하세요.

## 동작

- 공지는 날짜 내림차순으로 정렬합니다. 날짜가 같으면 파일 이름 내림차순입니다.
- `draft = true`인 글은 목록과 개별 HTML에 포함되지 않습니다. 다만 이 저장소는 공개이므로 커밋한 Markdown 원본은 공개됩니다. 비공개 초안은 저장소 밖에 보관하세요.
- 날짜는 표시와 정렬에만 사용합니다. 예약 발행 기능은 없습니다.
- 원본을 삭제하거나 다시 초안으로 바꾼 뒤 빌드하면 해당 글의 생성된 HTML도 제거됩니다.
- 글이 없으면 목록에 빈 상태 안내를 표시합니다. 양식 파일은 자동 게시되지 않습니다.
- `python tools/releases/build.py --check`는 생성 결과가 최신인지 검사합니다.

디자인은 `releases/releases.css`, 공통 HTML은 `tools/releases/page.html`에서 수정합니다. 이 도구는 기존 문서와 번역 파일을 변경하지 않습니다.
