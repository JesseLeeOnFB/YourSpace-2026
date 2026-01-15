import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";
import { getFirestore, collection, addDoc, query, orderBy, onSnapshot, deleteDoc, doc, updateDoc } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-storage.js";

// FIREBASE CONFIG
const firebaseConfig = {
  apiKey: "AIzaSyAHMbxr7rJS88ZefVJzt8p_9CCTstLmLU8",
  authDomain: "yourspace-2026.firebaseapp.com",
  projectId: "yourspace-2026",
  storageBucket: "yourspace-2026.firebasestorage.app",
  messagingSenderId: "72667267302",
  appId: "1:72667267302:web:2bed5f543e05d49ca8fb27",
  measurementId: "G-FZ4GFXWGSS"
};

// INITIALIZE FIREBASE
const app = initializeApp(firebaseConfig);
const auth = getAuth();
const db = getFirestore();
const storage = getStorage();

// NAVIGATION BUTTONS
document.addEventListener("DOMContentLoaded", () => {
  const homeBtn = document.getElementById("homeBtn");
  const profileBtn = document.getElementById("profileBtn");
  const logoutBtn = document.getElementById("logoutBtn");

  if (homeBtn) homeBtn.addEventListener("click", () => window.location.href = "feed.html");
  if (profileBtn) profileBtn.addEventListener("click", () => window.location.href = "profile.html");
  if (logoutBtn) logoutBtn.addEventListener("click", async () => {
    try {
      await signOut(auth);
      window.location.href = "index.html";
    } catch (err) {
      console.error(err);
      alert("Logout failed.");
    }
  });
});

// AUTH STATE
onAuthStateChanged(auth, user => {
  if (!user) window.location.href = "index.html";
});

// CREATE POST
const postBtn = document.getElementById("postBtn");
const postText = document.getElementById("postText");
const postFileInput = document.getElementById("postFileInput");
const imagePreview = document.getElementById("imagePreview");
const videoPreview = document.getElementById("videoPreview");
const postsContainer = document.getElementById("postsContainer");

let selectedFile = null;

postFileInput.addEventListener("change", e => {
  selectedFile = e.target.files[0];
  if (!selectedFile) return;
  
  if (selectedFile.type.startsWith("image/")) {
    imagePreview.src = URL.createObjectURL(selectedFile);
    imagePreview.style.display = "block";
    videoPreview.style.display = "none";
  } else if (selectedFile.type.startsWith("video/")) {
    videoPreview.src = URL.createObjectURL(selectedFile);
    videoPreview.style.display = "block";
    imagePreview.style.display = "none";
  }
});

postBtn.addEventListener("click", async () => {
  const user = auth.currentUser;
  if (!user) return alert("Must be logged in");

  let postData = { userId: user.uid, text: postText.value || "", timestamp: new Date(), likes: 0, dislikes: 0, comments: [] };

  try {
    if (selectedFile) {
      const storageRef = ref(storage, `posts/${user.uid}/${Date.now()}-${selectedFile.name}`);
      const snapshot = await uploadBytes(storageRef, selectedFile);
      const url = await getDownloadURL(snapshot.ref);
      if (selectedFile.type.startsWith("image/")) postData.postImage = url;
      else if (selectedFile.type.startsWith("video/")) postData.postVideo = url;
    }

    await addDoc(collection(db, "posts"), postData);

    // Reset
    postText.value = "";
    postFileInput.value = "";
    selectedFile = null;
    imagePreview.style.display = "none";
    videoPreview.style.display = "none";
  } catch (err) {
    console.error(err);
    alert("Failed to create post.");
  }
});

// DISPLAY POSTS
const postsQuery = query(collection(db, "posts"), orderBy("timestamp", "desc"));
onSnapshot(postsQuery, snapshot => {
  postsContainer.innerHTML = "";
  snapshot.forEach(docSnap => {
    const data = docSnap.data();
    const postId = docSnap.id;

    const postDiv = document.createElement("div");
    postDiv.className = "post card";

    let content = `<p><strong>${data.userId}</strong></p>`;
    if (data.text) content += `<p>${data.text}</p>`;
    if (data.postImage) content += `<img src="${data.postImage}" class="postMedia">`;
    if (data.postVideo) content += `<video src="${data.postVideo}" controls class="postMedia"></video>`;
    content += `
      <div class="postButtons">
        <button class="likeBtn">👍 ${data.likes || 0}</button>
        <button class="dislikeBtn">🖕 ${data.dislikes || 0}</button>
        <button class="deleteBtn">Delete</button>
      </div>
    `;
    postDiv.innerHTML = content;
    postsContainer.appendChild(postDiv);

    // BUTTON HANDLERS
    const likeBtn = postDiv.querySelector(".likeBtn");
    const dislikeBtn = postDiv.querySelector(".dislikeBtn");
    const deleteBtn = postDiv.querySelector(".deleteBtn");

    likeBtn.addEventListener("click", async () => {
      await updateDoc(doc(db, "posts", postId), { likes: (data.likes || 0) + 1 });
    });

    dislikeBtn.addEventListener("click", async () => {
      await updateDoc(doc(db, "posts", postId), { dislikes: (data.dislikes || 0) + 1 });
    });

    deleteBtn.addEventListener("click", async () => {
      if (auth.currentUser.uid !== data.userId) return alert("Cannot delete others' posts");
      await deleteDoc(doc(db, "posts", postId));
    });
  });
});
