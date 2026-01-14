// feed.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";
import { getFirestore, collection, addDoc, query, orderBy, onSnapshot, updateDoc, doc } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-storage.js";

// -------------------- Firebase Config --------------------
const firebaseConfig = {
  apiKey: "AIzaSyAHMbxr7rJS88ZefVJzt8p_9CCTstLmLU8",
  authDomain: "yourspace-2026.firebaseapp.com",
  projectId: "yourspace-2026",
  storageBucket: "yourspace-2026.firebasestorage.app",
  messagingSenderId: "72667267302",
  appId: "1:72667267302:web:2bed5f543e05d49ca8fb27",
  measurementId: "G-FZ4GFXWGSS"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

// -------------------- Elements --------------------
const postBtn = document.getElementById("postBtn");
const postTextInput = document.getElementById("postText");
const postFileInput = document.getElementById("postFileInput");
const postsContainer = document.getElementById("postsContainer");

const homeBtn = document.getElementById("homeBtn");
const profileBtn = document.getElementById("profileBtn");
const logoutBtn = document.getElementById("logoutBtn");

// -------------------- Auth and Navigation --------------------
onAuthStateChanged(auth, user => {
  if (!user) {
    window.location.href = "index.html";
  }
});

homeBtn?.addEventListener("click", () => window.location.href = "feed.html");
profileBtn?.addEventListener("click", () => window.location.href = "profile.html");
logoutBtn?.addEventListener("click", async () => {
  await auth.signOut();
  window.location.href = "index.html";
});

// -------------------- Create Post --------------------
postBtn?.addEventListener("click", async () => {
  postBtn.disabled = true;

  const text = postTextInput.value.trim();
  const file = postFileInput.files[0];
  let postImageURL = "";
  let postVideoURL = "";

  if (!text && !file) {
    alert("Enter text or select a file!");
    postBtn.disabled = false;
    return;
  }

  if (file) {
    let contentType = file.type;
    if (!contentType) {
      const ext = file.name.split('.').pop().toLowerCase();
      if (["jpg","jpeg","png","gif"].includes(ext)) contentType = "image/jpeg";
      if (["mp4","mov","webm"].includes(ext)) contentType = "video/mp4";
    }

    const storageRef = ref(storage, `posts/${auth.currentUser.uid}/${Date.now()}_${file.name}`);
    try {
      const snapshot = await uploadBytes(storageRef, file, { contentType });
      const downloadURL = await getDownloadURL(snapshot.ref);
      if (contentType.startsWith("image")) postImageURL = downloadURL;
      if (contentType.startsWith("video")) postVideoURL = downloadURL;
    } catch(err) {
      console.error("Upload failed:", err);
      alert("Upload failed. Check console.");
      postBtn.disabled = false;
      return;
    }
  }

  try {
    await addDoc(collection(db, "posts"), {
      userId: auth.currentUser.uid,
      text: text || null,
      postImage: postImageURL || null,
      postVideo: postVideoURL || null,
      createdAt: new Date(),
      likes: 0,
      dislikes: 0,
      comments: []
    });
    postTextInput.value = "";
    postFileInput.value = "";
  } catch(err) {
    console.error("Post creation failed:", err);
    alert("Post creation failed. Check console.");
  }

  postBtn.disabled = false;
});

// -------------------- Render Feed --------------------
const postsQuery = query(collection(db, "posts"), orderBy("createdAt", "desc"));
onSnapshot(postsQuery, snapshot => {
  postsContainer.innerHTML = "";
  snapshot.forEach(docSnap => {
    const post = docSnap.data();
    const postId = docSnap.id;

    const postDiv = document.createElement("div");
    postDiv.className = "post";

    // User display (replace anonymous if you have user profile)
    const username = post.userId || "Anonymous";

    postDiv.innerHTML = `
      <p><strong>${username}</strong></p>
      <p>${post.text || ""}</p>
      ${post.postImage ? `<img src="${post.postImage}" class="feedImage">` : ""}
      ${post.postVideo ? `<video src="${post.postVideo}" class="feedVideo" controls></video>` : ""}
      <button class="likeBtn">👍 ${post.likes || 0}</button>
      <button class="dislikeBtn">🖕 ${post.dislikes || 0}</button>
      <button class="commentBtn">💬 Comment</button>
      <button class="deleteBtn">Delete</button>
      <div class="commentsContainer"></div>
    `;
    
    // Like button
    postDiv.querySelector(".likeBtn")?.addEventListener("click", async () => {
      const docRef = doc(db, "posts", postId);
      await updateDoc(docRef, { likes: (post.likes || 0) + 1 });
    });

    // Dislike button
    postDiv.querySelector(".dislikeBtn")?.addEventListener("click", async () => {
      const docRef = doc(db, "posts", postId);
      await updateDoc(docRef, { dislikes: (post.dislikes || 0) + 1 });
    });

    // Delete button
    postDiv.querySelector(".deleteBtn")?.addEventListener("click", async () => {
      if (confirm("Delete this post?")) {
        await updateDoc(doc(db, "posts", postId), {}); // can also delete with deleteDoc if needed
      }
    });

    // Comment button
    postDiv.querySelector(".commentBtn")?.addEventListener("click", async () => {
      const commentText = prompt("Enter comment:");
      if (!commentText) return;
      const docRef = doc(db, "posts", postId);
      await updateDoc(docRef, { comments: [...(post.comments || []), { userId: auth.currentUser.uid, text: commentText }] });
    });

    // Render existing comments
    const commentsContainer = postDiv.querySelector(".commentsContainer");
    (post.comments || []).forEach(c => {
      const cDiv = document.createElement("div");
      cDiv.textContent = `${c.userId || "Anonymous"}: ${c.text}`;
      commentsContainer.appendChild(cDiv);
    });

    postsContainer.appendChild(postDiv);
  });
});
