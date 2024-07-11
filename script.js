const drawCanvas = document.getElementById('drawCanvas');
const gameCanvas = document.getElementById('gameCanvas');
const modifiedCanvas = document.getElementById('modifiedCanvas');
const drawCtx = drawCanvas.getContext('2d');
const gameCtx = gameCanvas.getContext('2d');
const modifiedCtx = modifiedCanvas.getContext('2d');
const cellSize = 12;
const rows = gameCanvas.height / cellSize;
const cols = gameCanvas.width / cellSize;
const differenceCanvas = document.getElementById('differenceCanvas');
const differenceCtx = differenceCanvas.getContext('2d');


let grid = create2DArray(rows, cols);
let modifiedGrid = [...grid.map(row => [...row])]; // Deep copy
let initialGrid = [...grid.map(row => [...row])]; // Deep copy
let animationId;

let speed = 500; // Default to medium speed
let isPlaying = false;
let gofromstart = true;
let timestep = 0;


function setSpeed(option) {
    switch (option) {
        case 'slow':
            speed = 1000;
            break;
        case 'medium':
            speed = 500;
            break;
        case 'fast':
            speed = 100;
            break;
    }

    // Highlight the active speed button
    document.querySelectorAll('.speed-control button').forEach(btn => {
        btn.classList.remove('active');
    });
    document.querySelector(`.speed-control button[onclick="setSpeed('${option}')"]`).classList.add('active');

    if (isPlaying) {
        stopGame();
        startGame(); // This will adjust the speed in real-time
    }
}

function create2DArray(rows, cols) {
    let arr = new Array(rows);
    for (let i = 0; i < rows; i++) {
        arr[i] = new Array(cols).fill(0);
    }
    return arr;
}

function downloadGrid() {
    saveGrid = [...initialGrid.map(row => [...row])];
    let gridString = '';
    for (let row of saveGrid) {
        for (let cell of row) {
            gridString += cell === 1 ? '■' : '□';
        }
        gridString += '\n'; // Add a line break for each row
    }

    const blob = new Blob([gridString], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = url;
    a.download = 'grid.txt';
    document.body.appendChild(a);
    a.click();
    URL.revokeObjectURL(url);
}

document.getElementById('fileInput').addEventListener('change', function(event) {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            const content = e.target.result;
            const lines = content.split('\n');
            for (let y = 0; y < lines.length && y < rows; y++) {
                for (let x = 0; x < lines[y].length && x < cols; x++) {
                    initialGrid[y][x] = lines[y][x] === '■' ? 1 : 0;
                }
            }
            drawGrid(drawCtx, initialGrid, null);
        };
        reader.readAsText(file);
    }
    restartSimulation();
});



let isDrawing = false;
let toggledCells = create2DArray(rows, cols); // Assuming you have a function to create a 2D array


drawCanvas.addEventListener('mousedown', function(event) {
    isDrawing = true;
    drawOnCanvas(event);
});

drawCanvas.addEventListener('mousemove', function(event) {
    if (isDrawing) {
        drawOnCanvas(event);
    }
});

drawCanvas.addEventListener('mouseup', function() {
    isDrawing = false;
    toggledCells = create2DArray(rows, cols); // Reset the toggled cells
});

drawCanvas.addEventListener('mouseleave', function() {
    isDrawing = false;
    toggledCells = create2DArray(rows, cols); // Reset the toggled cells
});


function drawOnCanvas(event) {
    const x = Math.floor(event.offsetX / cellSize);
    const y = Math.floor(event.offsetY / cellSize);

    // Check if the cell has already been toggled during this mouse press
    if (!toggledCells[y][x]) {
        initialGrid[y][x] = initialGrid[y][x] === 0 ? 1 : 0;
        toggledCells[y][x] = true; // Mark the cell as toggled
        drawGrid(drawCtx, initialGrid, null);
    }
}



function drawGrid(ctx, grid, darkGrid) {
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    ctx.fillStyle = 'black';
    for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
            if (grid[y][x] === 1) {
                ctx.fillRect(x * cellSize, y * cellSize, cellSize, cellSize);
            }
        }
    }
    // if (darkGrid !== null) {
    //     for (let y = 0; y < rows; y++) {
    //         for (let x = 0; x < cols; x++) {
    //             if (darkGrid[y][x] === 1) {
    //                 ctx.fillStyle = 'red';
    //                 ctx.fillRect(x * cellSize + 4, y * cellSize + 4, 4, 4);
    //             }
    //         }
    //     }
    // }
}

function computeNeighbors(grid) {
    let neighborsArray = create2DArray(rows, cols);
    for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
            let neighbors = 0;
            for (let i = -1; i < 2; i++) {
                for (let j = -1; j < 2; j++) {
                    if (i === 0 && j === 0) continue;
                    const newX = x + j;
                    const newY = y + i;
                    if (newX >= 0 && newY >= 0 && newX < cols && newY < rows) {
                        neighbors += grid[newY][newX];
                    }
                }
            }
            neighborsArray[y][x] = neighbors;
        }
    }
    return neighborsArray;
}

