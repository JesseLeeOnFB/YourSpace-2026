import { auth, db, storage } from './firebase.js';
import {
    collection, addDoc, getDocs, deleteDoc, doc, serverTimestamp, updateDoc
} from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";
import { ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-storage.js";

document.addEventListener("DOMContentLoaded", async () => {

    // NAVIGATION BUTTONS
    const homeBtn = document.getElementById("homeBtn");
    const profileBtn = document.getElementById("profileBtn");
    const logoutBtn = document.getElementById("logoutBtn");

    if (homeBtn) homeBtn.addEventListener("click", () => { window.location.href = "feed.html"; });
    if (profileBtn) profileBtn.addEventListener("click", () => { window.location.href = "profile.html"; });
    if (logoutBtn) logoutBtn.addEventListener("click", async () => {
        try { await auth.signOut(); window.location.href = "login.html"; }
        catch (err) { console.error("Logout failed:", err); }
    });

    const postsContainer = document.getElementById("postsContainer");
    const postText = document.getElementById("postText");
    const postFileInput = document.getElementById("postFileInput");
    const postBtn = document.getElementById("postBtn");

    // CREATE POST
    postBtn.addEventListener("click", async () => {
        if (!auth.currentUser) { alert("You must be logged in."); return; }

        let postData = { userId: auth.currentUser.uid, text: postText.value || null, likes: 0, dislikes: 0, comments: [], createdAt: serverTimestamp() };

        // Handle image/video
        if (postFileInput.files.length > 0) {
            const file = postFileInput.files[0];
            const fileRef = ref(storage, `posts/${auth.currentUser.uid}/${file.name}`);
            await uploadBytes(fileRef, file);
            const url = await getDownloadURL(fileRef);
            if (file.type.startsWith("image/")) postData.postImage = url;
            else if (file.type.startsWith("video/")) postData.postVideo = url;
        }

        try {
            await addDoc(collection(db, "posts"), postData);
            postText.value = "";
            postFileInput.value = "";
            loadPosts(); // Refresh feed
        } catch (err) { console.error("Post failed:", err); alert("Post failed. Check console."); }
    });

    // LOAD POSTS
    async function loadPosts() {
        postsContainer.innerHTML = "";
        try {
            const postsSnap = await getDocs(collection(db, "posts"));
            postsSnap.forEach(docSnap => {
                const data = docSnap.data();
                const postId = docSnap.id;
                const postEl = document.createElement("div");
                postEl.className = "post-container";

                let username = data.userId; // Could resolve to displayName if stored

                postEl.innerHTML = `
                    <div class="post-header">
                        <span class="post-username" data-uid="${data.userId}">${username}</span>
                        <button class="delete-post">Delete</button>
                        <button class="share-btn">Share</button>
                    </div>
                    <div class="post-content">
                        ${data.text ? `<p>${data.text}</p>` : ""}
                        ${data.postImage ? `<img src="${data.postImage}" class="post-media"/>` : ""}
                        ${data.postVideo ? `<video controls class="post-media"><source src="${data.postVideo}"></video>` : ""}
                    </div>
                    <div class="post-actions">
                        <button class="like-btn">👍 ${data.likes}</button>
                        <button class="dislike-btn">🖕 ${data.dislikes}</button>
                    </div>
                    <div class="post-comments">
                        <input type="text" placeholder="Write a comment..." class="comment-input"/>
                        <button class="comment-btn">Comment</button>
                        <div class="comments-list"></div>
                    </div>
                `;
                postsContainer.appendChild(postEl);

                // CLICKABLE USERNAME
                postEl.querySelector(".post-username").addEventListener("click", () => {
                    window.location.href = `userProfile.html?uid=${data.userId}`;
                });

                // DELETE POST
                postEl.querySelector(".delete-post").addEventListener("click", async () => {
                    try { await deleteDoc(doc(db, "posts", postId)); postEl.remove(); }
                    catch (err) { console.error("Failed to delete post:", err); }
                });

                // SHARE POST
                postEl.querySelector(".share-btn").addEventListener("click", () => {
                    const url = `${window.location.origin}/feed.html#${postId}`;
                    navigator.clipboard.writeText(url)
                        .then(() => alert("Post URL copied!"))
                        .catch(() => alert("Failed to copy URL."));
                });

                // LIKE / DISLIKE
                const likeBtn = postEl.querySelector(".like-btn");
                likeBtn.addEventListener("click", async () => {
                    const newLikes = (data.likes || 0) + 1;
                    await updateDoc(doc(db, "posts", postId), { likes: newLikes });
                    likeBtn.textContent = `👍 ${newLikes}`;
                });
                const dislikeBtn = postEl.querySelector(".dislike-btn");
                dislikeBtn.addEventListener("click", async () => {
                    const newDislikes = (data.dislikes || 0) + 1;
                    await updateDoc(doc(db, "posts", postId), { dislikes: newDislikes });
                    dislikeBtn.textContent = `🖕 ${newDislikes}`;
                });

                // COMMENTS
                const commentBtn = postEl.querySelector(".comment-btn");
                const commentInput = postEl.querySelector(".comment-input");
                const commentsList = postEl.querySelector(".comments-list");

                commentBtn.addEventListener("click", async () => {
                    if (!commentInput.value) return;
                    const comment = { userId: auth.currentUser.uid, text: commentInput.value, createdAt: serverTimestamp() };
                    const updatedComments = data.comments ? [...data.comments, comment] : [comment];
                    await updateDoc(doc(db, "posts", postId), { comments: updatedComments });
                    const commentEl = document.createElement("div");
                    commentEl.textContent = `${comment.userId}: ${comment.text}`;
                    commentsList.appendChild(commentEl);
                    commentInput.value = "";
                });
            });
        } catch (err) { console.error("Failed to load posts:", err); }
    }

    loadPosts();
});
