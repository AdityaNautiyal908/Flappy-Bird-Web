// Flappy Bird Game in JavaScript

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Game constants
const GRAVITY = 0.18; // Reduced gravity for slower fall
const FLAP = -5.0;    // Stronger flap for more satisfying jump
const PIPE_WIDTH = 60;
const PIPE_GAP = 180; // Wider gap for easier play
const BIRD_SIZE = 32;
const PIPE_SPEED = 1.2; // Slower pipe speed

// Game states
const STATE_MENU = 'menu';
const STATE_PLAYING = 'playing';
const STATE_GAMEOVER = 'gameover';
const STATE_QUIT = 'quit';
const STATE_PAUSED = 'paused';
let gameState = STATE_MENU;

// Game variables
let birdY = canvas.height / 2;
let birdVelocity = 0;
let pipes = [];
let score = 0;
let highScore = parseInt(localStorage.getItem('highScore') || '0');

// Initial gravity control
let initialGravity = true;
let initialGravityTimer = 0;
const INITIAL_GRAVITY_DURATION = 60; // frames (~1s at 60fps)
const INITIAL_GRAVITY = 0.08; // much slower at start

// Menu button positions
const playBtn = { x: 120, y: 250, w: 160, h: 60 };
const quitBtn = { x: 120, y: 340, w: 160, h: 60 };

// Track which menu button is hovered
let hoveredBtn = null; // 'play', 'shop', 'quit'

// Bird skins (each is a set of frames for animation)
const birdSkins = [
    { name: 'Yellow', frames: ['frames/frame-1.png','frames/frame-2.png','frames/frame-3.png','frames/frame-4.png','frames/frame-5.png','frames/frame-6.png','frames/frame-7.png','frames/frame-8.png'], cost: 0 },
    { name: 'Red', frames: ['frames/frame-9.png','frames/frame-10.png','frames/frame-11.png','frames/frame-12.png','frames/frame-13.png','frames/frame-14.png','frames/frame-15.png','frames/frame-16.png'], cost: 20 },
    { name: 'Blue', frames: ['frames/frame-17.png','frames/frame-18.png','frames/frame-19.png','frames/frame-20.png','frames/frame-21.png','frames/frame-22.png','frames/frame-23.png','frames/frame-24.png'], cost: 40 },
];
let unlockedBirds = JSON.parse(localStorage.getItem('unlockedBirds') || '[0]');
let selectedBird = parseInt(localStorage.getItem('selectedBird') || '0');

// Animation state
let birdFrameIdx = 0;
let birdFrameTick = 0;
const BIRD_ANIM_SPEED = 5; // Lower is faster
let birdImgs = [];
function loadBirdImages() {
    birdImgs = birdSkins[selectedBird].frames.map(f => {
        let img = new Image();
        img.src = f;
        return img;
    });
}
loadBirdImages();

// Shop state
let showShop = false;

// Audio elements
const bgMusic = document.getElementById('bgMusic');
const pointSound = document.getElementById('pointSound');
const dieSound = document.getElementById('dieSound');
const flapSound = new Audio('music/flap_sound.mp3');
const crossPipeSound = new Audio('music/cross_pipe.mp3');
const deathSound = new Audio('music/death.mp3');

let pauseCountdown = 0;
let pauseCountdownActive = false;
let spaceHeld = false;
let autoFlapTick = 0;
const AUTO_FLAP_INTERVAL = 18; // frames between auto-flaps when holding space

function resetGame() {
    birdY = canvas.height / 2;
    birdVelocity = 0;
    pipes = [];
    score = 0;
    birdFrameIdx = 0;
    birdFrameTick = 0;
    loadBirdImages();
    initialGravity = true;
    initialGravityTimer = 0;
    // Create initial pipes
    for (let i = 0; i < 3; i++) {
        pipes.push({
            x: 400 + i * 200,
            height: Math.random() * (canvas.height - PIPE_GAP - 100) + 50
        });
    }
}

function drawBird() {
    ctx.save();
    let img = birdImgs[birdFrameIdx];
    ctx.drawImage(img, 80 - BIRD_SIZE / 2, birdY - BIRD_SIZE / 2, BIRD_SIZE, BIRD_SIZE);
    ctx.restore();
    // Animate
    birdFrameTick++;
    if (birdFrameTick >= BIRD_ANIM_SPEED) {
        birdFrameTick = 0;
        birdFrameIdx = (birdFrameIdx + 1) % birdImgs.length;
    }
}

