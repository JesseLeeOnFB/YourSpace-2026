// notifications.js - Complete working version

import { initializeApp } from “https://www.gstatic.com/firebasejs/9.22.2/firebase-app.js”;
import {
getFirestore, collection, query, orderBy, onSnapshot, doc, updateDoc, getDocs
} from “https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js”;
import { getAuth, signOut } from “https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js”;

const firebaseConfig = {
apiKey: “AIzaSyAHMbxr7rJS88ZefVJzt8p_9CCTstLmLU8”,
authDomain: “yourspace-2026.firebaseapp.com”,
projectId: “yourspace-2026”,
storageBucket: “yourspace-2026.firebasestorage.app”,
messagingSenderId: “72667267302”,
appId: “1:72667267302:web:2bed5f543e05d49ca8fb27”
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

const ADMIN_EMAILS = [“skeeterjeeter8@gmail.com”, “daniellehunt01@gmail.com”];

// Navigation
document.getElementById(“feedNavBtn”)?.addEventListener(“click”, () => {
window.location.href = “feed.html”;
});

document.getElementById(“profileNavBtn”)?.addEventListener(“click”, () => {
window.location.href = “profile.html”;
});

document.getElementById(“messagesNavBtn”)?.addEventListener(“click”, () => {
window.location.href = “messages.html”;
});

document.getElementById(“notificationsNavBtn”)?.addEventListener(“click”, () => {
window.location.href = “notifications.html”;
});

document.getElementById(“dashboardNavBtn”)?.addEventListener(“click”, () => {
window.location.href = “dashboard.html”;
});

document.getElementById(“adminNavBtn”)?.addEventListener(“click”, () => {
window.location.href = “admin.html”;
});

document.getElementById(“contactNavBtn”)?.addEventListener(“click”, () => {
window.location.href = “contact.html”;
});

document.getElementById(“logoutBtn”)?.addEventListener(“click”, async () => {
await signOut(auth);
window.location.href = “login.html”;
});

// Hamburger menu
const hamburger = document.getElementById(“hamburger”);
const navLinks = document.getElementById(“navLinks”);

if (hamburger && navLinks) {
hamburger.addEventListener(“click”, () => {
hamburger.classList.toggle(“active”);
navLinks.classList.toggle(“active”);
});

navLinks.querySelectorAll(“button”).forEach(button => {
button.addEventListener(“click”, () => {
hamburger.classList.remove(“active”);
navLinks.classList.remove(“active”);
});
});

document.addEventListener(“click”, (e) => {
if (!hamburger.contains(e.target) && !navLinks.contains(e.target)) {
hamburger.classList.remove(“active”);
navLinks.classList.remove(“active”);
}
});
}

// Load notifications
function loadNotifications(userId) {
const notificationsRef = collection(db, “users”, userId, “notifications”);
const q = query(notificationsRef, orderBy(“createdAt”, “desc”));

onSnapshot(q, (snapshot) => {
const notificationsList = document.getElementById(“notificationsList”);
notificationsList.innerHTML = “”;

```
if (snapshot.empty) {
  notificationsList.innerHTML = `
    <div class="no-notifications">
      <div class="no-notifications-icon">🔔</div>
      <p>No notifications yet</p>
    </div>
  `;
  return;
}

snapshot.forEach((docSnap) => {
  const notification = docSnap.data();
  const notifId = docSnap.id;
  
  const notifEl = document.createElement("div");
  notifEl.className = `notification-item ${!notification.read ? 'unread' : ''}`;
  
  const iconMap = {
    like: "❤️",
    comment: "💬",
    gift: "🎁",
    follow: "👤",
    mention: "🏷️"
  };
  
  const icon = iconMap[notification.type] || "🔔";
  const timeAgo = getTimeAgo(notification.createdAt);
  
  notifEl.innerHTML = `
    <div class="notification-icon">${icon}</div>
    <img src="${notification.fromUserPhoto || 'https://via.placeholder.com/50'}" 
         alt="${notification.fromUsername}" 
         class="notification-avatar" />
    <div class="notification-content">
      <div class="notification-text">
        <strong>${notification.fromUsername || 'Someone'}</strong> ${notification.text || 'interacted with your post'}
      </div>
      <div class="notification-time">${timeAgo}</div>
    </div>
  `;
  
  // Click to mark as read and navigate
  notifEl.addEventListener("click", async () => {
    if (!notification.read) {
      await updateDoc(doc(db, "users", userId, "notifications", notifId), {
        read: true
      });
    }
    
    // Navigate based on type
    if (notification.postId) {
      window.location.href = `feed.html#post-${notification.postId}`;
    } else if (notification.fromUserId) {
      window.location.href = `profile.html?uid=${notification.fromUserId}`;
    }
  });
  
  notificationsList.appendChild(notifEl);
});
```

});
}

// Mark all as read
document.getElementById(“markAllReadBtn”)?.addEventListener(“click”, async () => {
const userId = auth.currentUser.uid;
const notificationsRef = collection(db, “users”, userId, “notifications”);
const snapshot = await getDocs(notificationsRef);

const updatePromises = [];
snapshot.forEach((docSnap) => {
if (!docSnap.data().read) {
updatePromises.push(
updateDoc(doc(db, “users”, userId, “notifications”, docSnap.id), {
read: true
})
);
}
});

await Promise.all(updatePromises);
alert(“All notifications marked as read!”);
});

// Helper function
function getTimeAgo(timestamp) {
if (!timestamp) return “just now”;

const now = new Date();
const then = timestamp.toMillis ? new Date(timestamp.toMillis()) : new Date(timestamp);
const diffMs = now - then;
const diffMins = Math.floor(diffMs / 60000);
const diffHours = Math.floor(diffMs / 3600000);
const diffDays = Math.floor(diffMs / 86400000);

if (diffMins < 1) return “just now”;
if (diffMins < 60) return `${diffMins}m ago`;
if (diffHours < 24) return `${diffHours}h ago`;
if (diffDays < 7) return `${diffDays}d ago`;
return then.toLocaleDateString();
}

// Auth
auth.onAuthStateChanged((user) => {
if (!user) {
window.location.href = “login.html”;
} else {
if (ADMIN_EMAILS.includes(user.email?.toLowerCase())) {
document.getElementById(“adminNavBtn”).style.display = “inline-block”;
}
loadNotifications(user.uid);
}
});
