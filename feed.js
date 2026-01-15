// feed.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-auth.js";
import { getFirestore, collection, addDoc, getDocs, query, orderBy, doc, updateDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-firestore.js";
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
const postText = document.getElementById("postText");
const postFileInput = document.getElementById("postFileInput");
const postBtn = document.getElementById("postBtn");
const postsContainer = document.getElementById("postsContainer");
const navHomeBtn = document.getElementById("homeBtn");
const navProfileBtn = document.getElementById("profileBtn");
const navLogoutBtn = document.getElementById("logoutBtn");

let currentUserId;

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

// Ensure user is logged in
onAuthStateChanged(auth, async (user) => {
    if (!user) {
        alert("You must be logged in!");
        window.location.href = "index.html";
        return;
    }
    currentUserId = user.uid;
    loadPosts();
});

// CREATE POST
if (postBtn) postBtn.addEventListener("click", async () => {
    if (!postText.value.trim() && !postFileInput.files.length) return alert("Post must have text or a file");

    let fileURL = null;

    if (postFileInput.files.length) {
        const file = postFileInput.files[0];
        const storageRef = ref(storage, `posts/${currentUserId}/${file.name}`);
        await uploadBytes(storageRef, file);
        fileURL = await getDownloadURL(storageRef);
    }

    const postObj = {
        userId: currentUserId,
        username: auth.currentUser.email.split("@")[0], // display first part of email as username
        text: postText.value.trim() || null,
        postFile: fileURL || null,
        likes: 0,
        dislikes: 0,
        comments: [],
        createdAt: new Date()
    };

    try {
        await addDoc(collection(db, "posts"), postObj);
        postText.value = "";
        postFileInput.value = "";
        loadPosts();
    } catch (err) {
        console.error("Failed to post:", err);
    }
});

// LOAD POSTS
async function loadPosts() {
    postsContainer.innerHTML = "";
    try {
        const q = query(collection(db, "posts"), orderBy("createdAt", "desc"));
        const snapshot = await getDocs(q);
        snapshot.forEach(docSnap => {
            const data = docSnap.data();
            const postDiv = document.createElement("div");
            postDiv.className = "postContainer";

            let mediaHTML = "";
            if (data.postFile) {
                if (data.postFile.match(/\.(jpeg|jpg|gif|png)$/i)) {
                    mediaHTML = `<img src="${data.postFile}" class="postMedia">`;
                } else {
                    mediaHTML = `<video controls class="postMedia"><source src="${data.postFile}"></video>`;
                }
            }

            postDiv.innerHTML = `
                <div class="postHeader">
                    <span class="postUsername" data-userid="${data.userId}">${data.username}</span>
                </div>
                <div class="postText">${data.text || ""}</div>
                <div class="postMediaContainer">${mediaHTML}</div>
                <div class="postActions">
                    <button class="likeBtn">👍 ${data.likes || 0}</button>
                    <button class="dislikeBtn">🖕 ${data.dislikes || 0}</button>
                    <button class="commentBtn">💬</button>
                    <button class="shareBtn">🔗</button>
                    ${data.userId === currentUserId ? '<button class="deleteBtn">🗑️</button>' : ''}
                </div>
                <div class="commentsContainer"></div>
            `;

            postsContainer.appendChild(postDiv);

            // EVENT LISTENERS
            const likeBtn = postDiv.querySelector(".likeBtn");
            likeBtn.addEventListener("click", async () => {
                const postRef = doc(db, "posts", docSnap.id);
                await updateDoc(postRef, { likes: (data.likes || 0) + 1 });
                loadPosts();
            });

            const dislikeBtn = postDiv.querySelector(".dislikeBtn");
            dislikeBtn.addEventListener("click", async () => {
                const postRef = doc(db, "posts", docSnap.id);
                await updateDoc(postRef, { dislikes: (data.dislikes || 0) + 1 });
                loadPosts();
            });

            const deleteBtn = postDiv.querySelector(".deleteBtn");
            if (deleteBtn) {
                deleteBtn.addEventListener("click", async () => {
                    const postRef = doc(db, "posts", docSnap.id);
                    await deleteDoc(postRef);
                    loadPosts();
                });
            }

            // Click username to go to profile
            const usernameSpan = postDiv.querySelector(".postUsername");
            usernameSpan.addEventListener("click", () => {
                window.location.href = `userProfile.html?uid=${data.userId}`;
            });
        });
    } catch (err) {
        console.error("Failed to load posts:", err);
    }
}
