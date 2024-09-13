// Constants
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const TILE_SIZE = 40;
const ROWS = Math.floor(canvas.height / TILE_SIZE);
const COLS = Math.floor(canvas.width / TILE_SIZE);

// UI Elements
const roleSelect = document.getElementById("role-select");
const startButton = document.getElementById("start-button");
const endButton = document.getElementById("end-button");
const speedRange = document.getElementById("speed-range");
const speedValue = document.getElementById("speed-value");
const scoreDisplay = document.getElementById("score");
const messageDisplay = document.getElementById("message");

// Game Variables
let game;
let role = "ghost";
let ghostSpeed = 2;

// Maze Generation using Prim's Algorithm
function generateMaze(rows, cols) {
  // Initialize maze with walls
  const maze = Array.from({ length: rows }, () => Array(cols).fill(1));

  // Directions for moving in the maze
  const directions = [
    { dr: -2, dc: 0 },
    { dr: 2, dc: 0 },
    { dr: 0, dc: -2 },
    { dr: 0, dc: 2 },
  ];

  function shuffle(array) {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
  }

  // Choose a random starting cell
  const startRow = 1;
  const startCol = 1;
  maze[startRow][startCol] = 0;

  // List of walls
  const walls = [];

  // Add the walls of the starting cell to the list
  directions.forEach((direction) => {
    const nr = startRow + direction.dr;
    const nc = startCol + direction.dc;
    if (nr >= 0 && nr < rows && nc >= 0 && nc < cols) {
      walls.push({ r: nr, c: nc, dr: direction.dr, dc: direction.dc });
    }
  });

  // While there are walls in the list
  while (walls.length > 0) {
    // Choose a random wall from the list
    const randomIndex = Math.floor(Math.random() * walls.length);
    const wall = walls[randomIndex];

    const oppositeRow = wall.r + wall.dr;
    const oppositeCol = wall.c + wall.dc;

    // If the cell on the opposite side of the wall is not in the maze
    if (
      oppositeRow >= 0 &&
      oppositeRow < rows &&
      oppositeCol >= 0 &&
      oppositeCol < cols &&
      maze[oppositeRow][oppositeCol] === 1
    ) {
      // Make the wall a passage and mark the cell on the opposite side as part of the maze
      maze[wall.r][wall.c] = 0;
      maze[oppositeRow][oppositeCol] = 0;

      // Add the neighboring walls of the cell to the list
      directions.forEach((direction) => {
        const nr = oppositeRow + direction.dr;
        const nc = oppositeCol + direction.dc;
        if (
          nr >= 0 &&
          nr < rows &&
          nc >= 0 &&
          nc < cols &&
          maze[nr][nc] === 1
        ) {
          walls.push({ r: nr, c: nc, dr: direction.dr, dc: direction.dc });
        }
      });
    }

    // Remove the wall from the list
    walls.splice(randomIndex, 1);
  }

  // Set borders as walls
  for (let r = 0; r < rows; r++) {
    maze[r][0] = 1;
    maze[r][cols - 1] = 1;
  }
  for (let c = 0; c < cols; c++) {
    maze[0][c] = 1;
    maze[rows - 1][c] = 1;
  }

  return maze;
}

// Helper Functions
function getRandomPosition(maze) {
  let row, col;
  do {
    row = Math.floor(Math.random() * ROWS);
    col = Math.floor(Math.random() * COLS);
  } while (maze[row][col] === 0);
  return { row, col };
}

function distance(a, b) {
  return Math.sqrt((a.row - b.row) ** 2 + (a.col - b.col) ** 2);
}

// Classes
class Player {
  constructor(row, col, color) {
    this.row = row;
    this.col = col;
    this.color = color;
    this.size = TILE_SIZE / 2;
  }

  draw() {
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.arc(
      this.col * TILE_SIZE + TILE_SIZE / 2,
      this.row * TILE_SIZE + TILE_SIZE / 2,
      this.size / 2,
      0,
      2 * Math.PI,
    );
    ctx.fill();
  }
}

class Ghost extends Player {
  constructor(row, col, speed) {
    super(row, col, "red");
    this.speed = speed;
    this.moveQueue = [];
  }

