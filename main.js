/*----- constants -----*/
const difficulty = {
    easy: {rows: 9, cols: 9, bombs: 10},
    medium: {rows: 14, cols: 14, bombs: 40},
    hard: {rows: 18, cols: 18, bombs: 60}
};
  
const cellState = {
    hidden: 'hidden',
    revealed: 'revealed',
    flagged: 'flagged'
};

/*----- state variables -----*/
let difficultySelected = 'easy'; // default to easy, to be selected by player
let board = []; // 2d array to be generated based on difficulty
let flagsPlaced = 0; // track the number of flags
let gameActive = false; // based on win-lose condition and trigger timer
let bombs = []; // bombs array
let timerInterval;
let timer = 0; // count-up timer
let firstClick = false; // first click flag to start timer

/*----- cached elements -----*/
const boardElement = document.querySelector('.board');
const difficultyElement = document.getElementById('difficulty');
const timerDisplay = document.getElementById('timer');
const bombsCountDisplay = document.getElementById('bombsCount');
const flagsPlacedDisplay = document.getElementById('flagsPlaced');
const startGameButton = document.getElementById('startGame');
const gameMessage = document.querySelector('.gameMessage');

/*----- event listeners -----*/
startGameButton.addEventListener('click', initialise);
difficultyElement.addEventListener('change', changeDifficulty);

/*----- functions -----*/
function initialise() {
    clearBoard();  // clear existing board
    gameActive = true;
    boardElement.classList.add('game-active'); // game-active class for hover effect on/off
    flagsPlaced = 0;  // reset flags
    flagsPlacedDisplay.textContent = `Flags:${flagsPlaced}`; // reset flag count
    bombs = [];  // clear bombs
    gameMessage.textContent = ''; // clear msg

    const rows = difficulty[difficultySelected].rows;
    const cols = difficulty[difficultySelected].cols;
    board = new Array(rows).fill().map(() => new Array(cols).fill().map(() => ({
        isBomb: false,
        state: cellState.hidden,
        adjacentBombs: 0
    })));
    
    resetTimer();
    timerInterval = null;
    firstClick = false;
    placeBombs();
    calculateAdjacentBombs();
    generateBoardCells();
    renderBoard();
};

function clearBoard() {
    boardElement.innerHTML = '';
};

function placeBombs() {
    const numberOfBombs = difficulty[difficultySelected].bombs;
    bombsCountDisplay.textContent = `Bombs:${numberOfBombs}`; // update bomb count
    let placedBombs = 0;
    while (placedBombs < numberOfBombs) {
        let row = Math.floor(Math.random() * difficulty[difficultySelected].rows);
        let col = Math.floor(Math.random() * difficulty[difficultySelected].cols);
        if (!board[row][col].isBomb) {
            board[row][col].isBomb = true;
            placedBombs++;
        }
    }
};

function calculateAdjacentBombs() {
    const rows = difficulty[difficultySelected].rows;
    const cols = difficulty[difficultySelected].cols;
    // calculate adjacent bombs for each cell, iterate through each row and column respectively
    for (let i = 0; i < rows; i++) {
        for (let j = 0; j < cols; j++) {
            if (!board[i][j].isBomb) {
                // check all adjacent cells 3x3
                for (let dx = -1; dx <= 1; dx++) {
                    for (let dy = -1; dy <= 1; dy++) {
                        const nx = i + dx;
                        const ny = j + dy;
                        // ensure the neighbor is within board bounds and is a bomb
                        if (nx >= 0 && nx < rows && ny >= 0 && ny < cols && board[nx][ny].isBomb) {
                            board[i][j].adjacentBombs++;
                        }
                    }
                }
            }
        }
    };
};    

function generateBoardCells() {
    const rows = difficulty[difficultySelected].rows;
    const cols = difficulty[difficultySelected].cols;
    boardElement.style.gridTemplateRows = `repeat(${rows}, 20px)`; // set the row and column for css
    boardElement.style.gridTemplateColumns = `repeat(${cols}, 20px)`; 

    board.forEach((row, rowIndex) => {
        row.forEach((cell, colIndex) => {
            const cellElement = document.createElement('div');
            cellElement.classList.add('cell');
            cellElement.dataset.row = rowIndex;
            cellElement.dataset.col = colIndex;
            // attach event listeners to cells
            cellElement.addEventListener('click', () => handleCellClick(rowIndex, colIndex));
            cellElement.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                handleCellRightClick(rowIndex, colIndex);
            });
            boardElement.appendChild(cellElement);
        });
    });
};

