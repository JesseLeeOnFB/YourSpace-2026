import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-app.js";
import { getFirestore, doc, getDoc, updateDoc, arrayUnion } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-storage.js";

const firebaseConfig = {
    apiKey: "AIzaSyAHMbxr7rJS88ZefVJzt8p_9CCTstLmLU8",
    authDomain: "yourspace-2026.firebaseapp.com",
    projectId: "yourspace-2026",
    storageBucket: "yourspace-2026.appspot.com",
    messagingSenderId: "72667267302",
    appId: "1:72667267302:web:2bed5f543e05d49ca8fb27"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const storage = getStorage(app);
const auth = getAuth(app);

// DOM elements
const profilePfp = document.getElementById("profilePfp");
const profilePfpInput = document.getElementById("profilePfpInput");
const saveProfilePfpBtn = document.getElementById("saveProfilePfpBtn");
const usernameInput = document.getElementById("usernameInput");
const bioInput = document.getElementById("bioInput");
const locationInput = document.getElementById("locationInput");
const saveProfileBtn = document.getElementById("saveProfileBtn");
const topFriendInput = document.getElementById("topFriendInput");
const addTopFriendBtn = document.getElementById("addTopFriendBtn");
const topFriendsContainer = document.querySelector(".top-friends-container");
const wallCommentInput = document.getElementById("wallCommentInput");
const postWallCommentBtn = document.getElementById("postWallCommentBtn");
const commentContainer = document.getElementById("commentContainer");
const musicInput = document.getElementById("musicInput");
const saveMusicBtn = document.getElementById("saveMusicBtn");
const musicPlayerContainer = document.getElementById("musicPlayerContainer");
const logoutBtn = document.getElementById("logoutBtn");
const feedBtn = document.getElementById("feedBtn");
const profileBtn = document.getElementById("profileBtn");

// AUTH STATE
auth.onAuthStateChanged(async (user) => {
    if (!user) {
        window.location.href = "login.html";
        return;
    }

    const userDocRef = doc(db, "users", user.uid);
    const userSnap = await getDoc(userDocRef);
    if (!userSnap.exists()) return;

    const data = userSnap.data();
    usernameInput.value = data.username || "";
    bioInput.value = data.bio || "";
    locationInput.value = data.location || "";
    profilePfp.src = data.pfpURL || "default-avatar.png";

    // Load Top Friends
    topFriendsContainer.innerHTML = "";
    (data.topFriends || []).forEach(friend => {
        const div = document.createElement("div");
        div.classList.add("friend-item");
        div.textContent = friend;
        topFriendsContainer.appendChild(div);
    });

    // Load Wall Comments
    commentContainer.innerHTML = "";
    (data.wallComments || []).forEach(c => {
        div = document.createElement("div");
        div.textContent = `${c.username || data.username}: ${c.text || ""}`;
        commentContainer.appendChild(div);
    });

    // Load music
    if (data.musicURL) {
        musicPlayerContainer.innerHTML = getEmbeddedMusicHTML(data.musicURL);
    }
});

// SAVE PROFILE INFO
saveProfileBtn.addEventListener("click", async () => {
    const user = auth.currentUser;
    const userDocRef = doc(db, "users", user.uid);
    await updateDoc(userDocRef, {
        username: usernameInput.value,
        bio: bioInput.value,
        location: locationInput.value
    });
    alert("Profile info updated!");
});

// SAVE PROFILE PICTURE
saveProfilePfpBtn.addEventListener("click", async () => {
    const file = profilePfpInput.files[0];
    if (!file) return alert("Select an image first!");
    try {
        const user = auth.currentUser;
        const storageRef = ref(storage, `profileImages/${user.uid}/${Date.now()}_${file.name}`);
        await uploadBytes(storageRef, file);
        const url = await getDownloadURL(storageRef);

        const userDocRef = doc(db, "users", user.uid);
        await updateDoc(userDocRef, { pfpURL: url });
        profilePfp.src = url;
        alert("Profile picture updated!");
    } catch (err) {
        console.error(err);
        alert("Failed to update profile picture.");
    }
});

// TOP FRIENDS (simplified)
addTopFriendBtn.addEventListener("click", async () => {
    alert("Feature pending: friend request backend logic not yet implemented.");
});

// WALL COMMENTS
postWallCommentBtn.addEventListener("click", async () => {
    const text = wallCommentInput.value.trim();
    if (!text) return;
    const user = auth.currentUser;
    const userDocRef = doc(db, "users", user.uid);
    const userSnap = await getDoc(userDocRef);
    const currentComments = userSnap.data().wallComments || [];
    const newComment = { username: usernameInput.value || user.email.split("@")[0], text };
    await updateDoc(userDocRef, { wallComments: arrayUnion(newComment) });
    const div = document.createElement("div");
    div.textContent = `${newComment.username}: ${newComment.text}`;
    commentContainer.appendChild(div);
    wallCommentInput.value = "";
});

// MUSIC PLAYER
saveMusicBtn.addEventListener("click", async () => {
    const url = musicInput.value.trim();
    if (!url) return alert("Enter a link!");
    const user = auth.currentUser;
    const userDocRef = doc(db, "users", user.uid);
    await updateDoc(userDocRef, { musicURL: url });
    musicPlayerContainer.innerHTML = getEmbeddedMusicHTML(url);
});

// LOGOUT
logoutBtn.addEventListener("click", async () => {
    await auth.signOut();
    window.location.href = "login.html";
});

// NAV BUTTONS
feedBtn.addEventListener("click", () => window.location.href = "feed.html");
profileBtn.addEventListener("click", () => window.location.href = "profile.html");

// MUSIC EMBED HELPER
function getEmbeddedMusicHTML(url) {
    if (!url) return "";
    if (url.includes("youtube.com") || url.includes("youtu.be")) {
        const videoId = url.split("v=")[1]?.split("&")[0] || url.split("/").pop();
        return `<iframe width="100%" height="166" src="https://www.youtube.com/embed/${videoId}" frameborder="0" allowfullscreen></iframe>`;
    }
    if (url.includes("soundcloud.com")) {
        return `<iframe width="100%" height="166" scrolling="no" frameborder="no" allow="autoplay" src="https://w.soundcloud.com/player/?url=${encodeURIComponent(url)}"></iframe>`;
    }
    return "";
}
