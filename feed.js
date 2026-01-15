import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs, doc, deleteDoc, updateDoc, serverTimestamp, onSnapshot } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";
import { getAuth, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-storage.js";

// Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyAHMbxr7rJS88ZefVJzt8p_9CCTstLmLU8",
  authDomain: "yourspace-2026.firebaseapp.com",
  projectId: "yourspace-2026",
  storageBucket: "yourspace-2026.firebasestorage.app",
  messagingSenderId: "72667267302",
  appId: "1:72667267302:web:2bed5f543e05d49ca8fb27",
  measurementId: "G-FZ4GFXWGSS"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const storage = getStorage(app);

// NAVIGATION BUTTONS
document.getElementById("homeBtn").onclick = () => window.location.href = "feed.html";
document.getElementById("profileBtn").onclick = () => window.location.href = "profile.html";
document.getElementById("logoutBtn").onclick = async () => {
  await signOut(auth);
  window.location.href = "index.html";
};

// AUTH STATE
onAuthStateChanged(auth, user => {
  if (!user) window.location.href = "index.html";
});

// POST CREATION
const postBtn = document.getElementById("postBtn");
const postText = document.getElementById("postText");
const postFileInput = document.getElementById("postFileInput");
const imagePreview = document.getElementById("imagePreview");
const videoPreview = document.getElementById("videoPreview");

postFileInput.addEventListener("change", async (e) => {
  const file = e.target.files[0];
  if (!file) return;

  const url = URL.createObjectURL(file);
  if (file.type.startsWith("image/")) {
    imagePreview.src = url;
    imagePreview.style.display = "block";
    videoPreview.style.display = "none";
  } else if (file.type.startsWith("video/")) {
    videoPreview.src = url;
    videoPreview.style.display = "block";
    imagePreview.style.display = "none";
  }
});

postBtn.addEventListener("click", async () => {
  const user = auth.currentUser;
  if (!user) return alert("You must be logged in");

  let fileURL = null;
  const file = postFileInput.files[0];

  if (file) {
    const storageRef = ref(storage, `posts/${user.uid}/${file.name}-${Date.now()}`);
    await uploadBytes(storageRef, file);
    fileURL = await getDownloadURL(storageRef);
  }

  await addDoc(collection(db, "posts"), {
    userId: user.uid,
    username: user.displayName || "Anonymous",
    text: postText.value,
    postImage: file?.type.startsWith("image/") ? fileURL : null,
    postVideo: file?.type.startsWith("video/") ? fileURL : null,
    likes: 0,
    dislikes: 0,
    comments: [],
    createdAt: serverTimestamp()
  });

  postText.value = "";
  postFileInput.value = "";
  imagePreview.style.display = "none";
  videoPreview.style.display = "none";
});

// LOAD FEED
const postsContainer = document.getElementById("postsContainer");

onSnapshot(collection(db, "posts"), (snapshot) => {
  postsContainer.innerHTML = "";
  snapshot.docs
    .sort((a, b) => b.data().createdAt?.seconds - a.data().createdAt?.seconds)
    .forEach(docSnap => {
      const data = docSnap.data();
      const postDiv = document.createElement("div");
      postDiv.className = "post-container";

      let mediaHTML = "";
      if (data.postImage) mediaHTML = `<img src="${data.postImage}" class="post-media">`;
      if (data.postVideo) mediaHTML = `<video src="${data.postVideo}" class="post-media" controls></video>`;

      postDiv.innerHTML = `
        <p><strong class="username" data-userid="${data.userId}">${data.username}</strong></p>
        <p>${data.text || ""}</p>
        ${mediaHTML}
        <div class="post-buttons">
          <button class="likeBtn">👍 ${data.likes}</button>
          <button class="dislikeBtn">🖕 ${data.dislikes}</button>
          <button class="commentBtn">💬</button>
          ${data.userId === auth.currentUser.uid ? '<button class="deleteBtn">🗑️</button>' : ''}
        </div>
        <div class="commentsContainer"></div>
      `;

      // LIKE BUTTON
      postDiv.querySelector(".likeBtn").onclick = async () => {
        await updateDoc(doc(db, "posts", docSnap.id), {
          likes: data.likes + 1
        });
      };

      // DISLIKE BUTTON
      postDiv.querySelector(".dislikeBtn").onclick = async () => {
        await updateDoc(doc(db, "posts", docSnap.id), {
          dislikes: data.dislikes + 1
        });
      };

      // DELETE BUTTON
      if (data.userId === auth.currentUser.uid) {
        postDiv.querySelector(".deleteBtn").onclick = async () => {
          await deleteDoc(doc(db, "posts", docSnap.id));
        };
      }

      // CLICKABLE USERNAME
      postDiv.querySelector(".username").onclick = () => {
        window.location.href = `userProfile.html?uid=${data.userId}`;
      };

      postsContainer.appendChild(postDiv);
    });
});
