// feed.js - COMPLETE WITH ALL FEATURES WORKING

import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-app.js";
import {
  getFirestore, collection, addDoc, doc, deleteDoc, getDoc, getDocs,
  updateDoc, query, where, orderBy, onSnapshot, serverTimestamp, arrayUnion, arrayRemove
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

const ADMIN_EMAILS = [
  "skeeterjeeter8@gmail.com",      // Jesse Lee
  "daniellehunt01@gmail.com"       // Danielle W
];

const BLOCKED_KEYWORDS = [
  "n***er", "n***a", "f****t", "d**e", "ch**k", "sp*c", "k**e", "r****d",
  "kill yourself", "kys", "kill you", "murder", "bomb threat",
  "suicide", "cut myself", "end it all", "kill myself"
];

function containsBlockedKeyword(text) {
  const lowerText = text.toLowerCase();
  return BLOCKED_KEYWORDS.some(keyword => lowerText.includes(keyword.toLowerCase()));
}

function isAdmin(email) {
  return ADMIN_EMAILS.includes(email.toLowerCase());
}

const postsContainer = document.getElementById("postsContainer");
const postBtn = document.getElementById("postBtn");
const postText = document.getElementById("postText");
const postFileInput = document.getElementById("postFileInput");

// NAVIGATION
document.getElementById("feedNavBtn")?.addEventListener("click", () => {
  window.location.href = "feed.html";
});

document.getElementById("profileNavBtn")?.addEventListener("click", () => {
  window.location.href = "profile.html";
});

document.getElementById("messagesNavBtn")?.addEventListener("click", () => {
  window.location.href = "messages.html";
});

document.getElementById("dashboardNavBtn")?.addEventListener("click", () => {
  window.location.href = "dashboard.html";
});

document.getElementById("adminNavBtn")?.addEventListener("click", () => {
  window.location.href = "admin.html";
});

document.getElementById("contactNavBtn")?.addEventListener("click", () => {
  window.location.href = "contact.html";
});

document.getElementById("logoutBtn")?.addEventListener("click", async () => {
  await signOut(auth);
  window.location.href = "login.html";
});

// HAMBURGER MENU
const hamburger = document.getElementById("hamburger");
const navLinks = document.getElementById("navLinks");
if (hamburger && navLinks) {
  hamburger.addEventListener("click", () => {
    hamburger.classList.toggle("active");
    navLinks.classList.toggle("active");
  });
}

// SEARCH FUNCTIONALITY
const searchBar = document.getElementById("searchBar");
const searchResults = document.getElementById("searchResults");
if (searchBar && searchResults) {
  searchBar.addEventListener("input", async (e) => {
    const searchTerm = e.target.value.trim().toLowerCase();
    
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
            username: username
          });
        }
      });
      
      if (matchedUsers.length > 0) {
        searchResults.style.display = "block";
        searchResults.innerHTML = matchedUsers.map(user => `
          <div class="search-result-item" data-user-id="${user.id}">
            <strong>${user.username}</strong>
          </div>
        `).join("");
        
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
}

// NOTIFICATIONS SYSTEM
const notifBtn = document.getElementById("notificationsBtn");
const notifModal = document.getElementById("notificationsModal");
const closeNotifModal = document.getElementById("closeNotifModal");
const notifCount = document.getElementById("notifCount");
const notificationsList = document.getElementById("notificationsList");

if (notifBtn && notifModal) {
  notifBtn.addEventListener("click", () => {
    notifModal.classList.add("active");
    loadNotifications();
  });
  
  if (closeNotifModal) {
    closeNotifModal.addEventListener("click", () => {
      notifModal.classList.remove("active");
    });
  }
  
  window.addEventListener("click", (e) => {
    if (e.target === notifModal) {
      notifModal.classList.remove("active");
    }
  });
}

