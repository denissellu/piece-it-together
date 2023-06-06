import './style.css'
import Spaces from '@ably-labs/spaces'
import { nanoid } from 'nanoid'
import { uniqueNamesGenerator, adjectives, animals } from 'unique-names-generator';

// Set up random name for game
let gameName = uniqueNamesGenerator({
  dictionaries: [adjectives, animals],
  separator: '-',
  length: 2,
})

//See if you were invited in to a game
const urlParams = new URLSearchParams(window.location.search);
const gameNameFromParam = urlParams.get('game-id');

if(gameNameFromParam !== null) {
  gameName = gameNameFromParam

  startGame();
}

document.getElementById('create-new-game').addEventListener('click', function () {
  const newUrl = new URL(window.location);
  newUrl.searchParams.set('game-id', gameName);

  window.history.pushState(null, '', newUrl.toString());

  startGame();
})

function startGame() {
  document.getElementById('welcome-screen').setAttribute('class', 'hide');
  document.getElementById('game-screen').removeAttribute('class', 'hide');

  // For the puzzle
  const headbreaker = window.headbreaker

  const puzzleImage = new Image()
  const jsonExportArea = document.getElementById('json-export-area')

  // init and setup spaces
  const spaces = new Spaces({
    key: '#',
    clientId: nanoid()
  })
  const mySpace = spaces.get(gameName)

  document.getElementById('game-name').innerHTML += window.location.origin + '/?game-id=' + gameName

  mySpace.on('membersUpdate', (members) => {
    console.log(members)
  })

  mySpace.enter({ name: 'Denis' })

  puzzleImage.src = 'public/jigsaw-images/1.jpg'
  puzzleImage.onload = () => {
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
      fixed: true,
      image: puzzleImage
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

    document.getElementById('persistent-import').addEventListener('click', function () {
      jigsaw.clear()

      const dump = JSON.parse(jsonExportArea.value)

      jigsaw.renderPuzzle(headbreaker.Puzzle.import(dump))
      jigsaw.draw()
    })

    document.getElementById('persistent-export').addEventListener('click', function () {
      const dump = jigsaw.puzzle.export({ compact: true })

      jsonExportArea.value = JSON.stringify(dump, null, 2)
    })
  }
}
