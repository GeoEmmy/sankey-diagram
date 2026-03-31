import {
  state,
  addColumn,
  removeColumn,
  addNode,
  removeNode,
  updateNodeColor,
  updateNodeValue,
  updateNodeName,
  addOrUpdateLink,
  removeLink,
  updateLinkValue,
  getOutgoingLinks,
  getNextColumnNodes,
  getNodeById,
  isFirstColumnNode
} from './state.js'

export function renderEditor(container) {
  container.innerHTML = state.columns.map(column => renderColumn(column)).join('')
  bindEditorEvents(container)
}

function renderColumn(column) {
  const nextNodes = getNextColumnNodes(column.index)
  const isFirstColumn = column.index === 0

  return `
    <div class="column-block" data-column-id="${column.id}">
      <div class="column-header">
        <span>열 ${column.index + 1} ${isFirstColumn ? '(입력)' : '(자동계산)'}</span>
        <button class="remove-col-btn" data-column-id="${column.id}" title="열 삭제">×</button>
      </div>

      <div class="node-list">
        ${column.nodes.map(node => renderNode(node, nextNodes, isFirstColumn)).join('')}
      </div>

      <div class="node-input-row">
        <input type="text" class="node-name-input" placeholder="노드 이름" data-column-id="${column.id}">
        ${isFirstColumn ? `
          <input type="number" class="node-value-input" placeholder="수치" value="100" min="0" data-column-id="${column.id}">
        ` : ''}
        <button class="add-node-btn" data-column-id="${column.id}">반영</button>
      </div>
    </div>
  `
}

function renderNode(node, nextNodes, isFirstColumn) {
  const outgoingLinks = getOutgoingLinks(node.id)

  return `
    <div class="node-item" data-node-id="${node.id}">
      <div class="node-main-row">
        <input type="color" class="node-color" value="${node.color}" data-node-id="${node.id}">
        <input type="text" class="node-name-edit" value="${node.name}" data-node-id="${node.id}">
        ${isFirstColumn ? `
          <input type="number" class="node-value" value="${node.value}" min="0" data-node-id="${node.id}" title="노드 수치">
        ` : `
          <span class="node-value-display" title="들어오는 링크 합계">${node.value}</span>
        `}
        <button class="node-delete" data-node-id="${node.id}">×</button>
      </div>

      ${nextNodes.length > 0 ? `
        <div class="link-section">
          <div class="link-header">
            <span>→ 연결:</span>
            <select class="add-link-select" data-source-id="${node.id}">
              <option value="">+ 연결 추가</option>
              ${nextNodes
                .filter(target => !outgoingLinks.find(l => l.target === target.id))
                .map(target => `
                  <option value="${target.id}">${target.name}</option>
                `).join('')}
            </select>
          </div>
          <div class="link-list">
            ${outgoingLinks.map(link => {
              const targetNode = getNodeById(link.target)
              return targetNode ? `
                <div class="link-item" data-source="${node.id}" data-target="${link.target}">
                  <span class="link-target-name">${targetNode.name}</span>
                  <input type="number" class="link-value" value="${link.value}" min="1"
                         data-source="${node.id}" data-target="${link.target}" title="연결 수치">
                  <button class="link-delete" data-source="${node.id}" data-target="${link.target}">×</button>
                </div>
              ` : ''
            }).join('')}
          </div>
          ${outgoingLinks.length > 0 ? `
            <div class="link-summary">
              합계: ${outgoingLinks.reduce((sum, l) => sum + l.value, 0)} / ${node.value}
              ${outgoingLinks.reduce((sum, l) => sum + l.value, 0) !== node.value ?
                `<span class="warning">⚠</span>` :
                `<span class="ok">✓</span>`}
            </div>
          ` : ''}
        </div>
      ` : ''}
    </div>
  `
}

function bindEditorEvents(container) {
  // 열 삭제
  container.querySelectorAll('.remove-col-btn').forEach(btn => {
    btn.onclick = () => removeColumn(btn.dataset.columnId)
  })

  // 노드 추가 (반영 버튼)
  container.querySelectorAll('.add-node-btn').forEach(btn => {
    btn.onclick = () => {
      const columnId = btn.dataset.columnId
      const nameInput = container.querySelector(`.node-name-input[data-column-id="${columnId}"]`)
      const valueInput = container.querySelector(`.node-value-input[data-column-id="${columnId}"]`)
      const value = valueInput ? valueInput.value : 0
      if (nameInput.value.trim()) {
        addNode(columnId, nameInput.value, value)
        nameInput.value = ''
        if (valueInput) valueInput.value = '100'
      }
    }
  })

  // Enter 키로 노드 추가
  container.querySelectorAll('.node-name-input').forEach(input => {
    input.onkeypress = (e) => {
      if (e.key === 'Enter') {
        const columnId = input.dataset.columnId
        const valueInput = container.querySelector(`.node-value-input[data-column-id="${columnId}"]`)
        const value = valueInput ? valueInput.value : 0
        if (input.value.trim()) {
          addNode(columnId, input.value, value)
          input.value = ''
          if (valueInput) valueInput.value = '100'
        }
      }
    }
  })

  // 노드 삭제
  container.querySelectorAll('.node-delete').forEach(btn => {
    btn.onclick = () => removeNode(btn.dataset.nodeId)
  })

  // 노드 색상 변경
  container.querySelectorAll('.node-color').forEach(input => {
    input.onchange = () => updateNodeColor(input.dataset.nodeId, input.value)
  })

  // 노드 이름 변경
  container.querySelectorAll('.node-name-edit').forEach(input => {
    input.onchange = () => updateNodeName(input.dataset.nodeId, input.value)
  })

  // 노드 수치 변경 (첫 열만)
  container.querySelectorAll('.node-value').forEach(input => {
    input.onchange = () => updateNodeValue(input.dataset.nodeId, input.value)
  })

  // 연결 추가 (드롭다운 선택)
  container.querySelectorAll('.add-link-select').forEach(select => {
    select.onchange = () => {
      if (select.value) {
        addOrUpdateLink(select.dataset.sourceId, select.value, 10)
        select.value = ''
      }
    }
  })

  // 연결 수치 변경
  container.querySelectorAll('.link-value').forEach(input => {
    input.onchange = () => {
      updateLinkValue(input.dataset.source, input.dataset.target, input.value)
    }
  })

  // 연결 삭제
  container.querySelectorAll('.link-delete').forEach(btn => {
    btn.onclick = () => removeLink(btn.dataset.source, btn.dataset.target)
  })
}
