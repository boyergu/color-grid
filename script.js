const grid = document.getElementById('grid');
const letterInput = document.getElementById('letterInput');
const colorInput = document.getElementById('colorInput');

let placedAt = null; // zaman kontrolü için

// 50x50 grid oluştur
for(let i=0; i<2500; i++) {
  const cell = document.createElement('div');
  cell.classList.add('cell');
  cell.dataset.index = i;
  grid.appendChild(cell);
}

function canPlaceLetter() {
  if(!placedAt) return true;
  const diff = Date.now() - placedAt;
  return diff > 5*60*1000; // 5 dakika
}

function updateTimer() {
  if(!placedAt) return;
  const remaining = 5*60*1000 - (Date.now() - placedAt);
  if(remaining <= 0) {
    placedAt = null;
    letterInput.disabled = false;
    colorInput.disabled = false;
  } else {
    letterInput.disabled = true;
    colorInput.disabled = true;
  }
}

grid.addEventListener('click', e => {
  if(!e.target.classList.contains('cell')) return;

  if(!canPlaceLetter()) {
    alert("You can only place a letter every 5 minutes.");
    return;
  }

  const letter = letterInput.value.toUpperCase();
  const color = colorInput.value;

  if(!letter.match(/^[A-Z0-9]$/)) {
    alert("Please enter a valid letter (A-Z or 0-9).");
    return;
  }

  e.target.textContent = letter;
  e.target.style.color = color;

  placedAt = Date.now();
  letterInput.value = "";
  letterInput.disabled = true;
  colorInput.disabled = true;
});

setInterval(() => {
  updateTimer();
}, 1000);
