// feed.js
import { db, auth, storage } from './firebase.js';
import {
    collection,
    addDoc,
    query,
    orderBy,
    onSnapshot,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";
import {
    ref,
    uploadBytes,
    getDownloadURL
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-storage.js";

const postBtn = document.getElementById("postBtn");
const postText = document.getElementById("postText");
const postFileInput = document.getElementById("postFileInput");
const postsContainer = document.getElementById("postsContainer");
const imagePreview = document.getElementById("imagePreview");

let selectedFile = null;

// Preview selected file
postFileInput.addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (!file) return;
    selectedFile = file;
    const reader = new FileReader();
    reader.onload = function(ev) {
        imagePreview.src = ev.target.result;
        imagePreview.style.display = "block";
    };
    reader.readAsDataURL(file);
});

// Create a new post
postBtn.addEventListener("click", async () => {
    const text = postText.value.trim();
    if (!text && !selectedFile) {
        alert("Please enter text or select an image/video.");
        return;
    }

    try {
        const user = auth.currentUser;
        if (!user) {
            alert("You must be logged in to post.");
            return;
        }

        let fileURL = null;
        if (selectedFile) {
            const fileRef = ref(storage, `posts/${user.uid}/${Date.now()}_${selectedFile.name}`);
            await uploadBytes(fileRef, selectedFile);
            fileURL = await getDownloadURL(fileRef);
        }

        await addDoc(collection(db, "posts"), {
            userId: user.uid,
            username: user.displayName || "Anonymous",
            text: text || "",
            postFile: fileURL || "",
            likes: 0,
            dislikes: 0,
            comments: [],
            createdAt: serverTimestamp()
        });

        postText.value = "";
        postFileInput.value = "";
        imagePreview.src = "";
        imagePreview.style.display = "none";
        selectedFile = null;
    } catch (err) {
        console.error("Error posting:", err);
        alert("Failed to create post. Check console for details.");
    }
});

// Load posts in real-time
const postsQuery = query(collection(db, "posts"), orderBy("createdAt", "desc"));
onSnapshot(postsQuery, (snapshot) => {
    postsContainer.innerHTML = ""; // Clear container
    snapshot.forEach((doc) => {
        const data = doc.data();
        const postEl = document.createElement("div");
        postEl.className = "post-container";

        // Post content
        let fileContent = "";
        if (data.postFile) {
            if (data.postFile.match(/\.(jpeg|jpg|png|gif)$/i)) {
                fileContent = `<img src="${data.postFile}" class="post-media" />`;
            } else if (data.postFile.match(/\.(mp4|webm)$/i)) {
                fileContent = `<video src="${data.postFile}" class="post-media" controls></video>`;
            }
        }

        postEl.innerHTML = `
            <div class="post-header">
                <strong>${data.username}</strong>
            </div>
            <div class="post-body">
                <p>${data.text}</p>
                ${fileContent}
            </div>
            <div class="post-actions">
                <button class="likeBtn">👍 ${data.likes || 0}</button>
                <button class="dislikeBtn">🖕 ${data.dislikes || 0}</button>
                <button class="commentBtn">💬</button>
                <button class="shareBtn">Share</button>
                <button class="deleteBtn">Delete</button>
            </div>
            <div class="post-comments"></div>
        `;

        // Attach event listeners
        const likeBtn = postEl.querySelector(".likeBtn");
        const dislikeBtn = postEl.querySelector(".dislikeBtn");
        const deleteBtn = postEl.querySelector(".deleteBtn");
        const commentBtn = postEl.querySelector(".commentBtn");

        likeBtn.addEventListener("click", async () => {
            try {
                const postRef = doc(db, "posts", doc.id);
                await postRef.update({ likes: (data.likes || 0) + 1 });
            } catch (err) { console.error(err); }
        });

        dislikeBtn.addEventListener("click", async () => {
            try {
                const postRef = doc(db, "posts", doc.id);
                await postRef.update({ dislikes: (data.dislikes || 0) + 1 });
            } catch (err) { console.error(err); }
        });

        deleteBtn.addEventListener("click", async () => {
            try {
                const postRef = doc(db, "posts", doc.id);
                if (auth.currentUser.uid === data.userId) {
                    await postRef.delete();
                } else {
                    alert("You can only delete your own posts.");
                }
            } catch (err) { console.error(err); }
        });

        postsContainer.appendChild(postEl);
    });
});
