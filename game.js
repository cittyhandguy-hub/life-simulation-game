// Canvas setup
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
canvas.width = 1000;
canvas.height = 600;

// Game constants
const BIOME_TYPES = {
    LAND: 0,
    FOREST: 1,
    DESERT: 2,
    TUNDRA: 3
};

const COLORS = {
    LAND: '#8B4513',
    FOREST: '#228B22',
    DESERT: '#DAA520',
    TUNDRA: '#E0FFFF',
    CITIZEN: '#FF0000',
    HOUSE: '#D2B48C',
    TREE: '#0B6623',
    BERRY: '#9932CC',
    POND: '#4169E1'
};

const TILE_SIZE = 50;
const GRID_WIDTH = canvas.width / TILE_SIZE;
const GRID_HEIGHT = canvas.height / TILE_SIZE;

// Game state
let gameState = {
    paused: false,
    speed: 1,
    day: 0,
    grid: [],
    citizens: [],
    resources: {
        houses: [],
        trees: [],
        berries: [],
        ponds: []
    }
};

// Utility function for random selection
function random(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Initialize grid with biomes
function initializeGrid() {
    gameState.grid = [];
    for (let y = 0; y < GRID_HEIGHT; y++) {
        gameState.grid[y] = [];
        for (let x = 0; x < GRID_WIDTH; x++) {
            gameState.grid[y][x] = generateBiome(x, y);
        }
    }
    generateResources();
}

// Generate biome using perlin-like noise
function generateBiome(x, y) {
    const centerX = GRID_WIDTH / 2;
    const centerY = GRID_HEIGHT / 2;
    const distanceFromCenter = Math.sqrt((x - centerX) ** 2 + (y - centerY) ** 2);
    const maxDistance = Math.sqrt(centerX ** 2 + centerY ** 2);
    const normalizedDistance = distanceFromCenter / maxDistance;

    // Forest in center, desert in middle, tundra at edges
    if (normalizedDistance < 0.3) return BIOME_TYPES.FOREST;
    if (normalizedDistance < 0.6) return BIOME_TYPES.DESERT;
    if (normalizedDistance < 0.9) return BIOME_TYPES.TUNDRA;
    return BIOME_TYPES.LAND;
}

// Generate initial resources
function generateResources() {
    gameState.resources = { houses: [], trees: [], berries: [], ponds: [] };

    // Generate trees in forests
    for (let i = 0; i < 50; i++) {
        let x, y;
        do {
            x = random(0, GRID_WIDTH - 1);
            y = random(0, GRID_HEIGHT - 1);
        } while (gameState.grid[y][x] !== BIOME_TYPES.FOREST);
        gameState.resources.trees.push({ x, y, wood: 3 });
    }

    // Generate berry bushes in forests
    for (let i = 0; i < 60; i++) {
        let x, y;
        do {
            x = random(0, GRID_WIDTH - 1);
            y = random(0, GRID_HEIGHT - 1);
        } while (gameState.grid[y][x] !== BIOME_TYPES.FOREST);
        gameState.resources.berries.push({ x, y, berries: 5 });
    }

    // Generate ponds
    for (let i = 0; i < 15; i++) {
        let x, y;
        do {
            x = random(0, GRID_WIDTH - 1);
            y = random(0, GRID_HEIGHT - 1);
        } while (gameState.grid[y][x] === BIOME_TYPES.LAND);
        gameState.resources.ponds.push({ x, y });
    }
}

// Citizen class
class Citizen {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.health = 100;
        this.hunger = 50;
        this.thirst = 50;
        this.age = 0;
        this.canReproduceCounter = 0;
        this.direction = Math.random() * Math.PI * 2;
    }

    update() {
        this.age++;
        
        // Decrease hunger and thirst naturally
        this.hunger = Math.max(0, this.hunger - 0.15);
        this.thirst = Math.max(0, this.thirst - 0.1);

        // Health depletes if hungry or thirsty
        if (this.hunger === 0 || this.thirst === 0) {
            this.health -= 0.5;
        } else if (this.hunger > 80 && this.thirst > 80) {
            // Health recovers slowly when both are high
            this.health = Math.min(100, this.health + 0.1);
        }

        // Movement
        this.move();

        // Resource interaction
        this.gatherResources();

        // Reproduction
        if (this.health > 80 && this.hunger > 70 && this.thirst > 70 && this.age > 500) {
            this.canReproduceCounter++;
            if (this.canReproduceCounter > 100) {
                this.canReproduceCounter = 0;
                this.health -= 20;
                this.reproduce();
            }
        } else {
            this.canReproduceCounter = 0;
        }
    }

    move() {
        // Random walk
        if (Math.random() < 0.1) {
            this.direction = Math.random() * Math.PI * 2;
        }

        const speed = 0.3;
        const newX = this.x + Math.cos(this.direction) * speed;
        const newY = this.y + Math.sin(this.direction) * speed;

        // Keep within bounds
        if (newX >= 0 && newX < GRID_WIDTH && newY >= 0 && newY < GRID_HEIGHT) {
            this.x = newX;
            this.y = newY;
        } else {
            this.direction = Math.random() * Math.PI * 2;
        }
    }

    gatherResources() {
        const gridX = Math.floor(this.x);
        const gridY = Math.floor(this.y);

        // Eat berries
        for (let i = gameState.resources.berries.length - 1; i >= 0; i--) {
            const berry = gameState.resources.berries[i];
            if (Math.abs(berry.x - this.x) < 0.5 && Math.abs(berry.y - this.y) < 0.5) {
                if (this.hunger < 100 && berry.berries > 0) {
                    const eaten = Math.min(5, berry.berries);
                    this.hunger = Math.min(100, this.hunger + eaten);
                    berry.berries -= eaten;
                    if (berry.berries <= 0) {
                        gameState.resources.berries.splice(i, 1);
                    }
                }
                break;
            }
        }

        // Drink from ponds
        for (let pond of gameState.resources.ponds) {
            if (Math.abs(pond.x - this.x) < 0.5 && Math.abs(pond.y - this.y) < 0.5) {
                if (this.thirst < 100) {
                    this.thirst = Math.min(100, this.thirst + 3);
                }
            }
        }
    }

    buildHouse() {
        // Find nearby wood
        let woodNearby = false;
        for (let tree of gameState.resources.trees) {
            if (Math.sqrt((tree.x - this.x) ** 2 + (tree.y - this.y) ** 2) < 2) {
                if (tree.wood > 0) {
                    woodNearby = true;
                    tree.wood--;
                    break;
                }
            }
        }

        if (woodNearby) {
            gameState.resources.houses.push({
                x: Math.floor(this.x),
                y: Math.floor(this.y)
            });
        }
    }

    reproduce() {
        gameState.citizens.push(new Citizen(this.x + (Math.random() - 0.5), this.y + (Math.random() - 0.5)));
    }

    isDead() {
        return this.health <= 0;
    }

    draw(ctx) {
        ctx.fillStyle = COLORS.CITIZEN;
        ctx.fillRect(this.x * TILE_SIZE + TILE_SIZE / 2 - 5, this.y * TILE_SIZE + TILE_SIZE / 2 - 5, 10, 10);

        // Draw health bar above citizen
        const barWidth = 12;
        const barHeight = 2;
        ctx.fillStyle = '#333';
        ctx.fillRect(this.x * TILE_SIZE + TILE_SIZE / 2 - barWidth / 2, this.y * TILE_SIZE - 10, barWidth, barHeight);
        ctx.fillStyle = this.health > 50 ? '#00FF00' : this.health > 25 ? '#FFFF00' : '#FF0000';
        ctx.fillRect(this.x * TILE_SIZE + TILE_SIZE / 2 - barWidth / 2, this.y * TILE_SIZE - 10, (barWidth * this.health) / 100, barHeight);
    }
}

