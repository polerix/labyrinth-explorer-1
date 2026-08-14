const ROWS = 10;
const COLS = 10;
let labyrinth = [];
let explorer = { x: 0, y: 0, direction: 'down' };
let minotaur = { x: 0, y: 0, direction: 'down' };
let book = { x: 0, y: 0 };
let cable = [];
let isSettingTNT = false;
let selectedWall = null;
let tntUsed = false;
let level = 1;
let minotaurInterval;
let evilEyeActive = false;
let horusEyeActive = false;

function createLabyrinth() {
    labyrinth = Array(ROWS).fill().map(() => Array(COLS).fill(0));
    console.log('Initial labyrinth:', labyrinth);

    // Generate maze using recursive backtracking
    function carve(x, y) {
        const directions = [{ dx: 0, dy: -1 }, { dx: 0, dy: 1 }, { dx: -1, dy: 0 }, { dx: 1, dy: 0 }];
        directions.sort(() => Math.random() - 0.5);

        for (let dir of directions) {
            let nx = x + dir.dx * 2, ny = y + dir.dy * 2;
            if (nx >= 0 && nx < COLS && ny >= 0 && ny < ROWS && labyrinth[ny][nx] === 0) {
                labyrinth[y + dir.dy][x + dir.dx] = 1;
                labyrinth[ny][nx] = 1;
                carve(nx, ny);
            }
        }
    }

    carve(0, 0);
    console.log('Carved labyrinth:', labyrinth);

    // Place entities
    placeEntities();
    console.log('Labyrinth with entities:', labyrinth);
    renderLabyrinth();
    updateLevelIndicator();

    // Start minotaur movement
    startMinotaurMovement();
}

function hasPath(startX, startY, endX, endY, maze) {
    let queue = [[startX, startY]];
    let visited = new Set();

    while (queue.length > 0) {
        let [x, y] = queue.shift();
        if (x === endX && y === endY) return true;

        let key = `${x},${y}`;
        if (visited.has(key)) continue;
        visited.add(key);

        let directions = [[0, 1], [1, 0], [0, -1], [-1, 0]];
        for (let [dx, dy] of directions) {
            let newX = x + dx, newY = y + dy;
            if (newX >= 0 && newX < COLS && newY >= 0 && newY < ROWS && maze[newY][newX] !== 0) {
                queue.push([newX, newY]);
            }
        }
    }
    return false;
}

function placeEntities() {
    // Randomly place explorer, minotaur, book, and cable
    explorer = { x: 0, y: 0, direction: 'down' };
    minotaur = { x: Math.floor(Math.random() * COLS), y: Math.floor(Math.random() * ROWS), direction: 'down' };
    book = { x: Math.floor(Math.random() * COLS), y: Math.floor(Math.random() * ROWS) };
    while (labyrinth[book.y][book.x] === 0 || (book.x === explorer.x && book.y === explorer.y)) {
        book = { x: Math.floor(Math.random() * COLS), y: Math.floor(Math.random() * ROWS) };
    }
}

function renderLabyrinth() {
    const labyrinthDiv = document.getElementById('labyrinth');
    labyrinthDiv.innerHTML = '';
    labyrinth.forEach((row, y) => {
        row.forEach((cell, x) => {
            const cellDiv = document.createElement('div');
            cellDiv.classList.add('cell');
            switch (cell) {
                case 0:
                    cellDiv.classList.add('wall');
                    break;
                case 1:
                    cellDiv.classList.add('floor');
                    break;
                case 3:
                    cellDiv.classList.add('wall-torch');
                    break;
                default:
                    console.error(`Unexpected cell value at (${x}, ${y}): ${cell}`);
            }
            if (x === explorer.x && y === explorer.y) cellDiv.classList.add(`explorer-${explorer.direction}`);
            if (x === minotaur.x && y === minotaur.y) cellDiv.classList.add(`minotaur-${minotaur.direction}`);
            if (x === book.x && y === book.y) cellDiv.classList.add('book');
            labyrinthDiv.appendChild(cellDiv);
        });
    });
    console.log('Rendered labyrinth');
}

