// feed.js – Global feed with text/image posts, likes/dislikes, comments, delete own

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
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";
import { ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-storage.js";

const postText = document.getElementById("postText");
const postImage = document.getElementById("postImage");
const postBtn = document.getElementById("postBtn");
const feedContainer = document.getElementById("feedContainer");

let currentUser = null;

// Load feed real-time
function loadFeed() {
  const q = query(collection(db, "posts"), orderBy("createdAt", "desc"));

  onSnapshot(q, (snap) => {
    feedContainer.innerHTML = "";

    snap.forEach((docSnap) => {
      const post = docSnap.data();
      const postId = docSnap.id;

      const isOwner = post.userId === currentUser?.uid;

      const div = document.createElement("div");
      div.className = "post";
      div.innerHTML = `
        <strong>${post.username || "Anonymous"}</strong>
        <p>${post.text || ""}</p>
        ${post.imageURL ? `<img src="${post.imageURL}" alt="Post image" style="max-width: 100%;">` : ""}
        <div class="actions">
          <button class="likeBtn" data-id="${postId}">
            Like (${post.likes?.length || 0})
          </button>
          <button class="dislikeBtn" data-id="${postId}">
            Dislike (${post.dislikes?.length || 0})
          </button>
          ${isOwner ? `<button class="deleteBtn" data-id="${postId}">Delete</button>` : ""}
        </div>
        <div class="comments">
          <h4>Comments</h4>
          <div id="comments-${postId}"></div>
          <input type="text" placeholder="Add comment" id="commentInput-${postId}">
          <button class="commentBtn" data-id="${postId}">Comment</button>
        </div>
      `;

      feedContainer.appendChild(div);

      // Like/Dislike
      div.querySelector(".likeBtn").onclick = async () => {
        const postRef = doc(db, "posts", postId);
        await updateDoc(postRef, {
          likes: arrayUnion(currentUser.uid)
        });
      };

      div.querySelector(".dislikeBtn").onclick = async () => {
        const postRef = doc(db, "posts", postId);
        await updateDoc(postRef, {
          dislikes: arrayUnion(currentUser.uid)
        });
      };

      // Delete post
      div.querySelector(".deleteBtn")?.onclick = async () => {
        if (confirm("Delete this post?")) {
          await deleteDoc(doc(db, "posts", postId));
        }
      };

      // Comment on post
      const commentInput = div.querySelector(`#commentInput-${postId}`);
      const commentBtn = div.querySelector(".commentBtn");

      commentBtn.onclick = async () => {
        const text = commentInput.value.trim();
        if (!text) return;

        await addDoc(collection(db, "posts", postId, "comments"), {
          text,
          username: currentUser.email.split('@')[0] || "Anonymous",
          userId: currentUser.uid,
          createdAt: serverTimestamp()
        });

        commentInput.value = "";
      };

      // Load comments for this post
      const commentsQ = query(collection(db, "posts", postId, "comments"), orderBy("createdAt", "desc"));
      onSnapshot(commentsQ, (snap) => {
        const commentsDiv = div.querySelector(`#comments-${postId}`);
        commentsDiv.innerHTML = "";

        snap.forEach((commentSnap) => {
          const c = commentSnap.data();
          const commentDiv = document.createElement("div");
          commentDiv.textContent = `${c.username}: ${c.text}`;
          commentsDiv.appendChild(commentDiv);
        });
      });
    });
  });
}

// Post new text/image
postBtn.addEventListener("click", async () => {
  if (!auth.currentUser) return alert("Not logged in");

  const text = postText.value.trim();
  const file = postImage.files[0];

  if (!text && !file) return alert("Add text or image");

  let imageURL = "";
  if (file) {
    const storageRef = ref(storage, `posts/${auth.currentUser.uid}/${file.name}-${Date.now()}`);
    await uploadBytes(storageRef, file);
    imageURL = await getDownloadURL(storageRef);
  }

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
});

// Init
onAuthStateChanged(auth, (user) => {
  if (!user) window.location.href = "login.html";
  else {
    loadFeed();
  }
});
