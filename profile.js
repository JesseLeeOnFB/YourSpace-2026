import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc, collection, query, where, onSnapshot, deleteDoc, updateDoc, orderBy, serverTimestamp, increment } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-storage.js";

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

// DOM elements
const profileImg = document.getElementById("profilePic");
const photoInput = document.getElementById("photoInput");
const displayNameInput = document.getElementById("displayName");
const bioInput = document.getElementById("bio");
const locationInput = document.getElementById("location");
const musicInput = document.getElementById("musicURL");
const saveProfileBtn = document.getElementById("saveProfile");
const customCodeInput = document.getElementById("customCode");
const saveCustomBtn = document.getElementById("saveCustom");
const customProfileDiv = document.getElementById("customProfileDiv");
const userPostsContainer = document.getElementById("userPostsContainer");
const homeBtn = document.getElementById("homeBtn");
const logoutBtn = document.getElementById("logoutBtn");

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    alert("You must be logged in");
    window.location.href = "index.html";
    return;
  }

  // LOAD PROFILE DATA
  const userDoc = await getDoc(doc(db, "users", user.uid));
  if (userDoc.exists()) {
    const data = userDoc.data();
    displayNameInput.value = data.displayName || "";
    bioInput.value = data.bio || "";
    locationInput.value = data.location || "";
    musicInput.value = data.musicURL || "";
    if (data.photoURL) profileImg.src = data.photoURL;
    if (data.customCode) customProfileDiv.innerHTML = data.customCode;
  }

  // SAVE PROFILE INFO
  saveProfileBtn.onclick = async () => {
    const updates = {
      displayName: displayNameInput.value,
      bio: bioInput.value,
      location: locationInput.value,
      musicURL: musicInput.value
    };

    if (photoInput.files.length > 0) {
      const file = photoInput.files[0];
      const storageRef = ref(storage, `profileImages/${user.uid}/${Date.now()}_${file.name}`);
      await uploadBytes(storageRef, file);
      updates.photoURL = await getDownloadURL(storageRef);
      profileImg.src = updates.photoURL;
    }

    await setDoc(doc(db, "users", user.uid), updates, { merge: true });
    alert("Profile updated!");
  };

  // SAVE CUSTOM HTML/CSS
  saveCustomBtn.onclick = async () => {
    const customHTML = customCodeInput.value;
    customProfileDiv.innerHTML = customHTML;
    await setDoc(doc(db, "users", user.uid), { customCode: customHTML }, { merge: true });
    alert("Custom profile updated!");
  };

  // LOAD USER POSTS
  const postsQuery = query(collection(db, "posts"), where("userId", "==", user.uid), orderBy("createdAt", "desc"));
  onSnapshot(postsQuery, (snapshot) => {
    userPostsContainer.innerHTML = "";
    snapshot.forEach(docSnap => {
      const data = docSnap.data();
      const postDiv = document.createElement("div");
      postDiv.classList.add("post");

      const imageHTML = data.postImage ? `<img src="${data.postImage}" class="postImage">` : "";
      postDiv.innerHTML = `
        <div class="postHeader">
          <img src="${data.photoURL || 'default-avatar.png'}" class="postProfilePic">
          <strong>${data.displayName}</strong>
        </div>
        <p>${data.text || ""}</p>
        ${imageHTML}
        <div class="postButtons">
          <button class="likeBtn">Like (${data.likes || 0})</button>
          <button class="commentBtn">Comment</button>
          <button class="shareBtn">Share</button>
          ${user.uid === data.userId ? '<button class="deleteBtn">Delete</button>' : ''}
        </div>
        <div class="commentsContainer"></div>
      `;
      userPostsContainer.appendChild(postDiv);

      // LIKE BUTTON
      const likeBtn = postDiv.querySelector(".likeBtn");
      likeBtn.onclick = async () => {
        const postRef = doc(db, "posts", docSnap.id);
        await updateDoc(postRef, { likes: increment(1) });
      };

      // COMMENT BUTTON
      const commentBtn = postDiv.querySelector(".commentBtn");
      const commentsContainer = postDiv.querySelector(".commentsContainer");
      commentBtn.onclick = async () => {
        const commentText = prompt("Enter your comment:");
        if (!commentText) return;
        const postRef = doc(db, "posts", docSnap.id);
        const updatedComments = [...(data.comments || []), { text: commentText, user: user.uid }];
        await updateDoc(postRef, { comments: updatedComments });

        const commentEl = document.createElement("p");
        commentEl.textContent = commentText;
        commentsContainer.appendChild(commentEl);
      };

      // DELETE BUTTON
      const deleteBtn = postDiv.querySelector(".deleteBtn");
      if (deleteBtn) {
        deleteBtn.onclick = async () => {
          if (confirm("Delete this post?")) await deleteDoc(doc(db, "posts", docSnap.id));
        };
      }

      // SHARE BUTTON
      const shareBtn = postDiv.querySelector(".shareBtn");
      shareBtn.onclick = () => {
        if (navigator.share) {
          navigator.share({ title: "YourSpace Post", text: data.text, url: window.location.href });
        } else {
          prompt("Copy this link to share:", window.location.href);
        }
      };

      // Render existing comments
      (data.comments || []).forEach(c => {
        const cEl = document.createElement("p");
        cEl.textContent = c.text;
        commentsContainer.appendChild(cEl);
      });
    });
  });

  // NAV BUTTONS
  homeBtn.onclick = () => window.location.href = "feed.html";
  logoutBtn.onclick = () => signOut(auth).then(() => window.location.href = "index.html");
});
