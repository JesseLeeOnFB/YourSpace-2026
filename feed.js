import { getFirestore, collection, addDoc, getDocs, query, orderBy, updateDoc, doc, arrayUnion } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-storage.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";

// Firebase references
const db = getFirestore();
const storage = getStorage();
const auth = getAuth();

const postsContainer = document.getElementById("postsContainer");
const postText = document.getElementById("postText");
const postFileInput = document.getElementById("postFileInput");
const postBtn = document.getElementById("postBtn");

// NAV BUTTONS (top nav)
document.addEventListener("DOMContentLoaded", () => {
    const homeBtn = document.getElementById("homeBtn");
    const profileBtn = document.getElementById("profileBtn");
    const logoutBtn = document.getElementById("logoutBtn");

    if(homeBtn) homeBtn.addEventListener("click", () => window.location.href="feed.html");
    if(profileBtn) profileBtn.addEventListener("click", () => window.location.href="profile.html");
    if(logoutBtn) logoutBtn.addEventListener("click", async () => {
        await auth.signOut();
        window.location.href="login.html";
    });
});

// Load posts on page load
async function loadPosts() {
    postsContainer.innerHTML = "";
    const q = query(collection(db, "posts"), orderBy("timestamp", "desc"));
    const querySnapshot = await getDocs(q);
    querySnapshot.forEach(docSnap => {
        const post = docSnap.data();
        const postId = docSnap.id;
        const postEl = document.createElement("div");
        postEl.classList.add("post-container");

        // Username clickable
        const userLink = document.createElement("span");
        userLink.classList.add("post-username");
        userLink.textContent = post.username || "Anonymous";
        userLink.addEventListener("click", () => {
            window.location.href = `userProfile.html?uid=${post.userId}`;
        });

        // Text
        const textEl = document.createElement("p");
        textEl.textContent = post.text;

        postEl.appendChild(userLink);
        postEl.appendChild(textEl);

        // Media
        if(post.mediaURL) {
            if(post.mediaType === "image") {
                const img = document.createElement("img");
                img.src = post.mediaURL;
                img.classList.add("post-media");
                postEl.appendChild(img);
            } else if(post.mediaType === "video") {
                const video = document.createElement("video");
                video.src = post.mediaURL;
                video.controls = true;
                video.classList.add("post-media");
                postEl.appendChild(video);
            }
        }

        // Buttons
        const likeBtn = document.createElement("button");
        likeBtn.textContent = "👍";
        likeBtn.addEventListener("click", async () => {
            await updateDoc(doc(db,"posts",postId), { likes: (post.likes || 0) + 1 });
            loadPosts();
        });

        const dislikeBtn = document.createElement("button");
        dislikeBtn.textContent = "🖕";
        dislikeBtn.addEventListener("click", async () => {
            await updateDoc(doc(db,"posts",postId), { dislikes: (post.dislikes || 0) + 1 });
            loadPosts();
        });

        const deleteBtn = document.createElement("button");
        deleteBtn.textContent = "Delete";
        deleteBtn.addEventListener("click", async () => {
            await updateDoc(doc(db,"posts",postId), { text: "[Deleted]" });
            loadPosts();
        });

        postEl.appendChild(likeBtn);
        postEl.appendChild(dislikeBtn);
        postEl.appendChild(deleteBtn);

        postsContainer.appendChild(postEl);
    });
}

auth.onAuthStateChanged(user => {
    if(!user) window.location.href="login.html";
    else loadPosts();
});

// Create new post
postBtn.addEventListener("click", async () => {
    const user = auth.currentUser;
    if(!user) return alert("You must be logged in to post.");

    let fileURL = "";
    let fileType = "";

    const file = postFileInput.files[0];
    if(file) {
        const storageRef = ref(storage, `posts/${user.uid}/${Date.now()}_${file.name}`);
        await uploadBytes(storageRef, file);
        fileURL = await getDownloadURL(storageRef);
        fileType = file.type.split("/")[0]; // image/video
    }

    try {
        await addDoc(collection(db,"posts"), {
            userId: user.uid,
            username: user.displayName || "Anonymous",
            text: postText.value || "",
            mediaURL: fileURL,
            mediaType: fileType,
            timestamp: Date.now(),
            likes: 0,
            dislikes: 0,
            comments: []
        });
        postText.value = "";
        postFileInput.value = "";
        loadPosts();
    } catch(err) {
        console.error("Failed to post:", err);
        alert("Post failed. Check console.");
    }
});
