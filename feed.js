import { auth, storage, db } from "./firebaseConfig.js"; // your working Firebase config
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { collection, addDoc, getDocs, updateDoc, deleteDoc, doc, serverTimestamp } from "firebase/firestore";

const postsContainer = document.getElementById("postsContainer");
const postBtn = document.getElementById("postBtn");
const postText = document.getElementById("postText");
const postFileInput = document.getElementById("postFileInput");
const imagePreview = document.getElementById("imagePreview");

// IMAGE PREVIEW
postFileInput.addEventListener("change", () => {
  const file = postFileInput.files[0];
  if (!file) return;
  imagePreview.src = URL.createObjectURL(file);
  imagePreview.style.display = "block";
});

// CREATE POST
postBtn.addEventListener("click", async () => {
  if (!auth.currentUser) {
    alert("You must be logged in to post!");
    return;
  }

  const text = postText.value.trim();
  const file = postFileInput.files[0];
  let postImage = "";
  let postVideo = "";

  if (file) {
    const ext = file.name.split(".").pop().toLowerCase();
    let contentType = file.type;

    if (!contentType) {
      if (["jpg", "jpeg", "png", "gif"].includes(ext)) contentType = "image/jpeg";
      if (["mp4", "mov", "webm"].includes(ext)) contentType = "video/mp4";
    }

    const storageRef = ref(storage, `posts/${auth.currentUser.uid}/${Date.now()}_${file.name}`);
    try {
      const snapshot = await uploadBytes(storageRef, file, { contentType });
      const downloadURL = await getDownloadURL(snapshot.ref);
      if (contentType.startsWith("image")) postImage = downloadURL;
      if (contentType.startsWith("video")) postVideo = downloadURL;
    } catch (err) {
      console.error("Upload failed:", err);
      alert("Upload failed. Check console.");
      return;
    }
  }

  // Save post to Firestore
  try {
    await addDoc(collection(db, "posts"), {
      userId: auth.currentUser.uid,
      username: auth.currentUser.displayName || "Anonymous",
      text: text || "",
      postImage,
      postVideo,
      likes: 0,
      dislikes: 0,
      comments: [],
      createdAt: serverTimestamp()
    });

    postText.value = "";
    postFileInput.value = "";
    imagePreview.style.display = "none";
    imagePreview.src = "";

    loadPosts(); // refresh feed
  } catch (err) {
    console.error("Post save failed:", err);
    alert("Failed to save post. Check console.");
  }
});

// LOAD POSTS
async function loadPosts() {
  postsContainer.innerHTML = "";
  const postsSnap = await getDocs(collection(db, "posts"));
  postsSnap.forEach(docSnap => {
    const data = docSnap.data();
    const postDiv = document.createElement("div");
    postDiv.classList.add("postCard");

    // USERNAME clickable
    const usernameEl = document.createElement("span");
    usernameEl.textContent = data.username;
    usernameEl.classList.add("postUsername");
    usernameEl.style.cursor = "pointer";
    usernameEl.addEventListener("click", () => {
      window.location.href = `userProfile.html?uid=${data.userId}`;
    });

    // TEXT
    const textEl = document.createElement("p");
    textEl.textContent = data.text;

    // IMAGE
    const imgEl = document.createElement("img");
    if (data.postImage) {
      imgEl.src = data.postImage;
      imgEl.classList.add("feedImage");
    }

    // VIDEO
    const videoEl = document.createElement("video");
    if (data.postVideo) {
      videoEl.src = data.postVideo;
      videoEl.controls = true;
      videoEl.classList.add("feedVideo");
    }

    // BUTTONS
    const likeBtn = document.createElement("button");
    likeBtn.textContent = `👍 ${data.likes}`;
    likeBtn.addEventListener("click", async () => {
      const postRef = doc(db, "posts", docSnap.id);
      await updateDoc(postRef, { likes: data.likes + 1 });
      loadPosts();
    });

    const dislikeBtn = document.createElement("button");
    dislikeBtn.textContent = `🖕 ${data.dislikes}`;
    dislikeBtn.addEventListener("click", async () => {
      const postRef = doc(db, "posts", docSnap.id);
      await updateDoc(postRef, { dislikes: data.dislikes + 1 });
      loadPosts();
    });

    const deleteBtn = document.createElement("button");
    deleteBtn.textContent = "Delete";
    if (auth.currentUser.uid === data.userId) {
      deleteBtn.addEventListener("click", async () => {
        await deleteDoc(doc(db, "posts", docSnap.id));
        loadPosts();
      });
    } else {
      deleteBtn.disabled = true;
    }

    const shareBtn = document.createElement("button");
    shareBtn.textContent = "Share";
    shareBtn.addEventListener("click", () => {
      navigator.clipboard.writeText(window.location.href + "#post-" + docSnap.id);
      alert("Post link copied!");
    });

    const actionsDiv = document.createElement("div");
    actionsDiv.classList.add("postActions");
    actionsDiv.append(likeBtn, dislikeBtn, deleteBtn, shareBtn);

    // Append everything to postCard
    postDiv.append(usernameEl, textEl, imgEl, videoEl, actionsDiv);
    postsContainer.appendChild(postDiv);
  });
}

// INITIAL LOAD
auth.onAuthStateChanged(user => {
  if (user) loadPosts();
});
