import {
  getAuth,
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";

import {
  getFirestore,
  collection,
  addDoc,
  serverTimestamp,
  query,
  orderBy,
  onSnapshot
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";

import { app } from "./firebase.js";

/* -------------------------------------------------- */
/* INIT */
/* -------------------------------------------------- */
const auth = getAuth(app);
const db = getFirestore(app);

/* -------------------------------------------------- */
/* DOM ELEMENTS */
/* -------------------------------------------------- */
const postText = document.getElementById("postText");
const postBtn = document.getElementById("postBtn");
const postsContainer = document.getElementById("postsContainer");

const homeBtn = document.getElementById("homeBtn");
const profileBtn = document.getElementById("profileBtn");
const logoutBtn = document.getElementById("logoutBtn");

/* -------------------------------------------------- */
/* AUTH GUARD */
/* -------------------------------------------------- */
let currentUser = null;

onAuthStateChanged(auth, (user) => {
  if (!user) {
    window.location.href = "index.html";
    return;
  }

  currentUser = user;
  loadFeed();
});

/* -------------------------------------------------- */
/* NAVIGATION */
/* -------------------------------------------------- */
homeBtn.addEventListener("click", () => {
  window.location.href = "feed.html";
});

profileBtn.addEventListener("click", () => {
  window.location.href = "profile.html";
});

logoutBtn.addEventListener("click", async () => {
  await signOut(auth);
  window.location.href = "index.html";
});

/* -------------------------------------------------- */
/* CREATE POST (TEXT ONLY) */
/* -------------------------------------------------- */
postBtn.addEventListener("click", async () => {
  if (!currentUser) return;

  const text = postText.value.trim();
  if (!text) return;

  postBtn.disabled = true;

  try {
    await addDoc(collection(db, "posts"), {
      userId: currentUser.uid,
      text,
      createdAt: serverTimestamp()
    });

    postText.value = "";
  } catch (err) {
    console.error("Post failed:", err);
    alert("Post failed. Check console.");
  }

  postBtn.disabled = false;
});

/* -------------------------------------------------- */
/* LOAD FEED */
/* -------------------------------------------------- */
function loadFeed() {
  const q = query(
    collection(db, "posts"),
    orderBy("createdAt", "desc")
  );

  onSnapshot(q, (snapshot) => {
    postsContainer.innerHTML = "";

    snapshot.forEach((doc) => {
      const post = doc.data();

      const div = document.createElement("div");
      div.className = "post";

      div.innerHTML = `
        <p class="post-text">${post.text || ""}</p>
      `;

      postsContainer.appendChild(div);
    });
  });
}
