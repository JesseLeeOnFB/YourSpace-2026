// feed.js — FIXED - All buttons working, username display

import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-app.js";
import {
  getFirestore, collection, addDoc, doc, deleteDoc, getDoc,
  updateDoc, query, orderBy, onSnapshot, serverTimestamp, arrayUnion, arrayRemove
} from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";
import { getAuth, signOut } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-storage.js";

const firebaseConfig = {
  apiKey: "AIzaSyAHMbxr7rJS88ZefVJzt8p_9CCTstLmLU8",
  authDomain: "yourspace-2026.firebaseapp.com",
  projectId: "yourspace-2026",
  storageBucket: "yourspace-2026.firebasestorage.app",
  messagingSenderId: "72667267302",
  appId: "1:72667267302:web:2bed5f543e05d49ca8fb27"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const storage = getStorage(app);
const auth = getAuth(app);

// Admin accounts
const ADMIN_EMAILS = [
  "skeeterjeeter8@gmail.com",
  "daniellehunt01@gmail.com"
];

// Keyword filter - blocks offensive content
const BLOCKED_KEYWORDS = [
  // Racist slurs (partial list - add more as needed)
  "n***er", "n***a", "f****t", "d**e", "ch**k", "sp*c", "k**e", "r****d",
  // Threats
  "kill yourself", "kys", "kill you", "murder", "bomb threat",
  // Self-harm
  "suicide", "cut myself", "end it all", "kill myself",
  // Add more keywords as needed
];

function containsBlockedKeyword(text) {
  const lowerText = text.toLowerCase();
  return BLOCKED_KEYWORDS.some(keyword => lowerText.includes(keyword.toLowerCase()));
}

function isAdmin(email) {
  return ADMIN_EMAILS.includes(email.toLowerCase());
}

function haptic(type = "light") {
  if (!navigator.vibrate) return;
  if (type === "light") navigator.vibrate(10);
  if (type === "medium") navigator.vibrate(20);
  if (type === "heavy") navigator.vibrate([30, 20, 30]);
}

const postsContainer = document.getElementById("postsContainer");
const postBtn = document.getElementById("postBtn");
const postText = document.getElementById("postText");
const postFileInput = document.getElementById("postFileInput");

document.getElementById("feedNavBtn")?.addEventListener("click", () => {
  window.location.href = "feed.html";
});

document.getElementById("profileNavBtn")?.addEventListener("click", () => {
  window.location.href = "profile.html";
});

document.getElementById("messagesNavBtn")?.addEventListener("click", () => {
  window.location.href = "messages.html";
});

document.getElementById("contactNavBtn")?.addEventListener("click", () => {
  window.location.href = "contact.html";
});

document.getElementById("logoutBtn")?.addEventListener("click", async () => {
  await signOut(auth);
  window.location.href = "login.html";
});

async function renderPost(post, postId) {
  const isOwner = post.userId === auth.currentUser.uid;
  const currentUserId = auth.currentUser.uid;
  const currentUserEmail = auth.currentUser.email;

  const likedBy = post.likedBy || [];
  const dislikedBy = post.dislikedBy || [];
  const userLiked = likedBy.includes(currentUserId);
  const userDisliked = dislikedBy.includes(currentUserId);
  const isPinned = post.pinned || false;

  const postEl = document.createElement("div");
  postEl.className = "post-card";
  if (isPinned) postEl.classList.add("pinned-post");

  const time = post.createdAt ? new Date(post.createdAt.toMillis()).toLocaleString() : "just now";

  postEl.innerHTML = `
    ${isPinned ? '<div class="pin-badge">📌 Pinned by Admin</div>' : ''}
    <div class="post-header">
      <strong>${post.username || "Anonymous"}</strong>
      <small>${time}</small>
    </div>
    <p>${post.text || ""}</p>
    ${post.mediaURL ? `<${post.mediaType === "video" ? "video controls" : "img"} src="${post.mediaURL}" class="post-media" />` : ""}
    <div class="actions">
      <button class="like-btn ${userLiked ? 'active' : ''}" data-id="${postId}">👍 ${likedBy.length}</button>
      <button class="dislike-btn ${userDisliked ? 'active' : ''}" data-id="${postId}">🖕 ${dislikedBy.length}</button>
      <button class="comment-toggle" data-id="${postId}">💬</button>
      <button class="share-btn" data-id="${postId}">🔗</button>
      ${isOwner ? `<button class="delete-btn" data-id="${postId}">🗑️</button>` : ""}
      ${isAdmin(currentUserEmail) && !isPinned ? `<button class="pin-btn" data-id="${postId}">📌 Pin</button>` : ""}
      ${isAdmin(currentUserEmail) && isPinned ? `<button class="unpin-btn" data-id="${postId}">📌 Unpin</button>` : ""}
    </div>
    <div class="comments-section" id="comments-${postId}"></div>
    <div class="comment-form">
      <input type="text" class="comment-input" placeholder="Write a comment..." />
      <button class="comment-btn" data-id="${postId}">💬</button>
    </div>
  `;

  postEl.querySelector(".like-btn").onclick = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    haptic("light");
    const postRef = doc(db, "posts", postId);
    
    if (userLiked) {
      await updateDoc(postRef, {
        likedBy: arrayRemove(currentUserId)
      });
    } else {
      const updates = {
        likedBy: arrayUnion(currentUserId)
      };
      if (userDisliked) {
        updates.dislikedBy = arrayRemove(currentUserId);
      }
      await updateDoc(postRef, updates);
    }
  };

  postEl.querySelector(".dislike-btn").onclick = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    haptic("light");
    const postRef = doc(db, "posts", postId);
    
    if (userDisliked) {
      await updateDoc(postRef, {
        dislikedBy: arrayRemove(currentUserId)
      });
    } else {
      const updates = {
        dislikedBy: arrayUnion(currentUserId)
      };
      if (userLiked) {
        updates.likedBy = arrayRemove(currentUserId);
      }
      await updateDoc(postRef, updates);
    }
  };

  postEl.querySelector(".share-btn").onclick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    haptic("medium");
    navigator.clipboard.writeText(`${window.location.origin}/feed.html#${postId}`);
    alert("Post link copied!");
  };

  const deleteBtn = postEl.querySelector(".delete-btn");
  if (deleteBtn) {
    deleteBtn.addEventListener("click", async (e) => {
      e.preventDefault();
      e.stopPropagation();
      haptic("heavy");
      if (confirm("Delete this post?")) {
        try {
          await deleteDoc(doc(db, "posts", postId));
          postEl.remove();
        } catch (err) {
          alert("Error deleting post: " + err.message);
        }
      }
    });
  }

  // PIN/UNPIN BUTTON (Admin only)
  const pinBtn = postEl.querySelector(".pin-btn");
  if (pinBtn) {
    pinBtn.addEventListener("click", async (e) => {
      e.preventDefault();
      e.stopPropagation();
      try {
        await updateDoc(doc(db, "posts", postId), { pinned: true });
        alert("Post pinned to top of feed!");
      } catch (err) {
        alert("Error pinning post: " + err.message);
      }
    });
  }

  const unpinBtn = postEl.querySelector(".unpin-btn");
  if (unpinBtn) {
    unpinBtn.addEventListener("click", async (e) => {
      e.preventDefault();
      e.stopPropagation();
      try {
        await updateDoc(doc(db, "posts", postId), { pinned: false });
      } catch (err) {
        alert("Error unpinning post: " + err.message);
      }
    });
  }

  const commentsSection = postEl.querySelector(".comments-section");
  const commentsQ = query(collection(db, "posts", postId, "comments"), orderBy("createdAt", "desc"));

  onSnapshot(commentsQ, (snap) => {
    commentsSection.innerHTML = "";

    snap.forEach((cDoc) => {
      const c = cDoc.data();
      const cEl = document.createElement("div");
      cEl.className = "comment";

      const isCommentOwner = c.userId === auth.currentUser.uid;

      cEl.innerHTML = `
        <strong>${c.username || "Anonymous"}</strong>
        <p>${c.text}</p>
        ${isCommentOwner ? `<button class="delete-comment" data-comment-id="${cDoc.id}" data-post-id="${postId}">🗑️</button>` : ""}
      `;

      const deleteCommentBtn = cEl.querySelector(".delete-comment");
      if (deleteCommentBtn) {
        deleteCommentBtn.addEventListener("click", async (e) => {
          e.preventDefault();
          e.stopPropagation();
          haptic("heavy");
          if (confirm("Delete this comment?")) {
            const commentId = e.target.getAttribute("data-comment-id");
            const postIdForComment = e.target.getAttribute("data-post-id");
            try {
              await deleteDoc(doc(db, "posts", postIdForComment, "comments", commentId));
            } catch (err) {
              alert("Error deleting comment: " + err.message);
            }
          }
        });
      }

      commentsSection.appendChild(cEl);
    });
  });

  postEl.querySelector(".comment-btn").onclick = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    const input = postEl.querySelector(".comment-input");
    const text = input.value.trim();
    if (!text) return;

    // KEYWORD FILTER - Block offensive comments
    if (containsBlockedKeyword(text)) {
      alert("Your comment contains blocked content and cannot be posted. Please remove offensive language.");
      return;
    }

    haptic("medium");

    const userDoc = await getDoc(doc(db, "users", auth.currentUser.uid));
    const userData = userDoc.data();
    const username = userData?.username || auth.currentUser.email.split("@")[0];

    try {
      await addDoc(collection(db, "posts", postId, "comments"), {
        text,
        userId: auth.currentUser.uid,
        username: username,
        createdAt: serverTimestamp()
      });

      input.value = "";
    } catch (err) {
      alert("Error posting comment: " + err.message);
    }
  };

  postsContainer.appendChild(postEl);
}

