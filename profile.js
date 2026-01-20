// profile.js - COMPLETE BETA VERSION with all safety features

import { initializeApp } from “https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js”;
import {
getFirestore, doc, getDoc, updateDoc, collection, query, where, getDocs,
setDoc, onSnapshot, orderBy, serverTimestamp, addDoc, deleteDoc
} from “https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js”;
import { getAuth, onAuthStateChanged } from “https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js”;
import { getStorage, ref, uploadBytesResumable, getDownloadURL } from “https://www.gstatic.com/firebasejs/9.23.0/firebase-storage.js”;

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
const storage = getStorage(app);

const ADMIN_EMAILS = [“skeeterjeeter8@gmail.com”, “daniellehunt01@gmail.com”];

let currentUser;
let viewingUserId;
let isOwnProfile = true;

const urlParams = new URLSearchParams(window.location.search);
viewingUserId = urlParams.get(‘userId’);

// Check if user is admin
function isAdmin(email) {
return ADMIN_EMAILS.includes(email?.toLowerCase());
}

// AUTH STATE
onAuthStateChanged(auth, user => {
if (!user) {
window.location.href = “login.html”;
} else {
currentUser = user;
if (!viewingUserId) {
viewingUserId = user.uid;
isOwnProfile = true;
} else {
isOwnProfile = (viewingUserId === user.uid);
}

```
// Show admin button if user is admin
if (isAdmin(user.email)) {
  document.getElementById("adminBtn").style.display = "inline-block";
}

initProfile();
```

}
});

document.getElementById(“logoutBtn”).onclick = async () => {
await auth.signOut();
window.location.href = “login.html”;
};

async function initProfile() {
await loadProfile();
setupThemeControls();
setupMusicPlayer();
setupTopFriends();
setupCommentsWall();
setupProfilePictureUpload();
setupEditProfile();
setupCustomHtml();
setupResetProfile();

if (!isOwnProfile) {
document.getElementById(“editProfileBtn”).style.display = “none”;
document.getElementById(“sendMessageBtn”).style.display = “inline-block”;
document.getElementById(“customHtmlSection”).style.display = “none”;
document.getElementById(“resetProfileBtn”).style.display = “none”;
document.getElementById(“searchFriendBtn”).style.display = “none”;
document.getElementById(“searchFriendInput”).style.display = “none”;
document.getElementById(“themeSelect”).disabled = true;
document.getElementById(“applyThemeBtn”).disabled = true;
document.getElementById(“resetThemeBtn”).disabled = true;
document.querySelectorAll(”.music-input”).forEach(input => input.disabled = true);
document.querySelectorAll(”.add-music-btn”).forEach(btn => btn.disabled = true);
}
}

async function loadProfile() {
const userDoc = await getDoc(doc(db, “users”, viewingUserId));
if (!userDoc.exists()) {
const defaultUsername = currentUser.email.split(”@”)[0];
await setDoc(doc(db, “users”, viewingUserId), {
username: defaultUsername,
photoURL: “default-avatar.png”,
bio: “”,
location: “”,
theme: “default-theme”,
music: [””, “”, “”, “”],
autoplay: true,
topFriends: [],
customHtml: “”
});
return loadProfile();
}

const data = userDoc.data();
const username = data.username || currentUser.email.split(”@”)[0];

document.getElementById(“displayName”).textContent = username;
document.getElementById(“location”).textContent = data.location || “📍 No location set”;
document.getElementById(“bio”).textContent = data.bio || “No bio yet…”;
document.getElementById(“profilePic”).src = data.photoURL || “default-avatar.png”;

const theme = data.theme || “default-theme”;
document.body.className = theme;
document.getElementById(“themeSelect”).value = theme;

if (data.customHtml) {
applyCustomHtml(data.customHtml);
}

const musicInputs = document.querySelectorAll(”.music-input”);
const music = data.music || [””, “”, “”, “”];
music.forEach((url, index) => {
if (musicInputs[index]) {
musicInputs[index].value = url;
}
});

document.getElementById(“autoplayToggle”).checked = data.autoplay !== false;

if (isOwnProfile) {
document.getElementById(“usernameInput”).value = username;
document.getElementById(“locationInput”).value = data.location || “”;
document.getElementById(“bioInput”).value = data.bio || “”;
}
}

// =================================================================
// RESET PROFILE FUNCTIONALITY - CRITICAL SAFETY FEATURE
// =================================================================

