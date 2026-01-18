// feed.js – Fixed: waits for auth, real-time posts, text/image posting, likes/dislikes/comments/delete, error alerts

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

const postText = document.getElementById("postText");
const postImage = document.getElementById("postImage");
const postBtn = document.getElementById("postBtn");
const feedContainer = document.getElementById("feedContainer");

// Navigation (JS listeners – no onclick in HTML!)
document.getElementById("navFeedBtn")?.addEventListener("click", () => window.location.href = "feed.html");
document.getElementById("navProfileBtn")?.addEventListener("click", () => window.location.href = "profile.html");
document.getElementById("navMessagesBtn")?.addEventListener("click", () => window.location.href = "messages.html");

// Load feed real-time
function loadFeed() {
  alert("Feed loading started...");

  const q = query(collection(db, "posts"), orderBy("createdAt", "desc"));

  onSnapshot(q, async (snap) => {
    feedContainer.innerHTML = "";

    if (snap.empty) {
      feedContainer.innerHTML = '<p>No posts yet. Be the first to post!</p>';
      alert("No posts found in 'posts' collection");
      return;
    }

    alert("Posts loaded: " + snap.size + " posts found");

    snap.forEach(async (docSnap) => {
      const post = docSnap.data();
      const postId = docSnap.id;

      // Get poster's username
      const userSnap = await getDoc(doc(db, "users", post.userId));
      const username = userSnap.exists() ? userSnap.data().username || "Anonymous" : "Anonymous";

      const isOwner = post.userId === auth.currentUser?.uid;

      const div = document.createElement("div");
      div.className = "post";
      div.innerHTML = `
        <strong>${username}</strong>
        <small>${post.createdAt ? new Date(post.createdAt.toMillis()).toLocaleString() : "just now"}</small>
        <p>${post.text || ""}</p>
        ${post.imageURL ? `<img src="${post.imageURL}" alt="Post image" style="max-width: 100%; border-radius: 8px;">` : ""}
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

      // Like
      div.querySelector(".likeBtn").onclick = async () => {
        await updateDoc(doc(db, "posts", postId), {
          likes: arrayUnion(auth.currentUser.uid)
        });
      };

      // Dislike
      div.querySelector(".dislikeBtn").onclick = async () => {
        await updateDoc(doc(db, "posts", postId), {
          dislikes: arrayUnion(auth.currentUser.uid)
        });
      };

      // Delete own post
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
          userId: auth.currentUser.uid,
          username: auth.currentUser.email.split('@')[0] || "Anonymous",
          createdAt: serverTimestamp()
        });

        commentInput.value = "";
      };

      // Load comments
      const commentsQ = query(collection(db, "posts", postId, "comments"), orderBy("createdAt", "desc"));
      onSnapshot(commentsQ, (snap) => {
        const commentsDiv = div.querySelector(`#comments-${postId}`);
        commentsDiv.innerHTML = "";

        snap.forEach((commentSnap) => {
          const c = commentSnap.data();
          const commentDiv = document.createElement("div");
          commentDiv.className = "comment";
          commentDiv.innerHTML = `<strong>${c.username}</strong>: ${c.text}`;
          commentsDiv.appendChild(commentDiv);
        });
      });
    });
  }, (err) => {
    alert("Feed load error: " + err.message + "\nLikely permissions or collection 'posts' missing.");
  });
}

// Post new text/image
postBtn.addEventListener("click", async () => {
  if (!auth.currentUser) return alert("Please login to post");

  const text = postText.value.trim();
  const file = postImage.files[0];

  if (!text && !file) return alert("Add text or image");

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
    alert("Post failed: " + err.message + "\nCheck Firestore rules or login status.");
  }
});

// Init – wait for auth
onAuthStateChanged(auth, (user) => {
  if (!user) {
    window.location.href = "login.html";
    return;
  }

  alert("Authenticated! Loading feed...");
  loadFeed();
});
