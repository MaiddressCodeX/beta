const canvas = document.getElementById("stage");
const ctx = canvas.getContext("2d");

const GRID_TILE = 64;
const GRID_COLS = canvas.width / GRID_TILE;
const GRID_ROWS = canvas.height / GRID_TILE;

const hud = {
  wave: document.getElementById("wave"),
  gold: document.getElementById("gold"),
  lives: document.getElementById("lives"),
  start: document.getElementById("start-wave"),
  message: document.getElementById("message"),
  selectedTower: document.getElementById("selected-tower"),
};

const towerButtons = Array.from(document.querySelectorAll(".tower-card"));

const towerCatalog = {
  basic: {
    name: "ป้อมพื้นฐาน",
    cost: 50,
    range: 150,
    fireRate: 700,
    damage: 12,
    color: "#48a7ff",
    shotRadius: 6,
    projectileSpeed: 0.5,
  },
  burst: {
    name: "ป้อมกระสุนคู่",
    cost: 70,
    range: 110,
    fireRate: 350,
    damage: 7,
    color: "#ff679d",
    shotRadius: 5,
    projectileSpeed: 0.55,
  },
  sniper: {
    name: "ป้อมสไนเปอร์",
    cost: 90,
    range: 240,
    fireRate: 1400,
    damage: 25,
    color: "#a06bff",
    shotRadius: 6,
    projectileSpeed: 0.65,
  },
};

const enemyWaves = [
  { hp: 60, speed: 0.045, reward: 10, color: "#6ef7b1" },
  { hp: 80, speed: 0.05, reward: 12, color: "#ffd85c" },
  { hp: 110, speed: 0.06, reward: 13, color: "#ff6b81" },
  { hp: 140, speed: 0.065, reward: 15, color: "#b799ff" },
];

const STATE = {
  gold: 100,
  lives: 10,
  wave: 1,
  towers: [],
  enemies: [],
  projectiles: [],
  path: [],
  selectedTower: null,
  placements: new Set(),
  playing: false,
  spawnTimer: 0,
  enemiesToSpawn: 0,
  currentConfig: null,
};

const pathWaypoints = [
  { x: 0, y: 3 },
  { x: 3, y: 3 },
  { x: 3, y: 1 },
  { x: 6, y: 1 },
  { x: 6, y: 5 },
  { x: 9, y: 5 },
  { x: 9, y: 7 },
];

function buildPath() {
  const tiles = [];
  for (let i = 0; i < pathWaypoints.length - 1; i++) {
    const a = pathWaypoints[i];
    const b = pathWaypoints[i + 1];
    let x = a.x;
    let y = a.y;
    tiles.push({ x, y });

    while (x !== b.x || y !== b.y) {
      if (x !== b.x) x += Math.sign(b.x - x);
      if (y !== b.y) y += Math.sign(b.y - y);
      tiles.push({ x, y });
    }
  }
  STATE.path = tiles;
}

function setSelectedTower(type) {
  STATE.selectedTower = type;
  towerButtons.forEach(btn => {
    btn.classList.toggle("selected", btn.dataset.tower === type);
  });
  hud.selectedTower.textContent = type ? towerCatalog[type].name : "-";
}

towerButtons.forEach(button => {
  button.addEventListener("click", () => {
    const type = button.dataset.tower;
    if (STATE.selectedTower === type) {
      setSelectedTower(null);
    } else {
      setSelectedTower(type);
    }
  });
});

canvas.addEventListener("click", event => {
  if (!STATE.selectedTower || STATE.playing) return;
  const rect = canvas.getBoundingClientRect();
  const x = Math.floor((event.clientX - rect.left) / GRID_TILE);
  const y = Math.floor((event.clientY - rect.top) / GRID_TILE);
  placeTower(x, y, STATE.selectedTower);
});

hud.start.addEventListener("click", () => {
  if (!STATE.playing) startWave();
});

function tileKey(x, y) {
  return `${x},${y}`;
}

function isPathTile(x, y) {
  return STATE.path.some(tile => tile.x === x && tile.y === y);
}

