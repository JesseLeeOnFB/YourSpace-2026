import { getFirestore, collection, addDoc, getDocs, doc, deleteDoc, updateDoc, query, orderBy } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";
import { getStorage, ref as storageRef, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-storage.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js";

// INIT
const db = getFirestore();
const storage = getStorage();
const auth = getAuth();

// NAVIGATION BUTTONS
document.addEventListener("DOMContentLoaded", () => {
    const homeBtn = document.getElementById("homeBtn");
    const profileBtn = document.getElementById("profileBtn");
    const logoutBtn = document.getElementById("logoutBtn");

    if (homeBtn) homeBtn.addEventListener("click", () => window.location.href="feed.html");
    if (profileBtn) profileBtn.addEventListener("click", () => window.location.href="profile.html");
    if (logoutBtn) logoutBtn.addEventListener("click", async () => {
        try {
            await auth.signOut();
            window.location.href="login.html";
        } catch(err){ alert("Logout failed. Check console."); console.error(err);}
    });
});

// AUTH STATE
onAuthStateChanged(auth, user => {
    if (!user) window.location.href="login.html";
    else loadPosts();
});

// POST CREATION
const postBtn = document.getElementById("postBtn");
if(postBtn) postBtn.addEventListener("click", async () => {
    const text = document.getElementById("postText").value.trim();
    const fileInput = document.getElementById("postFileInput");
    if(!text && !fileInput.files.length) { alert("Enter text or select file"); return; }

    const postData = { userId: auth.currentUser.uid, text, timestamp: Date.now(), likes: 0, dislikes: 0, comments: [] };

    try {
        // Upload media if exists
        if(fileInput.files.length){
            const file = fileInput.files[0];
            const mediaRef = storageRef(storage, `posts/${auth.currentUser.uid}/${Date.now()}_${file.name}`);
            await uploadBytes(mediaRef, file);
            postData.mediaURL = await getDownloadURL(mediaRef);
            postData.mediaType = file.type.startsWith("video/") ? "video" : "image";
        }

        await addDoc(collection(db, "posts"), postData);
        document.getElementById("postText").value = "";
        fileInput.value = "";
        loadPosts();
    } catch(err){ console.error(err); alert("Post failed. Check console."); }
});

// LOAD POSTS
async function loadPosts(){
    const postsContainer = document.getElementById("postsContainer");
    if(!postsContainer) return;
    postsContainer.innerHTML = "";

    try {
        const q = query(collection(db,"posts"), orderBy("timestamp","desc"));
        const querySnapshot = await getDocs(q);

        for(const docSnap of querySnapshot.docs){
            const post = docSnap.data();
            const postId = docSnap.id;

            // Get username
            let username = "Anonymous";
            try {
                const userSnap = await getDocs(query(collection(db,"users")));
                const matchedUser = userSnap.docs.find(u => u.id === post.userId);
                if(matchedUser) username = matchedUser.data().username || "Anonymous";
            } catch(e){ console.warn("Username fetch failed", e); }

            // Create post container
            const postDiv = document.createElement("div");
            postDiv.classList.add("postContainer");
            postDiv.innerHTML = `
                <div class="postHeader">
                    <span class="postUser">${username}</span>
                    <button class="deleteBtn">Delete</button>
                </div>
                <div class="postContent">
                    ${post.text ? `<p>${post.text}</p>` : ""}
                    ${post.mediaURL ? (post.mediaType==="video" ? `<video src="${post.mediaURL}" controls></video>` : `<img src="${post.mediaURL}" />`) : ""}
                </div>
                <div class="postActions">
                    <button class="likeBtn">👍 ${post.likes || 0}</button>
                    <button class="dislikeBtn">🖕 ${post.dislikes || 0}</button>
                    <button class="commentBtn">Comment</button>
                    <button class="shareBtn">Share</button>
                    <div class="commentsContainer"></div>
                </div>
            `;
            postsContainer.appendChild(postDiv);

            // LIKE / DISLIKE
            postDiv.querySelector(".likeBtn").addEventListener("click", async()=> updateDoc(doc(db,"posts",postId),{likes:(post.likes||0)+1}));
            postDiv.querySelector(".dislikeBtn").addEventListener("click", async()=> updateDoc(doc(db,"posts",postId),{dislikes:(post.dislikes||0)+1}));

            // DELETE
            postDiv.querySelector(".deleteBtn").addEventListener("click", async()=>{
                await deleteDoc(doc(db,"posts",postId));
                postDiv.remove();
            });

            // COMMENT
            const commentBtn = postDiv.querySelector(".commentBtn");
            const commentsContainer = postDiv.querySelector(".commentsContainer");
            commentBtn.addEventListener("click", ()=>{
                if(commentsContainer.querySelector("input")) return; // already open
                const input = document.createElement("input");
                input.placeholder = "Write a comment...";
                const submit = document.createElement("button");
                submit.textContent = "Send";
                submit.addEventListener("click", async()=>{
                    const commentText = input.value.trim();
                    if(!commentText) return;
                    const newComments = post.comments || [];
                    newComments.push({userId: auth.currentUser.uid, text: commentText});
                    await updateDoc(doc(db,"posts",postId), {comments:newComments});
                    input.remove();
                    submit.remove();
                    loadPosts(); // reload to show comment
                });
                commentsContainer.appendChild(input);
                commentsContainer.appendChild(submit);
            });

            // SHARE
            postDiv.querySelector(".shareBtn").addEventListener("click", ()=>{
                navigator.clipboard.writeText(window.location.href + "#post-" + postId);
                alert("Post link copied!");
            });
        }
    } catch(err){ console.error("Failed to load posts", err); }
}
