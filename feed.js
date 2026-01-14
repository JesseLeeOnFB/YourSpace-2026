// feed.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import {
  getFirestore, collection, addDoc, query, orderBy, onSnapshot,
  doc, getDoc, updateDoc, deleteDoc, serverTimestamp, increment
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-storage.js";

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
const storage = getStorage(app);

// -------------------- DOM --------------------
const postText = document.getElementById("postText");
const postFileInput = document.getElementById("postFileInput");
const imagePreview = document.getElementById("imagePreview");
const postBtn = document.getElementById("postBtn");
const postsContainer = document.getElementById("postsContainer");
const notifyEmail = document.getElementById("notifyEmail");
const notifyBrowser = document.getElementById("notifyBrowser");

const profileBtn = document.getElementById("profileBtn");
const homeBtn = document.getElementById("homeBtn");
const logoutBtn = document.getElementById("logoutBtn");

// -------------------- Image/Video Preview --------------------
postFileInput.addEventListener("change", () => {
  const file = postFileInput.files[0];
  if (!file) {
    imagePreview.style.display = "none";
    return;
  }
  imagePreview.src = URL.createObjectURL(file);
  imagePreview.style.display = "block";
});

// -------------------- Auth --------------------
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "index.html";
    return;
  }

  profileBtn.onclick = () => (window.location.href = "profile.html");
  homeBtn.onclick = () => (window.location.href = "feed.html");
  logoutBtn.onclick = async () => {
    await signOut(auth);
    window.location.href = "index.html";
  };

  // -------------------- Create Post --------------------
  postBtn.onclick = async () => {
    const text = postText.value.trim();
    const file = postFileInput.files[0];
    if (!text && !file) {
      alert("Write something or attach a file.");
      return;
    }

    postBtn.disabled = true;
    postBtn.textContent = "Posting...";

    let postFileURL = "";
    let postFileType = "";

    try {
      if (file) {
        // Detect proper content type
        let contentType = file.type;
        if (!contentType) {
          const ext = file.name.split(".").pop().toLowerCase();
          if (["jpg","jpeg","png","gif"].includes(ext)) contentType = "image/jpeg";
          if (["mp4","mov","webm"].includes(ext)) contentType = "video/mp4";
        }

        const filePath = `posts/${user.uid}/${Date.now()}_${encodeURIComponent(file.name)}`;
        const storageRef = ref(storage, filePath);
        const snapshot = await uploadBytes(storageRef, file, { contentType });
        postFileURL = await getDownloadURL(snapshot.ref);
        postFileType = contentType.startsWith("image") ? "image" : "video";
      }

      // Get user profile
      const userSnap = await getDoc(doc(db, "users", user.uid));
      const profile = userSnap.exists() ? userSnap.data() : {};

      // Create Firestore post
      await addDoc(collection(db, "posts"), {
        text: text || null,
        postFileURL: postFileURL || null,
        postFileType: postFileType || null,
        userId: user.uid,
        displayName: profile.displayName || "Anonymous",
        photoURL: profile.photoURL || "",
        likes: 0,
        dislikes: 0,
        comments: [],
        createdAt: serverTimestamp(),
        mentions: [] // for tagging users
      });

      // Reset inputs
      postText.value = "";
      postFileInput.value = "";
      imagePreview.style.display = "none";
    } catch (err) {
      console.error(err);
      alert("Post creation failed. Check console.");
    } finally {
      postBtn.disabled = false;
      postBtn.textContent = "Post";
    }
  };

  // -------------------- Load Feed --------------------
  const q = query(collection(db, "posts"), orderBy("createdAt", "desc"));
  onSnapshot(q, (snapshot) => {
    postsContainer.innerHTML = "";
    snapshot.forEach((docSnap) => {
      const data = docSnap.data();

      const postEl = document.createElement("div");
      postEl.className = "post";

      let mediaHTML = "";
      if (data.postFileURL) {
        if (data.postFileType === "image") {
          mediaHTML = `<img src="${data.postFileURL}" class="postMedia" style="max-width:400px; max-height:300px;">`;
        } else if (data.postFileType === "video") {
          mediaHTML = `<video controls class="postMedia" style="max-width:400px; max-height:300px;">
                         <source src="${data.postFileURL}" type="video/mp4">
                       </video>`;
        }
      }

      postEl.innerHTML = `
        <strong>${data.displayName}</strong>
        <p>${data.text || ""}</p>
        ${mediaHTML}
        <div class="postButtons">
          <button class="likeBtn">👍 (${data.likes || 0})</button>
          <button class="dislikeBtn">🖕 (${data.dislikes || 0})</button>
          <button class="commentBtn">💬 Comment</button>
          <button class="shareBtn">Share</button>
          ${data.userId === user.uid ? `<button class="deleteBtn">Delete</button>` : ""}
        </div>
        <div class="commentsContainer">
          ${data.comments.map(c => `<div class="comment"><strong>${c.displayName}</strong>: ${c.text}</div>`).join("")}
        </div>
      `;

      postsContainer.appendChild(postEl);

      // -------------------- Like --------------------
      postEl.querySelector(".likeBtn").onclick = async () => {
        await updateDoc(doc(db, "posts", docSnap.id), {
          likes: increment(1)
        });
      };

      // -------------------- Dislike --------------------
      postEl.querySelector(".dislikeBtn").onclick = async () => {
        await updateDoc(doc(db, "posts", docSnap.id), {
          dislikes: increment(1)
        });
      };

      // -------------------- Delete --------------------
      const delBtn = postEl.querySelector(".deleteBtn");
      if (delBtn) {
        delBtn.onclick = async () => {
          if (confirm("Delete post?")) {
            await deleteDoc(doc(db, "posts", docSnap.id));
          }
        };
      }

      // -------------------- Comment --------------------
      postEl.querySelector(".commentBtn").onclick = () => {
        const commentText = prompt("Enter comment:");
        if (!commentText) return;
        updateDoc(doc(db, "posts", docSnap.id), {
          comments: arrayUnion({
            text: commentText,
            displayName: profile.displayName || "Anonymous",
            createdAt: serverTimestamp()
          })
        });
      };

      // -------------------- Share --------------------
      postEl.querySelector(".shareBtn").onclick = () => {
        alert("Post shared! (implement actual sharing logic later)");
      };
    });
  });
});