function drawPipes() {
    ctx.fillStyle = '#228B22';
    pipes.forEach(pipe => {
        // Top pipe
        ctx.fillRect(pipe.x, 0, PIPE_WIDTH, pipe.height);
        // Bottom pipe
        ctx.fillRect(pipe.x, pipe.height + PIPE_GAP, PIPE_WIDTH, canvas.height - pipe.height - PIPE_GAP);
    });
}

function drawScore() {
    ctx.fillStyle = '#333';
    ctx.font = '32px Arial';
    ctx.fillText(`Score: ${score}`, 20, 50);
    ctx.font = '20px Arial';
    ctx.fillText(`High Score: ${highScore}`, 20, 80);
}

function startBackgroundMusic() {
    bgMusic.currentTime = 0;
    bgMusic.volume = 0.5;
    bgMusic.play();
}

function stopBackgroundMusic() {
    bgMusic.pause();
    bgMusic.currentTime = 0;
}

function playPointSound() {
    crossPipeSound.currentTime = 0;
    crossPipeSound.play();
}

function playDieSound() {
    deathSound.currentTime = 0;
    deathSound.play();
}

function playFlapSound() {
    flapSound.currentTime = 0;
    flapSound.play();
}

function update() {
    if (gameState !== STATE_PLAYING) return;
    // Use slower gravity for the first second
    let gravity = initialGravity ? INITIAL_GRAVITY : GRAVITY;
    birdVelocity += gravity;
    // Auto-flap if space is held
    if (spaceHeld && !initialGravity) {
        autoFlapTick++;
        if (autoFlapTick >= AUTO_FLAP_INTERVAL) {
            birdVelocity = FLAP * 0.7; // gentle auto-flap
            playFlapSound();
            autoFlapTick = 0;
        }
    }
    birdY += birdVelocity;
    if (initialGravity) {
        initialGravityTimer++;
        if (initialGravityTimer > INITIAL_GRAVITY_DURATION) {
            initialGravity = false;
        }
    }

    // Move pipes
    pipes.forEach(pipe => {
        pipe.x -= PIPE_SPEED;
    });

    // Add new pipe
    if (pipes[0].x < -PIPE_WIDTH) {
        pipes.shift();
        pipes.push({
            x: pipes[pipes.length - 1].x + 200,
            height: Math.random() * (canvas.height - PIPE_GAP - 100) + 50
        });
        score++;
        playPointSound();
        if (score > highScore) {
            highScore = score;
            localStorage.setItem('highScore', highScore);
        }
    }

    // Collision detection
    let collided = false;
    pipes.forEach(pipe => {
        if (
            80 + BIRD_SIZE / 2 > pipe.x &&
            80 - BIRD_SIZE / 2 < pipe.x + PIPE_WIDTH &&
            (birdY - BIRD_SIZE / 2 < pipe.height || birdY + BIRD_SIZE / 2 > pipe.height + PIPE_GAP)
        ) {
            collided = true;
        }
    });
    // Ground or ceiling
    if (birdY + BIRD_SIZE / 2 > canvas.height || birdY - BIRD_SIZE / 2 < 0) {
        collided = true;
    }
    if (collided) {
        gameState = STATE_GAMEOVER;
        playDieSound();
        stopBackgroundMusic();
    }
}

function drawMenu() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#4ec0ca';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#fff';
    ctx.font = '48px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('Flappy Bird', canvas.width / 2, 100);
    // Play button
    ctx.fillStyle = hoveredBtn === 'play' ? '#5cd97a' : '#28a745';
    ctx.fillRect(playBtn.x, playBtn.y, playBtn.w, playBtn.h);
    ctx.fillStyle = '#fff';
    ctx.font = '32px Arial';
    ctx.fillText('Play', playBtn.x + playBtn.w / 2, playBtn.y + 40);
    // Shop button
    ctx.fillStyle = hoveredBtn === 'shop' ? '#4da3ff' : '#007bff';
    ctx.fillRect(playBtn.x, playBtn.y + 100, playBtn.w, playBtn.h);
    ctx.fillStyle = '#fff';
    ctx.font = '32px Arial';
    ctx.fillText('Shop', playBtn.x + playBtn.w / 2, playBtn.y + 140);
    // Quit button
    ctx.fillStyle = hoveredBtn === 'quit' ? '#ff6b7a' : '#dc3545';
    ctx.fillRect(quitBtn.x, quitBtn.y + 100, quitBtn.w, quitBtn.h);
    ctx.fillStyle = '#fff';
    ctx.font = '32px Arial';
    ctx.fillText('Quit', quitBtn.x + quitBtn.w / 2, quitBtn.y + 140);
    ctx.font = '20px Arial';
    ctx.fillStyle = '#333';
    ctx.fillText(`High Score: ${highScore}`, canvas.width / 2, 200);
    ctx.textAlign = 'start';
}