function setupResetProfile() {
document.getElementById(“resetProfileBtn”).onclick = async () => {
const confirmed = confirm(
“⚠️ WARNING: This will reset your profile to default settings!\n\n” +
“This will:\n” +
“• Remove all custom HTML/CSS\n” +
“• Reset theme to default\n” +
“• Clear custom styling\n\n” +
“Your posts, comments, and friends will NOT be affected.\n\n” +
“Continue?”
);

```
if (!confirmed) return;

try {
  // Reset to default settings
  await updateDoc(doc(db, "users", currentUser.uid), {
    theme: "default-theme",
    customHtml: ""
  });
  
  // Clear custom HTML from DOM
  const customDiv = document.getElementById("customProfileStyles");
  if (customDiv) customDiv.remove();
  
  // Reset theme
  document.body.className = "default-theme";
  document.getElementById("themeSelect").value = "default-theme";
  document.getElementById("customHtmlInput").value = "";
  
  alert("✅ Profile reset to default successfully!");
  location.reload();
} catch (error) {
  console.error("Reset error:", error);
  alert("Error resetting profile. Please try again.");
}
```

};
}

// =================================================================
// THEME CONTROLS
// =================================================================

function setupThemeControls() {
document.getElementById(“applyThemeBtn”).onclick = async () => {
const theme = document.getElementById(“themeSelect”).value;
document.body.className = theme;
await updateDoc(doc(db, “users”, currentUser.uid), { theme });
alert(“Theme applied!”);
};

document.getElementById(“resetThemeBtn”).onclick = async () => {
document.body.className = “default-theme”;
document.getElementById(“themeSelect”).value = “default-theme”;
await updateDoc(doc(db, “users”, currentUser.uid), { theme: “default-theme” });
alert(“Theme reset to default!”);
};
}

// =================================================================
// CUSTOM HTML/CSS - WITH SAFE PREVIEW
// =================================================================

function setupCustomHtml() {
// Preview button
document.getElementById(“previewCustomHtmlBtn”).onclick = () => {
const html = document.getElementById(“customHtmlInput”).value.trim();

```
if (!html) {
  alert("No code to preview!");
  return;
}

// Show preview modal
const previewDiv = document.getElementById("customHtmlPreview");
previewDiv.innerHTML = `
  <div class="preview-modal">
    <h4>👁️ Preview</h4>
    <p class="preview-warning">This is how your code will look. If it looks good, click "Save & Apply".</p>
    <div class="preview-content">${html}</div>
    <button id="closePreview" class="secondary-btn">Close Preview</button>
  </div>
`;

document.getElementById("closePreview").onclick = () => {
  previewDiv.innerHTML = "";
};
```

};

// Save button
document.getElementById(“saveCustomHtmlBtn”).onclick = async () => {
const html = document.getElementById(“customHtmlInput”).value.trim();

```
const confirmed = confirm(
  "Apply this custom HTML/CSS?\n\n" +
  "Tip: If something breaks, use the Reset Profile button to restore defaults."
);

if (!confirmed) return;

try {
  await updateDoc(doc(db, "users", currentUser.uid), { customHtml: html });
  applyCustomHtml(html);
  alert("✅ Custom HTML/CSS applied successfully!");
} catch (error) {
  console.error("Custom HTML error:", error);
  alert("Error applying custom HTML. Please check your code.");
}
```

};

// Clear button
document.getElementById(“clearCustomHtmlBtn”).onclick = async () => {
const confirmed = confirm(“Clear all custom HTML/CSS?”);
if (!confirmed) return;

```
try {
  await updateDoc(doc(db, "users", currentUser.uid), { customHtml: "" });
  
  const customDiv = document.getElementById("customProfileStyles");
  if (customDiv) customDiv.remove();
  
  document.getElementById("customHtmlInput").value = "";
  alert("✅ Custom HTML/CSS cleared!");
} catch (error) {
  console.error("Clear error:", error);
  alert("Error clearing custom HTML.");
}
```

};
}

function applyCustomHtml(html) {
let customDiv = document.getElementById(“customProfileStyles”);
if (!customDiv) {
customDiv = document.createElement(“div”);
customDiv.id = “customProfileStyles”;
document.body.appendChild(customDiv);
}

customDiv.innerHTML = html;

const scripts = customDiv.querySelectorAll(“script”);
scripts.forEach(oldScript => {
const newScript = document.createElement(“script”);
Array.from(oldScript.attributes).forEach(attr => {
newScript.setAttribute(attr.name, attr.value);
});
newScript.textContent = oldScript.textContent;
oldScript.parentNode.replaceChild(newScript, oldScript);
});
}