function placeTower(tileX, tileY, type) {
  if (tileX < 0 || tileY < 0 || tileX >= GRID_COLS || tileY >= GRID_ROWS) return;
  if (tileY === GRID_ROWS - 1) return;
  const key = tileKey(tileX, tileY);
  if (STATE.placements.has(key) || isPathTile(tileX, tileY)) return flashMessage("วางไม่ได้ตรงนี้", 1000);

  const blueprint = towerCatalog[type];
  if (STATE.gold < blueprint.cost) {
    flashMessage("ทองไม่พอ", 1000);
    return;
  }

  STATE.gold -= blueprint.cost;
  STATE.placements.add(key);
  STATE.towers.push({
    type,
    x: tileX * GRID_TILE + GRID_TILE / 2,
    y: tileY * GRID_TILE + GRID_TILE / 2,
    cooldown: 0,
    config: blueprint,
  });
  updateHUD();
  flashMessage("สร้างป้อมแล้ว!", 800);
}

function startWave() {
  STATE.playing = true;
  hud.start.disabled = true;
  STATE.spawnTimer = 0;
  const index = Math.min(STATE.wave - 1, enemyWaves.length - 1);
  STATE.currentConfig = enemyWaves[index];
  STATE.enemiesToSpawn = 5 + STATE.wave * 2;
  STATE.enemies = [];
  STATE.projectiles = [];
  flashMessage(`ศัตรูบุกคลื่น ${STATE.wave}!`, 1200);
}

function spawnEnemy() {
  const start = STATE.path[0];
  STATE.enemies.push({
    x: start.x * GRID_TILE + GRID_TILE / 2,
    y: start.y * GRID_TILE + GRID_TILE / 2,
    hp: STATE.currentConfig.hp,
    speed: STATE.currentConfig.speed,
    reward: STATE.currentConfig.reward,
    color: STATE.currentConfig.color,
    pathIndex: 0,
  });
}

function update(delta) {
  if (!STATE.playing) {
    updateProjectiles(delta);
    return;
  }

  STATE.spawnTimer += delta;
  if (STATE.enemiesToSpawn > 0 && STATE.spawnTimer >= 900) {
    spawnEnemy();
    STATE.enemiesToSpawn--;
    STATE.spawnTimer = 0;
  }

  updateEnemies(delta);
  updateTowers(delta);
  updateProjectiles(delta);

  if (STATE.enemies.length === 0 && STATE.enemiesToSpawn === 0) {
    STATE.playing = false;
    STATE.wave++;
    STATE.gold += 35;
    hud.start.disabled = false;
    updateHUD();
    flashMessage("เอาชนะคลื่นนี้แล้ว!", 1400);
  }
}

function updateEnemies(delta) {
  for (let i = STATE.enemies.length - 1; i >= 0; i--) {
    const enemy = STATE.enemies[i];
    const nextTile = STATE.path[enemy.pathIndex + 1];
    if (!nextTile) {
      STATE.enemies.splice(i, 1);
      STATE.lives--;
      updateHUD();
      flashMessage("ฐานถูกโจมตี!", 1100);
      if (STATE.lives <= 0) {
        flashMessage("เกมจบ! รีเฟรชเพื่อเริ่มใหม่", 0);
        STATE.playing = false;
        hud.start.disabled = true;
      }
      continue;
    }

    const targetX = nextTile.x * GRID_TILE + GRID_TILE / 2;
    const targetY = nextTile.y * GRID_TILE + GRID_TILE / 2;
    const dx = targetX - enemy.x;
    const dy = targetY - enemy.y;
    const distance = Math.hypot(dx, dy);
    const step = enemy.speed * delta * GRID_TILE;

    if (distance <= step) {
      enemy.x = targetX;
      enemy.y = targetY;
      enemy.pathIndex++;
    } else {
      enemy.x += (dx / distance) * step;
      enemy.y += (dy / distance) * step;
    }

    if (enemy.hp <= 0) {
      STATE.enemies.splice(i, 1);
      STATE.gold += enemy.reward;
      updateHUD();
    }
  }
}

function updateTowers(delta) {
  STATE.towers.forEach(tower => {
    if (tower.cooldown > 0) {
      tower.cooldown -= delta;
      return;
    }

    const target = findTarget(tower);
    if (target) {
      fire(tower, target);
      tower.cooldown = tower.config.fireRate;
    }
  });
}

function findTarget(tower) {
  let selected = null;
  let minDistance = Infinity;
  STATE.enemies.forEach(enemy => {
    const dist = Math.hypot(enemy.x - tower.x, enemy.y - tower.y);
    if (dist <= tower.config.range && dist < minDistance) {
      selected = enemy;
      minDistance = dist;
    }
  });
  return selected;
}