function renderBoard() {
    board.forEach((row, rowIndex) => {
        row.forEach((cell, colIndex) => {
            const cellElement = document.querySelector(`div.cell[data-row="${rowIndex}"][data-col="${colIndex}"]`);
            // reset all cell class and state
            cellElement.className = 'cell';
            cellElement.textContent = '';

            if (cell.state === cellState.revealed) {
                if (cell.isBomb) {
                    cellElement.classList.add('bomb');
                    cellElement.textContent = '💣';
                } else if (cell.adjacentBombs > 0) {
                    cellElement.classList.add('number');
                    cellElement.textContent = cell.adjacentBombs;
                } else {
                    cellElement.classList.add('empty');
                }
            } else if (cell.state === cellState.flagged) {
                cellElement.classList.add('flagged');
                cellElement.textContent = '🚩';
            } else {
                cellElement.classList.add('hidden');
            }
        });
    });
};

function handleCellClick(row, col) {
    if (!gameActive || board[row][col].state !== cellState.hidden) return;

    if (!firstClick) {
        startTimer(); // start timer on first click
        firstClick = true; // flag
    }

    // process click based on bomb in cell if not floodfill -> reveal
    if (board[row][col].isBomb) {
        // game over logic
        board[row][col].state = cellState.revealed;
        gameActive = false;
        boardElement.classList.remove('game-active'); // remove game-active class to stop hover effect
        clearInterval(timerInterval);
        timerInterval = null;
        revealAllBombs();
    } else {
        // proceed to floodfill
        floodFill(row, col);
        checkForWin();
    }
    renderBoard();
};

function revealAllBombs() {
    // iterate over entire board to find and reveal all bombs
    for (let i = 0; i < board.length; i++) {
        for (let j = 0; j < board[i].length; j++) {
            if (board[i][j].isBomb) {
                board[i][j].state = cellState.revealed;
            }
        }
    }
    gameMessage.textContent = 'Sorry, try again.';
};

function floodFill(row, col) {
    // check edge cases
    if (row < 0 || row >= board.length || col < 0 || col >= board[0].length) {
        return;
    }
    // only continue if the cell is hidden and safe to reveal
    if (board[row][col].state !== cellState.hidden || board[row][col].isBomb) {
        return;
    }

    // reveal cell
    board[row][col].state = cellState.revealed;

    // once hit a numbered cell (adjacent bombs), stop the flood
    if (board[row][col].adjacentBombs > 0) {
        return;
    }

    // recursive calls to propogate the flood
    floodFill(row - 1, col); // up
    floodFill(row + 1, col); // down
    floodFill(row, col - 1); // left
    floodFill(row, col + 1); // right
};

function checkForWin() {
    for (let i = 0; i < board.length; i++) {
        for (let j = 0; j < board[i].length; j++) {
            // if there are hidden non-bomb cells, game is not won
            if (board[i][j].state === cellState.hidden && !board[i][j].isBomb) {
                return;
            }
        }
    }
    // if no hidden non-bomb cells left, player wins
    gameActive = false;
    gameMessage.textContent = 'You\'ve cleared the board.';
    boardElement.classList.remove('game-active'); // remove game-active class to stop hover effect
};

function handleCellRightClick(row, col) {
    if (!gameActive || board[row][col].state === cellState.revealed) return;

    if (board[row][col].state === cellState.flagged) {
        board[row][col].state = cellState.hidden; // unflag cell
        flagsPlaced--; // decrease flag count
    } else if (board[row][col].state === cellState.hidden) {
        board[row][col].state = cellState.flagged; // flag cell
        flagsPlaced++; // increase flag count
    }
    flagsPlacedDisplay.textContent = `Flags:${flagsPlaced}`;
    renderBoard();
}

function changeDifficulty() {
    difficultySelected = difficultyElement.value;
};

function resetTimer() {
    clearInterval(timerInterval); // clear existing timer interval
    timer = 0; // reset timer count
    updateTimerDisplay();
    firstClick = false; // reset the first click flag
};

function startTimer() {
    if (!timerInterval) {
        timerInterval = setInterval(() => {
            timer++;
            updateTimerDisplay();
            if (!gameActive) {
                clearInterval(timerInterval); // stop the timer if gameActive false
                timerInterval = null;
            }
        }, 1000);
    }
};

function updateTimerDisplay() {
    const timerDisplay = document.getElementById('timer');
    const minutes = Math.floor(timer / 60); // calculate total minutes
    const seconds = timer % 60; // calculate remaining seconds
    timerDisplay.textContent = `${pad(minutes)}:${pad(seconds)}`; // update text content in MM:SS format
}

function pad(number) {
    return number < 10 ? '0' + number : number; // pad single digit numbers with leading zero
}

initialise();