// admin-panel.js - Admin Dashboard Functionality

import { initializeApp } from “https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js”;
import {
getFirestore, collection, getDocs, doc, getDoc, updateDoc, query, where, orderBy
} from “https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js”;
import { getAuth, onAuthStateChanged } from “https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js”;
import { banUser, unbanUser, reviewReport, getPendingReports } from “./spam-protection.js”;

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

let currentUser = null;
let selectedUser = null;

// Check admin access
onAuthStateChanged(auth, (user) => {
if (!user) {
window.location.href = “login.html”;
return;
}

if (!ADMIN_EMAILS.includes(user.email.toLowerCase())) {
alert(“Access denied. Admin privileges required.”);
window.location.href = “feed.html”;
return;
}

currentUser = user;
initAdmin();
});

function initAdmin() {
setupTabs();
loadReports();
loadAnalytics();
loadContactMessages();
setupUserSearch();
setupModals();
}

// Tab System
function setupTabs() {
const tabBtns = document.querySelectorAll(’.tab-btn’);
const tabContents = document.querySelectorAll(’.tab-content’);

tabBtns.forEach(btn => {
btn.addEventListener(‘click’, () => {
const tabName = btn.dataset.tab;

```
  tabBtns.forEach(b => b.classList.remove('active'));
  tabContents.forEach(c => c.classList.remove('active'));
  
  btn.classList.add('active');
  document.getElementById(`${tabName}Tab`).classList.add('active');
});
```

});
}

// Load Reports
async function loadReports() {
const container = document.getElementById(‘reportsContainer’);
container.innerHTML = ‘<p class="loading">Loading reports…</p>’;

try {
const reportsRef = collection(db, “reports”);
const q = query(reportsRef, where(“status”, “==”, “pending”), orderBy(“createdAt”, “desc”));
const snapshot = await getDocs(q);

```
if (snapshot.empty) {
  container.innerHTML = '<p class="info-text">No pending reports</p>';
  return;
}

container.innerHTML = '';
snapshot.forEach(doc => {
  const report = { id: doc.id, ...doc.data() };
  container.appendChild(createReportElement(report));
});
```

} catch (error) {
console.error(“Load reports error:”, error);
container.innerHTML = ‘<p class="info-text">Error loading reports</p>’;
}
}

function createReportElement(report) {
const div = document.createElement(‘div’);
div.className = ‘report-item’;

const createdAt = report.createdAt?.toDate().toLocaleString() || ‘Unknown’;

div.innerHTML = `<div class="report-header"> <span class="report-reason ${report.reason}">${report.reason.replace('_', ' ')}</span> <span>${createdAt}</span> </div> <div class="report-content"> <p><strong>Reported User:</strong> ${report.reportedUserId}</p> <p><strong>Content Type:</strong> ${report.contentType}</p> <p><strong>Description:</strong> ${report.description || 'No description'}</p> </div> <div class="report-actions"> <button class="ban-btn danger-btn" data-report-id="${report.id}" data-user-id="${report.reportedUserId}">Ban User</button> <button class="warn-btn warn-btn" data-report-id="${report.id}">Warn</button> <button class="dismiss-btn secondary-btn" data-report-id="${report.id}">Dismiss</button> <button class="view-btn view-btn" data-user-id="${report.reportedUserId}">View User</button> </div>`;

// Add event listeners
div.querySelector(’.ban-btn’).onclick = () => handleReportAction(report.id, ‘ban’, report.reportedUserId);
div.querySelector(’.warn-btn’).onclick = () => handleReportAction(report.id, ‘warn’, report.reportedUserId);
div.querySelector(’.dismiss-btn’).onclick = () => handleReportAction(report.id, ‘dismiss’, report.reportedUserId);
div.querySelector(’.view-btn’).onclick = () => viewUser(report.reportedUserId);

return div;
}

async function handleReportAction(reportId, action, userId) {
if (!confirm(`Are you sure you want to ${action} this report?`)) return;

try {
await reviewReport(reportId, action, currentUser.uid);

```
if (action === 'ban') {
  await banUser(userId, "Banned by admin review", 168, currentUser.uid);
}

alert(`Report ${action} successful`);
loadReports();
```

} catch (error) {
console.error(“Report action error:”, error);
alert(“Error processing report”);
}
}

// User Search
function setupUserSearch() {
document.getElementById(‘searchUserBtn’).onclick = async () => {
const searchTerm = document.getElementById(‘userSearchInput’).value.trim().toLowerCase();
if (!searchTerm) {
alert(‘Please enter a username or email’);
return;
}

```
const container = document.getElementById('userResultsContainer');
container.innerHTML = '<p class="loading">Searching...</p>';

try {
  const usersRef = collection(db, "users");
  const snapshot = await getDocs(usersRef);
  
  const results = [];
  snapshot.forEach(doc => {
    const user = { uid: doc.id, ...doc.data() };
    if (user.username?.toLowerCase().includes(searchTerm) || 
        user.email?.toLowerCase().includes(searchTerm)) {
      results.push(user);
    }
  });
  
  if (results.length === 0) {
    container.innerHTML = '<p class="info-text">No users found</p>';
    return;
  }
  
  container.innerHTML = '';
  results.forEach(user => {
    container.appendChild(createUserElement(user));
  });
} catch (error) {
  console.error("Search error:", error);
  container.innerHTML = '<p class="info-text">Error searching users</p>';
}
```

};
}

function createUserElement(user) {
const div = document.createElement(‘div’);
div.className = ‘user-item’;

const isBanned = user.banned ? true : false;

div.innerHTML = `<img src="${user.photoURL || 'default-avatar.png'}" alt="Avatar" class="user-avatar"> <div class="user-details"> <h4>${user.username || 'Unknown'}</h4> <p>${user.email || ''}</p> </div> <span class="user-badge ${isBanned ? 'banned' : 'active'}"> ${isBanned ? 'Banned' : 'Active'} </span>`;

div.onclick = () => viewUser(user.uid);
return div;
}

async function viewUser(userId) {
selectedUser = userId;

try {
const userDoc = await getDoc(doc(db, “users”, userId));
if (!userDoc.exists()) {
alert(‘User not found’);
return;
}

```
const user = userDoc.data();
const modal = document.getElementById('userDetailModal');

document.getElementById('userModalPic').src = user.photoURL || 'default-avatar.png';
document.getElementById('userModalName').textContent = user.username || 'Unknown';
document.getElementById('userModalEmail').textContent = user.email || '';
document.getElementById('userModalPosts').textContent = user.stats?.posts || 0;
document.getElementById('userModalComments').textContent = user.stats?.comments || 0;
document.getElementById('userModalViolations').textContent = user.violations?.total || 0;
document.getElementById('userModalReports').textContent = user.stats?.reportsReceived || 0;

if (user.banned) {
  document.getElementById('banUserBtn').style.display = 'none';
  document.getElementById('unbanUserBtn').style.display = 'block';
} else {
  document.getElementById('banUserBtn').style.display = 'block';
  document.getElementById('unbanUserBtn').style.display = 'none';
}

modal.style.display = 'block';
```

} catch (error) {
console.error(“View user error:”, error);
alert(‘Error loading user details’);
}
}

// Modals
function setupModals() {
document.getElementById(‘closeUserModal’).onclick = () => {
document.getElementById(‘userDetailModal’).style.display = ‘none’;
};

document.getElementById(‘banUserBtn’).onclick = () => {
document.getElementById(‘userDetailModal’).style.display = ‘none’;
document.getElementById(‘banModal’).style.display = ‘block’;
};

document.getElementById(‘unbanUserBtn’).onclick = async () => {
if (!confirm(‘Unban this user?’)) return;

```
try {
  await unbanUser(selectedUser, currentUser.uid);
  alert('User unbanned successfully');
  document.getElementById('userDetailModal').style.display = 'none';
} catch (error) {
  alert('Error unbanning user');
}
```

};

document.getElementById(‘closeBanModal’).onclick = () => {
document.getElementById(‘banModal’).style.display = ‘none’;
};

document.getElementById(‘cancelBanBtn’).onclick = () => {
document.getElementById(‘banModal’).style.display = ‘none’;
};

document.getElementById(‘confirmBanBtn’).onclick = async () => {
const reason = document.getElementById(‘banReason’).value.trim();
const duration = document.getElementById(‘banDuration’).value;

```
if (!reason) {
  alert('Please provide a ban reason');
  return;
}

try {
  const hours = duration === 'null' ? null : parseInt(duration);
  await banUser(selectedUser, reason, hours, currentUser.uid);
  alert('User banned successfully');
  document.getElementById('banModal').style.display = 'none';
  document.getElementById('banReason').value = '';
} catch (error) {
  alert('Error banning user');
}
```

};

document.getElementById(‘viewUserProfileBtn’).onclick = () => {
window.location.href = `profile.html?uid=${selectedUser}`;
};
}

// Analytics
async function loadAnalytics() {
try {
const usersSnap = await getDocs(collection(db, “users”));
const postsSnap = await getDocs(collection(db, “posts”));

```
document.getElementById('totalUsers').textContent = usersSnap.size;
document.getElementById('totalPosts').textContent = postsSnap.size;

let bannedCount = 0;
usersSnap.forEach(doc => {
  if (doc.data().banned) bannedCount++;
});
document.getElementById('bannedUsers').textContent = bannedCount;
```

} catch (error) {
console.error(“Analytics error:”, error);
}
}

// Contact Messages
async function loadContactMessages() {
const container = document.getElementById(‘contactMessagesContainer’);

try {
const messagesRef = collection(db, “contactMessages”);
const snapshot = await getDocs(query(messagesRef, orderBy(“createdAt”, “desc”)));

```
if (snapshot.empty) {
  container.innerHTML = '<p class="info-text">No contact messages</p>';
  return;
}

container.innerHTML = '';
snapshot.forEach(doc => {
  const msg = doc.data();
  const div = document.createElement('div');
  div.className = 'contact-item';
  div.innerHTML = `
    <p><strong>${msg.name}</strong> (${msg.email})</p>
    <p>${msg.message}</p>
    <small>${msg.createdAt?.toDate().toLocaleString() || ''}</small>
  `;
  container.appendChild(div);
});
```

} catch (error) {
console.error(“Contact messages error:”, error);
container.innerHTML = ‘<p class="info-text">Error loading messages</p>’;
}
}
