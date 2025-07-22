// script.js (modül olarak import ediliyor)
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-app.js";
import { getFirestore, collection, addDoc, query, orderBy, onSnapshot, serverTimestamp, where, limit, getDocs } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-firestore.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-auth.js";

// Firebase config (BU KISIM SİZİN SAĞLADIĞINIZ BİLGİLERLE GÜNCELLENDİ!)
// Lütfen buradaki 'apiKey', 'authDomain', 'projectId' gibi bilgilerin Firebase konsolunuzdaki proje ayarlarıyla EŞLEŞTİĞİNDEN EMİN OLUN.
const firebaseConfig = {
  apiKey: "AIzaSyAmy3tU95GoWD92KsQfQiUQQ_RK-ER_8a0", // Sizin API key'iniz
  authDomain: "color-grid-7d73f.firebaseapp.com", // Sizin Auth Domain'iniz
  projectId: "color-grid-7d73f", // Sizin Proje ID'niz
  storageBucket: "color-grid-7d73f.appspot.com",
  messagingSenderId: "20551637017",
  appId: "1:20551637017:web:65e439cc83a3d4bf1d3288",
  measurementId: "G-5VE8JXRKYY" 
};

// Firebase uygulamasını başlat
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();

// HTML elementlerini al
const authContainer = document.getElementById("auth-container");
const gameContainer = document.getElementById("game-container");
const signInBtn = document.getElementById("signInBtn");
const signOutBtn = document.getElementById("signOutBtn");
const letterInput = document.getElementById("letterInput");
const colorInput = document.getElementById("colorInput");
const addBtn = document.getElementById("addBtn");
const letterBoard = document.getElementById("letterBoard");

let currentUser = null; // Şu anki kullanıcıyı saklamak için
let lastWriteTimestamp = null; // Son yazma zamanını tutar
const WAIT_TIME = 5 * 60 * 1000; // 5 dakika bekleme süresi (milisaniye cinsinden)

// Giriş butonuna tıklama dinleyicisi
signInBtn.addEventListener("click", () => {
  signInWithPopup(auth, provider)
    .then((result) => {
      // Başarılı giriş
      console.log("User signed in:", result.user.displayName);
      // onAuthStateChanged zaten UI'yı güncelleyecektir
    })
    .catch((error) => {
      // Hata durumunda
      console.error("Sign-in error:", error);
      alert("Failed to sign in. Please try again. Check console for details.");
    });
});

// Çıkış butonuna tıklama dinleyicisi
signOutBtn.addEventListener("click", () => {
  signOut(auth)
    .then(() => {
      console.log("User signed out.");
      // onAuthStateChanged zaten UI'yı güncelleyecektir
    })
    .catch((error) => {
      console.error("Sign-out error:", error);
      alert("Failed to sign out. Please try again.");
    });
});

// Kimlik doğrulama durumu değiştiğinde çalışır
onAuthStateChanged(auth, (user) => {
  if (user) {
    // Kullanıcı giriş yaptı
    currentUser = user;
    authContainer.style.display = "none";
    gameContainer.style.display = "block";
    
    // Kullanıcının son yazma zamanını kontrol et ve butonu güncelle
    checkLastWriteTime(currentUser.uid);
    startRealtimeListener(); // Giriş yapınca notları dinlemeye başla
    console.log("Current user:", currentUser.displayName, currentUser.uid);

  } else {
    // Kullanıcı çıkış yaptı
    currentUser = null;
    authContainer.style.display = "block";
    gameContainer.style.display = "none";
    // Çıkış yapınca notları temizle
    letterBoard.innerHTML = ""; 
    addBtn.disabled = false; // Butonu tekrar aktif et
    console.log("No user signed in.");
  }
});

// Kullanıcının son yazma zamanını kontrol eden fonksiyon
const checkLastWriteTime = async (uid) => {
  const q = query(
    collection(db, "letters"),
    where("userId", "==", uid),
    orderBy("createdAt", "desc"),
    limit(1)
  );

  try {
    const querySnapshot = await getDocs(q);
    if (!querySnapshot.empty) {
      const latestDoc = querySnapshot.docs[0].data();
      lastWriteTimestamp = latestDoc.createdAt ? latestDoc.createdAt.toMillis() : null;
    } else {
      lastWriteTimestamp = null; // Hiç yazmamışsa
    }
    updateAddButtonState(); // Buton durumunu güncelle
  } catch (error) {
    console.error("Error checking last write time:", error);
    lastWriteTimestamp = null;
    updateAddButtonState(); // Hata durumunda da butonu güncelle
  }
};

// Ekle butonunun durumunu güncelleyen fonksiyon
const updateAddButtonState = () => {
  const now = Date.now();
  if (lastWriteTimestamp && (now - lastWriteTimestamp) < WAIT_TIME) {
    addBtn.disabled = true;
    const timeLeft = Math.ceil((WAIT_TIME - (now - lastWriteTimestamp)) / 1000);
    // Buton metnini bekleme süresiyle güncelle, bu kısmı HTML'de gösterilebilir
    // Örneğin: addBtn.textContent = `Bekle (${timeLeft}s)`;
  } else {
    addBtn.disabled = false;
    addBtn.textContent = "Add Letter"; // Metni orijinaline döndür
  }
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
  if (!letter.match(/^[A-ZÇĞİÖŞÜ]$/i)) { // Türkçe karakterleri de dahil et
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
    // Firestore'a yeni bir belge ekle
    await addDoc(collection(db, "letters"), {
      letter: letter,
      color: color,
      createdAt: serverTimestamp(), // Sunucu zaman damgası
      userId: currentUser.uid, // Giriş yapan kullanıcının UID'sini kaydet
      userName: currentUser.displayName // Kullanıcı adını da kaydedebiliriz (isteğe bağlı)
    });

    lastWriteTimestamp = now; // Başarılı yazmadan sonra zaman damgasını güncelle
    updateAddButtonState(); // Buton durumunu güncelle
    letterInput.value = ""; // Inputu temizle

  } catch (e) {
    console.error("Error adding document: ", e);
    alert("Error adding letter. Please try again.");
  }
});

// Harfleri gerçek zamanlı dinle
// Sadece kullanıcı giriş yaptığında dinleyiciyi başlat
let unsubscribe = null; // Dinleyiciyi tutmak için değişken

const startRealtimeListener = () => {
  if (unsubscribe) {
    unsubscribe(); // Önceki dinleyiciyi durdur
  }

  const lettersCol = collection(db, "letters");
  // Yeni eklenen harflerin en üstte görünmesi için 'desc' (azalan) sıralama
  const q = query(lettersCol, orderBy("createdAt", "desc")); 

  unsubscribe = onSnapshot(q, (snapshot) => {
    letterBoard.innerHTML = ""; // Mevcut tüm harfleri temizle
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