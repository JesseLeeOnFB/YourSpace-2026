// admin.js - Admin Panel

import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-app.js";
import {
  getFirestore, collection, getDocs, doc, getDoc, deleteDoc, updateDoc, query, where, orderBy, limit
} from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js";

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

const ADMIN_EMAILS = [
  "skeeterjeeter8@gmail.com",
  "daniellehunt01@gmail.com"
];

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

document.getElementById("dashboardNavBtn")?.addEventListener("click", () => {
  window.location.href = "dashboard.html";
});

document.getElementById("adminNavBtn")?.addEventListener("click", () => {
  window.location.href = "admin.html";
});

document.getElementById("logoutBtn")?.addEventListener("click", async () => {
  await auth.signOut();
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

// Tab switching
document.querySelectorAll(".tab-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    const tabName = btn.getAttribute("data-tab");
    
    // Remove active class from all tabs and contents
    document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
    document.querySelectorAll(".tab-content").forEach(c => c.classList.remove("active"));
    
    // Add active class to clicked tab and corresponding content
    btn.classList.add("active");
    document.getElementById(tabName).classList.add("active");
  });
});

async function loadOverview() {
  // Total users
  const usersSnapshot = await getDocs(collection(db, "users"));
  document.getElementById("totalUsers").textContent = usersSnapshot.size;
  
  // Total posts
  const postsSnapshot = await getDocs(collection(db, "posts"));
  document.getElementById("totalPosts").textContent = postsSnapshot.size;
  
  // Total reports
  const reportsSnapshot = await getDocs(collection(db, "reports"));
  document.getElementById("totalReports").textContent = reportsSnapshot.size;
  
  // Active today (users who logged in today)
  const today = new Date().toDateString();
  let activeToday = 0;
  usersSnapshot.forEach(docSnap => {
    const user = docSnap.data();
    if (user.lastLoginDate === today) {
      activeToday++;
    }
  });
  document.getElementById("activeToday").textContent = activeToday;
  
  // Recent activity
  const recentActivityList = document.getElementById("recentActivityList");
  recentActivityList.innerHTML = "";
  
  const recentPosts = [];
  postsSnapshot.forEach(docSnap => {
    const post = docSnap.data();
    if (post.createdAt) {
      recentPosts.push({ ...post, id: docSnap.id });
    }
  });
  
  recentPosts.sort((a, b) => b.createdAt.toMillis() - a.createdAt.toMillis());
  recentPosts.slice(0, 10).forEach(post => {
    const activityEl = document.createElement("div");
    activityEl.className = "activity-item";
    const time = new Date(post.createdAt.toMillis()).toLocaleString();
    activityEl.textContent = `${post.username} posted: "${post.text?.substring(0, 50)}..." (${time})`;
    recentActivityList.appendChild(activityEl);
  });
}

async function loadUsers() {
  const usersSnapshot = await getDocs(collection(db, "users"));
  const usersList = document.getElementById("usersList");
  usersList.innerHTML = "";
  
  usersSnapshot.forEach(docSnap => {
    const user = docSnap.data();
    const userEl = document.createElement("div");
    userEl.className = "user-item";
    userEl.innerHTML = `
      <div>
        <strong>${user.username || "Unknown"}</strong>
        <div style="font-size: 0.9rem; color: #aaa;">${user.email || docSnap.id}</div>
      </div>
      <div class="action-buttons">
        <button class="delete-btn" onclick="deleteUser('${docSnap.id}')">Delete User</button>
      </div>
    `;
    usersList.appendChild(userEl);
  });
}

async function loadReports() {
  const reportsSnapshot = await getDocs(collection(db, "reports"));
  const reportsList = document.getElementById("reportsList");
  reportsList.innerHTML = "";
  
  if (reportsSnapshot.empty) {
    reportsList.innerHTML = "<p style='text-align:center; color:#aaa; padding:2rem;'>No reports yet!</p>";
    return;
  }
  
  for (const docSnap of reportsSnapshot.docs) {
    const report = docSnap.data();
    const reportEl = document.createElement("div");
    reportEl.className = "report-item";
    
    // Get reporter name
    const reporterDoc = await getDoc(doc(db, "users", report.reporterId));
    const reporterName = reporterDoc.data()?.username || "Unknown";
    
    reportEl.innerHTML = `
      <div>
        <strong>Report by ${reporterName}</strong>
        <div style="margin: 0.5rem 0;">Reason: ${report.reason}</div>
        <div style="font-size: 0.9rem; color: #aaa;">Post ID: ${report.postId}</div>
      </div>
      <div class="action-buttons">
        <button class="approve-btn" onclick="deleteReport('${docSnap.id}')">Dismiss</button>
        <button class="delete-btn" onclick="deleteReportedPost('${report.postId}', '${docSnap.id}')">Delete Post</button>
      </div>
    `;
    reportsList.appendChild(reportEl);
  }
}

