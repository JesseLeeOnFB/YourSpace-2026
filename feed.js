// feed.js – Clean global feed: text + image posts, likes/dislikes, comments, delete own, real-time

import { auth, db, storage } from "./firebase.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  arrayUnion,
  arrayRemove,
  serverTimestamp,
  getDoc
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";
import { ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-storage.js";

// DOM Elements
const postText = document.getElementById("postText");
const postImage = document.getElementById("postImage");
const postBtn = document.getElementById("postBtn");
const feedPosts = document.getElementById("feedPosts");
const uploadProgress = document.getElementById("uploadProgress");
const uploadStatus = document.getElementById("uploadStatus");

// Navigation (JS listeners)
document.getElementById("navFeedBtn")?.addEventListener("click", () => window.location.href = "feed.html");
document.getElementById("navProfileBtn")?.addEventListener("click", () => window.location.href = "profile.html");
document.getElementById("navMessagesBtn")?.addEventListener("click", () => window.location.href = "messages.html");

// Real-time feed loading
function loadFeed() {
  const q = query(collection(db, "posts"), orderBy("createdAt", "desc"));

  onSnapshot(q, (snap) => {
    feedPosts.innerHTML = "";

    if (snap.empty) {
      feedPosts.innerHTML = '<p class="no-posts">No posts yet. Be the first!</p>';
      return;
    }

    snap.forEach((docSnap) => {
      const post = docSnap.data();
      const postId = docSnap.id;

      const isOwner = post.userId === auth.currentUser?.uid;

      const postDiv = document.createElement("div");
      postDiv.className = "post-card";
      postDiv.innerHTML = `
        <div class="post-header">
          <strong>${post.username || "Anonymous"}</strong>
          <small>${post.createdAt ? new Date(post.createdAt.toMillis()).toLocaleString() : "just now"}</small>
        </div>
        <p class="post-text">${post.text || ""}</p>
        ${post.imageURL ? `<img src="${post.imageURL}" alt="Post image" class="post-image">` : ""}
        <div class="post-actions">
          <button class="action-btn like-btn" data-id="${postId}">
            👍 ${post.likes?.length || 0}
          </button>
          <button class="action-btn dislike-btn" data-id="${postId}">
            👎 ${post.dislikes?.length || 0}
          </button>
          ${isOwner ? `<button class="action-btn delete-btn" data-id="${postId}">🗑️ Delete</button>` : ""}
        </div>
        <div class="comments-section">
          <h4>Comments</h4>
          <div id="comments-${postId}" class="comments-list"></div>
          <div class="comment-form">
            <input type="text" placeholder="Add a comment..." id="commentInput-${postId}">
            <button class="comment-btn" data-id="${postId}">Send</button>
          </div>
        </div>
      `;

      feedPosts.appendChild(postDiv);

      // Like
      postDiv.querySelector(".like-btn").onclick = async () => {
        await updateDoc(doc(db, "posts", postId), {
          likes: arrayUnion(auth.currentUser.uid)
        });
      };

      // Dislike
      postDiv.querySelector(".dislike-btn").onclick = async () => {
        await updateDoc(doc(db, "posts", postId), {
          dislikes: arrayUnion(auth.currentUser.uid)
        });
      };

      // Delete own post
      postDiv.querySelector(".delete-btn")?.onclick = async () => {
        if (confirm("Delete this post?")) {
          await deleteDoc(doc(db, "posts", postId));
        }
      };

      // Comment
      const commentInput = postDiv.querySelector(`#commentInput-${postId}`);
      const commentBtn = postDiv.querySelector(".comment-btn");

      commentBtn.onclick = async () => {
        const text = commentInput.value.trim();
        if (!text) return;

        await addDoc(collection(db, "posts", postId, "comments"), {
          text,
          userId: auth.currentUser.uid,
          username: auth.currentUser.email.split('@')[0] || "Anonymous",
          createdAt: serverTimestamp()
        });

        commentInput.value = "";
      };

      // Load comments real-time
      const commentsQ = query(collection(db, "posts", postId, "comments"), orderBy("createdAt", "desc"));
      onSnapshot(commentsQ, (snap) => {
        const commentsList = postDiv.querySelector(`#comments-${postId}`);
        commentsList.innerHTML = "";

        snap.forEach((commentSnap) => {
          const c = commentSnap.data();
          const commentDiv = document.createElement("div");
          commentDiv.className = "comment";
          commentDiv.innerHTML = `<strong>${c.username}</strong>: ${c.text}`;
          commentsList.appendChild(commentDiv);
        });
      });
    });
  }, (err) => {
    alert("Feed error: " + err.message);
  });
}

// Create new post
postBtn.addEventListener("click", async () => {
  if (!auth.currentUser) return alert("Please login to post");

  const text = postText.value.trim();
  const file = postImage.files[0];

  if (!text && !file) return alert("Write something or add an image");

  let imageURL = "";
  if (file) {
    try {
      uploadProgress.style.display = "block";
      uploadProgress.value = 0;

      const storageRef = ref(storage, `posts/${auth.currentUser.uid}/${file.name}-${Date.now()}`);
      const uploadTask = uploadBytesResumable(storageRef, file);

      uploadTask.on("state_changed", (snapshot) => {
        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        uploadProgress.value = progress;
      });

      await uploadTask;

      imageURL = await getDownloadURL(uploadTask.snapshot.ref);
      uploadProgress.style.display = "none";
    } catch (err) {
      alert("Image upload failed: " + err.message);
      uploadProgress.style.display = "none";
      return;
    }
  }

  try {
    await addDoc(collection(db, "posts"), {
      text,
      imageURL,
      userId: auth.currentUser.uid,
      username: auth.currentUser.email.split('@')[0] || "Anonymous",
      createdAt: serverTimestamp(),
      likes: [],
      dislikes: []
    });

    postText.value = "";
    postImage.value = "";
    alert("Post created!");
  } catch (err) {
    alert("Failed to post: " + err.message);
  }
});

// Init – wait for auth
onAuthStateChanged(auth, (user) => {
  if (!user) {
    window.location.href = "login.html";
    return;
  }

  loadFeed();
});
