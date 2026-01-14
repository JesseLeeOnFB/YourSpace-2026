// feed.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";
import { getFirestore, collection, addDoc, getDocs, doc, updateDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-storage.js";

// ---- Firebase config ----
const firebaseConfig = {
  apiKey: "AIzaSyAHMbxr7rJS88ZefVJzt8p_9CCTstLmLU8",
  authDomain: "yourspace-2026.firebaseapp.com",
  projectId: "yourspace-2026",
  storageBucket: "yourspace-2026.firebasestorage.app",
  messagingSenderId: "72667267302",
  appId: "1:72667267302:web:2bed5f543e05d49ca8fb27",
  measurementId: "G-FZ4GFXWGSS"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

// ---- Elements ----
const postTextInput = document.getElementById("postText");
const postFileInput = document.getElementById("postFileInput");
const imagePreview = document.getElementById("imagePreview");
const videoPreview = document.getElementById("videoPreview");
const postBtn = document.getElementById("postBtn");
const postsContainer = document.getElementById("postsContainer");
const postTemplate = document.getElementById("postTemplate");

// ---- Helpers ----
function resetFilePreviews() {
  imagePreview.style.display = "none";
  imagePreview.src = "";
  videoPreview.style.display = "none";
  videoPreview.src = "";
}

// ---- File input preview ----
postFileInput.addEventListener("change", () => {
  const file = postFileInput.files[0];
  resetFilePreviews();
  if (!file) return;

  const type = file.type || file.name.split(".").pop().toLowerCase();
  if (file.type.startsWith("image") || ["jpg","jpeg","png","gif"].includes(type)) {
    imagePreview.src = URL.createObjectURL(file);
    imagePreview.style.display = "block";
  } else if (file.type.startsWith("video") || ["mp4","mov","webm"].includes(type)) {
    videoPreview.src = URL.createObjectURL(file);
    videoPreview.style.display = "block";
  }
});

// ---- Render posts ----
async function renderPosts() {
  postsContainer.innerHTML = "";
  const snapshot = await getDocs(collection(db, "posts"));
  snapshot.forEach(docSnap => {
    const postData = docSnap.data();
    const postEl = postTemplate.content.cloneNode(true);

    // Username & Profile Pic
    postEl.querySelector(".postUsername").textContent = postData.username || "Anonymous";
    postEl.querySelector(".postProfilePic").src = postData.profilePic || "default-avatar.png";

    // Text
    postEl.querySelector(".postText").textContent = postData.text || "";

    // Image / Video
    const postImage = postEl.querySelector(".postImage");
    const postVideo = postEl.querySelector(".postVideo");
    if (postData.postImage) {
      postImage.src = postData.postImage;
      postImage.style.display = "block";
    }
    if (postData.postVideo) {
      postVideo.src = postData.postVideo;
      postVideo.style.display = "block";
    }

    // Actions
    const likeBtn = postEl.querySelector(".likeBtn");
    const dislikeBtn = postEl.querySelector(".dislikeBtn");
    const commentBtn = postEl.querySelector(".commentBtn");
    const shareBtn = postEl.querySelector(".shareBtn");
    const deleteBtn = postEl.querySelector(".deleteBtn");
    const commentsSection = postEl.querySelector(".commentsSection");

    likeBtn.addEventListener("click", async () => {
      await updateDoc(doc(db, "posts", docSnap.id), { likes: (postData.likes || 0) + 1 });
      renderPosts();
    });
    dislikeBtn.addEventListener("click", async () => {
      await updateDoc(doc(db, "posts", docSnap.id), { dislikes: (postData.dislikes || 0) + 1 });
      renderPosts();
    });
    commentBtn.addEventListener("click", async () => {
      const comment = prompt("Enter your comment:");
      if (!comment) return;
      const newComments = [...(postData.comments || []), { text: comment, username: auth.currentUser.displayName || "Anonymous" }];
      await updateDoc(doc(db, "posts", docSnap.id), { comments: newComments });
      renderPosts();
    });
    shareBtn.addEventListener("click", () => alert("Share function not yet implemented."));
    deleteBtn.addEventListener("click", async () => {
      if (confirm("Delete this post?")) {
        await deleteDoc(doc(db, "posts", docSnap.id));
        renderPosts();
      }
    });

    // Render comments
    if (postData.comments) {
      postData.comments.forEach(c => {
        const commentEl = document.createElement("div");
        commentEl.textContent = `${c.username || "Anonymous"}: ${c.text}`;
        commentsSection.appendChild(commentEl);
      });
    }

    postsContainer.appendChild(postEl);
  });
}

// ---- Post creation ----
postBtn.addEventListener("click", async () => {
  if (!auth.currentUser) return alert("Not signed in");

  postBtn.disabled = true;
  postBtn.textContent = "Posting...";

  let postImageURL = "";
  let postVideoURL = "";
  const file = postFileInput.files[0];
  if (file) {
    let contentType = file.type;
    if (!contentType) {
      const ext = file.name.split('.').pop().toLowerCase();
      if (["jpg","jpeg","png","gif"].includes(ext)) contentType = "image/jpeg";
      if (["mp4","mov","webm"].includes(ext)) contentType = "video/mp4";
    }
    try {
      const storageRef = ref(storage, `posts/${auth.currentUser.uid}/${Date.now()}_${file.name}`);
      const snapshot = await uploadBytes(storageRef, file, { contentType });
      const downloadURL = await getDownloadURL(snapshot.ref);
      if (contentType.startsWith("image")) postImageURL = downloadURL;
      if (contentType.startsWith("video")) postVideoURL = downloadURL;
    } catch(err) {
      console.error("Upload failed:", err);
      alert("Upload failed. Check console.");
      postBtn.disabled = false;
      postBtn.textContent = "Post";
      return;
    }
  }

  try {
    await addDoc(collection(db, "posts"), {
      text: postTextInput.value || null,
      postImage: postImageURL || null,
      postVideo: postVideoURL || null,
      username: auth.currentUser.displayName || "Anonymous",
      profilePic: auth.currentUser.photoURL || "",
      likes: 0,
      dislikes: 0,
      comments: [],
      createdAt: new Date()
    });
    postTextInput.value = "";
    postFileInput.value = "";
    resetFilePreviews();
    renderPosts();
  } catch(err) {
    console.error("Post creation failed:", err);
    alert("Post creation failed. Check console.");
  }

  postBtn.disabled = false;
  postBtn.textContent = "Post";
});

// ---- Auth state ----
onAuthStateChanged(auth, user => {
  if (!user) {
    window.location.href = "index.html";
  } else {
    renderPosts();
  }
});