// =================================================================
// EDIT PROFILE - WITH USERNAME UNIQUENESS CHECK
// =================================================================

function setupEditProfile() {
const modal = document.getElementById(“editProfileModal”);
const closeBtn = modal.querySelector(”.close-modal”);

document.getElementById(“editProfileBtn”).onclick = () => {
modal.style.display = “block”;
};

closeBtn.onclick = () => {
modal.style.display = “none”;
};

window.onclick = (e) => {
if (e.target === modal) modal.style.display = “none”;
};

document.getElementById(“saveProfileBtn”).onclick = async () => {
const username = document.getElementById(“usernameInput”).value.trim();
const location = document.getElementById(“locationInput”).value.trim();
const bio = document.getElementById(“bioInput”).value.trim();
const errorDiv = document.getElementById(“usernameError”);

```
errorDiv.textContent = "";

if (!username) {
  errorDiv.textContent = "Username is required";
  return;
}

if (username.length < 3) {
  errorDiv.textContent = "Username must be at least 3 characters";
  return;
}

if (username.length > 20) {
  errorDiv.textContent = "Username must be 20 characters or less";
  return;
}

// Check username uniqueness
try {
  const currentUserDoc = await getDoc(doc(db, "users", currentUser.uid));
  const currentUsername = currentUserDoc.data().username;
  
  // If username changed, check if new one is available
  if (username.toLowerCase() !== currentUsername.toLowerCase()) {
    const usernameQuery = query(
      collection(db, "users"),
      where("username", "==", username.toLowerCase())
    );
    
    const snapshot = await getDocs(usernameQuery);
    if (!snapshot.empty) {
      errorDiv.textContent = "This username is already taken. Please choose another.";
      return;
    }
  }
  
  // Save changes
  await updateDoc(doc(db, "users", currentUser.uid), {
    username: username.toLowerCase(),
    location,
    bio
  });
  
  document.getElementById("displayName").textContent = username;
  document.getElementById("location").textContent = location || "📍 No location set";
  document.getElementById("bio").textContent = bio || "No bio yet...";
  
  modal.style.display = "none";
  alert("Profile updated successfully!");
  
} catch (error) {
  console.error("Save profile error:", error);
  errorDiv.textContent = "Error saving profile. Please try again.";
}
```

};
}

// =================================================================
// PROFILE PICTURE UPLOAD
// =================================================================

function setupProfilePictureUpload() {
document.getElementById(“changePfpBtn”).onclick = () => {
document.getElementById(“profilePicInput”).click();
};

document.getElementById(“profilePicInput”).onchange = async (e) => {
const file = e.target.files[0];
if (!file) return;

```
if (!file.type.startsWith("image/")) {
  alert("Please select an image file");
  return;
}

try {
  const storageRef = ref(storage, `profilePictures/${currentUser.uid}/${Date.now()}_${file.name}`);
  const uploadTask = uploadBytesResumable(storageRef, file);
  
  uploadTask.on("state_changed",
    (snapshot) => {
      const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
      console.log("Upload progress:", progress + "%");
    },
    (error) => {
      console.error("Upload error:", error);
      alert("Error uploading picture");
    },
    async () => {
      const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
      await updateDoc(doc(db, "users", currentUser.uid), { photoURL: downloadURL });
      document.getElementById("profilePic").src = downloadURL;
      alert("Profile picture updated!");
    }
  );
} catch (error) {
  console.error("Upload error:", error);
  alert("Error uploading picture");
}
```

};
}

// =================================================================
// MUSIC PLAYER
// =================================================================

