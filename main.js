import './style.css'
import Spaces from '@ably-labs/spaces'
import throttle from 'lodash.throttle'
import { nanoid } from 'nanoid'
import { uniqueNamesGenerator, adjectives, animals } from 'unique-names-generator'

const cursorSvg = (startColor = '#06B6D4', endColor = '#ffffff', id) => {
  return `
    <svg width="27" height="27" viewBox="0 0 27 27" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M0.391407 3.21084L7.76105 25.3198C8.27823 26.8713 10.2474 27.3361 11.4038 26.1797L26.1431 11.4404C27.2995 10.284 26.8347 8.31485 25.2831 7.79767L3.17421 0.42803C1.45434 -0.145257 -0.181883 1.49097 0.391407 3.21084Z" fill="url(#gradient-${id})"/>
      <defs>
        <linearGradient id="gradient-${id}" x1="28.6602" y1="-0.963373" x2="-0.999994" y2="28.6968" gradientUnits="userSpaceOnUse">
          <stop stop-color="${startColor}"/>
          <stop offset="1" stop-color="${endColor}"/>
        </linearGradient>
      </defs>
    </svg>`
}

let gameName
const clientId = nanoid()

// init and setup spaces
const spaces = new Spaces({
  key: 'hSA6lQ.MEZtyg:9485o7SPceb8pH-p3jYiYeTL2ZR9MFVfuzzF3lIfQX0',
  clientId
})

let mySpace

// JOINING GAME
// See if you were invited in to a game
const urlParams = new URLSearchParams(window.location.search)
const gameNameFromParam = urlParams.get('game-id')

if (gameNameFromParam !== null) {
  gameName = gameNameFromParam

  mySpace = await spaces.get(gameName, { cursors: { outboundBatchInterval: 200 } })

  document.getElementById('welcome-screen').setAttribute('class', 'hide')
  document.getElementById('user-sign-in').removeAttribute('class', 'hide')
}

// NEW GAME CREATION
document.getElementById('create-new-game').addEventListener('click', function () {
  showCutePetSelection()
})

function showCutePetSelection () {
  document.getElementById('welcome-screen').setAttribute('class', 'hide')
  document.getElementById('choose-cute-pet').removeAttribute('class', 'hide')
}

const cutePetsElements = document.querySelectorAll('.cute-pet')
let cutePetId

cutePetsElements.forEach(el => el.addEventListener('click', async event => {
  cutePetId = event.target.getAttribute('data-cute-pet-id')

  gameName = uniqueNamesGenerator({
    dictionaries: [adjectives, animals],
    separator: '-',
    length: 2
  }) + '-' + cutePetId

  const newUrl = new URL(window.location)
  newUrl.searchParams.set('game-id', gameName)

  mySpace = await spaces.get(gameName, { cursors: { outboundBatchInterval: 200 } })

  window.history.pushState(null, '', newUrl.toString())

  showSignInScreen()
}))

async function signInPlayerInToSpace () {
  const username = document.querySelector('#user-sign-in .username').value

  await mySpace.enter({
    username
  })
}

function showSignInScreen () {
  document.getElementById('choose-cute-pet').setAttribute('class', 'hide')
  document.getElementById('user-sign-in').removeAttribute('class', 'hide')
}

document.getElementById('join-game').addEventListener('click', async function () {
  await signInPlayerInToSpace()
  startGame()
})