async function loadNotifications() {
  if (!auth.currentUser || !notificationsList) return;
  
  try {
    const notifQuery = query(
      collection(db, "notifications"),
      where("userId", "==", auth.currentUser.uid),
      orderBy("createdAt", "desc")
    );
    
    const snapshot = await getDocs(notifQuery);
    
    if (snapshot.empty) {
      notificationsList.innerHTML = "<div class='no-notifs'>No notifications yet! When someone likes or comments on your posts, you'll see it here.</div>";
      return;
    }
    
    notificationsList.innerHTML = "";
    snapshot.forEach((docSnap) => {
      const notif = docSnap.data();
      const notifEl = document.createElement("div");
      notifEl.className = `notification-item ${notif.read ? 'read' : 'unread'}`;
      
      let message = notif.message || "New notification";
      const time = notif.createdAt ? new Date(notif.createdAt.toMillis()).toLocaleString() : "just now";
      
      notifEl.innerHTML = `
        <div class="notif-content">
          <p>${message}</p>
          <small>${time}</small>
        </div>
        <button class="mark-read-btn" data-id="${docSnap.id}">${notif.read ? 'Mark Unread' : 'Mark Read'}</button>
      `;
      
      notifEl.querySelector(".mark-read-btn").addEventListener("click", async (e) => {
        e.stopPropagation();
        try {
          await updateDoc(doc(db, "notifications", docSnap.id), {
            read: !notif.read
          });
          loadNotifications();
          updateNotifCount();
        } catch (err) {
          console.error("Error updating notification:", err);
        }
      });
      
      notifEl.addEventListener("click", () => {
        if (notif.postId) {
          window.location.href = `feed.html#post-${notif.postId}`;
        }
      });
      
      notificationsList.appendChild(notifEl);
    });
  } catch (err) {
    console.error("Error loading notifications:", err);
    if (notificationsList) {
      notificationsList.innerHTML = "<div class='no-notifs'>No notifications yet! When someone likes or comments on your posts, you'll see it here.</div>";
    }
  }
}

async function updateNotifCount() {
  if (!auth.currentUser || !notifCount) return;
  
  try {
    const notifQuery = query(
      collection(db, "notifications"),
      where("userId", "==", auth.currentUser.uid),
      where("read", "==", false)
    );
    
    const snapshot = await getDocs(notifQuery);
    const count = snapshot.size;
    
    if (count > 0) {
      notifCount.textContent = count;
      notifCount.style.display = "flex";
    } else {
      notifCount.style.display = "none";
    }
  } catch (err) {
    console.error("Error updating notif count:", err);
    if (notifCount) {
      notifCount.style.display = "none";
    }
  }
}

// CREATE NOTIFICATION (Database + Browser)
async function createNotification(userId, type, message, postId = null) {
  if (!userId || userId === auth.currentUser.uid) return;
  
  try {
    // Save to database
    await addDoc(collection(db, "notifications"), {
      userId: userId,
      type: type,
      message: message,
      postId: postId,
      read: false,
      createdAt: serverTimestamp()
    });
    
    // Send browser notification
    await sendBrowserNotification(userId, "YourSpace", message, postId);
  } catch (err) {
    console.error("Error creating notification:", err);
  }
}