function setupMusicPlayer() {
document.querySelectorAll(”.add-music-btn”).forEach(btn => {
btn.onclick = async () => {
const slot = parseInt(btn.dataset.slot);
const input = document.querySelector(`.music-input[data-slot="${slot}"]`);
const url = input.value.trim();

```
  if (!url) {
    alert("Please enter a music URL");
    return;
  }
  
  try {
    const userDoc = await getDoc(doc(db, "users", currentUser.uid));
    const music = userDoc.data().music || ["", "", "", ""];
    music[slot] = url;
    
    await updateDoc(doc(db, "users", currentUser.uid), { music });
    alert("Music added!");
  } catch (error) {
    console.error("Music error:", error);
    alert("Error adding music");
  }
};
```

});

document.getElementById(“autoplayToggle”).onchange = async (e) => {
await updateDoc(doc(db, “users”, currentUser.uid), { autoplay: e.target.checked });
};
}

// =================================================================
// TOP FRIENDS
// =================================================================

function setupTopFriends() {
document.getElementById(“searchFriendBtn”).onclick = async () => {
const searchTerm = document.getElementById(“searchFriendInput”).value.trim().toLowerCase();
if (!searchTerm) return;

```
const usersRef = collection(db, "users");
const q = query(usersRef, where("username", "==", searchTerm));
const snapshot = await getDocs(q);

const resultsDiv = document.getElementById("searchResults");
resultsDiv.innerHTML = "";

if (snapshot.empty) {
  resultsDiv.innerHTML = "<p>No users found</p>";
  return;
}

snapshot.forEach(doc => {
  const user = doc.data();
  const userId = doc.id;
  
  if (userId === currentUser.uid) return;
  
  const resultEl = document.createElement("div");
  resultEl.className = "search-result";
  resultEl.innerHTML = `
    <img src="${user.photoURL || 'default-avatar.png'}" alt="${user.username}">
    <span>${user.username}</span>
    <button class="add-friend-btn" data-user-id="${userId}">Add</button>
  `;
  
  resultEl.querySelector(".add-friend-btn").onclick = () => addFriend(userId, user);
  resultsDiv.appendChild(resultEl);
});
```

};

loadTopFriends();
}

async function loadTopFriends() {
const userDoc = await getDoc(doc(db, “users”, viewingUserId));
const topFriends = userDoc.data().topFriends || [];

const container = document.getElementById(“topFriendsContainer”);
container.innerHTML = “”;

for (const friendId of topFriends) {
const friendDoc = await getDoc(doc(db, “users”, friendId));
if (!friendDoc.exists()) continue;

```
const friend = friendDoc.data();
const friendEl = document.createElement("div");
friendEl.className = "friend-item";
friendEl.innerHTML = `
  <img src="${friend.photoURL || 'default-avatar.png'}" alt="${friend.username}">
  <p>${friend.username}</p>
  ${isOwnProfile ? `<button class="remove-friend-btn" data-friend-id="${friendId}">Remove</button>` : ''}
`;

if (isOwnProfile) {
  friendEl.querySelector(".remove-friend-btn").onclick = () => removeFriend(friendId);
}

container.appendChild(friendEl);
```

}

if (isOwnProfile && topFriends.length > 0) {
new Sortable(container, {
animation: 150,
onEnd: async () => {
const newOrder = Array.from(container.querySelectorAll(”.friend-item”))
.map(el => el.querySelector(”.remove-friend-btn”).dataset.friendId);

```
    await updateDoc(doc(db, "users", currentUser.uid), { topFriends: newOrder });
  }
});
```

}
}

async function addFriend(userId, user) {
const userDoc = await getDoc(doc(db, “users”, currentUser.uid));
const topFriends = userDoc.data().topFriends || [];

if (topFriends.length >= 10) {
alert(“You can only have 10 top friends!”);
return;
}

if (topFriends.includes(userId)) {
alert(“Already in your top friends!”);
return;
}

topFriends.push(userId);
await updateDoc(doc(db, “users”, currentUser.uid), { topFriends });
loadTopFriends();
alert(`${user.username} added to top friends!`);
}

async function removeFriend(friendId) {
const userDoc = await getDoc(doc(db, “users”, currentUser.uid));
const topFriends = userDoc.data().topFriends || [];

const newFriends = topFriends.filter(id => id !== friendId);
await updateDoc(doc(db, “users”, currentUser.uid), { topFriends: newFriends });
loadTopFriends();
}

// =================================================================
// WALL COMMENTS
// =================================================================

function setupCommentsWall() {
loadWallComments();

document.getElementById(“addCommentBtn”).onclick = async () => {
const text = document.getElementById(“commentInput”).value.trim();
if (!text) {
alert(“Please enter a comment”);
return;
}

```
try {
  await addDoc(collection(db, "wallComments"), {
    profileUserId: viewingUserId,
    commenterUserId: currentUser.uid,
    commenterEmail: currentUser.email,
    text,
    timestamp: serverTimestamp()
  });
  
  document.getElementById("commentInput").value = "";
} catch (error) {
  console.error("Comment error:", error);
  alert("Error posting comment");
}
```

};
}

function loadWallComments() {
const q = query(
collection(db, “wallComments”),
where(“profileUserId”, “==”, viewingUserId),
orderBy(“timestamp”, “desc”)
);

onSnapshot(q, async (snapshot) => {
const container = document.getElementById(“wallCommentsContainer”);
container.innerHTML = “”;

```
if (snapshot.empty) {
  container.innerHTML = "<p class='no-comments'>No comments yet. Be the first to comment!</p>";
  return;
}

for (const docSnap of snapshot.docs) {
  const comment = docSnap.data();
  const commentId = docSnap.id;
  
  const commenterDoc = await getDoc(doc(db, "users", comment.commenterUserId));
  const commenterUsername = commenterDoc.exists() 
    ? commenterDoc.data().username 
    : comment.commenterEmail.split("@")[0];
  
  const commentEl = document.createElement("div");
  commentEl.className = "wall-comment";
  commentEl.innerHTML = `
    <div class="comment-header">
      <strong><a href="profile.html?userId=${comment.commenterUserId}" class="username-link">${commenterUsername}</a></strong>
      <span class="comment-time">${comment.timestamp?.toDate().toLocaleString() || 'Just now'}</span>
    </div>
    <p>${comment.text}</p>
    ${(comment.commenterUserId === currentUser.uid || isAdmin(currentUser.email)) 
      ? `<button class="delete-comment-btn" data-comment-id="${commentId}">Delete</button>` 
      : ''}
  `;
  
  const deleteBtn = commentEl.querySelector(".delete-comment-btn");
  if (deleteBtn) {
    deleteBtn.onclick = async () => {
      if (confirm("Delete this comment?")) {
        try {
          await deleteDoc(doc(db, "wallComments", commentId));
        } catch (error) {
          console.error("Delete error:", error);
          alert("Error deleting comment");
        }
      }
    };
  }
  
  container.appendChild(commentEl);
}
```

});
}

// =================================================================
// EMERGENCY RESET FUNCTION
// =================================================================

function setupEmergencyReset() {
document.getElementById(“emergencyResetBtn”).onclick = async () => {
if (!confirm(“This will reset your profile to default theme and remove all custom HTML/CSS. Continue?”)) {
return;
}

```
try {
  // Reset to default theme
  document.body.className = "default-theme";
  
  // Clear custom HTML
  const customStylesDiv = document.getElementById("customProfileStyles");
  if (customStylesDiv) {
    customStylesDiv.remove();
  }
  
  // Update Firestore
  await updateDoc(doc(db, "users", currentUser.uid), {
    theme: "default-theme",
    customHtml: ""
  });
  
  // Clear input
  document.getElementById("customHtmlInput").value = "";
  
  alert("✅ Profile reset to default! Your profile is now safe.");
  window.location.reload();
  
} catch (error) {
  console.error("Reset error:", error);
  alert("Error resetting profile. Please try again.");
}
```

};

// Also add reset theme button
document.getElementById(“resetThemeBtn”)?.addEventListener(“click”, async () => {
if (!confirm(“Reset to default theme?”)) return;

```
try {
  document.body.className = "default-theme";
  await updateDoc(doc(db, "users", currentUser.uid), { theme: "default-theme" });
  document.getElementById("themeSelect").value = "default-theme";
  alert("Theme reset to default!");
} catch (error) {
  console.error("Reset error:", error);
}
```

});
}

// =================================================================
// ENHANCED CUSTOM HTML WITH PREVIEW
// =================================================================

function setupCustomHtml() {
const input = document.getElementById(“customHtmlInput”);
const previewBtn = document.getElementById(“previewCustomHtmlBtn”);
const saveBtn = document.getElementById(“saveCustomHtmlBtn”);
const clearBtn = document.getElementById(“clearCustomHtmlBtn”);

// Preview functionality
previewBtn?.addEventListener(“click”, () => {
const html = input.value.trim();

```
if (!html) {
  alert("No custom HTML to preview");
  return;
}

// Remove existing preview
const existingPreview = document.getElementById("customProfileStyles");
if (existingPreview) {
  existingPreview.remove();
}

// Create preview
const previewDiv = document.createElement("div");
previewDiv.id = "customProfileStyles";
previewDiv.innerHTML = html;
document.body.appendChild(previewDiv);

// Execute scripts in preview
const scripts = previewDiv.querySelectorAll("script");
scripts.forEach(script => {
  const newScript = document.createElement("script");
  newScript.textContent = script.textContent;
  document.body.appendChild(newScript);
});

alert("✅ Preview applied! Check your profile.\n\nTo save permanently, click 'Save & Apply'.\nTo remove, click 'Clear All' or refresh page.");
```

});

// Save functionality
saveBtn?.addEventListener(“click”, async () => {
const html = input.value.trim();

```
if (!html) {
  alert("No custom HTML to save");
  return;
}

if (!confirm("Save and apply this custom HTML/CSS?\n\nMake sure you've previewed it first!")) {
  return;
}

try {
  await updateDoc(doc(db, "users", currentUser.uid), {
    customHtml: html
  });
  
  // Apply it
  const existingDiv = document.getElementById("customProfileStyles");
  if (existingDiv) {
    existingDiv.remove();
  }
  
  const div = document.createElement("div");
  div.id = "customProfileStyles";
  div.innerHTML = html;
  document.body.appendChild(div);
  
  const scripts = div.querySelectorAll("script");
  scripts.forEach(script => {
    const newScript = document.createElement("script");
    newScript.textContent = script.textContent;
    document.body.appendChild(newScript);
  });
  
  alert("✅ Custom HTML saved and applied!");
  
} catch (error) {
  console.error("Save error:", error);
  alert("Error saving custom HTML");
}
```

});

// Clear functionality
clearBtn?.addEventListener(“click”, async () => {
if (!confirm(“This will remove ALL custom HTML/CSS. Continue?”)) {
return;
}

```
try {
  await updateDoc(doc(db, "users", currentUser.uid), {
    customHtml: ""
  });
  
  input.value = "";
  
  const existingDiv = document.getElementById("customProfileStyles");
  if (existingDiv) {
    existingDiv.remove();
  }
  
  alert("✅ Custom HTML cleared! Refresh page to see default profile.");
  window.location.reload();
  
} catch (error) {
  console.error("Clear error:", error);
  alert("Error clearing custom HTML");
}
```

});
}

// =================================================================
// USERNAME UNIQUENESS CHECK (on profile edit)
// =================================================================

async function checkUsernameUnique(username, currentUserId) {
const usersRef = collection(db, “users”);
const q = query(usersRef, where(“username”, “==”, username.toLowerCase()));
const snapshot = await getDocs(q);

// Check if username exists for someone else
for (const doc of snapshot.docs) {
if (doc.id !== currentUserId) {
return false; // Username taken by someone else
}
}

return true; // Username available
}

function setupEditProfile() {
const editBtn = document.getElementById(“editProfileBtn”);
const modal = document.getElementById(“editProfileModal”);
const closeBtn = modal?.querySelector(”.close-modal”);
const saveBtn = document.getElementById(“saveProfileBtn”);

editBtn?.addEventListener(“click”, async () => {
const userDoc = await getDoc(doc(db, “users”, currentUser.uid));
const data = userDoc.data();

```
document.getElementById("usernameInput").value = data.username || "";
document.getElementById("locationInput").value = data.location || "";
document.getElementById("bioInput").value = data.bio || "";

modal.style.display = "block";
```

});

closeBtn?.addEventListener(“click”, () => {
modal.style.display = “none”;
});

saveBtn?.addEventListener(“click”, async () => {
const newUsername = document.getElementById(“usernameInput”).value.trim();
const newLocation = document.getElementById(“locationInput”).value.trim();
const newBio = document.getElementById(“bioInput”).value.trim();

```
if (!newUsername) {
  alert("Username cannot be empty");
  return;
}

if (newUsername.length < 3) {
  alert("Username must be at least 3 characters");
  return;
}

if (newUsername.length > 20) {
  alert("Username must be 20 characters or less");
  return;
}

// CHECK USERNAME UNIQUENESS
try {
  const isUnique = await checkUsernameUnique(newUsername, currentUser.uid);
  
  if (!isUnique) {
    alert("⚠️ This username is already taken. Please choose another.");
    return;
  }
  
  await updateDoc(doc(db, "users", currentUser.uid), {
    username: newUsername.toLowerCase(),
    location: newLocation,
    bio: newBio
  });
  
  alert("✅ Profile updated!");
  modal.style.display = "none";
  loadProfile();
  
} catch (error) {
  console.error("Update error:", error);
  alert("Error updating profile");
}
```

});
}

// Admin check helper
function isAdmin(email) {
const adminEmails = [“skeeterjeeter8@gmail.com”, “daniellehunt01@gmail.com”];
return adminEmails.includes(email?.toLowerCase());
}
