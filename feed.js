// feed.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs, doc, deleteDoc, updateDoc, query, orderBy } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-storage.js";

// Initialize Firebase (your config must match the current firebase.js setup)
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
const storage = getStorage(app);
const auth = getAuth(app);

const postsContainer = document.getElementById("postsContainer");
const postBtn = document.getElementById("postBtn");
const postText = document.getElementById("postText");
const postFileInput = document.getElementById("postFileInput");

// UTILITY: Render a post
async function renderPost(postData, postId) {
    const postEl = document.createElement("div");
    postEl.className = "post-container";

    const username = postData.username || "Anonymous";
    const text = postData.text || "";
    const mediaURL = postData.mediaURL || "";
    const mediaType = postData.mediaType || ""; // "image" or "video"

    let mediaHTML = "";
    if (mediaType === "image") {
        mediaHTML = `<img src="${mediaURL}" alt="Post Image" class="post-media">`;
    } else if (mediaType === "video") {
        mediaHTML = `<video controls class="post-media"><source src="${mediaURL}"></video>`;
    }

    postEl.innerHTML = `
        <div class="post-header">
            <span class="post-username">${username}</span>
            <button class="delete-post">Delete</button>
        </div>
        <div class="post-body">
            <p>${text}</p>
            ${mediaHTML}
        </div>
        <div class="post-footer">
            <button class="like-btn">👍 ${postData.likes || 0}</button>
            <button class="dislike-btn">🖕 ${postData.dislikes || 0}</button>
            <button class="comment-btn">Comment</button>
            <button class="share-btn">Share</button>
        </div>
        <div class="comment-section"></div>
    `;

    // DELETE POST
    const deleteBtn = postEl.querySelector(".delete-post");
    deleteBtn.addEventListener("click", async () => {
        try {
            await deleteDoc(doc(db, "posts", postId));
            postEl.remove();
        } catch (err) {
            alert("Failed to delete post. Check console.");
            console.error(err);
        }
    });

    // LIKE/DISLIKE
    const likeBtn = postEl.querySelector(".like-btn");
    const dislikeBtn = postEl.querySelector(".dislike-btn");

    likeBtn.addEventListener("click", async () => {
        const postRef = doc(db, "posts", postId);
        await updateDoc(postRef, { likes: (postData.likes || 0) + 1 });
        likeBtn.textContent = `👍 ${postData.likes + 1}`;
    });

    dislikeBtn.addEventListener("click", async () => {
        const postRef = doc(db, "posts", postId);
        await updateDoc(postRef, { dislikes: (postData.dislikes || 0) + 1 });
        dislikeBtn.textContent = `🖕 ${postData.dislikes + 1}`;
    });

    // COMMENTS
    const commentBtn = postEl.querySelector(".comment-btn");
    const commentSection = postEl.querySelector(".comment-section");
    commentBtn.addEventListener("click", () => {
        const commentInput = document.createElement("input");
        commentInput.type = "text";
        commentInput.placeholder = "Write a comment...";
        const submitComment = document.createElement("button");
        submitComment.textContent = "Post";
        commentSection.appendChild(commentInput);
        commentSection.appendChild(submitComment);

        submitComment.addEventListener("click", async () => {
            const commentText = commentInput.value.trim();
            if (!commentText) return;
            const postRef = doc(db, "posts", postId);
            await updateDoc(postRef, { comments: [...(postData.comments || []), { user: auth.currentUser.email, text: commentText }] });
            const commentEl = document.createElement("p");
            commentEl.textContent = `${auth.currentUser.email}: ${commentText}`;
            commentSection.appendChild(commentEl);
            commentInput.value = "";
        });
    });

    postsContainer.prepend(postEl);
}

// LOAD POSTS
async function loadPosts() {
    try {
        const postsSnap = await getDocs(query(collection(db, "posts"), orderBy("createdAt", "desc")));
        postsContainer.innerHTML = "";
        postsSnap.forEach(docSnap => renderPost(docSnap.data(), docSnap.id));
    } catch (err) {
        console.error("Failed to load posts:", err);
    }
}

// CREATE POST
postBtn.addEventListener("click", async () => {
    const text = postText.value.trim();
    const file = postFileInput.files[0];

    if (!text && !file) return alert("Post cannot be empty.");

    let mediaURL = "";
    let mediaType = "";

    if (file) {
        mediaType = file.type.startsWith("image/") ? "image" : "video";
        const storageRef = ref(storage, `posts/${auth.currentUser.uid}/${file.name}`);
        await uploadBytes(storageRef, file);
        mediaURL = await getDownloadURL(storageRef);
    }

    try {
        await addDoc(collection(db, "posts"), {
            userId: auth.currentUser.uid,
            username: auth.currentUser.email.split("@")[0],
            text,
            mediaURL,
            mediaType,
            likes: 0,
            dislikes: 0,
            comments: [],
            createdAt: new Date()
        });
        postText.value = "";
        postFileInput.value = "";
        loadPosts();
    } catch (err) {
        console.error("Failed to create post:", err);
        alert("Post failed. Check console.");
    }
});

// INITIAL LOAD
auth.onAuthStateChanged(user => {
    if (user) {
        loadPosts();
    } else {
        window.location.href = "login.html"; // redirect if not logged in
    }
});