async function renderPost(post, postId) {
  const isOwner = post.userId === auth.currentUser.uid;
  const currentUserId = auth.currentUser.uid;
  const currentUserEmail = auth.currentUser.email;

  const likedBy = post.likedBy || [];
  const dislikedBy = post.dislikedBy || [];
  const savedBy = post.savedBy || [];
  const userLiked = likedBy.includes(currentUserId);
  const userDisliked = dislikedBy.includes(currentUserId);
  const userSaved = savedBy.includes(currentUserId);
  const isPinned = post.pinned || false;

  const postEl = document.createElement("div");
  postEl.className = "post-card";
  postEl.id = `post-${postId}`;
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
      <button class="save-btn ${userSaved ? 'saved' : ''}" data-id="${postId}">🔖 ${userSaved ? 'Saved' : 'Save'}</button>
      <button class="share-btn" data-id="${postId}">🔗 Share</button>
      <button class="report-btn" data-id="${postId}">⚠️ Report</button>
      ${isOwner || isAdmin(currentUserEmail) ? `<button class="delete-btn" data-id="${postId}">🗑️ Delete</button>` : ""}
      ${isAdmin(currentUserEmail) && !isPinned ? `<button class="pin-btn" data-id="${postId}">📌 Pin</button>` : ""}
      ${isAdmin(currentUserEmail) && isPinned ? `<button class="unpin-btn" data-id="${postId}">📌 Unpin</button>` : ""}
    </div>
    <div class="comments-section" id="comments-${postId}"></div>
    <div class="comment-form">
      <input type="text" class="comment-input" placeholder="Write a comment..." />
      <button class="comment-btn" data-id="${postId}">💬</button>
    </div>
  `;

  // LIKE BUTTON
  postEl.querySelector(".like-btn").onclick = async (e) => {
    e.preventDefault();
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
      
      // CREATE NOTIFICATION
      const userDoc = await getDoc(doc(db, "users", currentUserId));
      const username = userDoc.data()?.username || "Someone";
      await createNotification(post.userId, "like", `${username} liked your post`, postId);
    }
  };

  // DISLIKE BUTTON
  postEl.querySelector(".dislike-btn").onclick = async (e) => {
    e.preventDefault();
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

  // SAVE BUTTON
  postEl.querySelector(".save-btn").onclick = async (e) => {
    e.preventDefault();
    const postRef = doc(db, "posts", postId);
    const userRef = doc(db, "users", currentUserId);
    
    if (userSaved) {
      await updateDoc(postRef, {
        savedBy: arrayRemove(currentUserId)
      });
      await updateDoc(userRef, {
        savedPosts: arrayRemove(postId)
      });
    } else {
      await updateDoc(postRef, {
        savedBy: arrayUnion(currentUserId)
      });
      await updateDoc(userRef, {
        savedPosts: arrayUnion(postId)
      });
    }
  };

  // SHARE BUTTON
  postEl.querySelector(".share-btn").onclick = () => {
    const shareUrl = `${window.location.origin}/feed.html#post-${postId}`;
    navigator.clipboard.writeText(shareUrl);
    alert("Post link copied to clipboard!");
  };

  // REPORT BUTTON
  postEl.querySelector(".report-btn").onclick = async () => {
    const reason = prompt("Why are you reporting this post?");
    if (reason) {
      try {
        await addDoc(collection(db, "reports"), {
          postId: postId,
          reporterId: currentUserId,
          reason: reason,
          createdAt: serverTimestamp()
        });
        alert("Post reported. Admins will review it.");
      } catch (err) {
        alert("Error reporting post: " + err.message);
      }
    }
  };

  // DELETE BUTTON
  const deleteBtn = postEl.querySelector(".delete-btn");
  if (deleteBtn) {
    deleteBtn.onclick = async () => {
      if (confirm("Delete this post?")) {
        await deleteDoc(doc(db, "posts", postId));
      }
    };
  }

  // PIN/UNPIN BUTTONS
  const pinBtn = postEl.querySelector(".pin-btn");
  if (pinBtn) {
    pinBtn.onclick = async () => {
      await updateDoc(doc(db, "posts", postId), { pinned: true });
    };
  }

  const unpinBtn = postEl.querySelector(".unpin-btn");
  if (unpinBtn) {
    unpinBtn.onclick = async () => {
      await updateDoc(doc(db, "posts", postId), { pinned: false });
    };
  }

  // COMMENTS
  const commentsSection = postEl.querySelector(`#comments-${postId}`);
  onSnapshot(query(collection(db, "posts", postId, "comments"), orderBy("createdAt", "asc")), (snap) => {
    commentsSection.innerHTML = "";
    snap.forEach((cDoc) => {
      const comment = cDoc.data();
      const isCommentOwner = comment.userId === currentUserId;
      const isAdminUser = isAdmin(currentUserEmail);
      
      const cEl = document.createElement("div");
      cEl.className = "comment";
      cEl.innerHTML = `
        <strong>${comment.username || "Anonymous"}</strong>
        <p>${comment.text}</p>
        ${isCommentOwner || isAdminUser ? `<button class="delete-comment" data-comment-id="${cDoc.id}">🗑️</button>` : ""}
      `;
      
      const deleteCommentBtn = cEl.querySelector(".delete-comment");
      if (deleteCommentBtn) {
        deleteCommentBtn.onclick = async () => {
          if (confirm("Delete this comment?")) {
            await deleteDoc(doc(db, "posts", postId, "comments", cDoc.id));
          }
        };
      }
      
      commentsSection.appendChild(cEl);
    });
  });

  // COMMENT FORM
  const commentBtn = postEl.querySelector(".comment-btn");
  const commentInput = postEl.querySelector(".comment-input");
  
  commentBtn.onclick = async () => {
    const text = commentInput.value.trim();
    if (!text) return;
    
    if (containsBlockedKeyword(text)) {
      alert("Your comment contains blocked content.");
      return;
    }
    
    const userDoc = await getDoc(doc(db, "users", currentUserId));
    const username = userDoc.data()?.username || auth.currentUser.email.split("@")[0];
    
    await addDoc(collection(db, "posts", postId, "comments"), {
      text,
      userId: currentUserId,
      username: username,
      createdAt: serverTimestamp()
    });
    
    // CREATE NOTIFICATION
    await createNotification(post.userId, "comment", `${username} commented on your post`, postId);
    
    commentInput.value = "";
  };

  postsContainer.appendChild(postEl);
}

