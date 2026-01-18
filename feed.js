// feed.js – Global feed using same Firebase config as profile.js

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
  serverTimestamp,
  getDoc
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";
import { ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-storage.js";

// DOM Elements
const postText = document.getElementById("postText");
const postImage = document.getElementById("postImage");
const postBtn = document.getElementById("postBtn");
const feedPosts = document.getElementById("feedPosts");

// Navigation (using same auth-guard pattern)
document.getElementById("navFeedBtn")?.addEventListener("click", () => window.location.href = "feed.html");
document.getElementById("navProfileBtn")?.addEventListener("click", () => window.location.href = "profile.html");

// Load feed real-time
function loadFeed() {
  const q = query(collection(db, "posts"), orderBy("createdAt", "desc"));

  onSnapshot(q, async (snap) => {
    feedPosts.innerHTML = "";

    if (snap.empty) {
      feedPosts.innerHTML = '<p>No posts yet. Be the first to post!</p>';
      return;
    }

    snap.forEach(async (docSnap) => {
      const post = docSnap.data();
      const postId = docSnap.id;

      // Get username from users collection
      const userSnap = await getDoc(doc(db, "users", post.userId));
      const username = userSnap.exists() ? userSnap.data().username || "Anonymous" : "Anonymous";

      const isOwner = post.userId === auth.currentUser?.uid;

      const postDiv = document.createElement("div");
      postDiv.className = "post";
      postDiv.innerHTML = `
        <strong>${username}</strong>
        <small>${post.createdAt ? new Date(post.createdAt.toMillis()).toLocaleString() : "just now"}</small>
        <p>${post.text || ""}</p>
        ${post.imageURL ? `<img src="${post.imageURL}" alt="Post image" style="max-width:100%;">` : ""}
        <div class="actions">
          <button class="like-btn" data-id="${postId}">Like (${post.likes?.length || 0})</button>
          <button class="dislike-btn" data-id="${postId}">Dislike (${post.dislikes?.length || 0})</button>
          ${isOwner ? `<button class="delete-btn" data-id="${postId}">Delete</button>` : ""}
        </div>
        <div class="comments">
          <h4>Comments</h4>
          <div id="comments-${postId}"></div>
          <input type="text" placeholder="Add comment..." id="commentInput-${postId}">
          <button class="comment-btn" data-id="${postId}">Comment</button>
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
        const commentsDiv = postDiv.querySelector(`#comments-${postId}`);
        commentsDiv.innerHTML = "";

        snap.forEach((cSnap) => {
          const c = cSnap.data();
          const cDiv = document.createElement("div");
          cDiv.textContent = `${c.username}: ${c.text}`;
          commentsDiv.appendChild(cDiv);
        });
      });
    });
  });
}

// Post new content
postBtn.addEventListener("click", async () => {
  if (!auth.currentUser) return alert("Please login to post");

  const text = postText.value.trim();
  const file = postImage.files[0];

  if (!text && !file) return alert("Write something or add an image");

  let imageURL = "";
  if (file) {
    try {
      const storageRef = ref(storage, `posts/${auth.currentUser.uid}/${file.name}-${Date.now()}`);
      await uploadBytes(storageRef, file);
      imageURL = await getDownloadURL(storageRef);
    } catch (err) {
      alert("Image upload failed: " + err.message);
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
    alert("Post failed: " + err.message);
  }
});

// Start loading feed when auth is ready
onAuthStateChanged(auth, (user) => {
  if (!user) {
    window.location.href = "login.html";
    return;
  }

  loadFeed();
});
