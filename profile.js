// /YourSpace-2026/profile.js
console.log("🔥 profile.js loaded");

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth, signOut } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getFirestore, doc, getDoc, updateDoc, collection, query, orderBy, onSnapshot } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
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

// DOM
const logoutBtn = document.getElementById("logoutBtn");
const saveBtn = document.getElementById("saveProfileBtn");
const displayNameInput = document.getElementById("displayName");
const bioInput = document.getElementById("bio");
const locationInput = document.getElementById("location");
const musicInput = document.getElementById("musicURL");
const themeInput = document.getElementById("themeCSS");
const photoFile = document.getElementById("photoFile");
const userPostsDiv = document.getElementById("userPosts");

// Logout
logoutBtn.addEventListener("click", () => signOut(auth).then(() => window.location.href = "index.html"));

// Load profile
auth.onAuthStateChanged(async (user) => {
  if (!user) return window.location.href = "index.html";

  const userDoc = await getDoc(doc(db, "users", user.uid));
  const profile = userDoc.exists() ? userDoc.data() : {};

  displayNameInput.value = profile.displayName || "";
  bioInput.value = profile.bio || "";
  locationInput.value = profile.location || "";
  musicInput.value = profile.musicURL || "";
  themeInput.value = profile.themeCSS || "";

  // Load user's posts
  const q = query(collection(db, "posts"), orderBy("createdAt", "desc"));
  onSnapshot(q, snapshot => {
    userPostsDiv.innerHTML = "";
    snapshot.forEach(docSnap => {
      const p = docSnap.data();
      if (p.userId === user.uid) {
        const div = document.createElement("div");
        div.innerHTML = `
          <b>${p.displayName}</b>: ${p.text} 
          <button onclick="deletePost('${docSnap.id}', '${p.userId}')">Delete</button>
        `;
        userPostsDiv.appendChild(div);
      }
    });
  });
});

// Save profile
saveBtn.addEventListener("click", async () => {
  const user = auth.currentUser;
  if (!user) return;

  let photoURL = "";
  if (photoFile.files[0]) {
    const fileRef = ref(storage, `users/${user.uid}/${photoFile.files[0].name}`);
    await uploadBytes(fileRef, photoFile.files[0]);
    photoURL = await getDownloadURL(fileRef);
  }

  await updateDoc(doc(db, "users", user.uid), {
    displayName: displayNameInput.value,
    bio: bioInput.value,
    location: locationInput.value,
    musicURL: musicInput.value,
    themeCSS: themeInput.value,
    photoURL: photoURL || undefined
  });

  alert("Profile updated!");
});

// Delete post
window.deletePost = async (id, userId) => {
  if (auth.currentUser.uid !== userId) return alert("Can't delete");
  const docRef = doc(db, "posts", id);
  await updateDoc(docRef, { text: "[deleted]" });
};
