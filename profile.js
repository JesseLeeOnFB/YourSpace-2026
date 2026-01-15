// profile.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc, updateDoc, arrayUnion } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-firestore.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-storage.js";

// Firebase config
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
const auth = getAuth();
const db = getFirestore();
const storage = getStorage();

// DOM elements
const saveProfileBtn = document.getElementById("saveProfileBtn");
const saveMusicBtn = document.getElementById("saveMusicBtn");
const topFriendsInput = document.getElementById("topFriendsInput");
const addTopFriendBtn = document.getElementById("addTopFriendBtn");
const profilePicInput = document.getElementById("profilePicInput");
const wallCommentInput = document.getElementById("wallCommentInput");
const postWallCommentBtn = document.getElementById("postWallCommentBtn");
const navHomeBtn = document.getElementById("homeBtn");
const navProfileBtn = document.getElementById("profileBtn");
const navLogoutBtn = document.getElementById("logoutBtn");

let currentUserId;

// Ensure user is logged in
onAuthStateChanged(auth, async (user) => {
    if (!user) {
        alert("You must be logged in!");
        window.location.href = "index.html";
        return;
    }
    currentUserId = user.uid;
    loadProfileData();
});

// NAVIGATION BUTTONS
if (navHomeBtn) navHomeBtn.addEventListener("click", () => window.location.href = "feed.html");
if (navProfileBtn) navProfileBtn.addEventListener("click", () => window.location.href = "profile.html");
if (navLogoutBtn) navLogoutBtn.addEventListener("click", async () => {
    try {
        await signOut(auth);
        window.location.href = "index.html";
    } catch (err) {
        console.error("Logout failed:", err);
        alert("Failed to logout");
    }
});

// Load profile data
async function loadProfileData() {
    try {
        const userDocRef = doc(db, "users", currentUserId);
        const userSnap = await getDoc(userDocRef);
        if (!userSnap.exists()) return;

        const userData = userSnap.data();

        // Fill in fields
        document.getElementById("bioInput").value = userData.bio || "";
        document.getElementById("locationInput").value = userData.location || "";
        document.getElementById("usernameDisplay").textContent = userData.username || "Anonymous";

        // Load profile picture
        if (userData.profilePic) {
            document.getElementById("profilePicDisplay").src = userData.profilePic;
        }

        // Load top friends
        const topFriendsBox = document.getElementById("topFriendsBox");
        topFriendsBox.innerHTML = "";
        if (userData.topFriends) {
            userData.topFriends.forEach(friend => {
                const div = document.createElement("div");
                div.textContent = friend;
                topFriendsBox.appendChild(div);
            });
        }

        // Load wall comments
        const wallCommentsBox = document.getElementById("wallCommentsBox");
        wallCommentsBox.innerHTML = "";
        if (userData.wallComments) {
            userData.wallComments.forEach(comment => {
                const div = document.createElement("div");
                div.textContent = `${comment.username}: ${comment.text}`;
                wallCommentsBox.appendChild(div);
            });
        }

        // Load music
        if (userData.music) {
            document.getElementById("musicPlayer").innerHTML = embedMusic(userData.music);
        }

    } catch (err) {
        console.error("Failed to load profile:", err);
    }
}

// SAVE PROFILE INFO
if (saveProfileBtn) {
    saveProfileBtn.addEventListener("click", async () => {
        try {
            const bio = document.getElementById("bioInput").value;
            const location = document.getElementById("locationInput").value;

            const userDocRef = doc(db, "users", currentUserId);
            await updateDoc(userDocRef, { bio, location });

            alert("Profile updated!");
        } catch (err) {
            console.error("Failed to save profile:", err);
            alert("Failed to save profile info");
        }
    });
}

// SAVE MUSIC
if (saveMusicBtn) {
    saveMusicBtn.addEventListener("click", async () => {
        try {
            const musicLink = document.getElementById("musicInput").value;
            const userDocRef = doc(db, "users", currentUserId);
            await updateDoc(userDocRef, { music: musicLink });

            document.getElementById("musicPlayer").innerHTML = embedMusic(musicLink);
        } catch (err) {
            console.error("Failed to save music:", err);
        }
    });
}

// EMBED MUSIC FUNCTION
function embedMusic(link) {
    if (!link) return "";
    // YouTube example embed
    if (link.includes("youtube.com") || link.includes("youtu.be")) {
        const videoId = link.split("v=")[1] || link.split("/").pop();
        return `<iframe width="300" height="80" src="https://www.youtube.com/embed/${videoId}" frameborder="0" allow="autoplay; encrypted-media" allowfullscreen></iframe>`;
    }
    // Add more platforms here (Spotify, SoundCloud, Pandora)
    return `Unsupported platform`;
}

// SAVE PROFILE PIC
if (profilePicInput) {
    profilePicInput.addEventListener("change", async (e) => {
        try {
            const file = e.target.files[0];
            if (!file) return;
            const storageRef = ref(storage, `profileImages/${currentUserId}/${file.name}`);
            await uploadBytes(storageRef, file);
            const downloadURL = await getDownloadURL(storageRef);

            const userDocRef = doc(db, "users", currentUserId);
            await updateDoc(userDocRef, { profilePic: downloadURL });

            document.getElementById("profilePicDisplay").src = downloadURL;
            alert("Profile picture updated!");
        } catch (err) {
            console.error("Failed to upload profile picture:", err);
        }
    });
}

// ADD TOP FRIEND
if (addTopFriendBtn) {
    addTopFriendBtn.addEventListener("click", async () => {
        const friendName = topFriendsInput.value.trim();
        if (!friendName) return;

        const userDocRef = doc(db, "users", currentUserId);
        await updateDoc(userDocRef, {
            topFriends: arrayUnion(friendName)
        });

        topFriendsInput.value = "";
        loadProfileData();
    });
}

// POST WALL COMMENT
if (postWallCommentBtn) {
    postWallCommentBtn.addEventListener("click", async () => {
        const commentText = wallCommentInput.value.trim();
        if (!commentText) return;

        const userDocRef = doc(db, "users", currentUserId);
        await updateDoc(userDocRef, {
            wallComments: arrayUnion({ username: document.getElementById("usernameDisplay").textContent, text: commentText })
        });

        wallCommentInput.value = "";
        loadProfileData();
    });
}