function updateGrid(grid) {
    let newGrid = create2DArray(rows, cols);
    let neighborsArray = computeNeighbors(grid);
    for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
            neighbors = neighborsArray[y][x];
            if (grid[y][x] === 1 && (neighbors < 2 || neighbors > 3)) {
                newGrid[y][x] = 0;
            } else if (grid[y][x] === 0 && neighbors === 3) {
                newGrid[y][x] = 1;
            } else {
                newGrid[y][x] = grid[y][x];
            }
        }
    }
    return newGrid;
}

function isBorder(y, x, rows, cols) {
    return (y === 0 || y === rows-1 || x === 0 || x === cols-1);
}

function updateGridMod(grid, darkGrid) {
    let neighborsArray = computeNeighbors(grid);
    let darkGridNew = create2DArray(rows, cols);
    for (let y = 0; y < rows-1; y++) {
        darkGridNew[y+1][0] = darkGrid[y][0];
        darkGridNew[y][cols-1] = darkGrid[y+1][cols-1];
    }
    for (let x = 0; x < cols-1; x++) {
        darkGridNew[0][x] = darkGrid[0][x+1];
        darkGridNew[rows-1][x+1] = darkGrid[rows-1][x];
    }

    darkGrid = darkGridNew;
    for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
            neighbors = neighborsArray[y][x];
            
            if (grid[y][x] === 1 && (neighbors == 5) && isBorder(y, x, rows, cols)) {
                darkGrid[y][x] = 1;
                grid[y][x] = 0;
            }

            if (grid[y][x] === 1 && (neighbors < 2 || neighbors > 3)) {
                grid[y][x] = 0;
            } else if (grid[y][x] === 0 && neighbors === 3) {
                grid[y][x] = 1;
            }

            if (grid[y][x] === 1 && (darkGrid[y][x] === 1)) {
                grid[y][x] = 0;
                darkGrid[y][x] = 0;
            }
            
        }
    }
    return [grid, darkGrid];
}


function drawDifference() {
    for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
            if (grid[y][x] !== modifiedGrid[y][x]) {
                if (grid[y][x] === 1) {
                    differenceCtx.fillStyle = 'red';
                } else {
                    differenceCtx.fillStyle = 'green';
                }
                differenceCtx.fillRect(x * cellSize, y * cellSize, cellSize, cellSize);
            } else {
                differenceCtx.clearRect(x * cellSize, y * cellSize, cellSize, cellSize);
            }
        }
    }
}


const MAX_HISTORY = 1000;
let history = new Array(MAX_HISTORY).fill(null);

function restartSimulation() {
    stopGame();
    grid = [...initialGrid.map(row => [...row])];
    modifiedGrid = [...initialGrid.map(row => [...row])];
    darkGrid = create2DArray(rows, cols);
    //set one entry to 1
    // darkGrid[5][0] = 1;
    
    history = new Array(MAX_HISTORY).fill(null);
    drawGrid(gameCtx, grid, null);
    drawGrid(modifiedCtx, modifiedGrid, darkGrid);
    drawDifference();

    timestep = 0;
    document.getElementById('timestepCounter').textContent = `Timesteps: ${timestep}`;
}


function stepBack() {
    if (timestep > 0) {
        timestep--;
        [grid, modifiedGrid, darkGrid] = history[timestep];
        drawGrid(gameCtx, grid, null);
        drawGrid(modifiedCtx, modifiedGrid, darkGrid);
        drawDifference();
        document.getElementById('timestepCounter').textContent = `Timesteps: ${timestep}`;
    }
}

function stepForward() {
    if (gofromstart) {
        grid = [...initialGrid.map(row => [...row])];
        modifiedGrid = [...initialGrid.map(row => [...row])];
        // darkGrid = create2DArray(rows, cols);
        gofromstart = false;
    }
    if (timestep < MAX_HISTORY - 1) {
        gameLoop();
    }
}

function gameLoop() {
    if (timestep < MAX_HISTORY) {

        timestep++;
        drawGrid(gameCtx, grid, null);
        drawGrid(modifiedCtx, modifiedGrid, darkGrid);
        drawDifference();
        grid = updateGrid(grid);
        [modifiedGrid, darkGrid] = updateGridMod(modifiedGrid, darkGrid);

        history[timestep] = [[...grid.map(row => [...row])], [...modifiedGrid.map(row => [...row])], [...darkGrid.map(row => [...row])]];
        document.getElementById('timestepCounter').textContent = `Timesteps: ${timestep}`;
    } else {
        stopGame();
    }
}

function startGame() {
    stopGame();
    if (gofromstart) {
        grid = [...initialGrid.map(row => [...row])];
        modifiedGrid = [...initialGrid.map(row => [...row])];
        // darkGrid = create2DArray(rows, cols);
        gofromstart = false;
    }
    animationId = setInterval(gameLoop, speed);
    isPlaying = true;

    // highlight the active play button
    document.querySelectorAll('.button-control button').forEach(btn => {
        btn.classList.remove('active');
    });
    document.querySelector('.button-control button[onclick="startGame()"]').classList.add('active');

}

function stopGame() {
    clearInterval(animationId);
    isPlaying = false;

    // highlight the active play button
    document.querySelectorAll('.button-control button').forEach(btn => {
        btn.classList.remove('active');
    });
    document.querySelector('.button-control button[onclick="stopGame()"]').classList.add('active');
}
