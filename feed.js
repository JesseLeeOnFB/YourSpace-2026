const postFileInput = document.getElementById("postFileInput");
const postBtn = document.getElementById("postBtn");
const postInput = document.getElementById("postText");
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getFirestore, collection, doc, addDoc, getDocs, updateDoc, arrayUnion, onSnapshot } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-storage.js";
console.log("File input element:", postFileInput);

// -------------------- Firebase Init --------------------
const firebaseConfig = {
  apiKey: "AIzaSyAHMbxr7rJS88ZefVJzt8p_9CCTstLmLU8",
  authDomain: "yourspace-2026.firebaseapp.com",
  projectId: "yourspace-2026",
  storageBucket: "yourspace-2026.appspot.com",
  messagingSenderId: "72667267302",
  appId: "1:72667267302:web:2bed5f543e05d49ca8fb27"
};
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(
  app,
  "gs://yourspace-2026.firebasestorage.app"
);

// -------------------- DOM Elements --------------------
const postText = document.getElementById("postText");
const postFileInput = document.getElementById("postFileInput");
const imagePreview = document.getElementById("imagePreview");
const postBtn = document.getElementById("postBtn");
const notifyEmail = document.getElementById("notifyEmail");
const notifyBrowser = document.getElementById("notifyBrowser");
const postsContainer = document.getElementById("postsContainer");
const homeBtn = document.getElementById("homeBtn");
const profileBtn = document.getElementById("profileBtn");
const logoutBtn = document.getElementById("logoutBtn");

// -------------------- Auth --------------------
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "index.html";
    return;
  }

  homeBtn.onclick = () => window.location.href = "feed.html";
  profileBtn.onclick = () => window.location.href = "profile.html";
  logoutBtn.onclick = async () => {
    await signOut(auth);
    window.location.href = "index.html";
  };

  loadFeed();
});

// -------------------- Image Preview --------------------
postFileInput.addEventListener("change", () => {
  const file = postFileInput.files[0];
  if (!file) {
    imagePreview.style.display = "none";
    return;
  }
  imagePreview.src = URL.createObjectURL(file);
  imagePreview.style.display = "block";
});

// -------------------- Post Creation --------------------
postBtn.onclick = async () => {
  const user = auth.currentUser;
  if (!user) return alert("Not authenticated");
  postBtn.disabled = true;

  let postImageURL = null;
  let postVideoURL = null;

  try {
    const file = postFileInput.files[0];
    if (file) {
      let contentType = file.type;
      if (!contentType) {
        const ext = file.name.split('.').pop().toLowerCase();
        if (["jpg","jpeg","png","gif"].includes(ext)) contentType = "image/jpeg";
        if (["mp4","mov","webm"].includes(ext)) contentType = "video/mp4";
      }

      const safeName = encodeURIComponent(file.name);
      const storageRef = ref(storage, `posts/${user.uid}/${Date.now()}_${safeName}`);
      const snapshot = await uploadBytes(storageRef, file, { contentType });
      const fileURL = await getDownloadURL(snapshot.ref);

      if (contentType.startsWith("image/")) postImageURL = fileURL;
      else if (contentType.startsWith("video/")) postVideoURL = fileURL;
    }

    // Handle mentions @username
    const mentions = [];
    const mentionRegex = /@(\w+)/g;
    let match;
    while ((match = mentionRegex.exec(postText.value)) !== null) {
      mentions.push(match[1]);
    }

    // Add post to Firestore
    await addDoc(collection(db, "posts"), {
      userId: user.uid,
      text: postText.value || null,
      postImage: postImageURL,
      postVideo: postVideoURL,
      mentions,
      likes: 0,
      dislikes: 0,
      comments: [],
      createdAt: Date.now(),
      notifyEmail: notifyEmail.checked,
      notifyBrowser: notifyBrowser.checked
    });

    postText.value = "";
    postFileInput.value = "";
    imagePreview.style.display = "none";

  } catch (err) {
    console.error(err);
    alert("Post creation failed. Check console.");
  } finally {
    postBtn.disabled = false;
  }
};

// -------------------- Load Feed --------------------
async function loadFeed() {
  onSnapshot(collection(db, "posts"), snapshot => {
    postsContainer.innerHTML = "";
    snapshot.docs
      .sort((a,b) => b.data().createdAt - a.data().createdAt)
      .forEach(docSnap => renderPost(docSnap));
  });
}

// -------------------- Render Post --------------------
function renderPost(docSnap) {
  const data = docSnap.data();
  const postId = docSnap.id;

  const postDiv = document.createElement("div");
  postDiv.className = "post";

  // Text
  if (data.text) {
    const p = document.createElement("p");
    p.textContent = data.text;
    postDiv.appendChild(p);
  }

  // Image
  if (data.postImage) {
    const img = document.createElement("img");
    img.src = data.postImage;
    img.style.maxWidth = "300px";
    img.style.maxHeight = "300px";
    postDiv.appendChild(img);
  }

  // Video
  if (data.postVideo) {
    const video = document.createElement("video");
    video.src = data.postVideo;
    video.controls = true;
    video.style.maxWidth = "300px";
    video.style.maxHeight = "300px";
    postDiv.appendChild(video);
  }

  // Buttons: Like, Dislike, Comment, Share, Delete
  const btnDiv = document.createElement("div");
  btnDiv.className = "postButtons";

  const likeBtn = document.createElement("button");
  likeBtn.textContent = "👍 " + data.likes;
  likeBtn.onclick = async () => {
    await updateDoc(doc(db, "posts", postId), { likes: data.likes + 1 });
  };
  btnDiv.appendChild(likeBtn);

  const dislikeBtn = document.createElement("button");
  dislikeBtn.textContent = "🖕 " + (data.dislikes || 0);
  dislikeBtn.onclick = async () => {
    await updateDoc(doc(db, "posts", postId), { dislikes: (data.dislikes || 0) + 1 });
  };
  btnDiv.appendChild(dislikeBtn);

  const commentBtn = document.createElement("button");
  commentBtn.textContent = "💬 Comment";
  commentBtn.onclick = async () => {
    const commentText = prompt("Enter comment:");
    if (commentText) {
      await updateDoc(doc(db, "posts", postId), {
        comments: arrayUnion({ text: commentText, userId: auth.currentUser.uid, createdAt: Date.now() })
      });
    }
  };
  btnDiv.appendChild(commentBtn);

  const shareBtn = document.createElement("button");
  shareBtn.textContent = "Share";
  shareBtn.onclick = () => alert("Share feature not implemented yet");
  btnDiv.appendChild(shareBtn);

  // Delete post button if owner
  if (data.userId === auth.currentUser.uid) {
    const deleteBtn = document.createElement("button");
    deleteBtn.textContent = "Delete";
    deleteBtn.onclick = async () => {
      if (confirm("Delete this post?")) {
        await doc(db, "posts", postId).delete();
      }
    };
    btnDiv.appendChild(deleteBtn);
  }

  // Comments display
  if (data.comments && data.comments.length > 0) {
    const commentsDiv = document.createElement("div");
    commentsDiv.className = "comments";
    data.comments.forEach(c => {
      const cDiv = document.createElement("div");
      cDiv.textContent = `${c.userId}: ${c.text}`;
      commentsDiv.appendChild(cDiv);
    });
    postDiv.appendChild(commentsDiv);
  }

  postDiv.appendChild(btnDiv);
  postsContainer.appendChild(postDiv);
}
