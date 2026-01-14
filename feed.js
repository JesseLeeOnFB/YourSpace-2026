import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js";
import { getFirestore, collection, addDoc, getDocs, doc, updateDoc, arrayUnion, arrayRemove, onSnapshot, orderBy, query } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-storage.js";

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
const auth = getAuth();
const db = getFirestore();
const storage = getStorage();

// DOM elements
const postTextInput = document.getElementById("postText");
const postFileInput = document.getElementById("postFileInput");
const postBtn = document.getElementById("postBtn");
const postsContainer = document.getElementById("postsContainer");
const notifyEmailCheckbox = document.getElementById("notifyEmail");
const notifyBrowserCheckbox = document.getElementById("notifyBrowser");

// NAVIGATION
document.getElementById("homeBtn").addEventListener("click", () => { window.location.href = "feed.html"; });
document.getElementById("profileBtn").addEventListener("click", () => { window.location.href = "profile.html"; });
document.getElementById("logoutBtn").addEventListener("click", async () => { 
  await auth.signOut();
  window.location.href = "index.html";
});

// AUTH STATE
onAuthStateChanged(auth, async (user) => {
  if (!user) { window.location.href = "index.html"; return; }
  loadFeed();
});

// CREATE POST
postBtn.addEventListener("click", async () => {
  postBtn.disabled = true;

  const user = auth.currentUser;
  if (!user) return;

  let postText = postTextInput.value.trim();
  const file = postFileInput.files[0];

  let postImageURL = "";
  let postVideoURL = "";

  if (file) {
    let contentType = file.type;
    if (!contentType) {
      const ext = file.name.split('.').pop().toLowerCase();
      if (["jpg","jpeg","png","gif"].includes(ext)) contentType = "image/jpeg";
      if (["mp4","mov","webm"].includes(ext)) contentType = "video/mp4";
    }

    const storageRef = ref(storage, `posts/${user.uid}/${Date.now()}_${file.name}`);
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
    const postDoc = await addDoc(collection(db, "posts"), {
      userId: user.uid,
      text: postText || null,
      postImage: postImageURL || null,
      postVideo: postVideoURL || null,
      likes: 0,
      dislikes: 0,
      comments: [],
      createdAt: new Date(),
      mentions: [] // For future tagging
    });

    postTextInput.value = "";
    postFileInput.value = "";
  } catch (err) {
    console.error("Post creation failed:", err);
    alert("Post creation failed. Check console.");
  }

  postBtn.disabled = false;
});

// LOAD FEED
async function loadFeed() {
  const postsCol = collection(db, "posts");
  const q = query(postsCol, orderBy("createdAt", "desc"));

  onSnapshot(q, async (snap) => {
    postsContainer.innerHTML = "";
    for (const docSnap of snap.docs) {
      const data = docSnap.data();
      const postId = docSnap.id;

      // Get username and profile photo
      let username = "Anonymous";
      let profilePhoto = "";
      try {
        const userDoc = await getDoc(doc(db, "users", data.userId));
        if (userDoc.exists()) {
          username = userDoc.data().username || "Anonymous";
          profilePhoto = userDoc.data().profilePhoto || "";
        }
      } catch (err) { console.error(err); }

      // Post container
      const postDiv = document.createElement("div");
      postDiv.classList.add("post");

      postDiv.innerHTML = `
        <div class="postHeader">
          ${profilePhoto ? `<img src="${profilePhoto}" class="postProfilePhoto">` : ''}
          <span class="postUsername">${username}</span>
        </div>
        <div class="postContent">
          ${data.text ? `<p>${data.text}</p>` : ""}
          ${data.postImage ? `<img src="${data.postImage}" class="postMedia">` : ""}
          ${data.postVideo ? `<video src="${data.postVideo}" class="postMedia" controls></video>` : ""}
        </div>
        <div class="postActions">
          <button class="likeBtn">👍 ${data.likes || 0}</button>
          <button class="dislikeBtn">🖕 ${data.dislikes || 0}</button>
          <button class="commentBtn">💬 ${data.comments.length}</button>
          <button class="shareBtn">Share</button>
          ${data.userId === auth.currentUser.uid ? `<button class="deleteBtn">Delete</button>` : ""}
        </div>
        <div class="commentsSection"></div>
      `;

      // BUTTON HANDLERS
      const likeBtn = postDiv.querySelector(".likeBtn");
      likeBtn.addEventListener("click", async () => {
        await updateDoc(doc(db, "posts", postId), { likes: (data.likes || 0) + 1 });
      });

      const dislikeBtn = postDiv.querySelector(".dislikeBtn");
      dislikeBtn.addEventListener("click", async () => {
        await updateDoc(doc(db, "posts", postId), { dislikes: (data.dislikes || 0) + 1 });
      });

      const commentBtn = postDiv.querySelector(".commentBtn");
      const commentsSection = postDiv.querySelector(".commentsSection");
      commentBtn.addEventListener("click", () => {
        const commentText = prompt("Enter comment:");
        if (!commentText) return;
        const newComment = { userId: auth.currentUser.uid, text: commentText };
        updateDoc(doc(db, "posts", postId), { comments: arrayUnion(newComment) });
      });

      const shareBtn = postDiv.querySelector(".shareBtn");
      shareBtn.addEventListener("click", () => {
        alert("Share function enabled! Copy this URL: " + window.location.href);
      });

      const deleteBtn = postDiv.querySelector(".deleteBtn");
      if (deleteBtn) {
        deleteBtn.addEventListener("click", async () => {
          await doc(db, "posts", postId).delete();
        });
      }

      // Render existing comments
      if (data.comments.length) {
        commentsSection.innerHTML = "";
        for (const c of data.comments) {
          let cUsername = "Anonymous";
          try {
            const cUserDoc = await getDoc(doc(db, "users", c.userId));
            if (cUserDoc.exists()) cUsername = cUserDoc.data().username || "Anonymous";
          } catch {}
          const cDiv = document.createElement("div");
          cDiv.classList.add("comment");
          cDiv.textContent = `${cUsername}: ${c.text}`;
          commentsSection.appendChild(cDiv);
        }
      }

      postsContainer.appendChild(postDiv);
    }
  });
}
