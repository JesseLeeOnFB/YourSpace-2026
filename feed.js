import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";
import { getFirestore, collection, addDoc, query, orderBy, getDocs, doc, updateDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-storage.js";

// Firebase app is already initialized in your HTML <script> tag
const auth = getAuth();
const db = getFirestore();
const storage = getStorage();

// Elements
const postsContainer = document.getElementById("postsContainer");
const postText = document.getElementById("postText");
const postFileInput = document.getElementById("postFileInput");
const postBtn = document.getElementById("postBtn");
const imagePreview = document.getElementById("imagePreview");

let currentUser = null;

// AUTH CHECK
onAuthStateChanged(auth, user => {
    if (!user) {
        window.location.href = "index.html";
    } else {
        currentUser = user;
        loadFeed();
    }
});

// CREATE POST
postFileInput.addEventListener("change", () => {
    const file = postFileInput.files[0];
    if (file) {
        imagePreview.src = URL.createObjectURL(file);
        imagePreview.style.display = "block";
    } else {
        imagePreview.style.display = "none";
    }
});

postBtn.addEventListener("click", async () => {
    const text = postText.value.trim();
    const file = postFileInput.files[0];

    if (!text && !file) {
        alert("Add text or an image/video before posting!");
        return;
    }

    let fileURL = "";
    if (file) {
        const storageRef = ref(storage, `posts/${currentUser.uid}/${Date.now()}_${file.name}`);
        await uploadBytes(storageRef, file);
        fileURL = await getDownloadURL(storageRef);
    }

    await addDoc(collection(db, "posts"), {
        userId: currentUser.uid,
        username: currentUser.displayName || "Anonymous",
        text: text || "",
        media: fileURL || "",
        mediaType: file ? file.type.split("/")[0] : "",
        likes: 0,
        dislikes: 0,
        comments: [],
        createdAt: Date.now()
    });

    postText.value = "";
    postFileInput.value = "";
    imagePreview.style.display = "none";
    loadFeed();
});

// LOAD FEED
async function loadFeed() {
    postsContainer.innerHTML = "";
    const q = query(collection(db, "posts"), orderBy("createdAt", "desc"));
    const snapshot = await getDocs(q);
    snapshot.forEach(docSnap => {
        const post = docSnap.data();
        const postId = docSnap.id;
        const div = document.createElement("div");
        div.className = "feed-post";

        div.innerHTML = `
            <div class="post-header">
                <img src="${post.userProfilePic || 'default-profile.png'}" alt="Profile">
                <strong class="post-username" data-uid="${post.userId}">${post.username}</strong>
            </div>
            <div class="post-content">
                <p>${post.text}</p>
                ${post.media ? (post.mediaType === "image" ? `<img src="${post.media}" alt="Post">` : `<video src="${post.media}" controls></video>`) : ""}
            </div>
            <div class="post-buttons">
                <button class="like-btn">👍 ${post.likes}</button>
                <button class="dislike-btn">🖕 ${post.dislikes}</button>
                <button class="comment-btn">Comment</button>
                <button class="share-btn">Share</button>
                ${post.userId === currentUser.uid ? `<button class="delete-btn">Delete</button>` : ""}
            </div>
            <div class="comments-container"></div>
        `;

        postsContainer.appendChild(div);

        // BUTTON EVENT LISTENERS
        const likeBtn = div.querySelector(".like-btn");
        const dislikeBtn = div.querySelector(".dislike-btn");
        const deleteBtn = div.querySelector(".delete-btn");
        const commentBtn = div.querySelector(".comment-btn");

        likeBtn.addEventListener("click", async () => {
            const postRef = doc(db, "posts", postId);
            await updateDoc(postRef, { likes: post.likes + 1 });
            loadFeed();
        });

        dislikeBtn.addEventListener("click", async () => {
            const postRef = doc(db, "posts", postId);
            await updateDoc(postRef, { dislikes: post.dislikes + 1 });
            loadFeed();
        });

        if (deleteBtn) {
            deleteBtn.addEventListener("click", async () => {
                if (confirm("Delete this post?")) {
                    await deleteDoc(doc(db, "posts", postId));
                    loadFeed();
                }
            });
        }

        // COMMENT BUTTON (opens input under post)
        commentBtn.addEventListener("click", () => {
            const commentsContainer = div.querySelector(".comments-container");
            if (!div.querySelector(".comment-input")) {
                const inputDiv = document.createElement("div");
                inputDiv.innerHTML = `
                    <input type="text" class="comment-input" placeholder="Write a comment...">
                    <button class="submit-comment">Post</button>
                `;
                commentsContainer.appendChild(inputDiv);

                const submitBtn = inputDiv.querySelector(".submit-comment");
                const inputField = inputDiv.querySelector(".comment-input");

                submitBtn.addEventListener("click", async () => {
                    const commentText = inputField.value.trim();
                    if (!commentText) return;
                    const postRef = doc(db, "posts", postId);
                    const updatedComments = [...post.comments, { userId: currentUser.uid, username: currentUser.displayName || "Anonymous", text: commentText }];
                    await updateDoc(postRef, { comments: updatedComments });
                    loadFeed();
                });
            }
        });

        // Render comments
        const commentsContainer = div.querySelector(".comments-container");
        post.comments.forEach(c => {
            const cDiv = document.createElement("div");
            cDiv.className = "wall-comment";
            cDiv.textContent = `${c.username}: ${c.text}`;
            commentsContainer.appendChild(cDiv);
        });

        // Username click navigates to profile
        const usernameEl = div.querySelector(".post-username");
        usernameEl.addEventListener("click", () => {
            window.location.href = `userProfile.html?uid=${post.userId}`;
        });
    });
}