function fire(tower, enemy) {
  STATE.projectiles.push({
    x: tower.x,
    y: tower.y,
    target: enemy,
    speed: tower.config.projectileSpeed,
    damage: tower.config.damage,
    color: tower.config.color,
    radius: tower.config.shotRadius,
  });
}

function updateProjectiles(delta) {
  for (let i = STATE.projectiles.length - 1; i >= 0; i--) {
    const projectile = STATE.projectiles[i];
    if (!STATE.enemies.includes(projectile.target)) {
      STATE.projectiles.splice(i, 1);
      continue;
    }

    const dx = projectile.target.x - projectile.x;
    const dy = projectile.target.y - projectile.y;
    const distance = Math.hypot(dx, dy);
    const step = projectile.speed * delta * GRID_TILE;

    if (distance <= step) {
      projectile.target.hp -= projectile.damage;
      STATE.projectiles.splice(i, 1);
      continue;
    }

    projectile.x += (dx / distance) * step;
    projectile.y += (dy / distance) * step;
  }
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawGrid();
  drawPath();
  drawBase();
  drawTowers();
  drawEnemies();
  drawProjectiles();
}

function drawGrid() {
  ctx.strokeStyle = "rgba(112, 240, 255, 0.05)";
  for (let x = 0; x <= canvas.width; x += GRID_TILE) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, canvas.height);
    ctx.stroke();
  }
  for (let y = 0; y <= canvas.height; y += GRID_TILE) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(canvas.width, y);
    ctx.stroke();
  }
}

function drawPath() {
  ctx.fillStyle = "rgba(112, 240, 255, 0.08)";
  STATE.path.forEach(tile => {
    ctx.fillRect(tile.x * GRID_TILE + 4, tile.y * GRID_TILE + 4, GRID_TILE - 8, GRID_TILE - 8);
  });
}

function drawBase() {
  const base = STATE.path[STATE.path.length - 1];
  ctx.fillStyle = "#ff5c8a";
  ctx.beginPath();
  ctx.arc(base.x * GRID_TILE + GRID_TILE / 2, base.y * GRID_TILE + GRID_TILE / 2, 28, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "rgba(17,26,46,0.8)";
  ctx.beginPath();
  ctx.arc(base.x * GRID_TILE + GRID_TILE / 2, base.y * GRID_TILE + GRID_TILE / 2, 18, 0, Math.PI * 2);
  ctx.fill();
}

function drawTowers() {
  STATE.towers.forEach(tower => {
    ctx.fillStyle = tower.config.color;
    ctx.beginPath();
    ctx.arc(tower.x, tower.y, 20, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,0.2)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(tower.x, tower.y, tower.config.range, 0, Math.PI * 2);
    ctx.stroke();
  });
}

function drawEnemies() {
  STATE.enemies.forEach(enemy => {
    ctx.fillStyle = enemy.color;
    ctx.beginPath();
    ctx.arc(enemy.x, enemy.y, 16, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "rgba(0,0,0,0.65)";
    ctx.fillRect(enemy.x - 22, enemy.y - 28, 44, 8);

    const maxHp = STATE.currentConfig ? STATE.currentConfig.hp : enemy.hp;
    ctx.fillStyle = "#70f0ff";
    ctx.fillRect(enemy.x - 22, enemy.y - 28, 44 * Math.max(enemy.hp, 0) / maxHp, 8);
  });
}

function drawProjectiles() {
  STATE.projectiles.forEach(projectile => {
    ctx.fillStyle = projectile.color;
    ctx.beginPath();
    ctx.arc(projectile.x, projectile.y, projectile.radius, 0, Math.PI * 2);
    ctx.fill();
  });
}

let lastTime = performance.now();
function loop(time) {
  const delta = time - lastTime;
  lastTime = time;
  update(delta);
  draw();
  requestAnimationFrame(loop);
}

function updateHUD() {
  hud.gold.textContent = STATE.gold;
  hud.wave.textContent = STATE.wave;
  hud.lives.textContent = STATE.lives;
}

let messageTimer = null;
function flashMessage(text, duration) {
  if (!text) return;
  hud.message.textContent = text;
  hud.message.classList.add("visible");
  if (messageTimer) clearTimeout(messageTimer);
  if (duration > 0) {
    messageTimer = setTimeout(() => {
      hud.message.classList.remove("visible");
    }, duration);
  }
}

function init() {
  buildPath();
  updateHUD();
  draw();
}

init();
requestAnimationFrame(loop);
