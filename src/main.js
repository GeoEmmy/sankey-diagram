import './style.css'
import { state, subscribe, addColumn, setShowText, exportState, loadState, resetState } from './state.js'
import { renderEditor } from './editor.js'
import { initSankey, renderSankey } from './sankey.js'

// DOM 준비
document.addEventListener('DOMContentLoaded', () => {
  const editorContainer = document.getElementById('editor')
  const chartContainer = document.getElementById('chart')

  // Sankey 차트 초기화
  initSankey(chartContainer)

  // 상태 변경 시 UI 업데이트
  subscribe(() => {
    renderEditor(editorContainer)
    renderSankey()
  })

  // 열 추가 버튼
  document.getElementById('add-column-btn').onclick = () => addColumn()

  // 텍스트 표시 토글
  document.getElementById('text-toggle').onchange = (e) => {
    setShowText(e.target.checked)
  }

  // SVG 다운로드
  document.getElementById('download-svg-btn').onclick = downloadSVG

  // JSON 저장
  document.getElementById('save-json-btn').onclick = saveJSON

  // JSON 불러오기
  const fileInput = document.getElementById('load-file-input')
  document.getElementById('load-json-btn').onclick = () => fileInput.click()
  fileInput.onchange = (e) => {
    const file = e.target.files[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (event) => {
        const success = loadState(event.target.result)
        if (success) {
          document.getElementById('text-toggle').checked = state.showText
          alert('불러오기 완료!')
        } else {
          alert('파일 형식이 올바르지 않습니다.')
        }
      }
      reader.readAsText(file)
      fileInput.value = '' // 같은 파일 다시 선택 가능하게
    }
  }

  // 초기화 버튼
  document.getElementById('reset-btn').onclick = () => {
    if (confirm('모든 데이터를 삭제하시겠습니까?')) {
      resetState()
      addColumn()
      addColumn()
    }
  }

  // 초기 열 2개 생성
  addColumn()
  addColumn()
})

function saveJSON() {
  const json = exportState()
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)

  const a = document.createElement('a')
  a.href = url
  a.download = `sankey-data-${Date.now()}.json`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

function downloadSVG() {
  const svgElement = document.querySelector('#chart svg')
  if (!svgElement) {
    alert('다이어그램이 없습니다')
    return
  }

  // SVG 복사 및 스타일 인라인
  const clone = svgElement.cloneNode(true)

  // 배경색 추가
  const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect')
  rect.setAttribute('width', '100%')
  rect.setAttribute('height', '100%')
  rect.setAttribute('fill', 'white')
  clone.insertBefore(rect, clone.firstChild)

  // 스타일 인라인
  clone.querySelectorAll('.sankey-link').forEach(el => {
    el.style.fill = 'none'
    el.style.strokeOpacity = '0.4'
  })

  const svgData = new XMLSerializer().serializeToString(clone)
  const blob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' })
  const url = URL.createObjectURL(blob)

  const a = document.createElement('a')
  a.href = url
  a.download = `sankey-diagram-${Date.now()}.svg`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
