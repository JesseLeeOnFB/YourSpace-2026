// feed.js
import { auth, db, storage } from "./firebase.js";
import {
  collection,
  addDoc,
  getDocs,
  onSnapshot,
  doc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  orderBy,
  query
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";

import {
  ref,
  uploadBytes,
  getDownloadURL
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-storage.js";

// DOM elements
const postText = document.getElementById("postText");
const postFileInput = document.getElementById("postFileInput");
const postBtn = document.getElementById("postBtn");
const postsContainer = document.getElementById("postsContainer");
const imagePreview = document.getElementById("imagePreview");

// NAVIGATION BUTTONS
const homeBtn = document.getElementById("homeBtn");
const profileBtn = document.getElementById("profileBtn");
const logoutBtn = document.getElementById("logoutBtn");

if (homeBtn) homeBtn.addEventListener("click", () => window.location.href = "feed.html");
if (profileBtn) profileBtn.addEventListener("click", () => window.location.href = "profile.html");
if (logoutBtn) logoutBtn.addEventListener("click", async () => {
    try {
        await auth.signOut();
        window.location.href = "index.html";
    } catch (err) { console.error("Logout failed", err); }
});

// Preview image/video before posting
postFileInput.addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    imagePreview.src = url;
    imagePreview.style.display = "block";
});

// CREATE POST
postBtn.addEventListener("click", async () => {
    if (!auth.currentUser) return alert("You must be logged in to post.");
    const userId = auth.currentUser.uid;
    const text = postText.value.trim();
    const file = postFileInput.files[0];

    let postFileURL = null;
    if (file) {
        const fileRef = ref(storage, `posts/${userId}/${file.name}-${Date.now()}`);
        await uploadBytes(fileRef, file);
        postFileURL = await getDownloadURL(fileRef);
    }

    try {
        await addDoc(collection(db, "posts"), {
            userId,
            username: auth.currentUser.displayName || "Anonymous",
            text: text || null,
            postFileURL: postFileURL || null,
            likes: 0,
            dislikes: 0,
            comments: [],
            createdAt: serverTimestamp()
        });
        postText.value = "";
        postFileInput.value = "";
        imagePreview.style.display = "none";
    } catch (err) {
        console.error("Error posting:", err);
        alert("Failed to create post.");
    }
});

// LOAD POSTS
const postsQuery = query(collection(db, "posts"), orderBy("createdAt", "desc"));
onSnapshot(postsQuery, (snapshot) => {
    postsContainer.innerHTML = "";
    snapshot.forEach((docSnap) => {
        const post = docSnap.data();
        const postId = docSnap.id;

        const postDiv = document.createElement("div");
        postDiv.className = "post-container";

        // Username clickable
        const usernameEl = document.createElement("span");
        usernameEl.textContent = post.username;
        usernameEl.className = "post-username";
        usernameEl.addEventListener("click", () => {
            window.location.href = `userProfile.html?uid=${post.userId}`;
        });

        // Post content
        const textEl = document.createElement("p");
        textEl.textContent = post.text || "";

        postDiv.appendChild(usernameEl);
        postDiv.appendChild(textEl);

        // Image/video
        if (post.postFileURL) {
            const mediaEl = document.createElement("img");
            mediaEl.src = post.postFileURL;
            mediaEl.className = "post-media";
            mediaEl.style.maxWidth = "100%";
            mediaEl.style.borderRadius = "10px";
            postDiv.appendChild(mediaEl);
        }

        // Likes/Dislikes
        const likeBtn = document.createElement("button");
        likeBtn.textContent = "👍 " + (post.likes || 0);
        likeBtn.addEventListener("click", async () => {
            await updateDoc(doc(db, "posts", postId), {
                likes: (post.likes || 0) + 1
            });
        });

        const dislikeBtn = document.createElement("button");
        dislikeBtn.textContent = "🖕 " + (post.dislikes || 0);
        dislikeBtn.addEventListener("click", async () => {
            await updateDoc(doc(db, "posts", postId), {
                dislikes: (post.dislikes || 0) + 1
            });
        });

        // Delete post if owner
        const deleteBtn = document.createElement("button");
        deleteBtn.textContent = "Delete";
        if (auth.currentUser && auth.currentUser.uid === post.userId) {
            deleteBtn.addEventListener("click", async () => {
                if (confirm("Delete this post?")) {
                    await deleteDoc(doc(db, "posts", postId));
                }
            });
        } else {
            deleteBtn.disabled = true;
        }

        // Comment section
        const commentInput = document.createElement("input");
        commentInput.placeholder = "Add a comment...";
        const commentBtn = document.createElement("button");
        commentBtn.textContent = "Comment";
        commentBtn.addEventListener("click", async () => {
            const commentText = commentInput.value.trim();
            if (!commentText) return;
            const newComment = {
                userId: auth.currentUser.uid,
                username: auth.currentUser.displayName || "Anonymous",
                text: commentText,
                createdAt: serverTimestamp()
            };
            await updateDoc(doc(db, "posts", postId), {
                comments: [...(post.comments || []), newComment]
            });
            commentInput.value = "";
        });

        // Comment container
        const commentContainer = document.createElement("div");
        commentContainer.className = "comment-container";
        (post.comments || []).forEach(c => {
            const cEl = document.createElement("p");
            cEl.textContent = `${c.username}: ${c.text}`;
            commentContainer.appendChild(cEl);
        });

        postDiv.appendChild(likeBtn);
        postDiv.appendChild(dislikeBtn);
        postDiv.appendChild(deleteBtn);
        postDiv.appendChild(commentInput);
        postDiv.appendChild(commentBtn);
        postDiv.appendChild(commentContainer);

        postsContainer.appendChild(postDiv);
    });
});
