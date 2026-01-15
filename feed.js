import { getFirestore, collection, addDoc, query, orderBy, onSnapshot } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-storage.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";

// Firebase instances
const db = getFirestore();
const storage = getStorage();
const auth = getAuth();

// DOM elements
const postsContainer = document.getElementById("postsContainer");
const postText = document.getElementById("postText");
const postFileInput = document.getElementById("postFileInput");
const postBtn = document.getElementById("postBtn");

// Navigation buttons
document.addEventListener("DOMContentLoaded", () => {
    const homeBtn = document.getElementById("homeBtn");
    const profileBtn = document.getElementById("profileBtn");
    const logoutBtn = document.getElementById("logoutBtn");

    if (homeBtn) homeBtn.addEventListener("click", () => window.location.href = "feed.html");
    if (profileBtn) profileBtn.addEventListener("click", () => window.location.href = "profile.html");
    if (logoutBtn) logoutBtn.addEventListener("click", async () => {
        try {
            await auth.signOut();
            window.location.href = "login.html";
        } catch (err) {
            console.error(err);
            alert("Logout failed.");
        }
    });
});

// Create post
postBtn.addEventListener("click", async () => {
    const user = auth.currentUser;
    if (!user) return alert("You must be logged in!");
    const text = postText.value.trim();
    if (!text && !postFileInput.files[0]) return alert("Cannot post empty content!");

    let fileURL = null;
    const file = postFileInput.files[0];
    if (file) {
        const storageRef = ref(storage, `posts/${user.uid}/${Date.now()}-${file.name}`);
        await uploadBytes(storageRef, file);
        fileURL = await getDownloadURL(storageRef);
    }

    try {
        await addDoc(collection(db, "posts"), {
            userId: user.uid,
            text: text || "",
            mediaURL: fileURL || "",
            mediaType: file ? file.type.split("/")[0] : "", // image or video
            timestamp: Date.now(),
            likes: 0,
            dislikes: 0,
            comments: []
        });
        postText.value = "";
        postFileInput.value = "";
    } catch (err) {
        console.error("Post failed:", err);
        alert("Failed to create post. Check console.");
    }
});

// Load feed posts live
onAuthStateChanged(auth, (user) => {
    if (!user) return window.location.href = "login.html";

    const q = query(collection(db, "posts"), orderBy("timestamp", "desc"));
    onSnapshot(q, (snapshot) => {
        postsContainer.innerHTML = "";
        snapshot.forEach(doc => {
            const data = doc.data();
            const postEl = document.createElement("div");
            postEl.className = "post-container";

            let mediaHTML = "";
            if (data.mediaURL) {
                if (data.mediaType === "image") {
                    mediaHTML = `<img src="${data.mediaURL}" class="post-media">`;
                } else if (data.mediaType === "video") {
                    mediaHTML = `<video src="${data.mediaURL}" class="post-media" controls></video>`;
                }
            }

            postEl.innerHTML = `
                <div class="post-header">
                    <span class="post-username">${data.userId}</span>
                    <span class="post-time">${new Date(data.timestamp).toLocaleString()}</span>
                </div>
                <div class="post-text">${data.text}</div>
                ${mediaHTML}
                <div class="post-actions">
                    <button class="like-btn">👍 ${data.likes}</button>
                    <button class="dislike-btn">🖕 ${data.dislikes}</button>
                    <button class="comment-btn">💬 Comment</button>
                    <button class="share-btn">🔗 Share</button>
                    <button class="delete-btn">🗑️ Delete</button>
                </div>
                <div class="comments-container"></div>
            `;

            // TODO: Add event listeners for like, dislike, comment, delete, share
            postsContainer.appendChild(postEl);
        });
    });
});