// Initialize game
function init() {
    initializeGrid();
    gameState.citizens = [];
    gameState.day = 0;

    // Create initial citizens
    for (let i = 0; i < 10; i++) {
        const x = random(GRID_WIDTH / 3, (2 * GRID_WIDTH) / 3);
        const y = random(GRID_HEIGHT / 3, (2 * GRID_HEIGHT) / 3);
        gameState.citizens.push(new Citizen(x, y));
    }
}

// Update game logic
function update() {
    if (gameState.paused) return;

    // Update all citizens
    for (let citizen of gameState.citizens) {
        citizen.update();
    }

    // Remove dead citizens
    gameState.citizens = gameState.citizens.filter(c => !c.isDead());

    // Regenerate resources
    if (gameState.day % 100 === 0) {
        for (let tree of gameState.resources.trees) {
            tree.wood = Math.min(3, tree.wood + 1);
        }
        for (let berry of gameState.resources.berries) {
            berry.berries = Math.min(5, berry.berries + 1);
        }
    }

    gameState.day++;
}

// Draw game state
function draw() {
    // Clear canvas
    ctx.fillStyle = '#87CEEB';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw grid
    for (let y = 0; y < GRID_HEIGHT; y++) {
        for (let x = 0; x < GRID_WIDTH; x++) {
            const biome = gameState.grid[y][x];
            ctx.fillStyle = biome === BIOME_TYPES.FOREST ? COLORS.FOREST :
                           biome === BIOME_TYPES.DESERT ? COLORS.DESERT :
                           biome === BIOME_TYPES.TUNDRA ? COLORS.TUNDRA :
                           COLORS.LAND;
            ctx.fillRect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
            ctx.strokeStyle = '#666';
            ctx.lineWidth = 0.5;
            ctx.strokeRect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
        }
    }

    // Draw ponds
    ctx.fillStyle = COLORS.POND;
    for (let pond of gameState.resources.ponds) {
        ctx.beginPath();
        ctx.arc(pond.x * TILE_SIZE + TILE_SIZE / 2, pond.y * TILE_SIZE + TILE_SIZE / 2, 8, 0, Math.PI * 2);
        ctx.fill();
    }

    // Draw trees
    ctx.fillStyle = COLORS.TREE;
    for (let tree of gameState.resources.trees) {
        ctx.fillRect(tree.x * TILE_SIZE + TILE_SIZE / 2 - 5, tree.y * TILE_SIZE + TILE_SIZE / 2 - 5, 10, 10);
    }

    // Draw berry bushes
    ctx.fillStyle = COLORS.BERRY;
    for (let berry of gameState.resources.berries) {
        ctx.beginPath();
        ctx.arc(berry.x * TILE_SIZE + TILE_SIZE / 2, berry.y * TILE_SIZE + TILE_SIZE / 2, 6, 0, Math.PI * 2);
        ctx.fill();
    }

    // Draw houses
    ctx.fillStyle = COLORS.HOUSE;
    for (let house of gameState.resources.houses) {
        ctx.fillRect(house.x * TILE_SIZE, house.y * TILE_SIZE, TILE_SIZE - 2, TILE_SIZE - 2);
        ctx.strokeStyle = '#8B4513';
        ctx.lineWidth = 2;
        ctx.strokeRect(house.x * TILE_SIZE, house.y * TILE_SIZE, TILE_SIZE - 2, TILE_SIZE - 2);
    }

    // Draw citizens
    for (let citizen of gameState.citizens) {
        citizen.draw(ctx);
    }

    // Draw borders
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 3;
    ctx.strokeRect(0, 0, canvas.width, canvas.height);
}

