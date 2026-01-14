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
  updateDoc,
  deleteDoc,
  serverTimestamp,
  increment,
  arrayUnion
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
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
const postInput = document.getElementById("postText");
const postFileInput = document.getElementById("postFileInput");
const postBtn = document.getElementById("postBtn");
const postsContainer = document.getElementById("postsContainer");

/* -------------------- Image/Video Preview -------------------- */
postFileInput.addEventListener("change", () => {
  const file = postFileInput.files[0];
  const preview = document.getElementById("filePreview");
  if (!file) {
    preview.style.display = "none";
    preview.src = "";
    preview.innerHTML = "";
    return;
  }

  if (file.type.startsWith("image/")) {
    preview.src = URL.createObjectURL(file);
    preview.style.display = "block";
    preview.innerHTML = "";
  } else if (file.type.startsWith("video/")) {
    preview.innerHTML = `<video src="${URL.createObjectURL(file)}" controls style="max-width:300px; max-height:300px;"></video>`;
    preview.style.display = "block";
    preview.src = "";
  }
});

/* -------------------- Auth -------------------- */
onAuthStateChanged(auth, user => {
  if (!user) {
    window.location.href = "index.html";
    return;
  }

  postBtn.onclick = async () => {
    const text = postInput.value.trim();
    const file = postFileInput.files[0];

    if (!text && !file) return alert("Write something or attach a file.");

    postBtn.disabled = true;
    let fileURL = "";
    try {
      if (file) {
        const safeName = encodeURIComponent(file.name);
        const storageRef = ref(storage, `posts/${auth.currentUser.uid}/${Date.now()}_${safeName}`);
        const snapshot = await uploadBytes(storageRef, file, { contentType: file.type });
        fileURL = await getDownloadURL(snapshot.ref);
      }

      await addDoc(collection(db, "posts"), {
        userId: user.uid,
        text: text || null,
        postImage: file && file.type.startsWith("image/") ? fileURL : null,
        postVideo: file && file.type.startsWith("video/") ? fileURL : null,
        likes: 0,
        dislikes: 0,
        comments: [],
        createdAt: serverTimestamp()
      });

      // Reset
      postInput.value = "";
      postFileInput.value = "";
      document.getElementById("filePreview").style.display = "none";
      document.getElementById("filePreview").src = "";
      document.getElementById("filePreview").innerHTML = "";
    } catch (err) {
      console.error("Post creation failed", err);
      alert("Post creation failed. Check console.");
    } finally {
      postBtn.disabled = false;
    }
  };

  /* -------------------- Load Feed -------------------- */
  const q = query(collection(db, "posts"), orderBy("createdAt", "desc"));
  onSnapshot(q, snapshot => {
    postsContainer.innerHTML = "";
    snapshot.forEach(docSnap => {
      const data = docSnap.data();

      const postDiv = document.createElement("div");
      postDiv.className = "post";

      const fileHTML = data.postImage
        ? `<img src="${data.postImage}" class="postFile" style="max-width:300px; max-height:300px;">`
        : data.postVideo
        ? `<video src="${data.postVideo}" controls style="max-width:300px; max-height:300px;"></video>`
        : "";

      postDiv.innerHTML = `
        <div class="postHeader">
          <strong>${data.userId}</strong>
        </div>
        <p>${data.text || ""}</p>
        ${fileHTML}
        <div class="postButtons">
          <button class="likeBtn">👍 ${data.likes || 0}</button>
          <button class="dislikeBtn">🖕 ${data.dislikes || 0}</button>
          <button class="commentBtn">💬</button>
          <button class="shareBtn">Share</button>
          ${data.userId === user.uid ? `<button class="deleteBtn">Delete</button>` : ""}
        </div>
        <div class="commentsContainer"></div>
      `;

      postsContainer.appendChild(postDiv);

      // LIKE
      postDiv.querySelector(".likeBtn").onclick = async () => {
        await updateDoc(doc(db, "posts", docSnap.id), {
          likes: increment(1)
        });
      };

      // DISLIKE
      postDiv.querySelector(".dislikeBtn").onclick = async () => {
        await updateDoc(doc(db, "posts", docSnap.id), {
          dislikes: increment(1)
        });
      };

      // COMMENT
      postDiv.querySelector(".commentBtn").onclick = async () => {
        const comment = prompt("Enter your comment:");
        if (!comment) return;
        await updateDoc(doc(db, "posts", docSnap.id), {
          comments: arrayUnion({ user: user.uid, text: comment })
        });
        const commentEl = document.createElement("p");
        commentEl.textContent = `${user.uid}: ${comment}`;
        postDiv.querySelector(".commentsContainer").appendChild(commentEl);
      };

      // DELETE
      const delBtn = postDiv.querySelector(".deleteBtn");
      if (delBtn) {
        delBtn.onclick = async () => {
          if (confirm("Delete this post?")) {
            await deleteDoc(doc(db, "posts", docSnap.id));
          }
        };
      }
    });
  });
});