// MAIN GAMEPLAY FUNCTION
function startGame () {
  document.getElementById('user-sign-in').setAttribute('class', 'hide')
  document.getElementById('game-screen').removeAttribute('class', 'hide')

  // For the puzzle
  const headbreaker = window.headbreaker

  const puzzleImage = new Image()

  document.getElementById('game-name').innerHTML += window.location.origin + '/?game-id=' + gameName

  const playersConnected = (player) => player.isConnected === true

  cutePetId = gameName.split('-').pop()

  puzzleImage.src = 'jigsaw-images/' + cutePetId + '.jpg'
  puzzleImage.onload = () => {
    const updateGameChannel = mySpace.client.channels.get('updateGame')

    mySpace.on('enter', (player) => {
      const chosenPlayer = mySpace.getMembers().filter(playersConnected)

      if (chosenPlayer.length !== 0) {
        if (chosenPlayer[0].clientId === clientId) {
          const gameState = jigsaw.puzzle.export({ compact: true })
          updateGameChannel.publish('updateGameState', gameState)
        }
      }
    })

    // FOR THE CURSOR
    const createCursor = (connectionId, profileData) => {
      const container = document.createElement('div')
      container.id = `cursor-${connectionId}`
      container.classList.add('absolute')

      const cursor = document.createElement('div')
      cursor.innerHTML = cursorSvg(
        '#' + Math.floor(Math.random() * 16777215).toString(16),
        '#' + Math.floor(Math.random() * 16777215).toString(16),
        connectionId
      )

      const label = document.createElement('p')
      label.classList.add('absolute')

      label.innerHTML = profileData.username

      container.appendChild(cursor)
      container.appendChild(label)

      return container
    }

    const gameContainer = document.querySelector('#game-screen')
    const cursor = mySpace.cursors.get(gameName)

    cursor.on('cursorUpdate', update => {
      if (update.clientId === clientId) {
        return
      }

      let cursorNode = gameContainer.querySelector(
        `#cursor-${update.connectionId}`
      )

      const playersInGame = mySpace.getMembers()

      const player = playersInGame.find(
        player => player.connectionId === update.connectionId
      )

      if (!player || !mySpace.getSelf().connectionId || self.connectionId === update.connectionId) {
        return
      }

      if (!(cursorNode instanceof HTMLElement)) {
        cursorNode = createCursor(update.connectionId, player.profileData)
        gameContainer.appendChild(cursorNode)
      }

      if (update.data.state === 'leave') {
        gameContainer.removeChild(cursorNode)
      } else {
        cursorNode.style.left = update.position.x + 'px'
        cursorNode.style.top = update.position.y + 'px'
      }
    })

    gameContainer.addEventListener('mouseenter', function (event) {
      const { top, left } = gameContainer.getBoundingClientRect()

      cursor.set({
        position: { x: event.clientX - left, y: event.clientY - top },
        data: { state: 'enter' }
      })
    })

    gameContainer.addEventListener('mousemove', throttle(function (event) {
      const { top, left } = gameContainer.getBoundingClientRect()

      cursor.set({
        position: { x: event.clientX - left, y: event.clientY - top },
        data: { state: 'move' }
      })
    }, 30))

    gameContainer.addEventListener('mouseleave', function (event) {
      const { top, left } = gameContainer.getBoundingClientRect()

      cursor.set({
        position: { x: event.clientX - left, y: event.clientY - top },
        data: { state: 'leave' }
      })
    })

    // JIGSAW
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
      horizontalPiecesCount: 5,
      verticalPiecesCount: 5
    })

    jigsaw.attachSolvedValidator()

    jigsaw.onValid(() => {
      setTimeout(() => {
        if (jigsaw.puzzle.isValid()) {
          alert('WHOOOOOP!!!!')
        }
      }, 500)
    })

    jigsaw.shuffle(0.6)
    jigsaw.draw()
    setDragListenersOnPieces()

    jigsaw.onConnect((_piece, figure, _target, targetFigure) => {
      console.log('CONNECTED!!!!')
      figure.shape.stroke('yellow')
      targetFigure.shape.stroke('yellow')
      jigsaw.redraw()

      setTimeout(() => {
        figure.shape.stroke('black')
        targetFigure.shape.stroke('black')
        jigsaw.redraw()
        const gameState = jigsaw.puzzle.export({ compact: true })
        updateGameChannel.publish('updateGameState', gameState)
      }, 400)
    })

    updateGameChannel.subscribe('updateGameState', function (message) {
      if (message.clientId === clientId) { return }
      const jsonGameState = message.data

      jigsaw.clear()
      jigsaw.renderPuzzle(headbreaker.Puzzle.import(jsonGameState))
      jigsaw.draw()

      jigsaw.onConnect((_piece, figure, _target, targetFigure) => {
        console.log('CONNECTED!!!!')
        figure.shape.stroke('yellow')
        targetFigure.shape.stroke('yellow')
        jigsaw.redraw()

        setTimeout(() => {
          figure.shape.stroke('black')
          targetFigure.shape.stroke('black')
          jigsaw.redraw()
          const gameState = jigsaw.puzzle.export({ compact: true })
          updateGameChannel.publish('updateGameState', gameState)
        }, 200)
      })
      setDragListenersOnPieces()
    })

    function setDragListenersOnPieces () {
      const figures = Object.values(jigsaw.figures)
      const timesPerSecond1 = 20
      let waitUntil1 = 0

      figures.forEach(it => {
        it.group.on('dragmove', function (event) {
          if (Date.now() >= waitUntil1) {
            const gameState = jigsaw.puzzle.export({ compact: true })
            updateGameChannel.publish('updateGameState', gameState)

            waitUntil1 = Date.now() + 1000 / timesPerSecond1
          }
        })
      })
    }
  }
}
