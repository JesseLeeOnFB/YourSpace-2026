import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-app.js";
import { getFirestore, doc, getDoc, setDoc, updateDoc, collection, query, where, getDocs } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-storage.js";

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
const storage = getStorage(app);

const profilePfp = document.getElementById("profilePfp");
const profilePfpInput = document.getElementById("profilePfpInput");
const savePfpBtn = document.getElementById("savePfpBtn");
const usernameInput = document.getElementById("usernameInput");
const bioInput = document.getElementById("bioInput");
const locationInput = document.getElementById("locationInput");
const saveProfileBtn = document.getElementById("saveProfileBtn");
const topFriendInput = document.getElementById("topFriendInput");
const topFriendsContainer = document.getElementById("topFriendsContainer");
const friendPreviewContainer = document.getElementById("friendPreviewContainer");
const wallCommentInput = document.getElementById("wallCommentInput");
const postWallCommentBtn = document.getElementById("postWallCommentBtn");
const commentContainer = document.getElementById("commentContainer");
const musicInput = document.getElementById("musicInput");
const saveMusicBtn = document.getElementById("saveMusicBtn");
const musicPlayerContainer = document.getElementById("musicPlayerContainer");
const feedNavBtn = document.getElementById("feedNavBtn");
const logoutBtn = document.getElementById("logoutBtn");

let currentUser;

auth.onAuthStateChanged(async user => {
    if (!user) {
        window.location.href = "login.html";
        return;
    }
    currentUser = user;
    loadProfile();
});

// NAVIGATION
feedNavBtn.onclick = () => window.location.href = "feed.html";
logoutBtn.onclick = () => auth.signOut().then(() => window.location.href="login.html");

// LOAD PROFILE
async function loadProfile() {
    const refUser = doc(db, "users", currentUser.uid);
    const snap = await getDoc(refUser);

    if (!snap.exists()) {
        await setDoc(refUser, { username: "", bio: "", location: "", pfpURL: "", topFriends: [], wallComments: [], musicURL: "" });
        return loadProfile();
    }

    const data = snap.data();
    usernameInput.value = data.username || "";
    bioInput.value = data.bio || "";
    locationInput.value = data.location || "";
    profilePfp.src = data.pfpURL || "default-avatar.png";

    renderTopFriends(data.topFriends || []);
    renderWallComments(data.wallComments || []);
    if (data.musicURL) renderMusic(data.musicURL);
}

// SAVE PROFILE INFO
saveProfileBtn.onclick = async () => {
    await updateDoc(doc(db, "users", currentUser.uid), {
        username: usernameInput.value,
        bio: bioInput.value,
        location: locationInput.value
    });
    alert("Profile info saved");
};

// SAVE PROFILE PICTURE
savePfpBtn.onclick = async () => {
    const file = profilePfpInput.files[0];
    if (!file) return alert("Select an image");

    const storageRef = ref(storage, `profileImages/${currentUser.uid}`);
    await uploadBytes(storageRef, file);
    const url = await getDownloadURL(storageRef);

    await updateDoc(doc(db, "users", currentUser.uid), { pfpURL: url });
    profilePfp.src = url;
};

// FRIEND SEARCH + ADD
topFriendInput.oninput = async () => {
    const queryText = topFriendInput.value.trim();
    friendPreviewContainer.innerHTML = "";
    if (!queryText) {
        friendPreviewContainer.style.display = "none";
        return;
    }

    const q = query(collection(db, "users"), where("username", "==", queryText));
    const results = await getDocs(q);
    results.forEach(docSnap => {
        const userData = docSnap.data();
        if (docSnap.id === currentUser.uid) return; // cannot add self

        friendPreviewContainer.style.display = "flex";
        const div = document.createElement("div");
        div.innerHTML = `<img src="${userData.pfpURL || 'default-avatar.png'}"><span>${userData.username}</span>`;
        const addBtn = document.createElement("button");
        addBtn.textContent = "Add Friend";
        addBtn.onclick = async () => {
            alert("Friend request functionality will be implemented next phase.");
        };
        div.appendChild(addBtn);
        friendPreviewContainer.appendChild(div);
    });
};

// TOP FRIENDS RENDER
function renderTopFriends(friends) {
    topFriendsContainer.innerHTML = "";
    friends.forEach(f => {
        const div = document.createElement("div");
        div.className = "top-friend";
        const img = document.createElement("img");
        img.src = f.pfpURL || "default-avatar.png";
        const name = document.createElement("strong");
        name.textContent = f.username;
        name.onclick = () => alert("Profile link will be implemented next phase.");
        const removeBtn = document.createElement("button");
        removeBtn.textContent = "Remove";
        removeBtn.onclick = async () => {
            friends.splice(friends.indexOf(f), 1);
            await updateDoc(doc(db, "users", currentUser.uid), { topFriends: friends });
            renderTopFriends(friends);
        };
        div.append(img, name, removeBtn);
        topFriendsContainer.appendChild(div);
    });
}

// WALL COMMENTS
postWallCommentBtn.onclick = async () => {
    const text = wallCommentInput.value.trim();
    if (!text) return;

    const refUser = doc(db, "users", currentUser.uid);
    const snap = await getDoc(refUser);
    const comments = snap.data().wallComments || [];
    comments.push({ uid: currentUser.uid, user: usernameInput.value || currentUser.email.split("@")[0], text });
    await updateDoc(refUser, { wallComments: comments });
    renderWallComments(comments);
    wallCommentInput.value = "";
};

function renderWallComments(comments) {
    commentContainer.innerHTML = "";
    comments.forEach((c, i) => {
        const div = document.createElement("div");
        div.innerHTML = `<strong>${c.user}:</strong> ${c.text} <button>Delete</button>`;
        div.querySelector("button").onclick = async () => {
            comments.splice(i, 1);
            await updateDoc(doc(db, "users", currentUser.uid), { wallComments: comments });
            renderWallComments(comments);
        };
        commentContainer.appendChild(div);
    });
}

// MUSIC PLAYER
saveMusicBtn.onclick = async () => {
    const url = musicInput.value.trim();
    if (!url) return;
    await updateDoc(doc(db, "users", currentUser.uid), { musicURL: url });
    renderMusic(url);
};

function renderMusic(url) {
    if (url.includes("youtube")) {
        const id = url.split("v=")[1]?.split("&")[0];
        musicPlayerContainer.innerHTML = `<iframe width="100%" height="200" src="https://www.youtube.com/embed/${id}" allowfullscreen></iframe>`;
    } else {
        musicPlayerContainer.innerHTML = `<audio controls src="${url}"></audio>`;
    }
}
