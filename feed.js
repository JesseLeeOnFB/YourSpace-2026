import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";
import {
  getFirestore, collection, addDoc, getDocs,
  doc, updateDoc, getDoc, query, orderBy
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-storage.js";

// Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyAHMbxr7rJS88ZefVJzt8p_9CCTstLmLU8",
  authDomain: "yourspace-2026.firebaseapp.com",
  projectId: "yourspace-2026",
  storageBucket: "yourspace-2026.appspot.com",
  messagingSenderId: "72667267302",
  appId: "1:72667267302:web:2bed5f543e05d49ca8fb27"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

// DOM Elements
const postText = document.getElementById("postText");
const postFile = document.getElementById("postFile");
const postBtn = document.getElementById("postBtn");
const feedContainer = document.getElementById("feedContainer");

document.getElementById("navFeed").onclick = () => window.location.href = "feed.html";
document.getElementById("navProfile").onclick = () => window.location.href = "profile.html";
document.getElementById("navMessages").onclick = () => window.location.href = "messages.html";
document.getElementById("logoutBtn").onclick = async () => { await signOut(auth); window.location.href = "login.html"; };

let currentUser = null;

// Auth
onAuthStateChanged(auth, async (user) => {
  if (!user) { window.location.href = "login.html"; return; }
  currentUser = user;
  loadFeed();
});

// Load feed
async function loadFeed() {
  feedContainer.innerHTML = "";
  const q = query(collection(db, "posts"), orderBy("createdAt", "desc"));
  const snap = await getDocs(q);

  for (const docSnap of snap.docs) {
    const data = docSnap.data();
    const postDiv = document.createElement("div");
    postDiv.className = "post";

    const userSnap = await getDoc(doc(db, "users", data.userId));
    const username = userSnap.data()?.username || "User";
    const profilePic = userSnap.data()?.profilePicture || "default-avatar.png";

    let mediaHTML = "";
    if (data.file) {
      if (data.fileType.startsWith("image")) mediaHTML = `<img src="${data.file}" />`;
      else if (data.fileType.startsWith("video")) mediaHTML = `<video controls src="${data.file}"></video>`;
    }

    postDiv.innerHTML = `
      <div><img src="${profilePic}" width="50" /> 
      <span class="username-link" onclick="window.location.href='profile.html?uid=${data.userId}'">${username}</span></div>
      <p>${data.text}</p>
      ${mediaHTML}
      <div class="actions">
        <span>Likes: ${data.likes?.length || 0}</span>
        <button class="likeBtn">Like</button>
        <span>Dislikes: ${data.dislikes?.length || 0}</span>
        <button class="dislikeBtn">Dislike</button>
      </div>
    `;

    // Like/Dislike
    const likeBtn = postDiv.querySelector(".likeBtn");
    const dislikeBtn = postDiv.querySelector(".dislikeBtn");

    likeBtn.onclick = async () => {
      const likes = data.likes || [];
      const dislikes = data.dislikes || [];
      if (!likes.includes(currentUser.uid)) likes.push(currentUser.uid);
      const idx = dislikes.indexOf(currentUser.uid);
      if (idx > -1) dislikes.splice(idx, 1);
      await updateDoc(doc(db, "posts", docSnap.id), { likes, dislikes });
      loadFeed();
    };

    dislikeBtn.onclick = async () => {
      const likes = data.likes || [];
      const dislikes = data.dislikes || [];
      if (!dislikes.includes(currentUser.uid)) dislikes.push(currentUser.uid);
      const idx = likes.indexOf(currentUser.uid);
      if (idx > -1) likes.splice(idx, 1);
      await updateDoc(doc(db, "posts", docSnap.id), { likes, dislikes });
      loadFeed();
    };

    feedContainer.appendChild(postDiv);
  }
}

// Post new content
postBtn.onclick = async () => {
  const text = postText.value.trim();
  let fileURL = "";
  let fileType = "";

  if (postFile.files[0]) {
    const file = postFile.files[0];
    const fileRef = ref(storage, `posts/${Date.now()}-${file.name}`);
    await uploadBytes(fileRef, file);
    fileURL = await getDownloadURL(fileRef);
    fileType = file.type;
  }

  await addDoc(collection(db, "posts"), {
    text,
    file: fileURL,
    fileType,
    userId: currentUser.uid,
    likes: [],
    dislikes: [],
    createdAt: serverTimestamp()
  });

  postText.value = "";
  postFile.value = "";
  loadFeed();
};
