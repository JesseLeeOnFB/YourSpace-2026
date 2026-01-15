import { initializeApp } from "https://www.gstatic.com/firebasejs/10.6.1/firebase-app.js";
import { getFirestore, doc, getDoc, updateDoc, arrayUnion } from "https://www.gstatic.com/firebasejs/10.6.1/firebase-firestore.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.6.1/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyAHMbxr7rJS88ZefVJzt8p_9CCTstLmLU8",
  authDomain: "yourspace-2026.firebaseapp.com",
  projectId: "yourspace-2026",
  storageBucket: "yourspace-2026.firebasestorage.app",
  messagingSenderId: "72667267302",
  appId: "1:72667267302:web:2bed5f543e05d49ca8fb27",
  measurementId: "G-FZ4GFXWGSS"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

const urlParams = new URLSearchParams(window.location.search);
const profileUid = urlParams.get('uid');

const userProfilePic = document.getElementById("userProfilePic");
const userDisplayName = document.getElementById("userDisplayName");
const userUsername = document.getElementById("userUsername");
const userBio = document.getElementById("userBio");
const userLocation = document.getElementById("userLocation");
const userMusicPlayer = document.getElementById("userMusicPlayer");
const userTopFriendsList = document.getElementById("userTopFriendsList");
const addFriendBtn = document.getElementById("addFriendBtn");

// Auth check
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "index.html"; // redirect if not logged in
    return;
  }

  // Load the user profile
  const userDocRef = doc(db, "users", profileUid);
  const userSnap = await getDoc(userDocRef);

  if (userSnap.exists()) {
    const data = userSnap.data();
    userProfilePic.src = data.photoURL || "default-profile.png";
    userDisplayName.textContent = data.displayName || "Anonymous";
    userUsername.textContent = data.username || "Anonymous";
    userBio.textContent = data.bio || "";
    userLocation.textContent = data.location || "";
    
    // Music embed
    if (data.music) {
      userMusicPlayer.innerHTML = `<iframe width="100%" height="80" src="https://www.youtube.com/embed/${extractYouTubeID(data.music)}" frameborder="0" allow="autoplay; encrypted-media" allowfullscreen></iframe>`;
    } else {
      userMusicPlayer.innerHTML = "No music set";
    }

    // Top friends
    userTopFriendsList.innerHTML = "";
    if (data.topFriends && data.topFriends.length > 0) {
      data.topFriends.forEach(friendUsername => {
        const li = document.createElement("li");
        li.textContent = friendUsername;
        userTopFriendsList.appendChild(li);
      });
    }

    // Friend button logic
    if (data.friends && data.friends.includes(auth.currentUser.uid)) {
      addFriendBtn.disabled = true;
      addFriendBtn.textContent = "Friend";
    } else if (data.friendRequests && data.friendRequests.includes(auth.currentUser.uid)) {
      addFriendBtn.disabled = true;
      addFriendBtn.textContent = "Request Sent";
    } else {
      addFriendBtn.disabled = false;
      addFriendBtn.textContent = "Add Friend";
    }

  } else {
    alert("User not found");
    window.location.href = "feed.html";
  }
});

// Add friend
addFriendBtn.addEventListener("click", async () => {
  const targetRef = doc(db, "users", profileUid);
  await updateDoc(targetRef, {
    friendRequests: arrayUnion(auth.currentUser.uid)
  });
  addFriendBtn.disabled = true;
  addFriendBtn.textContent = "Request Sent";
});

// Helper function to extract YouTube ID
function extractYouTubeID(url) {
  const regExp = /(?:youtube\.com\/.*v=|youtu\.be\/)([^&\n]+)/;
  const match = url.match(regExp);
  return match ? match[1] : "";
}

// Nav buttons
document.getElementById("homeBtn").addEventListener("click", () => { window.location.href = "feed.html"; });
document.getElementById("profileBtn").addEventListener("click", () => { window.location.href = "profile.html"; });
document.getElementById("logoutBtn").addEventListener("click", async () => { await auth.signOut(); window.location.href = "index.html"; });
