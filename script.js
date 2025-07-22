// script.js (modül olarak import ediliyor)
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-app.js";
import { getFirestore, collection, addDoc, query, orderBy, onSnapshot, serverTimestamp, where, limit, getDocs } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-firestore.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-auth.js";

// Firebase config (BU KISIM SİZİN SAĞLADIĞINIZ BİLGİLERLE GÜNCELLENDİ!)
const firebaseConfig = {
  apiKey: "AIzaSyAmy3tU95GoWD92KsQfQiUQQ_RK-ER_8a0",
  authDomain: "color-grid-7d73f.firebaseapp.com",
  projectId: "color-grid-7d73f",
  storageBucket: "color-grid-7d73f.firebasestorage.app",
  messagingSenderId: "20551637017",
  appId: "1:20551637017:web:65e439cc83a3d4bf1d3288",
  measurementId: "G-5VE8JXRKYY" // Bu bilgi de Firebase konsolundan geldiği için ekledik
};

// Firebase Uygulamasını Başlat
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app); // Auth servisini başlat

// HTML Elementleri
const authContainer = document.getElementById("auth-container");
const gameContainer = document.getElementById("game-container");
const signInBtn = document.getElementById("signInBtn");
const signOutBtn = document.getElementById("signOutBtn");
const letterInput = document.getElementById("letterInput");
const colorInput = document.getElementById("colorInput");
const addBtn = document.getElementById("addBtn");
const letterBoard = document.getElementById("letterBoard");

// Global Değişkenler
let currentUser = null; // Giriş yapan kullanıcı bilgisi
let lastWriteTimestamp = null;
const WAIT_TIME = 5 * 60 * 1000; // 5 minutes wait time

// --- Firebase Authentication ---

// Google ile Giriş Yap
signInBtn.addEventListener("click", async () => {
  const provider = new GoogleAuthProvider();
  try {
    await signInWithPopup(auth, provider);
    // onAuthStateChanged listener'ı zaten UI'ı güncelleyecek
  } catch (error) {
    console.error("Error signing in with Google:", error);
    alert("Failed to sign in. Please try again.");
  }
});

// Çıkış Yap
signOutBtn.addEventListener("click", async () => {
  try {
    await signOut(auth);
    // onAuthStateChanged listener'ı zaten UI'ı güncelleyecek
  } catch (error) {
    console.error("Error signing out:", error);
    alert("Failed to sign out. Please try again.");
  }
});

// Kullanıcı oturum durumu değiştiğinde çalışır
onAuthStateChanged(auth, (user) => {
  if (user) {
    // Kullanıcı giriş yaptı
    currentUser = user;
    authContainer.style.display = "none";
    gameContainer.style.display = "block";
    console.log("User signed in:", currentUser.displayName, currentUser.uid);
    // Son yazma zaman damgasını kontrol et (Firebase'den)
    checkLastWrite();
    // LetterBoard'u dinlemeye başla
    listenToLetters();
  } else {
    // Kullanıcı çıkış yaptı
    currentUser = null;
    authContainer.style.display = "block";
    gameContainer.style.display = "none";
    letterBoard.innerHTML = ""; // Board'u temizle
    addBtn.disabled = false; // Butonu etkinleştir
    addBtn.textContent = "Add Letter";
    console.log("User signed out.");
  }
});

// --- Firestore (Letter Board) İşlemleri ---

// Son yazma zaman damgasını Firebase'den kontrol et
const checkLastWrite = async () => {
    if (!currentUser) return; // Kullanıcı yoksa kontrol etme

    const q = query(
        collection(db, "letters"),
        where("userId", "==", currentUser.uid), // currentUser.uid kullan
        orderBy("createdAt", "desc"),
        limit(1)
    );
    try {
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
            const doc = querySnapshot.docs[0];
            // Firebase Timestamp nesnesini Date nesnesine çevir
            lastWriteTimestamp = doc.data().createdAt.toDate().getTime();
            updateButtonState();
        } else {
            lastWriteTimestamp = null; // Hiç yazmamışsa
            updateButtonState();
        }
    } catch (e) {
        console.error("Error checking last write:", e);
    }
};

// Buton durumunu güncelleme fonksiyonu
const updateButtonState = () => {
    if (!currentUser) { // Kullanıcı yoksa butonu devre dışı bırak
        addBtn.disabled = true;
        addBtn.textContent = "Sign in to add";
        return;
    }

    const now = Date.now();
    if (lastWriteTimestamp && (now - lastWriteTimestamp) < WAIT_TIME) {
        const remainingSeconds = Math.ceil((WAIT_TIME - (now - lastWriteTimestamp)) / 1000);
        addBtn.disabled = true;
        addBtn.textContent = `Wait (${remainingSeconds}s)`;
        // Her saniye güncelleme için setTimeout, kalan saniye 0 olana kadar
        setTimeout(updateButtonState, 1000);
    } else {
        addBtn.disabled = false;
        addBtn.textContent = "Add Letter";
    }
};

// Harfleri gerçek zamanlı dinle
const listenToLetters = () => {
  const lettersCol = collection(db, "letters");
  const q = query(lettersCol, orderBy("createdAt"));

  // Sadece kullanıcı giriş yaptığında dinleyiciyi etkinleştir
  onSnapshot(q, (snapshot) => {
    letterBoard.innerHTML = ""; // Mevcut içeriği temizle
    snapshot.forEach(doc => {
      const data = doc.data();
      const span = document.createElement("span");
      span.textContent = data.letter;
      span.style.color = data.color;
      span.classList.add("letter");
      letterBoard.appendChild(span);
    });
  }, (error) => {
    console.error("Error listening to letters:", error);
  });
};


// Add Letter butonuna tıklanınca
addBtn.addEventListener("click", async () => {
  if (!currentUser) {
    alert("Please sign in to add letters.");
    return;
  }

  const letter = letterInput.value.trim().toUpperCase();
  const color = colorInput.value;

  // Harf doğrulama
  if (!letter.match(/^[A-ZÇĞİÖŞÜ]$/i)) {
    alert("Please enter a single letter (e.g., 'A' or 'ç').");
    return;
  }

  const now = Date.now();
  if (lastWriteTimestamp && (now - lastWriteTimestamp) < WAIT_TIME) {
    // Buton zaten disabled olacağı için bu uyarıya gerek kalmayacak, sadece engelle
    console.log("You must wait before adding another letter.");
    return;
  }

  try {
    await addDoc(collection(db, "letters"), {
      letter: letter,
      color: color,
      createdAt: serverTimestamp(),
      userId: currentUser.uid, // Giriş yapan kullanıcının UID'sini kaydet
      userName: currentUser.displayName // Kullanıcı adını da kaydedebiliriz (isteğe bağlı)
    });
    lastWriteTimestamp = now; // Başarılı yazmadan sonra zaman damgasını güncelle
    letterInput.value = ""; // Inputu temizle
    updateButtonState(); // Buton durumunu güncelle
  } catch (e) {
    console.error("Error adding document: ", e);
    alert("Failed to add letter. Please try again.");
  }
});

// Sayfa ilk yüklendiğinde buton durumunu ayarla (kullanıcı henüz giriş yapmadıysa)
updateButtonState();