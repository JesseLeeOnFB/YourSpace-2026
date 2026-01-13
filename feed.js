import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getFirestore, collection, addDoc, query, orderBy, getDocs, deleteDoc, doc } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { firebaseConfig } from "../firebase-config.js";

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const homeBtn = document.getElementById("homeBtn");
const profileBtn = document.getElementById("profileBtn");
const logoutBtn = document.getElementById("logoutBtn");

const postTitle = document.getElementById("postTitle");
const postContent = document.getElementById("postContent");
const postImage = document.getElementById("postImage");
const publishBtn = document.getElementById("publishBtn");
const postError = document.getElementById("postError");
const postsContainer = document.getElementById("postsContainer");
const trendingContainer = document.getElementById("trendingContainer");

// Navigation
homeBtn.addEventListener("click", () => location.href = "feed.html");
profileBtn.addEventListener("click", () => location.href = "profile.html");
logoutBtn.addEventListener("click", () => signOut(auth).then(() => location.href="index.html"));

// Check auth
onAuthStateChanged(auth, user => {
    if (!user) location.href = "index.html";
    loadPosts();
    loadTrending();
});

// Publish post
publishBtn.addEventListener("click", async () => {
    if (!postTitle.value || !postContent.value) {
        postError.textContent = "Please enter title and content";
        return;
    }
    try {
        await addDoc(collection(db, "posts"), {
            title: postTitle.value,
            content: postContent.value,
            image: postImage.value || "",
            userId: auth.currentUser.uid,
            username: auth.currentUser.displayName || auth.currentUser.email,
            timestamp: new Date(),
            likes: 0,
            comments: []
        });
        postTitle.value = "";
        postContent.value = "";
        postImage.value = "";
        postError.textContent = "";
        loadPosts();
        loadTrending();
    } catch(err) {
        postError.textContent = err.message;
    }
});

// Load all posts
async function loadPosts() {
    postsContainer.innerHTML = "";
    const postsRef = collection(db, "posts");
    const q = query(postsRef, orderBy("timestamp", "desc"));
    const snapshot = await getDocs(q);
    snapshot.forEach(docSnap => {
        const data = docSnap.data();
        const postEl = document.createElement("div");
        postEl.className = "post";
        postEl.innerHTML = `
            <h4>${data.title}</h4>
            <p>${data.content}</p>
            ${data.image ? `<img src="${data.image}" class="post-img">` : ""}
            <p>By: ${data.username}</p>
            <button class="deleteBtn">Delete</button>
        `;
        const deleteBtn = postEl.querySelector(".deleteBtn");
        if (data.userId === auth.currentUser.uid) {
            deleteBtn.addEventListener("click", async () => {
                await deleteDoc(doc(db, "posts", docSnap.id));
                loadPosts();
                loadTrending();
            });
        } else {
            deleteBtn.style.display = "none";
        }
        postsContainer.appendChild(postEl);
    });
}

// Load trending (highest likes)
async function loadTrending() {
    trendingContainer.innerHTML = "";
    const postsRef = collection(db, "posts");
    const q = query(postsRef, orderBy("likes", "desc"));
    const snapshot = await getDocs(q);
    if (!snapshot.empty) {
        const top = snapshot.docs[0].data();
        trendingContainer.innerHTML = `
            <h4>${top.title}</h4>
            <p>${top.content}</p>
            ${top.image ? `<img src="${top.image}" class="post-img">` : ""}
            <p>By: ${top.username}</p>
            <p>🔥 Trending</p>
        `;
    }
}
