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
const postInput = document.getElementById("postText");
const postFileInput = document.getElementById("postFileInput"); // new file input for images/videos
const postBtn = document.getElementById("postBtn");
const postsContainer = document.getElementById("postsContainer");
const imagePreview = document.getElementById("imagePreview");

const profileBtn = document.getElementById("profileBtn");
const homeBtn = document.getElementById("homeBtn");
const logoutBtn = document.getElementById("logoutBtn");

// -------------------- Image / Video Preview --------------------
postFileInput.addEventListener("change", () => {
  const file = postFileInput.files[0];
  if (!file) {
    imagePreview.style.display = "none";
    imagePreview.src = "";
    return;
  }

  if (file.type.startsWith("image/")) {
    imagePreview.src = URL.createObjectURL(file);
    imagePreview.style.display = "block";
  } else if (file.type.startsWith("video/")) {
    imagePreview.src = "";
    imagePreview.style.display = "none";
    alert("Video ready for upload!");
  }
});

// -------------------- Auth & Navigation --------------------
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "index.html";
    return;
  }

  profileBtn.onclick = () => window.location.href = "profile.html";
  homeBtn.onclick = () => window.location.href = "feed.html";
  logoutBtn.onclick = async () => {
    await signOut(auth);
    window.location.href = "index.html";
  };

  // -------------------- Create Post --------------------
  postBtn.onclick = async () => {
    postBtn.disabled = true;
    const text = postInput.value.trim();
    const file = postFileInput.files[0];

    if (!text && !file) {
      alert("Write something or attach a file!");
      postBtn.disabled = false;
      return;
    }

    let postFileURL = "";
    let fileType = "";

    try {
      // Upload file if present
      if (file) {
        const fileExt = file.name.split('.').pop().toLowerCase();
        const safeName = encodeURIComponent(file.name);
        const storageRef = ref(storage, `posts/${user.uid}/${Date.now()}_${safeName}`);
        const snapshot = await uploadBytes(storageRef, file, { contentType: file.type || "application/octet-stream" });
        postFileURL = await getDownloadURL(snapshot.ref);
        fileType = file.type.startsWith("image/") ? "image" : file.type.startsWith("video/") ? "video" : "file";
      }

      // Fetch user profile
      const userSnap = await getDoc(doc(db, "users", user.uid));
      const profile = userSnap.exists() ? userSnap.data() : {};

      // Parse mentions
      let mentions = [];
      if (text) {
        const mentionRegex = /@(\w+)/g;
        let match;
        while ((match = mentionRegex.exec(text)) !== null) {
          mentions.push(match[1]);
        }
      }

      // Create Firestore post
      const postRef = await addDoc(collection(db, "posts"), {
        text,
        postFileURL,
        fileType,
        userId: user.uid,
        displayName: profile.displayName || "Anonymous",
        photoURL: profile.photoURL || "",
        likes: 0,
        dislikes: 0,
        comments: [],
        mentions,
        createdAt: serverTimestamp()
      });

      // Notifications for mentions
      mentions.forEach(async username => {
        const usersQuery = query(collection(db, "users"));
        const usersSnapshot = await getDocs(usersQuery);
        const mentionedUser = usersSnapshot.docs.find(d => d.data().displayName === username);
        if (mentionedUser) {
          await addDoc(collection(db, "notifications"), {
            userId: mentionedUser.id,
            fromUserId: user.uid,
            type: "mention",
            postId: postRef.id,
            text: `You were mentioned in a post by ${profile.displayName}`,
            read: false,
            createdAt: serverTimestamp()
          });
        }
      });

      // Reset
      postInput.value = "";
      postFileInput.value = "";
      imagePreview.style.display = "none";
      imagePreview.src = "";

    } catch (err) {
      console.error("Post creation failed:", err);
      alert("Post creation failed, check console.");
    } finally {
      postBtn.disabled = false;
    }
  };

  // -------------------- Load Posts --------------------
  const q = query(collection(db, "posts"), orderBy("createdAt", "desc"));
  onSnapshot(q, snapshot => {
    postsContainer.innerHTML = "";

    snapshot.forEach(docSnap => {
      const data = docSnap.data();
      const postEl = document.createElement("div");
      postEl.className = "post";

      // Render mentions as clickable links
      let renderedText = data.text || "";
      if (data.mentions && data.mentions.length > 0) {
        data.mentions.forEach(username => {
          const userLink = `<a href="profile.html?user=${username}" class="mention">@${username}</a>`;
          renderedText = renderedText.replace(new RegExp(`@${username}`, "g"), userLink);
        });
      }

      // Render file (image/video)
      let fileHTML = "";
      if (data.postFileURL) {
        if (data.fileType === "image") {
          fileHTML = `<img src="${data.postFileURL}" class="postImage">`;
        } else if (data.fileType === "video") {
          fileHTML = `<video src="${data.postFileURL}" class="postVideo" controls></video>`;
        } else {
          fileHTML = `<a href="${data.postFileURL}" target="_blank">Download file</a>`;
        }
      }

      postEl.innerHTML = `
        <div class="postHeader">
          <img src="${data.photoURL || 'default-avatar.png'}" class="postProfilePic">
          <strong>${data.displayName}</strong>
        </div>
        <p>${renderedText}</p>
        ${fileHTML}
        <div class="postButtons">
          <button class="likeBtn">👍 ${data.likes || 0}</button>
          <button class="dislikeBtn">🖕 ${data.dislikes || 0}</button>
          <button class="commentBtn">💬</button>
          <button class="shareBtn">↗️</button>
          ${user.uid === data.userId ? '<button class="deleteBtn">Delete</button>' : ''}
        </div>
        <div class="commentsContainer"></div>
      `;

      postsContainer.appendChild(postEl);

      // -------------------- Buttons --------------------
      postEl.querySelector(".likeBtn").onclick = async () => {
        await updateDoc(doc(db, "posts", docSnap.id), { likes: increment(1) });
      };
      postEl.querySelector(".dislikeBtn").onclick = async () => {
        await updateDoc(doc(db, "posts", docSnap.id), { dislikes: increment(1) });
      };
      postEl.querySelector(".deleteBtn")?.addEventListener("click", async () => {
        if (confirm("Delete this post?")) {
          await deleteDoc(doc(db, "posts", docSnap.id));
        }
      });
      postEl.querySelector(".commentBtn").onclick = () => {
        const commentText = prompt("Enter your comment:");
        if (!commentText) return;
        updateDoc(doc(db, "posts", docSnap.id), { comments: arrayUnion({ text: commentText, userId: user.uid }) });
        const commentsContainer = postEl.querySelector(".commentsContainer");
        const commentEl = document.createElement("p");
        commentEl.textContent = commentText;
        commentsContainer.appendChild(commentEl);
      };
      postEl.querySelector(".shareBtn").onclick = () => {
        if (navigator.share) {
          navigator.share({ title: "YourSpace Post", text: data.text, url: window.location.href });
        } else {
          prompt("Copy this link to share:", window.location.href);
        }
      };
    });
});