function loadPosts() {
  const q = query(collection(db, "posts"), orderBy("createdAt", "desc"));

  onSnapshot(q, (snap) => {
    postsContainer.innerHTML = "";
    
    const pinnedPosts = [];
    const regularPosts = [];
    const allPosts = [];
    
    snap.forEach((docSnap) => {
      const post = docSnap.data();
      allPosts.push({ data: post, id: docSnap.id });
      
      if (post.pinned) {
        pinnedPosts.push({ data: post, id: docSnap.id });
      } else {
        regularPosts.push({ data: post, id: docSnap.id });
      }
    });
    
    // Show trending post (most engagement in last hour)
    showTrendingPost(allPosts);
    
    pinnedPosts.forEach(({ data, id }) => renderPost(data, id));
    regularPosts.forEach(({ data, id }) => renderPost(data, id));
  });
}

// Show trending post banner
function showTrendingPost(posts) {
  const trendingContainer = document.getElementById("trendingPostContainer");
  if (!trendingContainer) return;
  
  // Filter posts from last hour
  const oneHourAgo = Date.now() - (60 * 60 * 1000);
  const recentPosts = posts.filter(({ data }) => {
    if (!data.createdAt) return false;
    return data.createdAt.toMillis() > oneHourAgo;
  });
  
  if (recentPosts.length === 0) {
    trendingContainer.innerHTML = "";
    return;
  }
  
  // Calculate engagement score
  recentPosts.forEach(post => {
    const likes = (post.data.likedBy || []).length;
    const dislikes = (post.data.dislikedBy || []).length;
    const saves = (post.data.savedBy || []).length;
    post.engagementScore = (likes * 2) + saves - dislikes;
  });
  
  // Sort by engagement
  recentPosts.sort((a, b) => b.engagementScore - a.engagementScore);
  
  const trending = recentPosts[0];
  if (trending.engagementScore < 3) {
    trendingContainer.innerHTML = "";
    return;
  }
  
  const { data, id } = trending;
  const likes = (data.likedBy || []).length;
  const comments = data.commentCount || 0;
  
  trendingContainer.innerHTML = `
    <div class="trending-banner">
      <div class="trending-header">
        <span class="trending-fire">🔥</span>
        Trending Now
      </div>
      <div class="trending-post-content">
        <strong>${data.username}</strong>: ${data.text?.substring(0, 150) || "Check out this post!"}...
      </div>
      <div class="trending-stats">
        <span>👍 ${likes} likes</span>
        <span>💬 ${comments} comments</span>
      </div>
      <button class="trending-view-btn" onclick="window.location.href='#post-${id}'">
        View Post
      </button>
    </div>
  `;
}

