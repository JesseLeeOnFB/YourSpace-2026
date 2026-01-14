// feed.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import {
  getFirestore,
  collection,
  addDoc,
  query,
  orderBy,
  onSnapshot,
  doc,
  getDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  increment,
  arrayUnion
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-storage.js";

// ---------------- Firebase Init ----------------
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

// ---------------- DOM ----------------
const postInput = document.getElementById("postText");
const postBtn = document.getElementById("postBtn");
const postFileInput = document.getElementById("postFileInput");
const imagePreview = document.getElementById("imagePreview");
const postsContainer = document.getElementById("postsContainer");

const homeBtn = document.getElementById("homeBtn");
const profileBtn = document.getElementById("profileBtn");
const logoutBtn = document.getElementById("logoutBtn");

const notifyEmail = document.getElementById("notifyEmail");
const notifyBrowser = document.getElementById("notifyBrowser");

// ---------------- Image/Video Preview ----------------
postFileInput.addEventListener("change", () => {
  const file = postFileInput.files[0];
  if (!file) {
    imagePreview.style.display = "none";
    return;
  }
  if (file.type.startsWith("image/")) {
    imagePreview.src = URL.createObjectURL(file);
    imagePreview.style.display = "block";
  } else {
    imagePreview.src = "";
    imagePreview.style.display = "none";
  }
});

// ---------------- Auth & Navigation ----------------
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "index.html";
    return;
  }

  // Nav
  homeBtn.onclick = () => window.location.href = "feed.html";
  profileBtn.onclick = () => window.location.href = "profile.html";
  logoutBtn.onclick = async () => {
    await signOut(auth);
    window.location.href = "index.html";
  };

  // ---------------- Create Post ----------------
  postBtn.onclick = async () => {
    const text = postInput.value.trim();
    const file = postFileInput.files[0];

    if (!text && !file) return alert("Write something or attach a file.");

    postBtn.disabled = true;

    let postImage = "";
    let postVideo = "";

    try {
      // Handle file upload
      if (file) {
        let contentType = file.type;
        if (!contentType) {
          const ext = file.name.split(".").pop().toLowerCase();
          if (["jpg","jpeg","png","gif"].includes(ext)) contentType = "image/jpeg";
          if (["mp4","mov","webm"].includes(ext)) contentType = "video/mp4";
        }

        let folder = contentType.startsWith("image/") ? "posts" : "posts";
        const storageRef = ref(storage, `${folder}/${user.uid}/${Date.now()}_${encodeURIComponent(file.name)}`);
        const snapshot = await uploadBytes(storageRef, file, { contentType });
        const downloadURL = await getDownloadURL(snapshot.ref);

        if (contentType.startsWith("image/")) postImage = downloadURL;
        else postVideo = downloadURL;
      }

      // Get user profile info
      const userSnap = await getDoc(doc(db, "users", user.uid));
      const profile = userSnap.exists() ? userSnap.data() : {};

      // Handle mentions @username
      const mentions = [];
      const mentionRegex = /@(\w+)/g;
      let match;
      while ((match = mentionRegex.exec(text)) !== null) {
        mentions.push(match[1]);
      }

      // Create post
      await addDoc(collection(db, "posts"), {
        text: text || null,
        postImage: postImage || null,
        postVideo: postVideo || null,
        userId: user.uid,
        displayName: profile.displayName || "Anonymous",
        photoURL: profile.photoURL || "",
        likes: 0,
        dislikes: 0,
        comments: [],
        mentions: mentions,
        createdAt: serverTimestamp()
      });

      // Notifications
      if (notifyBrowser.checked && Notification.permission === "granted") {
        new Notification("Your post was created!");
      }
      if (notifyEmail.checked) {
        // Send email via backend or 3rd party
        console.log("Email notification would be sent here.");
      }

      // Reset UI
      postInput.value = "";
      postFileInput.value = "";
      imagePreview.style.display = "none";

    } catch (err) {
      console.error(err);
      alert("Post creation failed. Check console.");
    } finally {
      postBtn.disabled = false;
    }
  };

  // ---------------- Load Feed ----------------
  const q = query(collection(db, "posts"), orderBy("createdAt", "desc"));
  onSnapshot(q, (snapshot) => {
    postsContainer.innerHTML = "";

    snapshot.forEach((docSnap) => {
      const data = docSnap.data();

      const post = document.createElement("div");
      post.className = "post";

      const mediaHTML = data.postImage
        ? `<img src="${data.postImage}" class="postMedia">`
        : data.postVideo
          ? `<video src="${data.postVideo}" class="postMedia" controls></video>`
          : "";

      post.innerHTML = `
        <div class="postHeader">
          <img src="${data.photoURL || 'default-avatar.png'}" class="postProfilePic">
          <strong>${data.displayName}</strong>
        </div>
        <p>${data.text || ""}</p>
        ${mediaHTML}
        <div class="postButtons">
          <button class="likeBtn">👍 (${data.likes || 0})</button>
          <button class="dislikeBtn">🖕 (${data.dislikes || 0})</button>
          <button class="commentBtn">💬</button>
          <button class="shareBtn">🔗</button>
          ${user.uid === data.userId ? '<button class="deleteBtn">Delete</button>' : ''}
        </div>
        <div class="commentsContainer"></div>
      `;

      postsContainer.appendChild(post);

      // Like
      post.querySelector(".likeBtn").onclick = async () => {
        await updateDoc(doc(db, "posts", docSnap.id), {
          likes: increment(1)
        });
      };

      // Dislike
      post.querySelector(".dislikeBtn").onclick = async () => {
        await updateDoc(doc(db, "posts", docSnap.id), {
          dislikes: increment(1)
        });
      };

      // Comment
      post.querySelector(".commentBtn").onclick = async () => {
        const commentText = prompt("Enter your comment:");
        if (!commentText) return;
        const postRef = doc(db, "posts", docSnap.id);
        await updateDoc(postRef, {
          comments: arrayUnion({ text: commentText, user: user.uid })
        });

        const commentEl = document.createElement("p");
        commentEl.textContent = commentText;
        post.querySelector(".commentsContainer").appendChild(commentEl);
      };

      // Delete
      const delBtn = post.querySelector(".deleteBtn");
      if (delBtn) {
        delBtn.onclick = async () => {
          if (confirm("Delete this post?")) {
            await deleteDoc(doc(db, "posts", docSnap.id));
          }
        };
      }

      // Share (copy URL)
      post.querySelector(".shareBtn").onclick = () => {
        const url = `${window.location.href}#${docSnap.id}`;
        navigator.clipboard.writeText(url);
        alert("Post URL copied!");
      };
    });
  });
});
