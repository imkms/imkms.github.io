// --- DOM Elements ---
const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');
const scoreEl = document.getElementById('score');
const highScoreEl = document.getElementById('high-score');
const configScreen = document.getElementById('config-screen');
const gameOverScreen = document.getElementById('game-over-screen');
const finalScoreEl = document.getElementById('final-score');
const startGameBtn = document.getElementById('start-game-btn');
const playAgainBtn = document.getElementById('play-again-btn');

// --- Game Constants & State ---
const bird = {
    x: 50,
    y: 150,
    width: 30,
    height: 30,
    velocity: 0,
    gravity: 0.28, // Default value, will be set by difficulty
    lift: -7 
};

const pipes = [];
const pipeWidth = 50;
const pipeGap = 210;
let pipeSpawnTimer = 0;
const pipeSpawnInterval = 120;

let gameState = 'CONFIG'; // CONFIG, PLAYING, GAMEOVER
let score = 0;
let highScore = localStorage.getItem('flappyHighScore') || 0;
highScoreEl.textContent = highScore;

let selectedSkins = {
    bird: 'classic',
    pipe: 'classic'
};

// --- Canvas Sizing ---
function setCanvasSize() {
    const containerWidth = canvas.parentElement.clientWidth;
    canvas.width = containerWidth;
    canvas.height = containerWidth * 1.5;
}

// --- Game Logic ---
function resetGame() {
    bird.y = canvas.height / 2.5;
    bird.velocity = 0;
    pipes.length = 0;
    score = 0;
    scoreEl.textContent = 0;
    gameState = 'CONFIG';
    configScreen.classList.remove('hidden');
    gameOverScreen.classList.add('hidden');
}

function startGame() {
    const difficulty = document.querySelector('input[name="difficulty"]:checked').value;
    switch(difficulty) {
        case 'easy':
            bird.gravity = 0.20;
            break;
        case 'hard':
            bird.gravity = 0.38;
            break;
        case 'normal':
        default:
            bird.gravity = 0.28;
            break;
    }

    selectedSkins.bird = document.querySelector('input[name="bird-skin"]:checked').value;
    selectedSkins.pipe = document.querySelector('input[name="pipe-skin"]:checked').value;
    gameState = 'PLAYING';
    configScreen.classList.add('hidden');
    flap(); // Give an initial flap to start
}


function flap() {
    if (gameState === 'PLAYING') {
        bird.velocity = bird.lift;
    }
}

function update() {
    if (gameState !== 'PLAYING') return;

    bird.velocity += bird.gravity;
    bird.y += bird.velocity;

    if (bird.y + bird.height > canvas.height || bird.y < 0) {
        endGame();
        return;
    }

    if (pipeSpawnTimer >= pipeSpawnInterval) {
        const gapY = Math.random() * (canvas.height - pipeGap - 80) + 40;
        pipes.push({ x: canvas.width, y: gapY, passed: false });
        pipeSpawnTimer = 0;
    }
    pipeSpawnTimer++;

    for (let i = pipes.length - 1; i >= 0; i--) {
        const p = pipes[i];
        p.x -= 2;

        if (!p.passed && p.x + pipeWidth < bird.x) {
            p.passed = true;
            score++;
            scoreEl.textContent = score;
        }

        if (bird.x < p.x + pipeWidth && bird.x + bird.width > p.x && (bird.y < p.y || bird.y + bird.height > p.y + pipeGap)) {
            endGame();
            return;
        }

        if (p.x + pipeWidth < 0) {
            pipes.splice(i, 1);
        }
    }
}

function endGame() {
    gameState = 'GAMEOVER';
    gameOverScreen.classList.remove('hidden');
    finalScoreEl.textContent = score;
    if (score > highScore) {
        highScore = score;
        localStorage.setItem('flappyHighScore', highScore);
        highScoreEl.textContent = highScore;
    }
}

// --- Drawing ---
function draw() {
    const style = getComputedStyle(document.documentElement);
    const bgColor = style.getPropertyValue('--canvas-bg').trim();
    const birdColor = style.getPropertyValue(`--bird-color-${selectedSkins.bird}`).trim();
    const pipeColor = style.getPropertyValue(`--pipe-color-${selectedSkins.pipe}`).trim();
    const borderColor = style.getPropertyValue('--border-color').trim();

    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = birdColor;
    ctx.fillRect(bird.x, bird.y, bird.width, bird.height);
    ctx.strokeStyle = borderColor;
    ctx.lineWidth = 2;
    ctx.strokeRect(bird.x, bird.y, bird.width, bird.height);

    ctx.fillStyle = pipeColor;
    pipes.forEach(p => {
        ctx.fillRect(p.x, 0, pipeWidth, p.y);
        ctx.strokeRect(p.x, 0, pipeWidth, p.y);
        ctx.fillRect(p.x, p.y + pipeGap, pipeWidth, canvas.height - p.y - pipeGap);
        ctx.strokeRect(p.x, p.y + pipeGap, pipeWidth, canvas.height - p.y - pipeGap);
    });
}

// --- Game Loop ---
function gameLoop() {
    if (gameState === 'PLAYING') {
        update();
    }
    draw();
    requestAnimationFrame(gameLoop);
}

// --- Event Listeners ---
document.addEventListener('keydown', (e) => {
    if (e.code === 'Space' && gameState === 'PLAYING') {
        e.preventDefault();
        flap();
    }
});
canvas.parentElement.addEventListener('mousedown', () => { if (gameState === 'PLAYING') flap(); });
canvas.parentElement.addEventListener('touchstart', (e) => { if (gameState === 'PLAYING') { e.preventDefault(); flap(); } });
startGameBtn.addEventListener('click', startGame);
playAgainBtn.addEventListener('click', (e) => { e.stopPropagation(); resetGame(); });
window.addEventListener('resize', () => { setCanvasSize(); });

// --- Initialisation ---
setCanvasSize();
resetGame();
gameLoop();