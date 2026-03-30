# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Sankey Diagram Generator - 무제한 열과 노드를 지원하는 인터랙티브 Sankey 다이어그램 생성기

## Tech Stack

- **Build**: Vite
- **Visualization**: D3.js + d3-sankey
- **Deployment**: GitHub Pages (GitHub Actions)

## Commands

```bash
# 개발 서버 실행
npm run dev

# 프로덕션 빌드
npm run build

# 빌드 미리보기
npm run preview
```

## Architecture

```
src/
├── main.js     # 앱 진입점, 이벤트 바인딩, SVG 다운로드
├── state.js    # 전역 상태 관리 (columns, links, nodes)
├── editor.js   # 좌측 에디터 UI 렌더링
├── sankey.js   # D3 Sankey 차트 렌더링
└── style.css   # 스타일
```

### State Flow

1. `state.js`: 상태 변경 함수 호출 (addColumn, addNode, setLinks 등)
2. `subscribe()` 콜백 실행 → 모든 리스너에 notify
3. `editor.js`: UI 리렌더링
4. `sankey.js`: 차트 리렌더링

### Data Structure

```javascript
// 열
{ id: 'col_xxx', index: 0, nodes: [...] }

// 노드
{ id: 'node_xxx', name: '이름', color: '#hex', columnIndex: 0 }

// 링크
{ id: 'link_xxx', source: 'node_id', target: 'node_id', value: 1 }
```

### D3-Sankey 변환

`toSankeyData()` 함수가 state를 D3-sankey 입력 형식으로 변환:
- nodes: `[{ name, color }, ...]`
- links: `[{ source: index, target: index, value }, ...]`

## Key Files

- `src/state.js:toSankeyData()` - D3 형식 변환 로직
- `src/sankey.js:renderSankey()` - 차트 렌더링 메인 함수
- `src/editor.js:renderEditor()` - 에디터 UI 렌더링