function drawShop() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#4ec0ca';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.font = '40px Arial';
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';
    ctx.fillText('Bird Shop', canvas.width / 2, 60);
    ctx.font = '20px Arial';
    ctx.fillText('Click a bird to buy/select', canvas.width / 2, 90);
    // Draw birds (show first frame as preview)
    for (let i = 0; i < birdSkins.length; i++) {
        let x = 60 + (i % 4) * 100;
        let y = 120 + Math.floor(i / 4) * 140;
        ctx.save();
        ctx.globalAlpha = unlockedBirds.includes(i) ? 1 : 0.5;
        let img = new Image();
        img.src = birdSkins[i].frames[0];
        ctx.drawImage(img, x, y, 64, 64);
        ctx.restore();
        ctx.font = '16px Arial';
        ctx.fillStyle = '#fff';
        ctx.fillText(birdSkins[i].name, x + 32, y + 80);
        if (!unlockedBirds.includes(i)) {
            ctx.fillStyle = '#ff0';
            ctx.fillText(`Cost: ${birdSkins[i].cost}`, x + 32, y + 100);
        } else if (selectedBird === i) {
            ctx.fillStyle = '#0f0';
            ctx.fillText('Selected', x + 32, y + 100);
        } else {
            ctx.fillStyle = '#fff';
            ctx.fillText('Owned', x + 32, y + 100);
        }
    }
    ctx.font = '24px Arial';
    ctx.fillStyle = '#333';
    ctx.fillText('Back', 60, canvas.height - 30);
    ctx.textAlign = 'start';
}

function drawPause() {
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#fff';
    ctx.font = '48px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('Paused', canvas.width / 2, 250);
    ctx.font = '24px Arial';
    ctx.fillText('Press P to Resume', canvas.width / 2, 300);
    ctx.fillText('Press Q to Quit', canvas.width / 2, 340);
    ctx.textAlign = 'start';
}

function drawPauseCountdown() {
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#fff';
    ctx.font = '48px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('Get Ready!', canvas.width / 2, 250);
    ctx.font = '64px Arial';
    ctx.fillText(pauseCountdown, canvas.width / 2, 340);
    ctx.textAlign = 'start';
}

function draw() {
    if (showShop) {
        drawShop();
        return;
    }
    if (gameState === STATE_MENU) {
        drawMenu();
        return;
    }
    if (gameState === STATE_QUIT) {
        drawMenu();
        return;
    }
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawPipes();
    drawBird();
    drawScore();
    if (gameState === STATE_GAMEOVER) {
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#fff';
        ctx.font = '48px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('Game Over', canvas.width / 2, 250);
        ctx.font = '24px Arial';
        ctx.fillText('Press Space to Restart', canvas.width / 2, 300);
        ctx.textAlign = 'start';
    } else if (gameState === STATE_PAUSED) {
        drawPause();
    } else if (pauseCountdownActive) {
        drawPauseCountdown();
    }
}

function gameLoop() {
    if (pauseCountdownActive) {
        if (pauseCountdown > 0) {
            if (gameLoop._lastCountdownFrame === undefined || performance.now() - gameLoop._lastCountdownFrame >= 1000) {
                pauseCountdown--;
                gameLoop._lastCountdownFrame = performance.now();
            }
        } else {
            pauseCountdownActive = false;
            gameState = STATE_PLAYING;
            startBackgroundMusic();
        }
        draw();
        requestAnimationFrame(gameLoop);
        return;
    }
    // If quit, reset to menu for interactivity and reset game state
    if (gameState === STATE_QUIT) {
        resetGame();
        gameState = STATE_MENU;
        drawMenu();
        return;
    }
    if (gameState !== STATE_PAUSED) {
        update();
    }
    draw();
    requestAnimationFrame(gameLoop);
}

