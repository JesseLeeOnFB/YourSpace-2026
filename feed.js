import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth, signOut } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getFirestore, collection, addDoc, query, orderBy, onSnapshot, deleteDoc, doc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// Firebase config (your keys)
const firebaseConfig = {
  apiKey: "AIzaSyAHMbxr7rJS88ZefVJzt8p_9CCTstLmLU8",
  authDomain: "yourspace-2026.firebaseapp.com",
  projectId: "yourspace-2026",
  storageBucket: "yourspace-2026.firebasestorage.app",
  messagingSenderId: "72667267302",
  appId: "1:72667267302:web:2bed5f543e05d49ca8fb27",
  measurementId: "G-FZ4GFXWGSS"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// DOM elements
const postInput = document.getElementById("postInput");
const postBtn = document.getElementById("postBtn");
const feedContainer = document.getElementById("feedContainer");
const logoutBtn = document.getElementById("logoutBtn");

// Logout
logoutBtn.addEventListener("click", () => {
    signOut(auth).then(() => location.href='index.html');
});

// Create Post
postBtn.addEventListener("click", async () => {
    const content = postInput.value.trim();
    const user = auth.currentUser;

    if (!user) return alert("You must be logged in!");
    if (!content) return alert("Enter something to post!");

    try {
        await addDoc(collection(db, "posts"), {
            userId: user.uid,
            username: user.displayName || user.email,
            content: content,
            photoURL: user.photoURL || "",
            timestamp: serverTimestamp()
        });
        postInput.value = "";
    } catch (e) {
        console.error("Error adding post:", e);
    }
});

// Display Feed
const postsQuery = query(collection(db, "posts"), orderBy("timestamp", "desc"));
onSnapshot(postsQuery, snapshot => {
    feedContainer.innerHTML = "";
    snapshot.forEach(docSnap => {
        const post = docSnap.data();
        const postId = docSnap.id;

        const postDiv = document.createElement("div");
        postDiv.className = "post";

        postDiv.innerHTML = `
            <div class="post-header">
                <img src="${post.photoURL || 'https://via.placeholder.com/50'}" alt="Profile" class="post-profile-pic">
                <span class="post-username">${post.username}</span>
                ${post.userId === auth.currentUser?.uid ? `<button class="deleteBtn" data-id="${postId}">Delete</button>` : ""}
            </div>
            <div class="post-content">${post.content}</div>
        `;

        feedContainer.appendChild(postDiv);

        // Delete post
        const deleteBtn = postDiv.querySelector(".deleteBtn");
        if (deleteBtn) {
            deleteBtn.addEventListener("click", async () => {
                try {
                    await deleteDoc(doc(db, "posts", postId));
                } catch (e) {
                    console.error("Delete failed:", e);
                }
            });
        }
    });
});
