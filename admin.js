// admin.js - COMPLETE WITH FIXED NAVIGATION

import { initializeApp } from “https://www.gstatic.com/firebasejs/9.22.2/firebase-app.js”;
import {
getFirestore, collection, doc, getDoc, getDocs, deleteDoc, updateDoc, query, where, orderBy
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

function isAdmin(email) {
return ADMIN_EMAILS.includes(email?.toLowerCase());
}

// ═══════════════════════════════════════════════════════════
// NAVIGATION HANDLERS - FIXED
// ═══════════════════════════════════════════════════════════

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

// ═══════════════════════════════════════════════════════════
// TAB SWITCHING
// ═══════════════════════════════════════════════════════════

document.querySelectorAll(”.admin-tab”).forEach(tab => {
tab.addEventListener(“click”, () => {
const tabName = tab.dataset.tab;

```
// Update active tab
document.querySelectorAll(".admin-tab").forEach(t => t.classList.remove("active"));
tab.classList.add("active");

// Update active panel
document.querySelectorAll(".admin-panel").forEach(p => p.classList.remove("active"));
document.getElementById(`${tabName}-panel`).classList.add("active");

// Load data for the selected tab
if (tabName === "users") loadUsers();
if (tabName === "posts") loadPosts();
if (tabName === "reports") loadReports();
if (tabName === "contact") loadContactSubmissions();
```

});
});

// ═══════════════════════════════════════════════════════════
// LOAD OVERVIEW STATS
// ═══════════════════════════════════════════════════════════

async function loadOverview() {
try {
// Count users
const usersSnapshot = await getDocs(collection(db, “users”));
document.getElementById(“totalUsers”).textContent = usersSnapshot.size;

```
// Count posts
const postsSnapshot = await getDocs(collection(db, "posts"));
document.getElementById("totalPosts").textContent = postsSnapshot.size;

// Count gifts
const giftsSnapshot = await getDocs(collection(db, "gifts"));
document.getElementById("totalGifts").textContent = giftsSnapshot.size;

// Calculate total revenue
let totalRevenue = 0;
giftsSnapshot.forEach(doc => {
  totalRevenue += doc.data().amount || 0;
});
document.getElementById("totalRevenue").textContent = `$${totalRevenue.toFixed(2)}`;

// Count pending reports
const reportsQuery = query(collection(db, "reports"), where("status", "==", "pending"));
const reportsSnapshot = await getDocs(reportsQuery);
document.getElementById("pendingReports").textContent = reportsSnapshot.size;
```

} catch (error) {
console.error(“Error loading overview:”, error);
}
}

// ═══════════════════════════════════════════════════════════
// LOAD USERS
// ═══════════════════════════════════════════════════════════

async function loadUsers() {
const tbody = document.getElementById(“usersTableBody”);
tbody.innerHTML = “<tr><td colspan='5' style='text-align:center;color:#666;padding:2rem;'>Loading…</td></tr>”;

try {
const usersSnapshot = await getDocs(collection(db, “users”));
tbody.innerHTML = “”;

```
if (usersSnapshot.empty) {
  tbody.innerHTML = "<tr><td colspan='5' style='text-align:center;color:#666;padding:2rem;'>No users found</td></tr>";
  return;
}

for (const userDoc of usersSnapshot.docs) {
  const user = userDoc.data();
  const userId = userDoc.id;
  
  // Count user's posts
  const postsQuery = query(collection(db, "posts"), where("userId", "==", userId));
  const postsSnapshot = await getDocs(postsQuery);
  
  const row = document.createElement("tr");
  row.innerHTML = `
    <td>${user.username || "N/A"}</td>
    <td>${user.email || "N/A"}</td>
    <td>${user.createdAt ? new Date(user.createdAt.toMillis()).toLocaleDateString() : "N/A"}</td>
    <td>${postsSnapshot.size}</td>
    <td>
      <button class="action-btn btn-delete" onclick="deleteUser('${userId}')">🗑️ Delete</button>
    </td>
  `;
  tbody.appendChild(row);
}
```

} catch (error) {
console.error(“Error loading users:”, error);
tbody.innerHTML = “<tr><td colspan='5' style='text-align:center;color:red;padding:2rem;'>Error loading users</td></tr>”;
}
}

// ═══════════════════════════════════════════════════════════
// LOAD POSTS
// ═══════════════════════════════════════════════════════════

async function loadPosts() {
const tbody = document.getElementById(“postsTableBody”);
tbody.innerHTML = “<tr><td colspan='5' style='text-align:center;color:#666;padding:2rem;'>Loading…</td></tr>”;

try {
const postsSnapshot = await getDocs(query(collection(db, “posts”), orderBy(“createdAt”, “desc”)));
tbody.innerHTML = “”;

```
if (postsSnapshot.empty) {
  tbody.innerHTML = "<tr><td colspan='5' style='text-align:center;color:#666;padding:2rem;'>No posts found</td></tr>";
  return;
}

postsSnapshot.forEach(postDoc => {
  const post = postDoc.data();
  const postId = postDoc.id;
  
  const row = document.createElement("tr");
  row.innerHTML = `
    <td>${post.username || "Anonymous"}</td>
    <td>${(post.text || "").substring(0, 50)}${post.text?.length > 50 ? "..." : ""}</td>
    <td>${post.createdAt ? new Date(post.createdAt.toMillis()).toLocaleDateString() : "N/A"}</td>
    <td>${(post.likedBy || []).length}</td>
    <td>
      <button class="action-btn btn-delete" onclick="deletePost('${postId}')">🗑️ Delete</button>
      ${post.pinned ? 
        `<button class="action-btn" style="background:#666;" onclick="unpinPost('${postId}')">📍 Unpin</button>` :
        `<button class="action-btn btn-approve" onclick="pinPost('${postId}')">📌 Pin</button>`
      }
    </td>
  `;
  tbody.appendChild(row);
});
```

} catch (error) {
console.error(“Error loading posts:”, error);
tbody.innerHTML = “<tr><td colspan='5' style='text-align:center;color:red;padding:2rem;'>Error loading posts</td></tr>”;
}
}

// ═══════════════════════════════════════════════════════════
// LOAD REPORTS
// ═══════════════════════════════════════════════════════════

async function loadReports() {
const tbody = document.getElementById(“reportsTableBody”);
tbody.innerHTML = “<tr><td colspan='6' style='text-align:center;color:#666;padding:2rem;'>Loading…</td></tr>”;

try {
const reportsSnapshot = await getDocs(query(collection(db, “reports”), orderBy(“createdAt”, “desc”)));
tbody.innerHTML = “”;

```
if (reportsSnapshot.empty) {
  tbody.innerHTML = "<tr><td colspan='6' style='text-align:center;color:#666;padding:2rem;'>No reports found</td></tr>";
  return;
}

reportsSnapshot.forEach(reportDoc => {
  const report = reportDoc.data();
  const reportId = reportDoc.id;
  
  const row = document.createElement("tr");
  row.innerHTML = `
    <td>${report.contentType || "N/A"}</td>
    <td>${report.reason || "N/A"}</td>
    <td>${report.reporterEmail || "Anonymous"}</td>
    <td>${report.createdAt ? new Date(report.createdAt.toMillis()).toLocaleDateString() : "N/A"}</td>
    <td><span style="color:${report.status === 'pending' ? 'orange' : '#00ff00'};">${report.status || "pending"}</span></td>
    <td>
      ${report.status === 'pending' ? `<button class="action-btn btn-approve" onclick="resolveReport('${reportId}')">✅ Resolve</button>` : ""}
      <button class="action-btn btn-delete" onclick="deleteReport('${reportId}')">🗑️ Delete</button>
    </td>
  `;
  tbody.appendChild(row);
});
```

} catch (error) {
console.error(“Error loading reports:”, error);
tbody.innerHTML = “<tr><td colspan='6' style='text-align:center;color:red;padding:2rem;'>Error loading reports</td></tr>”;
}
}

// ═══════════════════════════════════════════════════════════
// LOAD CONTACT SUBMISSIONS
// ═══════════════════════════════════════════════════════════

async function loadContactSubmissions() {
const tbody = document.getElementById(“contactTableBody”);
tbody.innerHTML = “<tr><td colspan='6' style='text-align:center;color:#666;padding:2rem;'>Loading…</td></tr>”;

try {
const contactSnapshot = await getDocs(query(collection(db, “contactSubmissions”), orderBy(“createdAt”, “desc”)));
tbody.innerHTML = “”;

```
if (contactSnapshot.empty) {
  tbody.innerHTML = "<tr><td colspan='6' style='text-align:center;color:#666;padding:2rem;'>No contact submissions</td></tr>";
  return;
}

contactSnapshot.forEach(contactDoc => {
  const contact = contactDoc.data();
  const contactId = contactDoc.id;
  
  const row = document.createElement("tr");
  row.innerHTML = `
    <td>${contact.name || "N/A"}</td>
    <td>${contact.email || "N/A"}</td>
    <td>${contact.subject || "N/A"}</td>
    <td>${(contact.message || "").substring(0, 50)}...</td>
    <td>${contact.createdAt ? new Date(contact.createdAt.toMillis()).toLocaleDateString() : "N/A"}</td>
    <td>
      <button class="action-btn btn-delete" onclick="deleteContact('${contactId}')">🗑️ Delete</button>
    </td>
  `;
  tbody.appendChild(row);
});
```

} catch (error) {
console.error(“Error loading contact submissions:”, error);
tbody.innerHTML = “<tr><td colspan='6' style='text-align:center;color:red;padding:2rem;'>Error loading submissions</td></tr>”;
}
}

// ═══════════════════════════════════════════════════════════
// ACTION FUNCTIONS (accessible globally)
// ═══════════════════════════════════════════════════════════

window.deleteUser = async (userId) => {
if (!confirm(“Delete this user? This will also delete all their posts.”)) return;
try {
await deleteDoc(doc(db, “users”, userId));
loadUsers();
loadOverview();
} catch (error) {
alert(“Error deleting user: “ + error.message);
}
};

window.deletePost = async (postId) => {
if (!confirm(“Delete this post?”)) return;
try {
await deleteDoc(doc(db, “posts”, postId));
loadPosts();
loadOverview();
} catch (error) {
alert(“Error deleting post: “ + error.message);
}
};

window.pinPost = async (postId) => {
try {
await updateDoc(doc(db, “posts”, postId), { pinned: true });
loadPosts();
} catch (error) {
alert(“Error pinning post: “ + error.message);
}
};

window.unpinPost = async (postId) => {
try {
await updateDoc(doc(db, “posts”, postId), { pinned: false });
loadPosts();
} catch (error) {
alert(“Error unpinning post: “ + error.message);
}
};

window.resolveReport = async (reportId) => {
try {
await updateDoc(doc(db, “reports”, reportId), { status: “resolved” });
loadReports();
loadOverview();
} catch (error) {
alert(“Error resolving report: “ + error.message);
}
};

window.deleteReport = async (reportId) => {
if (!confirm(“Delete this report?”)) return;
try {
await deleteDoc(doc(db, “reports”, reportId));
loadReports();
loadOverview();
} catch (error) {
alert(“Error deleting report: “ + error.message);
}
};

window.deleteContact = async (contactId) => {
if (!confirm(“Delete this contact submission?”)) return;
try {
await deleteDoc(doc(db, “contactSubmissions”, contactId));
loadContactSubmissions();
} catch (error) {
alert(“Error deleting contact: “ + error.message);
}
};

// ═══════════════════════════════════════════════════════════
// SEARCH FUNCTIONALITY
// ═══════════════════════════════════════════════════════════

document.getElementById(“userSearch”)?.addEventListener(“input”, (e) => {
const searchTerm = e.target.value.toLowerCase();
const rows = document.querySelectorAll(”#usersTableBody tr”);
rows.forEach(row => {
const text = row.textContent.toLowerCase();
row.style.display = text.includes(searchTerm) ? “” : “none”;
});
});

document.getElementById(“postSearch”)?.addEventListener(“input”, (e) => {
const searchTerm = e.target.value.toLowerCase();
const rows = document.querySelectorAll(”#postsTableBody tr”);
rows.forEach(row => {
const text = row.textContent.toLowerCase();
row.style.display = text.includes(searchTerm) ? “” : “none”;
});
});

// ═══════════════════════════════════════════════════════════
// AUTH & INITIALIZATION
// ═══════════════════════════════════════════════════════════

auth.onAuthStateChanged((user) => {
if (!user) {
window.location.href = “login.html”;
} else if (!isAdmin(user.email)) {
alert(“⛔ Access Denied: Admin privileges required”);
window.location.href = “feed.html”;
} else {
loadOverview();
}
});