async function loadAdminPosts() {
  const postsSnapshot = await getDocs(query(collection(db, "posts"), orderBy("createdAt", "desc")));
  const adminPostsList = document.getElementById("adminPostsList");
  adminPostsList.innerHTML = "";
  
  postsSnapshot.forEach(docSnap => {
    const post = docSnap.data();
    const postEl = document.createElement("div");
    postEl.className = "admin-post-item";
    postEl.innerHTML = `
      <div>
        <strong>${post.username}</strong>
        <div>${post.text?.substring(0, 100) || "Post with media"}...</div>
        <div style="font-size: 0.9rem; color: #aaa; margin-top: 0.3rem;">
          👍 ${(post.likedBy || []).length} | 🖕 ${(post.dislikedBy || []).length} | ${post.pinned ? "📌 Pinned" : ""}
        </div>
      </div>
      <div class="action-buttons">
        ${post.pinned ? 
          `<button class="approve-btn" onclick="unpinPost('${docSnap.id}')">Unpin</button>` : 
          `<button class="approve-btn" onclick="pinPost('${docSnap.id}')">Pin</button>`
        }
        <button class="delete-btn" onclick="deleteAdminPost('${docSnap.id}')">Delete</button>
      </div>
    `;
    adminPostsList.appendChild(postEl);
  });
}

// Global functions for buttons
window.deleteUser = async (userId) => {
  if (confirm("Delete this user? This will NOT delete their posts.")) {
    try {
      await deleteDoc(doc(db, "users", userId));
      alert("User deleted");
      loadUsers();
    } catch (err) {
      alert("Error: " + err.message);
    }
  }
};

window.deleteReport = async (reportId) => {
  try {
    await deleteDoc(doc(db, "reports", reportId));
    loadReports();
  } catch (err) {
    alert("Error: " + err.message);
  }
};

window.deleteReportedPost = async (postId, reportId) => {
  if (confirm("Delete this reported post?")) {
    try {
      await deleteDoc(doc(db, "posts", postId));
      await deleteDoc(doc(db, "reports", reportId));
      alert("Post deleted");
      loadReports();
    } catch (err) {
      alert("Error: " + err.message);
    }
  }
};

window.deleteAdminPost = async (postId) => {
  if (confirm("Delete this post?")) {
    try {
      await deleteDoc(doc(db, "posts", postId));
      loadAdminPosts();
    } catch (err) {
      alert("Error: " + err.message);
    }
  }
};

window.pinPost = async (postId) => {
  try {
    await updateDoc(doc(db, "posts", postId), { pinned: true });
    loadAdminPosts();
  } catch (err) {
    alert("Error: " + err.message);
  }
};

window.unpinPost = async (postId) => {
  try {
    await updateDoc(doc(db, "posts", postId), { pinned: false });
    loadAdminPosts();
  } catch (err) {
    alert("Error: " + err.message);
  }
};

// Refresh button
document.getElementById("refreshPostsBtn")?.addEventListener("click", () => {
  loadAdminPosts();
});

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "login.html";
    return;
  }
  
  // Check if user is admin
  if (!isAdmin(user.email)) {
    alert("Access denied. Admin only.");
    window.location.href = "feed.html";
    return;
  }
  
  // Load admin name
  const userDoc = await getDoc(doc(db, "users", user.uid));
  const userData = userDoc.data();
  document.getElementById("adminName").textContent = userData?.username || user.email.split("@")[0];
  
  // Load all sections
  await loadOverview();
  await loadUsers();
  await loadReports();
  await loadAdminPosts();
});
