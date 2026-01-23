// notifications.js - Notifications Page

import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-app.js";
import {
  getFirestore, collection, query, where, orderBy, getDocs, doc, updateDoc, deleteDoc, onSnapshot
} from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js";

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
const auth = getAuth(app);

const ADMIN_EMAILS = ["skeeterjeeter8@gmail.com", "daniellehunt01@gmail.com"];

function isAdmin(email) {
  return ADMIN_EMAILS.includes(email.toLowerCase());
}

// Navigation
document.getElementById("feedNavBtn")?.addEventListener("click", () => {
  window.location.href = "feed.html";
});

document.getElementById("profileNavBtn")?.addEventListener("click", () => {
  window.location.href = "profile.html";
});

document.getElementById("messagesNavBtn")?.addEventListener("click", () => {
  window.location.href = "messages.html";
});

document.getElementById("notificationsNavBtn")?.addEventListener("click", () => {
  window.location.href = "notifications.html";
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

// Hamburger menu
const hamburger = document.getElementById("hamburger");
const navLinks = document.getElementById("navLinks");
if (hamburger) {
  hamburger.addEventListener("click", () => {
    hamburger.classList.toggle("active");
    navLinks.classList.toggle("active");
  });
}

// Current filter
let currentFilter = "all";

// Tab switching
document.querySelectorAll(".tab-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    currentFilter = btn.dataset.tab;
    loadNotifications();
  });
});

// Mark all as read
document.getElementById("markAllReadBtn").addEventListener("click", async () => {
  if (!auth.currentUser) return;
  
  try {
    const notificationsQuery = query(
      collection(db, "users", auth.currentUser.uid, "notifications"),
      where("read", "==", false)
    );
    const snapshot = await getDocs(notificationsQuery);
    
    const promises = [];
    snapshot.forEach((docSnap) => {
      promises.push(updateDoc(docSnap.ref, { read: true }));
    });
    
    await Promise.all(promises);
    loadNotifications();
  } catch (err) {
    console.error("Error marking all read:", err);
  }
});

async function loadNotifications() {
  if (!auth.currentUser) return;
  
  const notificationsList = document.getElementById("notificationsList");
  
  try {
    let q = query(
      collection(db, "users", auth.currentUser.uid, "notifications"),
      orderBy("createdAt", "desc")
    );
    
    const snapshot = await getDocs(q);
    
    if (snapshot.empty) {
      notificationsList.innerHTML = '<p class="empty-state">No notifications yet. Start engaging with posts!</p>';
      return;
    }
    
    notificationsList.innerHTML = "";
    
    snapshot.forEach((docSnap) => {
      const notif = docSnap.data();
      
      // Filter by type
      if (currentFilter !== "all") {
        if (currentFilter === "likes" && notif.type !== "like") return;
        if (currentFilter === "comments" && notif.type !== "comment") return;
        if (currentFilter === "gifts" && notif.type !== "gift") return;
      }
      
      renderNotification(notif, docSnap.id);
    });
    
  } catch (err) {
    console.error("Error loading notifications:", err);
    notificationsList.innerHTML = '<p class="empty-state">Error loading notifications</p>';
  }
}

function renderNotification(notif, notifId) {
  const notificationsList = document.getElementById("notificationsList");
  
  const item = document.createElement("div");
  item.className = `notification-item ${!notif.read ? 'unread' : ''}`;
  
  let iconClass = "like";
  let iconEmoji = "👍";
  if (notif.type === "comment") {
    iconClass = "comment";
    iconEmoji = "💬";
  } else if (notif.type === "gift") {
    iconClass = "gift";
    iconEmoji = "🎁";
  } else if (notif.type === "dislike") {
    iconClass = "like";
    iconEmoji = "🖕";
  }
  
  const time = notif.createdAt ? timeAgo(notif.createdAt.toMillis()) : "just now";
  
  item.innerHTML = `
    <div class="notification-icon ${iconClass}">
      ${iconEmoji}
    </div>
    <div class="notification-content">
      <p class="notification-text">
        <strong>${notif.senderName || "Someone"}</strong> ${notif.message || "interacted with your post"}
      </p>
      <p class="notification-time">${time}</p>
    </div>
    <div class="notification-actions">
      ${!notif.read ? '<div class="read-indicator"></div>' : ''}
      <button class="delete-notif-btn" data-id="${notifId}">🗑️</button>
    </div>
  `;
  
  // Mark as read when clicked
  item.addEventListener("click", async (e) => {
    if (e.target.classList.contains("delete-notif-btn")) return;
    
    if (!notif.read) {
      await updateDoc(doc(db, "users", auth.currentUser.uid, "notifications", notifId), {
        read: true
      });
      item.classList.remove("unread");
      item.querySelector(".read-indicator")?.remove();
    }
    
    // Navigate to post if postId exists
    if (notif.postId) {
      window.location.href = `feed.html#${notif.postId}`;
    }
  });
  
  // Delete button
  item.querySelector(".delete-notif-btn").addEventListener("click", async (e) => {
    e.stopPropagation();
    if (confirm("Delete this notification?")) {
      await deleteDoc(doc(db, "users", auth.currentUser.uid, "notifications", notifId));
      item.remove();
    }
  });
  
  notificationsList.appendChild(item);
}

function timeAgo(timestamp) {
  const now = Date.now();
  const diffMs = now - timestamp;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  
  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return `${Math.floor(diffDays / 7)}w ago`;
}

onAuthStateChanged(auth, (user) => {
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
    
    loadNotifications();
  }
});
