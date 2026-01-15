// ----------------------------
// PROFILE.JS
// ----------------------------

import { 
  getFirestore, doc, getDoc, setDoc, updateDoc, arrayUnion 
} from "https://www.gstatic.com/firebasejs/10.1.0/firebase-firestore.js";
import { 
  getAuth, onAuthStateChanged 
} from "https://www.gstatic.com/firebasejs/10.1.0/firebase-auth.js";
import { 
  getStorage, ref, uploadBytes, getDownloadURL 
} from "https://www.gstatic.com/firebasejs/10.1.0/firebase-storage.js";

const db = getFirestore();
const auth = getAuth();
const storage = getStorage();

let currentUserUID = null;

// ----------------------------
// Auth Listener
// ----------------------------
onAuthStateChanged(auth, async user => {
  if (user) {
    currentUserUID = user.uid;
    await loadUserProfile(user.uid);
  }
});

// ----------------------------
// Load Profile Info
// ----------------------------
async function loadUserProfile(uid) {
  const userDoc = doc(db, "users", uid);
  const docSnap = await getDoc(userDoc);
  if (!docSnap.exists()) return;

  const data = docSnap.data();
  
  document.getElementById("usernameInput").value = data.username || "";
  document.getElementById("bioInput").value = data.bio || "";
  document.getElementById("locationInput").value = data.location || "";
  document.getElementById("musicInput").value = data.music || "";
  document.getElementById("topFriendsInput").value = data.topFriends || "";
  
  // Profile picture
  if (data.profilePic) {
    const img = document.getElementById("profilePicDisplay");
    img.src = data.profilePic;
    img.style.display = "block";
  }

  // Theme
  if (data.theme) document.body.className = data.theme;
}

// ----------------------------
// Save Profile Info (bio, location, music, topFriends)
// ----------------------------
document.getElementById("saveProfileBtn").addEventListener("click", async () => {
  if (!currentUserUID) return;

  const username = document.getElementById("usernameInput").value.trim();
  const bio = document.getElementById("bioInput").value.trim();
  const location = document.getElementById("locationInput").value.trim();
  const music = document.getElementById("musicInput").value.trim();
  const topFriends = document.getElementById("topFriendsInput").value.trim();

  await updateDoc(doc(db, "users", currentUserUID), {
    username, bio, location, music, topFriends
  });

  alert("Profile saved!");
});

// ----------------------------
// Upload Profile Picture
// ----------------------------
document.getElementById("profilePicInput").addEventListener("change", async (e) => {
  if (!currentUserUID) return;
  const file = e.target.files[0];
  if (!file) return;

  const contentType = file.type || "image/jpeg";
  const storageRef = ref(storage, `profileImages/${currentUserUID}/${Date.now()}_${file.name}`);

  try {
    const snapshot = await uploadBytes(storageRef, file, { contentType });
    const downloadURL = await getDownloadURL(snapshot.ref);

    // Update user document
    await updateDoc(doc(db, "users", currentUserUID), { profilePic: downloadURL });
    
    // Show picture
    const img = document.getElementById("profilePicDisplay");
    img.src = downloadURL;
    img.style.display = "block";

    alert("Profile picture updated!");
  } catch(err) {
    console.error(err);
    alert("Failed to upload profile picture. Check console.");
  }
});

// ----------------------------
// Change Theme
// ----------------------------
document.getElementById("themeSelect").addEventListener("change", () => {
  const theme = document.getElementById("themeSelect").value;
  document.body.className = theme;
  if (currentUserUID) {
    updateDoc(doc(db, "users", currentUserUID), { theme });
  }
});

// ----------------------------
// Step 6: Notifications (friend requests)
// ----------------------------
async function checkNotifications() {
  if (!currentUserUID) return;

  const userDoc = doc(db, "users", currentUserUID);
  const docSnap = await getDoc(userDoc);
  if (!docSnap.exists()) return;

  const data = docSnap.data();
  const requests = (data.friendRequests || "").split(",").filter(f => f);
  if (requests.length > 0) {
    showNotification("Friend Requests", `You have ${requests.length} new friend request(s)!`);
  }
}

function showNotification(title, body) {
  if (!("Notification" in window)) return;

  if (Notification.permission === "granted") {
    new Notification(title, { body });
  } else if (Notification.permission !== "denied") {
    Notification.requestPermission().then(permission => {
      if (permission === "granted") new Notification(title, { body });
    });
  }
}

// Initial check + poll every 30s
setInterval(checkNotifications, 30000);
onAuthStateChanged(auth, user => { if (user) checkNotifications(); });

// ----------------------------
// Friend Requests (optional)
// ----------------------------
async function sendFriendRequest(targetUID) {
  if (!currentUserUID || !targetUID) return;
  const targetDoc = doc(db, "users", targetUID);
  await updateDoc(targetDoc, {
    friendRequests: arrayUnion(currentUserUID)
  });
  alert("Friend request sent!");
}