// CREATE POST
postBtn.addEventListener("click", async () => {
  const text = postText.value.trim();
  const file = postFileInput.files[0];

  if (!text && !file) return alert("Post cannot be empty");

  if (containsBlockedKeyword(text)) {
    alert("Your post contains blocked content and cannot be published.");
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
  const username = userDoc.data()?.username || auth.currentUser.email.split("@")[0];

  await addDoc(collection(db, "posts"), {
    userId: auth.currentUser.uid,
    username: username,
    text,
    mediaURL,
    mediaType,
    likedBy: [],
    dislikedBy: [],
    savedBy: [],
    pinned: false,
    createdAt: serverTimestamp()
  });

  postText.value = "";
  postFileInput.value = "";
});

auth.onAuthStateChanged((user) => {
  if (!user) {
    window.location.href = "login.html";
  } else {
    // Show dashboard button for all users
    const dashboardBtn = document.getElementById("dashboardNavBtn");
    if (dashboardBtn) {
      dashboardBtn.style.display = "inline-block";
    }
    
    // Show admin button if user is admin
    if (isAdmin(user.email)) {
      const adminBtn = document.getElementById("adminNavBtn");
      if (adminBtn) {
        adminBtn.style.display = "inline-block";
      }
    }
    
    loadPosts();
    
    // Browser notification permission request (once per user)
    checkNotificationPermission();
  }
});

// Browser Notification System
async function checkNotificationPermission() {
  if (!("Notification" in window)) {
    console.log("Browser doesn't support notifications");
    return;
  }
  
  // Check if user has already made a choice
  const userDoc = await getDoc(doc(db, "users", auth.currentUser.uid));
  const userData = userDoc.data();
  
  if (userData?.notificationChoice === undefined) {
    // Show permission modal
    const modal = document.getElementById("notificationPermissionModal");
    if (modal) {
      modal.classList.add("active");
    }
  } else if (userData?.notificationChoice === true && Notification.permission === "default") {
    // They said yes before but browser permission not granted
    Notification.requestPermission();
  }
}

// Enable notifications button
const enableNotificationsBtn = document.getElementById("enableNotificationsBtn");
if (enableNotificationsBtn) {
  enableNotificationsBtn.addEventListener("click", async () => {
    try {
      const permission = await Notification.requestPermission();
      
      await updateDoc(doc(db, "users", auth.currentUser.uid), {
        notificationChoice: true,
        notificationPermission: permission
      });
      
      if (permission === "granted") {
        new Notification("YourSpace Notifications Enabled! 🎉", {
          body: "You'll now get notified when someone interacts with your posts!",
          icon: "/icon.png"
        });
      }
      
      document.getElementById("notificationPermissionModal").classList.remove("active");
    } catch (err) {
      console.error("Notification error:", err);
    }
  });
}

// Disable notifications button
const disableNotificationsBtn = document.getElementById("disableNotificationsBtn");
if (disableNotificationsBtn) {
  disableNotificationsBtn.addEventListener("click", async () => {
    await updateDoc(doc(db, "users", auth.currentUser.uid), {
      notificationChoice: false
    });
    
    document.getElementById("notificationPermissionModal").classList.remove("active");
  });
}

// Send browser notification
async function sendBrowserNotification(userId, title, body, postId = null) {
  if (!userId) return;
  
  try {
    const userDoc = await getDoc(doc(db, "users", userId));
    const userData = userDoc.data();
    
    if (userData?.notificationChoice === true && userData?.notificationPermission === "granted") {
      // Only send if user has granted permission
      if (Notification.permission === "granted") {
        const notification = new Notification(title, {
          body: body,
          icon: "/icon.png",
          badge: "/badge.png",
          tag: postId || "notification",
          requireInteraction: false
        });
        
        notification.onclick = function() {
          window.focus();
          if (postId) {
            window.location.href = `feed.html#post-${postId}`;
          }
          notification.close();
        };
      }
    }
  } catch (err) {
    console.error("Browser notification error:", err);
  }
}
