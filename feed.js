import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";
import {
  getFirestore,
  collection,
  addDoc,
  getDocs,
  query,
  orderBy,
  doc,
  updateDoc,
  increment
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";

/* -------------------- FIREBASE -------------------- */
const firebaseConfig = {
  apiKey: "AIzaSyAHMbxr7rJS88ZefVJzt8p_9CCTstLmLU8",
  authDomain: "yourspace-2026.firebaseapp.com",
  projectId: "yourspace-2026",
  storageBucket: "yourspace-2026.firebasestorage.app",
  messagingSenderId: "72667267302",
  appId: "1:72667267302:web:2bed5f543e05d49ca8fb27"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

let currentUser;

/* -------------------- DOM -------------------- */
const postInput = document.getElementById("postInput");
const postBtn = document.getElementById("postBtn");
const feedContainer = document.getElementById("feedContainer");

/* -------------------- AUTH -------------------- */
onAuthStateChanged(auth, async (user) => {
  if (!user) return location.href = "login.html";
  currentUser = user;
  await loadFeed();
});

/* -------------------- LOAD FEED -------------------- */
async function loadFeed() {
  feedContainer.innerHTML = "";

  const q = query(
    collection(db, "posts"),
    orderBy("createdAt", "desc")
  );

  const snap = await getDocs(q);

  snap.forEach(docSnap => {
    const post = docSnap.data();

    const div = document.createElement("div");
    div.className = "feed-post";

    div.innerHTML = `
      <strong>${post.authorUsername}</strong>
      <p>${post.text}</p>
      <div class="feed-actions">
        <button data-id="${docSnap.id}" class="like-btn">👍 ${post.likes || 0}</button>
        <button data-id="${docSnap.id}" class="dislike-btn">👎 ${post.dislikes || 0}</button>
      </div>
    `;

    feedContainer.appendChild(div);
  });

  attachFeedButtons();
}

/* -------------------- POST -------------------- */
postBtn.onclick = async () => {
  if (!postInput.value.trim()) return;

  await addDoc(collection(db, "posts"), {
    text: postInput.value,
    authorId: currentUser.uid,
    authorUsername: currentUser.displayName || "Anonymous",
    likes: 0,
    dislikes: 0,
    createdAt: Date.now()
  });

  postInput.value = "";
  loadFeed();
};

/* -------------------- LIKE / DISLIKE -------------------- */
function attachFeedButtons() {
  document.querySelectorAll(".like-btn").forEach(btn => {
    btn.onclick = async () => {
      await updateDoc(doc(db, "posts", btn.dataset.id), {
        likes: increment(1)
      });
      loadFeed();
    };
  });

  document.querySelectorAll(".dislike-btn").forEach(btn => {
    btn.onclick = async () => {
      await updateDoc(doc(db, "posts", btn.dataset.id), {
        dislikes: increment(1)
      });
      loadFeed();
    };
  });
}