function loadPosts() {
  const q = query(collection(db, "posts"), orderBy("createdAt", "desc"));

  onSnapshot(q, (snap) => {
    postsContainer.innerHTML = "";
    
    // Separate pinned and regular posts
    const pinnedPosts = [];
    const regularPosts = [];
    
    snap.forEach((docSnap) => {
      const post = docSnap.data();
      if (post.pinned) {
        pinnedPosts.push({ data: post, id: docSnap.id });
      } else {
        regularPosts.push({ data: post, id: docSnap.id });
      }
    });
    
    // Render pinned posts first
    pinnedPosts.forEach(({ data, id }) => renderPost(data, id));
    
    // Then render regular posts
    regularPosts.forEach(({ data, id }) => renderPost(data, id));
  });
}

postBtn.addEventListener("click", async () => {
  const text = postText.value.trim();
  const file = postFileInput.files[0];

  if (!text && !file) return alert("Post cannot be empty");

  // KEYWORD FILTER - Block offensive posts
  if (containsBlockedKeyword(text)) {
    alert("Your post contains blocked content and cannot be published. Please remove offensive language.");
    return;
  }

  let mediaURL = "";
  let mediaType = "";

  if (file) {
    mediaType = file.type.startsWith("video") ? "video" : "image";
    const storageRef = ref(storage, `posts/${auth.currentUser.uid}/${Date.now()}_${file.name}`);
    await uploadBytes(storageRef, file);
    mediaURL = await getDownloadURL(storageRef);
  }

  const userDoc = await getDoc(doc(db, "users", auth.currentUser.uid));
  const userData = userDoc.data();
  const username = userData?.username || auth.currentUser.email.split("@")[0];

  try {
    await addDoc(collection(db, "posts"), {
      userId: auth.currentUser.uid,
      username: username,
      text,
      mediaURL,
      mediaType,
      likedBy: [],
      dislikedBy: [],
      pinned: false,
      createdAt: serverTimestamp()
    });

    haptic("medium");

    postText.value = "";
    postFileInput.value = "";
  } catch (err) {
    alert("Error creating post: " + err.message);
  }
});

auth.onAuthStateChanged((user) => {
  if (!user) window.location.href = "login.html";
  else loadPosts();
});