// Update UI
function updateUI() {
    document.getElementById('populationCount').textContent = gameState.citizens.length;
    document.getElementById('housesCount').textContent = gameState.resources.houses.length;
    document.getElementById('treesCount').textContent = gameState.resources.trees.reduce((sum, tree) => sum + tree.wood, 0);
    document.getElementById('berriesCount').textContent = gameState.resources.berries.reduce((sum, berry) => sum + berry.berries, 0);
    document.getElementById('timeDisplay').textContent = `Day: ${Math.floor(gameState.day / 60)}`;
    document.getElementById('speedDisplay').textContent = `Speed: ${gameState.speed}x`;
}

// Game loop
function gameLoop() {
    for (let i = 0; i < gameState.speed; i++) {
        update();
    }
    draw();
    updateUI();
    requestAnimationFrame(gameLoop);
}

// Event listeners
document.getElementById('pauseBtn').addEventListener('click', () => {
    gameState.paused = !gameState.paused;
    document.getElementById('pauseBtn').textContent = gameState.paused ? '▶ Resume' : '⏸ Pause';
});

document.getElementById('resetBtn').addEventListener('click', () => {
    gameState.paused = false;
    init();
    document.getElementById('pauseBtn').textContent = '⏸ Pause';
});

document.getElementById('speedUpBtn').addEventListener('click', () => {
    gameState.speed = Math.min(5, gameState.speed + 1);
});

document.getElementById('speedDownBtn').addEventListener('click', () => {
    gameState.speed = Math.max(1, gameState.speed - 1);
});

// Canvas click to build houses
canvas.addEventListener('click', (e) => {
    const rect = canvas.getBoundingClientRect();
    const mouseX = (e.clientX - rect.left) / TILE_SIZE;
    const mouseY = (e.clientY - rect.top) / TILE_SIZE;

    for (let citizen of gameState.citizens) {
        if (Math.sqrt((citizen.x - mouseX) ** 2 + (citizen.y - mouseY) ** 2) < 1) {
            citizen.buildHouse();
            break;
        }
    }
});

// Start the game
init();
gameLoop();