canvas.addEventListener('click', function(e) {
    if (gameState === STATE_MENU && !showShop) {
        const rect = canvas.getBoundingClientRect();
        const mx = e.clientX - rect.left;
        const my = e.clientY - rect.top;
        // Play
        if (
            mx >= playBtn.x && mx <= playBtn.x + playBtn.w &&
            my >= playBtn.y && my <= playBtn.y + playBtn.h
        ) {
            resetGame();
            gameState = STATE_PLAYING;
            startBackgroundMusic();
        // Shop
        } else if (
            mx >= playBtn.x && mx <= playBtn.x + playBtn.w &&
            my >= playBtn.y + 100 && my <= playBtn.y + 100 + playBtn.h
        ) {
            showShop = true;
            drawShop();
        // Quit
        } else if (
            mx >= quitBtn.x && mx <= quitBtn.x + quitBtn.w &&
            my >= quitBtn.y + 100 && my <= quitBtn.y + 100 + quitBtn.h
        ) {
            gameState = STATE_QUIT;
            stopBackgroundMusic();
        }
    } else if (showShop) {
        const rect = canvas.getBoundingClientRect();
        const mx = e.clientX - rect.left;
        const my = e.clientY - rect.top;
        // Back button
        if (mx >= 40 && mx <= 120 && my >= canvas.height - 50 && my <= canvas.height - 10) {
            showShop = false;
            drawMenu();
            return;
        }
        // Bird selection
        for (let i = 0; i < birdSkins.length; i++) {
            let x = 60 + (i % 4) * 100;
            let y = 120 + Math.floor(i / 4) * 140;
            if (mx >= x && mx <= x + 64 && my >= y && my <= y + 64) {
                if (!unlockedBirds.includes(i)) {
                    if (score >= birdSkins[i].cost) {
                        unlockedBirds.push(i);
                        localStorage.setItem('unlockedBirds', JSON.stringify(unlockedBirds));
                        selectedBird = i;
                        localStorage.setItem('selectedBird', selectedBird);
                        loadBirdImages();
                        birdFrameIdx = 0;
                    }
                } else {
                    selectedBird = i;
                    localStorage.setItem('selectedBird', selectedBird);
                    loadBirdImages();
                    birdFrameIdx = 0;
                }
                drawShop();
                break;
            }
        }
    }
});

document.addEventListener('keydown', function(e) {
    if (gameState === STATE_MENU || gameState === STATE_QUIT) return;
    // Handle pause countdown controls
    if (pauseCountdownActive) {
        if (e.code === 'KeyQ') {
            pauseCountdownActive = false;
            gameState = STATE_QUIT;
            stopBackgroundMusic();
        } else if (e.code === 'KeyP') {
            pauseCountdownActive = false;
            gameState = STATE_PAUSED;
            drawPause();
        }
        return;
    }
    // Handle pause menu controls
    if (gameState === STATE_PAUSED) {
        if (e.code === 'KeyP') {
            pauseCountdown = 3;
            pauseCountdownActive = true;
        } else if (e.code === 'KeyQ') {
            gameState = STATE_QUIT;
            stopBackgroundMusic();
        }
        return;
    }
    // Handle normal gameplay controls
    if (e.code === 'Space') {
        if (gameState === STATE_GAMEOVER) {
            resetGame();
            gameState = STATE_PLAYING;
            startBackgroundMusic();
        } else if (gameState === STATE_PLAYING) {
            birdVelocity = FLAP;
            playFlapSound();
            spaceHeld = true;
            autoFlapTick = 0;
        }
    } else if (gameState === STATE_PLAYING && e.code === 'KeyP') {
        gameState = STATE_PAUSED;
        stopBackgroundMusic();
    }
});

document.addEventListener('keyup', function(e) {
    if (e.code === 'Space') {
        spaceHeld = false;
        autoFlapTick = 0;
    }
});

canvas.addEventListener('mousemove', function(e) {
    if (gameState === STATE_MENU && !showShop) {
        const rect = canvas.getBoundingClientRect();
        const mx = e.clientX - rect.left;
        const my = e.clientY - rect.top;
        if (
            mx >= playBtn.x && mx <= playBtn.x + playBtn.w &&
            my >= playBtn.y && my <= playBtn.y + playBtn.h
        ) {
            hoveredBtn = 'play';
        } else if (
            mx >= playBtn.x && mx <= playBtn.x + playBtn.w &&
            my >= playBtn.y + 100 && my <= playBtn.y + 100 + playBtn.h
        ) {
            hoveredBtn = 'shop';
        } else if (
            mx >= quitBtn.x && mx <= quitBtn.x + quitBtn.w &&
            my >= quitBtn.y + 100 && my <= quitBtn.y + 100 + quitBtn.h
        ) {
            hoveredBtn = 'quit';
        } else {
            hoveredBtn = null;
        }
        drawMenu();
    } else {
        hoveredBtn = null;
    }
});

gameLoop();
drawMenu(); 