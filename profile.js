import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth, signOut } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc, collection, query, orderBy, onSnapshot, deleteDoc } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
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

document.addEventListener("DOMContentLoaded", () => {
  const displayNameInput = document.getElementById("displayNameInput");
  const bioInput = document.getElementById("bioInput");
  const locationInput = document.getElementById("locationInput");
  const musicInput = document.getElementById("musicInput");
  const photoInput = document.getElementById("photoInput");
  const saveProfileBtn = document.getElementById("saveProfileBtn");
  const profileImage = document.getElementById("profileImage");
  const displayNameHeader = document.getElementById("displayNameHeader");
  const bioHeader = document.getElementById("bioHeader");
  const locationHeader = document.getElementById("locationHeader");
  const postsContainer = document.getElementById("postsContainer");
  const homeBtn = document.getElementById("homeBtn");
  const logoutBtn = document.getElementById("logoutBtn");

  // Nav
  homeBtn.addEventListener("click", () => window.location.href = "feed.html");
  logoutBtn.addEventListener("click", () => signOut(auth).then(() => window.location.href="index.html"));

  const user = auth.currentUser;
  if (!user) return alert("You must be logged in!");

  const userDocRef = doc(db, "users", user.uid);

  // Load profile
  getDoc(userDocRef).then(docSnap => {
    if (docSnap.exists()) {
      const data = docSnap.data();
      displayNameHeader.textContent = data.displayName || "Anonymous";
      bioHeader.textContent = data.bio || "";
      locationHeader.textContent = data.location || "";
      profileImage.src = data.photoURL || "default.png";
      displayNameInput.value = data.displayName || "";
      bioInput.value = data.bio || "";
      locationInput.value = data.location || "";
      musicInput.value = data.musicURL || "";
    }
  });

  // Save profile
  saveProfileBtn.addEventListener("click", async () => {
    let photoURL = profileImage.src;

    if (photoInput.files.length > 0) {
      const file = photoInput.files[0];
      const storageRef = ref(storage, `profilePhotos/${user.uid}`);
      await uploadBytes(storageRef, file);
      photoURL = await getDownloadURL(storageRef);
    }

    await setDoc(userDocRef, {
      displayName: displayNameInput.value,
      bio: bioInput.value,
      location: locationInput.value,
      musicURL: musicInput.value,
      photoURL
    }, { merge: true });

    // Update headers
    displayNameHeader.textContent = displayNameInput.value;
    bioHeader.textContent = bioInput.value;
    locationHeader.textContent = locationInput.value;
    profileImage.src = photoURL;

    alert("Profile updated!");
  });

  // Display user's posts with Delete / Like / Comment / Share
  const postsQuery = query(collection(db, "posts"), orderBy("createdAt", "desc"));
  onSnapshot(postsQuery, snapshot => {
    postsContainer.innerHTML = "";
    snapshot.forEach(docSnap => {
      const data = docSnap.data();
      if (data.userId !== user.uid) return; // only show user's own posts
      const postDiv = document.createElement("div");
      postDiv.classList.add("post");
      postDiv.innerHTML = `
        <div class="post-header">
          <img class="post-photo" src="${data.photoURL || 'default.png'}" alt="Profile">
          <strong>${data.displayName || 'Anonymous'}</strong>
        </div>
        <p class="post-text">${data.text}</p>
        <div class="post-buttons">
          <button class="likeBtn">Like (${data.likes || 0})</button>
          <button class="commentBtn">Comment</button>
          <button class="shareBtn">Share</button>
          <button class="deleteBtn">Delete</button>
        </div>
        <div class="comment-section" id="comment-${docSnap.id}"></div>
      `;
      postsContainer.appendChild(postDiv);

      // Delete post
      postDiv.querySelector(".deleteBtn").addEventListener("click", async () => {
        await deleteDoc(doc(db, "posts", docSnap.id));
      });

      // Like post
      postDiv.querySelector(".likeBtn").addEventListener("click", async () => {
        await setDoc(doc(db, "posts", docSnap.id), {
          likes: (data.likes || 0) + 1
        }, { merge: true });
      });

      // Comment and share can be implemented later if needed
    });
  });

});
