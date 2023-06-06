import './style.css'

const headbreaker = window.headbreaker

const jigsaw = new headbreaker.Canvas('puzzle', {
  width: 1000,
  height: 1000,
  preventOffstageDrag: true,
  pieceSize: 100,
  outline: new headbreaker.outline.Rounded(),
  proximity: 20,
  borderFill: 10,
  strokeWidth: 2,
  lineSoftness: 0.18,
  fixed: true
})

jigsaw.autogenerate({
  horizontalPiecesCount: 3,
  verticalPiecesCount: 3
})

jigsaw.attachSolvedValidator()

jigsaw.onValid(() => {
  setTimeout(() => {
    if (jigsaw.puzzle.isValid()) {
      alert('WHOOOOOP!!!!')
    }
  }, 500)
})

jigsaw.shuffle(0.8)
jigsaw.draw()
