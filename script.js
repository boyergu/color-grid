const gridSize = 50;
const grid = document.getElementById("grid");
const letterInput = document.getElementById("letterInput");
const colorInput = document.getElementById("colorInput");

// Firebase Firestore referansı
const db = firebase.firestore();
const gridRef = db.collection("grid");

// Grid oluştur
for (let row = 0; row < gridSize; row++) {
  const rowDiv = document.createElement("div");
  rowDiv.classList.add("row");

  for (let col = 0; col < gridSize; col++) {
    const cell = document.createElement("div");
    cell.classList.add("cell");
    cell.dataset.row = row;
    cell.dataset.col = col;

    cell.addEventListener("click", async () => {
      const letter = letterInput.value;
      const color = colorInput.value;

      if (letter) {
        cell.textContent = letter;
        cell.style.color = color;

        // Firebase'e kaydet
        await gridRef.doc(`${row}-${col}`).set({
          row,
          col,
          letter,
          color
        });
      }
    });

    rowDiv.appendChild(cell);
  }

  grid.appendChild(rowDiv);
}

// Firebase'den verileri yükle
async function loadGrid() {
  const snapshot = await gridRef.get();
  snapshot.forEach(doc => {
    const data = doc.data();
    const selector = `.cell[data-row='${data.row}'][data-col='${data.col}']`;
    const cell = document.querySelector(selector);
    if (cell) {
      cell.textContent = data.letter;
      cell.style.color = data.color;
    }
  });
}

// Sayfa yüklenince verileri getir
loadGrid();
