import * as d3 from 'd3'
import { sankey as d3Sankey, sankeyLinkHorizontal, sankeyLeft } from 'd3-sankey'
import { state, toSankeyData } from './state.js'

let svg, width, height
const margin = { top: 20, right: 120, bottom: 20, left: 20 }

export function initSankey(container) {
  const rect = container.getBoundingClientRect()
  width = rect.width
  height = rect.height

  svg = d3.select(container)
    .append('svg')
    .attr('width', width)
    .attr('height', height)
    .append('g')
    .attr('transform', `translate(${margin.left},${margin.top})`)

  // 리사이즈 처리
  const resizeObserver = new ResizeObserver(entries => {
    const { width: w, height: h } = entries[0].contentRect
    width = w
    height = h
    d3.select(container).select('svg')
      .attr('width', w)
      .attr('height', h)
    renderSankey()
  })
  resizeObserver.observe(container)
}

export function renderSankey() {
  if (!svg) return

  const data = toSankeyData()

  // 기존 요소 제거
  svg.selectAll('*').remove()

  // 노드가 없으면 안내 메시지
  if (data.nodes.length === 0) {
    svg.append('text')
      .attr('x', (width - margin.left - margin.right) / 2)
      .attr('y', (height - margin.top - margin.bottom) / 2)
      .attr('text-anchor', 'middle')
      .attr('fill', '#999')
      .attr('font-size', '16px')
      .text('열을 추가하고 노드를 입력하세요')
    return
  }

  // 링크가 없으면 노드만 표시
  if (data.links.length === 0) {
    renderNodesOnly(data.nodes)
    return
  }

  const innerWidth = width - margin.left - margin.right
  const innerHeight = height - margin.top - margin.bottom

  // Sankey 레이아웃
  const sankeyGenerator = d3Sankey()
    .nodeWidth(60)
    .nodePadding(15)
    .nodeAlign(sankeyLeft)
    .extent([[0, 0], [innerWidth, innerHeight]])

  try {
    const { nodes, links } = sankeyGenerator({
      nodes: data.nodes.map(d => ({ ...d })),
      links: data.links.map(d => ({ ...d }))
    })

    // 링크 렌더링
    renderLinks(links)

    // 노드 렌더링
    renderNodes(nodes)
  } catch (e) {
    console.error('Sankey render error:', e)
    renderNodesOnly(data.nodes)
  }
}

function renderLinks(links) {
  const linkGroup = svg.append('g').attr('class', 'sankey-links')

  // 링크 패스
  linkGroup.selectAll('path')
    .data(links)
    .join('path')
    .attr('class', 'sankey-link')
    .attr('d', sankeyLinkHorizontal())
    .attr('stroke', d => d.source.color || '#aaa')
    .attr('stroke-width', d => Math.max(1, d.width))
    .attr('fill', 'none')
    .attr('stroke-opacity', 0.4)
    .on('mouseover', function() {
      d3.select(this).attr('stroke-opacity', 0.7)
    })
    .on('mouseout', function() {
      d3.select(this).attr('stroke-opacity', 0.4)
    })

  // 링크 수치 텍스트
  if (state.showText) {
    const linkLabels = svg.append('g').attr('class', 'sankey-link-labels')

    linkLabels.selectAll('text')
      .data(links)
      .join('text')
      .attr('class', 'sankey-link-label')
      .attr('x', d => d.source.x1 + 100)
      .attr('y', d => d.y0)
      .attr('dy', '0.35em')
      .attr('text-anchor', 'start')
      .attr('fill', '#666')
      .attr('font-size', '10px')
      .attr('font-weight', '500')
      .attr('pointer-events', 'none')
      .text(d => d.value)
  }
}

function renderNodes(nodes) {
  const nodeGroup = svg.append('g').attr('class', 'sankey-nodes')

  const node = nodeGroup.selectAll('g')
    .data(nodes)
    .join('g')
    .attr('class', 'sankey-node')

  // 노드 사각형
  node.append('rect')
    .attr('x', d => d.x0)
    .attr('y', d => d.y0)
    .attr('height', d => Math.max(1, d.y1 - d.y0))
    .attr('width', d => d.x1 - d.x0)
    .attr('fill', d => d.color || '#4a90d9')
    .attr('rx', 2)
    .attr('ry', 2)

  // 텍스트 (이름 + 수치)
  if (state.showText) {
    node.append('text')
      .attr('x', d => d.x0 < (width - margin.left - margin.right) / 2 ? d.x1 + 8 : d.x0 - 8)
      .attr('y', d => (d.y1 + d.y0) / 2)
      .attr('dy', '0.35em')
      .attr('text-anchor', d => d.x0 < (width - margin.left - margin.right) / 2 ? 'start' : 'end')
      .attr('fill', '#333')
      .attr('font-size', '12px')
      .attr('font-weight', '500')
      .text(d => `${d.name} (${d.value})`)
  }
}

function renderNodesOnly(nodes) {
  const innerWidth = width - margin.left - margin.right
  const innerHeight = height - margin.top - margin.bottom

  // 열별로 노드 그룹화
  const columnGroups = new Map()
  nodes.forEach((node, idx) => {
    // state에서 원본 노드 찾기
    for (const col of state.columns) {
      const found = col.nodes.find(n => n.id === node.id)
      if (found) {
        if (!columnGroups.has(col.index)) {
          columnGroups.set(col.index, [])
        }
        columnGroups.get(col.index).push({ ...node, originalIndex: idx })
        break
      }
    }
  })

  const numColumns = columnGroups.size
  if (numColumns === 0) return

  const columnWidth = innerWidth / numColumns
  const nodeHeight = 30
  const nodePadding = 10

  const nodeGroup = svg.append('g').attr('class', 'sankey-nodes')

  columnGroups.forEach((colNodes, colIndex) => {
    const x = colIndex * columnWidth + columnWidth / 2 - 10

    colNodes.forEach((node, nodeIndex) => {
      const y = nodeIndex * (nodeHeight + nodePadding) + 50

      const g = nodeGroup.append('g').attr('class', 'sankey-node')

      g.append('rect')
        .attr('x', x)
        .attr('y', y)
        .attr('width', 60)
        .attr('height', nodeHeight)
        .attr('fill', node.color || '#4a90d9')
        .attr('rx', 2)

      if (state.showText) {
        g.append('text')
          .attr('x', x + 68)
          .attr('y', y + nodeHeight / 2)
          .attr('dy', '0.35em')
          .attr('fill', '#333')
          .attr('font-size', '12px')
          .text(`${node.name} (${node.value})`)
      }
    })
  })
}
