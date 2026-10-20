// Canvas 설정
game.width = 800
game.height = 800
const ctx = game.getContext('2d')

// 색상 상수
const background = '#333333'
const foreground = '#00ff00'

// 포인트 크기
const s = 20

// FPS 설정
const FPS = 60
const dt = 1 / FPS

// 화면 지우기 함수
function clear() {
  ctx.fillStyle = background
  ctx.fillRect(0, 0, game.width, game.height)
}

// 포인트 그리기 함수
function point({ x, y }) {
  ctx.fillStyle = foreground
  ctx.fillRect(x - s / 2, y - s / 2, s, s)
}

// 화면 좌표 변환 함수 (display 좌표 -> screen 좌표)
// 입력: x, y는 -1 ~ 1 범위
// 출력: 0 ~ width/height 범위
function screen({ x, y }) {
  const normalizedX = (x + 1) / 2
  const normalizedY = (y + 1) / 2
  return {
    x: normalizedX * game.width,
    y: (1 - normalizedY) * game.height, // Y축 뒤집기
  }
}

// 3D 투영 함수 (x/z, y/z)
function project({ x, y, z }) {
  return {
    x: x / z,
    y: y / z,
  }
}

// Z축 이동 함수
function translateZ({ x, y, z }, deltaZ) {
  return {
    x: x,
    y: y,
    z: z + deltaZ,
  }
}

// Y축 주위 회전 함수 (XZ 평면에서 회전)
function rotate({ x, y, z }, angle) {
  const c = Math.cos(angle)
  const s = Math.sin(angle)
  return {
    x: x * c - z * s,
    y: y,
    z: x * s + z * c,
  }
}

// 선 그리기 함수
function line(p1, p2) {
  ctx.beginPath()
  ctx.moveTo(p1.x, p1.y)
  ctx.lineTo(p2.x, p2.y)
  ctx.stroke()
}

// 큐브 정점 정의 (중심이 원점인 큐브)
// 앞면: z = 0.5, 뒷면: z = -0.5
const vs = [
  // 뒷면 (z = -0.5)
  { x: -0.25, y: -0.25, z: -0.25 },
  { x: 0.25, y: -0.25, z: -0.25 },
  { x: 0.25, y: 0.25, z: -0.25 },
  { x: -0.25, y: 0.25, z: -0.25 },
  // 앞면 (z = 0.5)
  { x: -0.25, y: -0.25, z: 0.25 },
  { x: 0.25, y: -0.25, z: 0.25 },
  { x: 0.25, y: 0.25, z: 0.25 },
  { x: -0.25, y: 0.25, z: 0.25 },
]

// 면 정의 (각 면은 정점 인덱스 배열)
const fs = [
  // 뒷면
  [0, 1, 2, 3],
  // 앞면
  [4, 5, 6, 7],
  // 연결선 (두 평면을 연결하여 큐브 만들기)
  [0, 4],
  [1, 5],
  [2, 6],
  [3, 7],
]

// 애니메이션 변수
let angle = 0

// 프레임 렌더링 함수
function frame() {
  clear()

  // 각도 업데이트 (1초에 1회전, 속도를 절반으로 줄임)
  angle += 2 * Math.PI * dt * 0.5

  // 모든 정점 변환 및 투영
  const transformed = []
  for (const v of vs) {
    // 회전 적용
    let rotated = rotate(v, angle)

    // Z축 이동 (화면에서 약간 떨어뜨림)
    let translated = translateZ(rotated, 1)

    // 3D -> 2D 투영
    const projected = project(translated)

    // 화면 좌표로 변환
    const screenPos = screen(projected)

    transformed.push(screenPos)
  }

  // 면 렌더링
  ctx.strokeStyle = foreground
  ctx.lineWidth = 3

  for (const f of fs) {
    if (f.length === 2) {
      // 연결선 (두 점만 있는 경우)
      const p1 = transformed[f[0]]
      const p2 = transformed[f[1]]
      line(p1, p2)
    } else {
      // 폴리곤 면 (여러 점이 있는 경우)
      for (let i = 0; i < f.length; i++) {
        const idx1 = f[i]
        const idx2 = f[(i + 1) % f.length] // 마지막 점은 첫 번째 점과 연결

        const p1 = transformed[idx1]
        const p2 = transformed[idx2]

        line(p1, p2)
      }
    }
  }

  // 다음 프레임 스케줄링
  setTimeout(frame, 1000 / FPS)
}

// 애니메이션 시작
frame()
