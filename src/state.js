// 색상 팔레트 (자동 할당용)
const COLOR_PALETTE = [
  '#4e79a7', '#f28e2c', '#e15759', '#76b7b2', '#59a14f',
  '#edc949', '#af7aa1', '#ff9da7', '#9c755f', '#bab0ab'
]

let colorIndex = 0
function getNextColor() {
  const color = COLOR_PALETTE[colorIndex % COLOR_PALETTE.length]
  colorIndex++
  return color
}

// 앱 상태
export const state = {
  columns: [],
  links: [],
  showText: true
}

// 이벤트 리스너들
const listeners = []

export function subscribe(fn) {
  listeners.push(fn)
  return () => {
    const idx = listeners.indexOf(fn)
    if (idx > -1) listeners.splice(idx, 1)
  }
}

function notify() {
  // 알림 전에 계산된 값 업데이트
  recalculateNodeValues()
  listeners.forEach(fn => fn(state))
}

// 들어오는 링크 합계로 노드 값 재계산 (첫 열 제외)
function recalculateNodeValues() {
  state.columns.forEach((column, colIndex) => {
    if (colIndex === 0) return // 첫 열은 수동 입력

    column.nodes.forEach(node => {
      const incomingLinks = state.links.filter(l => l.target === node.id)
      if (incomingLinks.length > 0) {
        node.value = incomingLinks.reduce((sum, link) => sum + (link.value || 0), 0)
      }
      // 들어오는 링크가 없으면 기존 값 유지 (또는 0)
    })
  })
}

// 열 ID 카운터
let columnIdCounter = 0

// 열 추가
export function addColumn() {
  columnIdCounter++
  const column = {
    id: `col_${columnIdCounter}_${Math.random().toString(36).substr(2, 5)}`,
    index: state.columns.length,
    nodes: []
  }
  state.columns.push(column)
  notify()
  return column
}

// 열 삭제
export function removeColumn(columnId) {
  const idx = state.columns.findIndex(c => c.id === columnId)
  if (idx === -1) return

  const nodeIds = state.columns[idx].nodes.map(n => n.id)
  state.links = state.links.filter(l =>
    !nodeIds.includes(l.source) && !nodeIds.includes(l.target)
  )

  state.columns.splice(idx, 1)
  state.columns.forEach((col, i) => col.index = i)
  notify()
}

// 노드 추가 (이름 + 수치)
export function addNode(columnId, name, value = 100) {
  const column = state.columns.find(c => c.id === columnId)
  if (!column || !name.trim()) return null

  const node = {
    id: `node_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
    name: name.trim(),
    value: Math.max(0, parseInt(value) || 0),
    color: getNextColor(),
    columnIndex: column.index
  }
  column.nodes.push(node)
  notify()
  return node
}

// 노드 삭제
export function removeNode(nodeId) {
  for (const column of state.columns) {
    const idx = column.nodes.findIndex(n => n.id === nodeId)
    if (idx > -1) {
      column.nodes.splice(idx, 1)
      state.links = state.links.filter(l =>
        l.source !== nodeId && l.target !== nodeId
      )
      notify()
      return
    }
  }
}

// 노드 수치 변경 (첫 열만 가능)
export function updateNodeValue(nodeId, value) {
  for (const column of state.columns) {
    const node = column.nodes.find(n => n.id === nodeId)
    if (node && column.index === 0) {
      node.value = Math.max(0, parseInt(value) || 0)
      notify()
      return
    }
  }
}

// 노드 색상 변경
export function updateNodeColor(nodeId, color) {
  for (const column of state.columns) {
    const node = column.nodes.find(n => n.id === nodeId)
    if (node) {
      node.color = color
      notify()
      return
    }
  }
}

// 노드 이름 변경
export function updateNodeName(nodeId, name) {
  if (!name.trim()) return
  for (const column of state.columns) {
    const node = column.nodes.find(n => n.id === nodeId)
    if (node) {
      node.name = name.trim()
      notify()
      return
    }
  }
}

// 단일 링크 추가/업데이트
export function addOrUpdateLink(sourceId, targetId, value = 10) {
  const existing = state.links.find(l => l.source === sourceId && l.target === targetId)
  if (existing) {
    existing.value = Math.max(1, parseInt(value) || 1)
  } else {
    state.links.push({
      id: `link_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      source: sourceId,
      target: targetId,
      value: Math.max(1, parseInt(value) || 10)
    })
  }
  notify()
}

// 링크 삭제
export function removeLink(sourceId, targetId) {
  state.links = state.links.filter(l => !(l.source === sourceId && l.target === targetId))
  notify()
}

// 링크 값 업데이트
export function updateLinkValue(sourceId, targetId, value) {
  const link = state.links.find(l => l.source === sourceId && l.target === targetId)
  if (link) {
    link.value = Math.max(1, parseInt(value) || 1)
    notify()
  }
}

// 텍스트 표시 토글
export function setShowText(show) {
  state.showText = show
  notify()
}

// D3-sankey 형식으로 변환
export function toSankeyData() {
  const nodes = []
  const nodeIndexMap = new Map()

  let globalIdx = 0
  state.columns.forEach(column => {
    column.nodes.forEach(node => {
      nodeIndexMap.set(node.id, globalIdx)
      nodes.push({
        id: node.id,
        name: node.name,
        value: node.value,
        color: node.color
      })
      globalIdx++
    })
  })

  const links = state.links
    .filter(l => nodeIndexMap.has(l.source) && nodeIndexMap.has(l.target))
    .map(l => ({
      source: nodeIndexMap.get(l.source),
      target: nodeIndexMap.get(l.target),
      value: l.value || 1
    }))

  return { nodes, links }
}

// 특정 노드에서 나가는 링크들 가져오기
export function getOutgoingLinks(sourceId) {
  return state.links.filter(l => l.source === sourceId)
}

// 다음 열의 노드들 가져오기
export function getNextColumnNodes(columnIndex) {
  const nextColumn = state.columns[columnIndex + 1]
  return nextColumn ? nextColumn.nodes : []
}

// 노드 정보 가져오기
export function getNodeById(nodeId) {
  for (const column of state.columns) {
    const node = column.nodes.find(n => n.id === nodeId)
    if (node) return node
  }
  return null
}

// 노드가 첫 열에 있는지 확인
export function isFirstColumnNode(nodeId) {
  if (state.columns.length === 0) return false
  return state.columns[0].nodes.some(n => n.id === nodeId)
}

// 상태 내보내기 (JSON)
export function exportState() {
  return JSON.stringify({
    columns: state.columns,
    links: state.links,
    showText: state.showText
  }, null, 2)
}

// 상태 불러오기 (JSON)
export function loadState(jsonString) {
  try {
    const data = JSON.parse(jsonString)
    if (data.columns && Array.isArray(data.columns)) {
      state.columns = data.columns
      state.links = data.links || []
      state.showText = data.showText !== false
      notify()
      return true
    }
    return false
  } catch (e) {
    console.error('Failed to load state:', e)
    return false
  }
}

// 상태 초기화
export function resetState() {
  state.columns = []
  state.links = []
  state.showText = true
  notify()
}
