// feed.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getFirestore, collection, addDoc, doc, getDoc, updateDoc, onSnapshot, serverTimestamp, arrayUnion, increment } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-storage.js";

/* -------------------- Firebase Init -------------------- */
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
const storage = getStorage(app);

/* -------------------- DOM -------------------- */
const postText = document.getElementById("postText");
const postFileInput = document.getElementById("postFileInput");
const postBtn = document.getElementById("postBtn");
const imagePreview = document.getElementById("imagePreview");
const postsContainer = document.getElementById("postsContainer");
const notifyEmail = document.getElementById("notifyEmail");
const notifyBrowser = document.getElementById("notifyBrowser");
const homeBtn = document.getElementById("homeBtn");
const profileBtn = document.getElementById("profileBtn");
const logoutBtn = document.getElementById("logoutBtn");

/* -------------------- Auth -------------------- */
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "index.html";
    return;
  }

  const uid = user.uid;

  // Nav buttons
  homeBtn.onclick = () => window.location.href = "feed.html";
  profileBtn.onclick = () => window.location.href = "profile.html";
  logoutBtn.onclick = async () => {
    await signOut(auth);
    window.location.href = "index.html";
  };

  /* -------------------- Image/Video Preview -------------------- */
  postFileInput.addEventListener("change", () => {
    const file = postFileInput.files[0];
    if (!file) {
      imagePreview.style.display = "none";
      return;
    }
    imagePreview.src = URL.createObjectURL(file);
    imagePreview.style.display = "block";
  });

  /* -------------------- Create Post -------------------- */
  postBtn.onclick = async () => {
    const text = postText.value.trim();
    const file = postFileInput.files[0];

    if (!text && !file) {
      alert("Write something or attach an image/video.");
      return;
    }

    postBtn.disabled = true;

    try {
      let postImageURL = null;
      let postVideoURL = null;

      // Upload file if exists
      if (file) {
        let contentType = file.type;
        if (!contentType) {
          const ext = file.name.split(".").pop().toLowerCase();
          if (["jpg","jpeg","png","gif"].includes(ext)) contentType = "image/jpeg";
          if (["mp4","mov","webm"].includes(ext)) contentType = "video/mp4";
        }

        const storageRef = ref(storage, `posts/${uid}/${Date.now()}_${encodeURIComponent(file.name)}`);
        const snapshot = await uploadBytes(storageRef, file, { contentType });
        const url = await getDownloadURL(snapshot.ref);

        if (contentType.startsWith("image")) postImageURL = url;
        if (contentType.startsWith("video")) postVideoURL = url;
      }

      // Get current user profile
      const userSnap = await getDoc(doc(db, "users", uid));
      const profile = userSnap.exists() ? userSnap.data() : {};

      // Create post document
      await addDoc(collection(db, "posts"), {
        userId: uid,
        displayName: profile.username || "Anonymous",
        profilePic: profile.profilePic || "",
        text: text || null,
        postImage: postImageURL,
        postVideo: postVideoURL,
        likes: 0,
        dislikes: 0,
        comments: [],
        mentions: extractMentions(text),
        createdAt: serverTimestamp(),
        notifyEmail: notifyEmail.checked,
        notifyBrowser: notifyBrowser.checked
      });

      // Reset
      postText.value = "";
      postFileInput.value = "";
      imagePreview.style.display = "none";
    } catch (err) {
      console.error("Post creation failed:", err);
      alert("Post creation failed. Check console.");
    } finally {
      postBtn.disabled = false;
    }
  };

  /* -------------------- Load Feed -------------------- */
  const q = collection(db, "posts");
  onSnapshot(q, (snapshot) => {
    postsContainer.innerHTML = "";

    snapshot.docs
      .sort((a,b) => (b.data().createdAt?.seconds || 0) - (a.data().createdAt?.seconds || 0))
      .forEach(docSnap => {
        const data = docSnap.data();
        const postDiv = document.createElement("div");
        postDiv.className = "post";

        let mediaHTML = "";
        if (data.postImage) mediaHTML += `<img src="${data.postImage}" class="postMedia">`;
        if (data.postVideo) mediaHTML += `<video src="${data.postVideo}" class="postMedia" controls></video>`;

        // Post HTML
        postDiv.innerHTML = `
          <div class="postHeader">
            <img src="${data.profilePic || ''}" class="postProfilePic">
            <strong>${data.displayName}</strong>
          </div>
          <p>${data.text || ""}</p>
          ${mediaHTML}
          <div class="postButtons">
            <button class="likeBtn">👍 (${data.likes || 0})</button>
            <button class="dislikeBtn">🖕 (${data.dislikes || 0})</button>
            <button class="commentBtn">💬 (${data.comments?.length || 0})</button>
            <button class="shareBtn">Share</button>
            ${data.userId === uid ? `<button class="deleteBtn">Delete</button>` : ""}
          </div>
          <div class="commentsContainer"></div>
        `;

        postsContainer.appendChild(postDiv);

        // Like button
        postDiv.querySelector(".likeBtn").onclick = async () => {
          await updateDoc(doc(db, "posts", docSnap.id), { likes: increment(1) });
        };

        // Dislike button
        postDiv.querySelector(".dislikeBtn").onclick = async () => {
          await updateDoc(doc(db, "posts", docSnap.id), { dislikes: increment(1) });
        };

        // Delete button
        const delBtn = postDiv.querySelector(".deleteBtn");
        if (delBtn) delBtn.onclick = async () => {
          if (confirm("Delete post?")) await doc(db, "posts", docSnap.id).delete();
        };

        // Comment button
        const commentBtn = postDiv.querySelector(".commentBtn");
        const commentsContainer = postDiv.querySelector(".commentsContainer");

        commentBtn.onclick = () => {
          const commentBox = document.createElement("textarea");
          commentBox.placeholder = "Write a comment...";
          const submitBtn = document.createElement("button");
          submitBtn.textContent = "Post";

          submitBtn.onclick = async () => {
            const commentText = commentBox.value.trim();
            if (!commentText) return;

            await updateDoc(doc(db, "posts", docSnap.id), {
              comments: arrayUnion({ userId: uid, text: commentText, createdAt: serverTimestamp() })
            });
            commentBox.remove();
            submitBtn.remove();
          };

          commentsContainer.appendChild(commentBox);
          commentsContainer.appendChild(submitBtn);
        };
      });
  });
});

/* -------------------- Utility -------------------- */
function extractMentions(text) {
  if (!text) return [];
  const regex = /@(\w+)/g;
  const mentions = [];
  let match;
  while ((match = regex.exec(text)) !== null) mentions.push(match[1]);
  return mentions;
}