  move(targets, maze) {
    // Simple AI: Move towards the nearest survivor
    if (targets.length === 0) return;

    let nearest = targets.reduce((prev, curr) => {
      return distance(this, curr) < distance(this, prev) ? curr : prev;
    });

    // Pathfinding: BFS to find the next move towards the nearest survivor
    const queue = [];
    const visited = Array.from({ length: ROWS }, () => Array(COLS).fill(false));
    const prevMap = Array.from({ length: ROWS }, () => Array(COLS).fill(null));

    queue.push({ r: this.row, c: this.col });
    visited[this.row][this.col] = true;

    while (queue.length > 0) {
      const current = queue.shift();
      if (current.r === nearest.row && current.c === nearest.col) {
        break;
      }

      const directions = [
        { dr: -1, dc: 0 },
        { dr: 1, dc: 0 },
        { dr: 0, dc: -1 },
        { dr: 0, dc: 1 },
      ];

      for (let dir of directions) {
        const nr = current.r + dir.dr;
        const nc = current.c + dir.dc;
        if (
          nr >= 0 &&
          nr < ROWS &&
          nc >= 0 &&
          nc < COLS &&
          maze[nr][nc] === 1 &&
          !visited[nr][nc]
        ) {
          queue.push({ r: nr, c: nc });
          visited[nr][nc] = true;
          prevMap[nr][nc] = current;
        }
      }
    }

    // Reconstruct path
    let path = [];
    let current = { r: nearest.row, c: nearest.col };
    while (current.r !== this.row || current.c !== this.col) {
      path.push(current);
      current = prevMap[current.r][current.c];
      if (!current) break; // No path found
    }

    path = path.reverse();

    // Move Ghost according to its speed
    for (let i = 0; i < this.speed; i++) {
      if (path.length > 0) {
        this.row = path[0].r;
        this.col = path[0].c;
        path.shift();
      }
    }

    // Alternatively, if player controls the ghost, movement is handled via keyboard
  }

  handleKeyPress(key, maze) {
    let newRow = this.row;
    let newCol = this.col;

    switch (key) {
      case "ArrowUp":
        newRow -= 1;
        break;
      case "ArrowDown":
        newRow += 1;
        break;
      case "ArrowLeft":
        newCol -= 1;
        break;
      case "ArrowRight":
        newCol += 1;
        break;
      default:
        return;
    }

    // Check boundaries and walls
    if (
      newRow >= 0 &&
      newRow < ROWS &&
      newCol >= 0 &&
      newCol < COLS &&
      maze[newRow][newCol] === 1
    ) {
      this.row = newRow;
      this.col = newCol;
    }
  }
}

class Survivor extends Player {
  constructor(row, col) {
    super(row, col, "blue");
    this.hp = 3;
    this.isHypnotized = false;
    this.hypnosisTimer = 0;
    this.moveCounter = 0; // Add move counter
  }

  move(maze) {
    if (this.isHypnotized) {
      this.hypnosisTimer--;
      if (this.hypnosisTimer <= 0) {
        this.isHypnotized = false;
      }
      return;
    }

    // Only move every 30 frames (half a second at 60 FPS)
    if (this.moveCounter < 30) {
      this.moveCounter++;
      return;
    }
    this.moveCounter = 0; // Reset counter after moving

    // Simple AI: Random movement
    const directions = [
      { dr: -1, dc: 0 },
      { dr: 1, dc: 0 },
      { dr: 0, dc: -1 },
      { dr: 0, dc: 1 },
    ];

    // Shuffle directions for random movement
    for (let i = directions.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [directions[i], directions[j]] = [directions[j], directions[i]];
    }

    for (let dir of directions) {
      const newRow = this.row + dir.dr;
      const newCol = this.col + dir.dc;
      if (
        newRow >= 0 &&
        newRow < ROWS &&
        newCol >= 0 &&
        newCol < COLS &&
        maze[newRow][newCol] === 1
      ) {
        this.row = newRow;
        this.col = newCol;
        break;
      }
    }
  }

  draw() {
    // Change color if hypnotized
    ctx.fillStyle = this.isHypnotized ? "purple" : this.color;
    ctx.beginPath();
    ctx.arc(
      this.col * TILE_SIZE + TILE_SIZE / 2,
      this.row * TILE_SIZE + TILE_SIZE / 2,
      this.size / 2,
      0,
      2 * Math.PI,
    );
    ctx.fill();

    // Draw HP
    ctx.fillStyle = "white";
    ctx.font = "16px Arial";
    ctx.textAlign = "center";
    ctx.fillText(
      this.hp,
      this.col * TILE_SIZE + TILE_SIZE / 2,
      this.row * TILE_SIZE + TILE_SIZE / 2 + 5,
    );
  }
}

