// 🔥 Firebase Imports
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

import {
  getFirestore,
  collection,
  addDoc,
  query,
  orderBy,
  onSnapshot,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// 🔥 Firebase Config (USE YOUR OWN — this is a placeholder)
const firebaseConfig = {
  apiKey: "PASTE_YOUR_API_KEY",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "XXXX",
  appId: "XXXX"
};

// 🔥 Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// 🔗 DOM
const authSection = document.getElementById("authSection");
const appSection = document.getElementById("appSection");
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const signupBtn = document.getElementById("signupBtn");
const loginBtn = document.getElementById("loginBtn");
const logoutBtn = document.getElementById("logoutBtn");
const postBtn = document.getElementById("postBtn");
const postText = document.getElementById("postText");
const feed = document.getElementById("feed");
const userEmail = document.getElementById("userEmail");

// 🧠 AUTH STATE
onAuthStateChanged(auth, user => {
  console.log("AUTH STATE:", user);

  if (user) {
    authSection.classList.add("hidden");
    appSection.classList.remove("hidden");
    userEmail.textContent = user.email;
    loadPosts();
  } else {
    authSection.classList.remove("hidden");
    appSection.classList.add("hidden");
  }
});

// 📝 SIGN UP
signupBtn.onclick = async () => {
  await createUserWithEmailAndPassword(
    auth,
    emailInput.value,
    passwordInput.value
  );
};

// 🔐 LOG IN
loginBtn.onclick = async () => {
  await signInWithEmailAndPassword(
    auth,
    emailInput.value,
    passwordInput.value
  );
};

// 🚪 LOG OUT
logoutBtn.onclick = async () => {
  await signOut(auth);
};

// 🗨️ CREATE POST
postBtn.onclick = async () => {
  console.log("POST BUTTON CLICKED");

  const user = auth.currentUser;
  if (!user || !postText.value.trim()) return;

  console.log("About to write to Firestore");

  await addDoc(collection(db, "posts"), {
    text: postText.value,
    user: user.email,
    createdAt: serverTimestamp()
  });

  console.log("Firestore write finished");

  postText.value = "";
};

// 📰 LOAD FEED
function loadPosts() {
  const q = query(
    collection(db, "posts"),
    orderBy("createdAt", "desc")
  );

  onSnapshot(q, snapshot => {
    feed.innerHTML = "";
    snapshot.forEach(doc => {
      const data = doc.data();
      const div = document.createElement("div");
      div.className = "post";
      div.innerHTML = `
        <strong>${data.user}</strong>
        <p>${data.text}</p>
        <div class="small">${data.createdAt?.toDate?.() || ""}</div>
      `;
      feed.appendChild(div);
    });
  });
}