function moveExplorer(dx, dy) {
    const newX = explorer.x + dx;
    const newY = explorer.y + dy;
    if (newX >= 0 && newX < COLS && newY >= 0 && newY < ROWS && labyrinth[newY][newX] !== 0) {
        explorer.x = newX;
        explorer.y = newY;
        if (dx === 1) explorer.direction = 'right';
        else if (dx === -1) explorer.direction = 'left';
        else if (dy === 1) explorer.direction = 'down';
        else if (dy === -1) explorer.direction = 'up';
        renderLabyrinth();
        checkGameStatus();
    }
}

function moveMinotaur() {
    const directions = [
        { dx: 0, dy: -1 }, // up
        { dx: 0, dy: 1 },  // down
        { dx: -1, dy: 0 }, // left
        { dx: 1, dy: 0 }   // right
    ];
    directions.sort(() => Math.random() - 0.5); // randomize directions

    let moved = false;
    for (let dir of directions) {
        let newX = minotaur.x + dir.dx;
        let newY = minotaur.y + dir.dy;
        if (newX >= 0 && newX < COLS && newY >= 0 && newY < ROWS && labyrinth[newY][newX] !== 0) {
            minotaur.x = newX;
            minotaur.y = newY;
            minotaur.direction = dir.dy === -1 ? 'up' : dir.dy === 1 ? 'down' : dir.dx === -1 ? 'left' : 'right';
            moved = true;
            break;
        }
    }

    if (!moved) {
        // If the minotaur couldn't move in a random direction, force it towards the explorer
        const dx = explorer.x > minotaur.x ? 1 : -1;
        const dy = explorer.y > minotaur.y ? 1 : -1;
        if (explorer.x !== minotaur.x && labyrinth[minotaur.y][minotaur.x + dx] !== 0) {
            minotaur.x += dx;
            minotaur.direction = dx === 1 ? 'right' : 'left';
        } else if (explorer.y !== minotaur.y && labyrinth[minotaur.y + dy][minotaur.x] !== 0) {
            minotaur.y += dy;
            minotaur.direction = dy === 1 ? 'down' : 'up';
        }
    }

    renderLabyrinth();
    checkGameStatus();
}

function startMinotaurMovement() {
    clearInterval(minotaurInterval);
    const intervalTime = Math.max(1000 - (level * 100), 100); // decrease interval time as level increases
    minotaurInterval = setInterval(moveMinotaur, intervalTime);
}

function checkGameStatus() {
    if (explorer.x === book.x && explorer.y === book.y) {
        document.getElementById('labyrinth-title').src = 'eureka.png';
        document.getElementById('labyrinth-title').style.display = 'block';
        document.getElementById('explorer-title').src = 'keepexploring.png';
        document.getElementById('explorer-title').style.display = 'block';
        level++;
        updateLevelIndicator();
        createLabyrinth(); // Start next level
    } else if (explorer.x === minotaur.x && explorer.y === minotaur.y) {
        document.getElementById('labyrinth-title').src = 'caught.png';
        document.getElementById('labyrinth-title').style.display = 'block';
        document.getElementById('explorer-title').src = 'tryagain.png';
        document.getElementById('explorer-title').style.display = 'block';
        clearInterval(minotaurInterval);
    }
}

function resetGame() {
    document.getElementById('labyrinth-title').src = '';
    document.getElementById('labyrinth-title').style.display = 'none';
    document.getElementById('explorer-title').src = '';
    document.getElementById('explorer-title').style.display = 'none';
    level = 1;
    updateLevelIndicator();
    createLabyrinth();
}

function updateLevelIndicator() {
    const levelNumber = level < 10 ? `lvl${level}.png` : `lvl${Math.floor(level / 10)}${level % 10}.png`;
    document.getElementById('level').querySelector('img').src = levelNumber;
}

document.getElementById('reset').addEventListener('click', resetGame);
document.getElementById('up').addEventListener('click', () => moveExplorer(0, -1));
document.getElementById('down').addEventListener('click', () => moveExplorer(0, 1));
document.getElementById('left').addEventListener('click', () => moveExplorer(-1, 0));
document.getElementById('right').addEventListener('click', () => moveExplorer(1, 0));
document.getElementById('tnt').addEventListener('click', () => {
    isSettingTNT = true;
    selectedWall = null;
});
document.getElementById('evil-eye').addEventListener('click', () => {
    evilEyeActive = true;
    horusEyeActive = false;
});
document.getElementById('horus-eye').addEventListener('click', () => {
    horusEyeActive = true;
    evilEyeActive = false;
});

createLabyrinth();