class Game {
  constructor(role, speed) {
    this.role = role;
    this.maze = generateMaze(ROWS, COLS);
    this.ghost = null;
    this.survivors = [];
    this.maxSurvivors = 5;
    this.gameInterval = null;
    this.gameOver = false;
    this.message = "";
    this.ghostSpeed = speed;
  }

  start() {
    // Initialize Ghost
    const ghostPos = getRandomPosition(this.maze);
    this.ghost = new Ghost(ghostPos.row, ghostPos.col, this.ghostSpeed);

    // Initialize Survivors
    for (let i = 0; i < this.maxSurvivors; i++) {
      let pos = getRandomPosition(this.maze);
      // Ensure survivors don't spawn on the ghost
      if (pos.row === this.ghost.row && pos.col === this.ghost.col) {
        i--;
        continue;
      }
      this.survivors.push(new Survivor(pos.row, pos.col));
    }

    // Update UI
    scoreDisplay.textContent = `Survivors Left: ${this.survivors.length}`;
    messageDisplay.textContent = "";

    // Start Game Loop
    this.gameInterval = setInterval(() => this.update(), 1000 / 60); // 60 FPS
  }

  update() {
    if (this.gameOver) return;

    // Move Entities
    if (this.role === "ghost-controlled") {
      // Ghost is controlled via keyboard; movement handled by event listener
    } else {
      // Ghost is AI-controlled
      this.ghost.move(this.survivors, this.maze);
    }

    this.survivors.forEach((survivor) => survivor.move(this.maze));

    // Check Collisions
    this.checkCollisions();

    // Render
    this.render();

    // Check Game Over
    if (this.survivors.length === 0) {
      this.endGame("Ghost Wins!");
    }
  }

  checkCollisions() {
    this.survivors.forEach((survivor, index) => {
      if (survivor.row === this.ghost.row && survivor.col === this.ghost.col) {
        survivor.hp -= 1;
        survivor.isHypnotized = true;
        survivor.hypnosisTimer = 60; // 1 second at 60fps
        if (survivor.hp <= 0) {
          // Remove Survivor
          this.survivors.splice(index, 1);
        }
      }
    });

    // Update Score Display
    scoreDisplay.textContent = `Survivors Left: ${this.survivors.length}`;
  }

  render() {
    // Clear Canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw Maze
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        if (this.maze[r][c] === 0) {
          ctx.fillStyle = "black";
          ctx.fillRect(c * TILE_SIZE, r * TILE_SIZE, TILE_SIZE, TILE_SIZE);
        } else {
          ctx.fillStyle = "#555";
          ctx.fillRect(c * TILE_SIZE, r * TILE_SIZE, TILE_SIZE, TILE_SIZE);
        }
      }
    }

    // Draw Ghost
    this.ghost.draw();

    // Draw Survivors
    this.survivors.forEach((survivor) => survivor.draw());
  }

  endGame(message) {
    this.gameOver = true;
    clearInterval(this.gameInterval);
    this.message = message;
    messageDisplay.textContent = message;

    // Re-enable role selection and buttons
    roleSelect.disabled = false;
    startButton.disabled = false;
    endButton.disabled = true;
  }
}

// Initialize
function initializeGame() {
  // Generate initial maze and render (optional)
  // Not necessary as maze is drawn within the Game class
}

// Handle Speed Change
speedRange.addEventListener("input", () => {
  ghostSpeed = parseInt(speedRange.value);
  speedValue.textContent = ghostSpeed;
});

// Handle Start Button
startButton.addEventListener("click", () => {
  role = roleSelect.value === "ghost" ? "ghost-controlled" : "ghost";
  // Disable role selection and speed setting during game
  roleSelect.disabled = true;
  speedRange.disabled = true;
  startButton.disabled = true;
  endButton.disabled = false;

  game = new Game(role, ghostSpeed);
  game.start();
});

// Handle End Game Button
endButton.addEventListener("click", () => {
  if (game) {
    game.endGame("Game Ended by Player.");
  }
});

// Handle Keyboard Controls for Ghost
document.addEventListener("keydown", (e) => {
  if (game && game.role === "ghost-controlled" && !game.gameOver) {
    const key = e.key;
    if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(key)) {
      game.ghost.handleKeyPress(key, game.maze);
    }
  }
});

// Start the game
initializeGame();
