// feed.js — FIXED - All buttons working, username display

import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-app.js";
import {
  getFirestore, collection, addDoc, doc, deleteDoc, getDoc, getDocs,
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

document.getElementById("dashboardNavBtn")?.addEventListener("click", () => {
  window.location.href = "dashboard.html";
});

document.getElementById("adminNavBtn")?.addEventListener("click", () => {
  window.location.href = "admin.html";
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
  const isTrending = post.trending || false;

  const postEl = document.createElement("div");
  postEl.className = "post-card";
  if (isPinned) postEl.classList.add("pinned-post");
  if (isTrending) postEl.classList.add("trending-post");

  const time = post.createdAt ? new Date(post.createdAt.toMillis()).toLocaleString() : "just now";

  postEl.innerHTML = `
    ${isPinned ? '<div class="pin-badge">📌 Pinned by Admin</div>' : ''}
    ${isTrending && !isPinned ? '<div class="trending-badge">🔥 Trending Now</div>' : ''}
    <div class="post-header">
      <strong>${post.username || "Anonymous"}</strong>
      <small>${time}</small>
    </div>
    <p>${post.text || ""}${post.edited ? ' <span class="edited-badge">(edited)</span>' : ""}</p>
    ${post.mediaURL ? `<${post.mediaType === "video" ? "video controls" : "img"} src="${post.mediaURL}" class="post-media" />` : ""}
    <div class="actions">
      <button class="like-btn ${userLiked ? 'active' : ''}" data-id="${postId}">👍 ${likedBy.length}</button>
      <button class="dislike-btn ${userDisliked ? 'active' : ''}" data-id="${postId}">🖕 ${dislikedBy.length}</button>
      <button class="comment-toggle" data-id="${postId}">💬</button>
      <button class="share-btn" data-id="${postId}">🔗</button>
      ${isOwner ? `<button class="edit-btn" data-id="${postId}">✏️ Edit</button>` : ""}
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

  // EDIT BUTTON (Post owner only)
  const editBtn = postEl.querySelector(".edit-btn");
  if (editBtn) {
    editBtn.addEventListener("click", async (e) => {
      e.preventDefault();
      e.stopPropagation();
      haptic("light");
      
      const postTextEl = postEl.querySelector("p");
      const currentText = post.text || "";
      
      // Create edit form
      const editForm = document.createElement("div");
      editForm.className = "edit-post-form";
      editForm.innerHTML = `
        <textarea class="edit-post-textarea">${currentText}</textarea>
        <div class="edit-post-actions">
          <button class="save-edit-btn">💾 Save</button>
          <button class="cancel-edit-btn">❌ Cancel</button>
        </div>
      `;
      
      // Replace post text with edit form
      postTextEl.replaceWith(editForm);
      const textarea = editForm.querySelector(".edit-post-textarea");
      textarea.focus();
      textarea.setSelectionRange(textarea.value.length, textarea.value.length);
      
      // Save button
      editForm.querySelector(".save-edit-btn").addEventListener("click", async () => {
        const newText = textarea.value.trim();
        if (!newText) {
          alert("Post cannot be empty!");
          return;
        }
        
        try {
          await updateDoc(doc(db, "posts", postId), {
            text: newText,
            edited: true,
            editedAt: serverTimestamp()
          });
          
          // Replace edit form with updated text
          const newPostTextEl = document.createElement("p");
          newPostTextEl.innerHTML = `${newText} <span class="edited-badge">(edited)</span>`;
          editForm.replaceWith(newPostTextEl);
          
          haptic("success");
        } catch (err) {
          alert("Error updating post: " + err.message);
        }
      });
      
      // Cancel button
      editForm.querySelector(".cancel-edit-btn").addEventListener("click", () => {
        const newPostTextEl = document.createElement("p");
        newPostTextEl.textContent = currentText;
        editForm.replaceWith(newPostTextEl);
      });
    });
  }

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
      const replies = c.replies || [];

      cEl.innerHTML = `
        <strong>${c.username || "Anonymous"}</strong>
        <p>${c.text}</p>
        <div class="comment-actions">
          <button class="reply-btn" data-comment-id="${cDoc.id}">↩️ Reply</button>
          ${isCommentOwner ? `<button class="delete-comment" data-comment-id="${cDoc.id}" data-post-id="${postId}">🗑️</button>` : ""}
        </div>
        <div class="replies-container" id="replies-${cDoc.id}">
          ${replies.map(reply => `
            <div class="reply">
              <strong>${reply.username}</strong>
              <p>${reply.text}</p>
              ${reply.userId === auth.currentUser.uid ? `<button class="delete-reply" data-comment-id="${cDoc.id}" data-reply-id="${reply.id}" data-post-id="${postId}">🗑️</button>` : ''}
            </div>
          `).join('')}
        </div>
        <div class="reply-form" id="reply-form-${cDoc.id}" style="display:none;">
          <input type="text" class="reply-input" placeholder="Write a reply..." />
          <button class="reply-submit-btn" data-comment-id="${cDoc.id}">Send</button>
          <button class="reply-cancel-btn" data-comment-id="${cDoc.id}">Cancel</button>
        </div>
      `;

      // Reply button
      cEl.querySelector(".reply-btn").onclick = () => {
        const replyForm = document.getElementById(`reply-form-${cDoc.id}`);
        replyForm.style.display = replyForm.style.display === "none" ? "flex" : "none";
      };

      // Submit reply
      const replySubmitBtn = cEl.querySelector(".reply-submit-btn");
      if (replySubmitBtn) {
        replySubmitBtn.onclick = async () => {
          const replyInput = cEl.querySelector(".reply-input");
          const replyText = replyInput.value.trim();
          if (!replyText) return;

          if (containsBlockedKeyword(replyText)) {
            alert("Your reply contains blocked content and cannot be posted.");
            return;
          }

          const userDoc = await getDoc(doc(db, "users", auth.currentUser.uid));
          const userData = userDoc.data();

          const newReply = {
            id: Date.now().toString(),
            userId: auth.currentUser.uid,
            username: userData?.username || auth.currentUser.email.split("@")[0],
            text: replyText,
            createdAt: new Date().toISOString()
          };

          const commentRef = doc(db, "posts", postId, "comments", cDoc.id);
          const commentDoc = await getDoc(commentRef);
          const existingReplies = commentDoc.data().replies || [];

          await updateDoc(commentRef, {
            replies: [...existingReplies, newReply]
          });

          replyInput.value = "";
          document.getElementById(`reply-form-${cDoc.id}`).style.display = "none";
        };
      }

      // Cancel reply
      const replyCancelBtn = cEl.querySelector(".reply-cancel-btn");
      if (replyCancelBtn) {
        replyCancelBtn.onclick = () => {
          document.getElementById(`reply-form-${cDoc.id}`).style.display = "none";
        };
      }

      // Delete comment
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

      // Delete reply buttons
      cEl.querySelectorAll(".delete-reply").forEach(btn => {
        btn.onclick = async (e) => {
          if (confirm("Delete this reply?")) {
            const commentId = e.target.getAttribute("data-comment-id");
            const replyId = e.target.getAttribute("data-reply-id");
            const postIdForReply = e.target.getAttribute("data-post-id");

            const commentRef = doc(db, "posts", postIdForReply, "comments", commentId);
            const commentDoc = await getDoc(commentRef);
            const existingReplies = commentDoc.data().replies || [];
            const updatedReplies = existingReplies.filter(r => r.id !== replyId);

            await updateDoc(commentRef, {
              replies: updatedReplies
            });
          }
        };
      });

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
    
    // Separate pinned, trending, and regular posts
    const pinnedPosts = [];
    const trendingPosts = [];
    const regularPosts = [];
    
    snap.forEach((docSnap) => {
      const post = docSnap.data();
      if (post.pinned) {
        pinnedPosts.push({ data: post, id: docSnap.id });
      } else if (post.trending) {
        trendingPosts.push({ data: post, id: docSnap.id });
      } else {
        regularPosts.push({ data: post, id: docSnap.id });
      }
    });
    
    // Render in order: Pinned → Trending → Regular
    pinnedPosts.forEach(({ data, id }) => renderPost(data, id));
    trendingPosts.forEach(({ data, id }) => renderPost(data, id));
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
  if (!user) {
    window.location.href = "login.html";
  } else {
    // Show dashboard for all users
    const dashboardBtn = document.getElementById("dashboardNavBtn");
    if (dashboardBtn) dashboardBtn.style.display = "inline-block";
    
    // Show admin button only for admins
    if (isAdmin(user.email)) {
      const adminBtn = document.getElementById("adminNavBtn");
      if (adminBtn) adminBtn.style.display = "inline-block";
    }
    
    loadPosts();
  }
});

// HAMBURGER MENU FUNCTIONALITY
const hamburger = document.getElementById("hamburger");
const navLinks = document.getElementById("navLinks");

if (hamburger && navLinks) {
  hamburger.addEventListener("click", () => {
    hamburger.classList.toggle("active");
    navLinks.classList.toggle("active");
  });
  
  // Close menu when clicking a nav link
  navLinks.querySelectorAll("button").forEach(button => {
    button.addEventListener("click", () => {
      hamburger.classList.remove("active");
      navLinks.classList.remove("active");
    });
  });
  
  // Close menu when clicking outside
  document.addEventListener("click", (e) => {
    if (!hamburger.contains(e.target) && !navLinks.contains(e.target)) {
      hamburger.classList.remove("active");
      navLinks.classList.remove("active");
    }
  });
}

// ═══════════════════════════════════════════════════════════
// FEATURE 1: USER SEARCH BAR
// ═══════════════════════════════════════════════════════════

const searchBar = document.getElementById("searchBar");
const searchResults = document.getElementById("searchResults");
const clearSearchBtn = document.getElementById("clearSearchBtn");

if (searchBar && searchResults) {
  searchBar.addEventListener("input", async (e) => {
    const searchTerm = e.target.value.trim().toLowerCase();
    
    // Show/hide clear button
    if (clearSearchBtn) {
      clearSearchBtn.style.display = searchTerm ? "block" : "none";
    }
    
    if (!searchTerm) {
      searchResults.style.display = "none";
      searchResults.innerHTML = "";
      return;
    }
    
    try {
      const usersSnapshot = await getDocs(collection(db, "users"));
      const matchedUsers = [];
      
      usersSnapshot.forEach((docSnap) => {
        const userData = docSnap.data();
        const username = userData.username || "";
        if (username.toLowerCase().includes(searchTerm)) {
          matchedUsers.push({
            id: docSnap.id,
            username: username,
            photoURL: userData.photoURL || "https://via.placeholder.com/50"
          });
        }
      });
      
      if (matchedUsers.length > 0) {
        searchResults.style.display = "block";
        searchResults.innerHTML = matchedUsers.map(user => `
          <div class="search-result-item" data-user-id="${user.id}">
            <img src="${user.photoURL}" alt="${user.username}" class="search-result-avatar" onerror="this.src='https://via.placeholder.com/50'">
            <strong class="search-result-username">${user.username}</strong>
          </div>
        `).join("");
        
        // Add click handlers to results
        searchResults.querySelectorAll(".search-result-item").forEach(item => {
          item.addEventListener("click", () => {
            const userId = item.getAttribute("data-user-id");
            window.location.href = `profile.html?userId=${userId}`;
          });
        });
      } else {
        searchResults.style.display = "block";
        searchResults.innerHTML = "<div class='no-results'>No users found</div>";
      }
    } catch (err) {
      console.error("Search error:", err);
    }
  });
  
  // Close search results when clicking outside
  document.addEventListener("click", (e) => {
    if (!searchBar.contains(e.target) && !searchResults.contains(e.target)) {
      searchResults.style.display = "none";
    }
  });
}

// Clear search button
if (clearSearchBtn) {
  clearSearchBtn.addEventListener("click", () => {
    searchBar.value = "";
    searchResults.style.display = "none";
    searchResults.innerHTML = "";
    clearSearchBtn.style.display = "none";
    searchBar.focus();
  });
}
