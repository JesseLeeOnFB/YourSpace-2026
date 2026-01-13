// profile.js?v=4
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc, collection, query, where, onSnapshot } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
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

// DOM Elements
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

  // Load profile
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

  // Save profile info
  saveProfileBtn.addEventListener("click", async () => {
    const updates = {
      displayName: displayNameInput.value,
      bio: bioInput.value,
      location: locationInput.value,
      musicURL: musicInput.value
    };

    if (photoInput.files.length > 0) {
      const file = photoInput.files[0];
      const storageRef = ref(storage, `profilePics/${user.uid}`);
      await uploadBytes(storageRef, file);
      updates.photoURL = await getDownloadURL(storageRef);
      profileImg.src = updates.photoURL;
    }

    await setDoc(doc(db, "users", user.uid), updates, { merge: true });
    alert("Profile updated!");
  });

  // Save custom HTML/CSS
  saveCustomBtn.addEventListener("click", async () => {
    const customHTML = customCodeInput.value;
    customProfileDiv.innerHTML = customHTML;
    await setDoc(doc(db, "users", user.uid), { customCode: customHTML }, { merge: true });
    alert("Custom profile updated!");
  });

  // Load user posts
  const postsQuery = query(collection(db, "posts"), where("userId", "==", user.uid));
  onSnapshot(postsQuery, (snapshot) => {
    userPostsContainer.innerHTML = "";
    snapshot.forEach(docSnap => {
      const data = docSnap.data();
      const postDiv = document.createElement("div");
      postDiv.classList.add("post");
      postDiv.innerHTML = `
        <p><strong>${data.displayName}</strong></p>
        <p>${data.text}</p>
        <button class="deleteBtn">Delete</button>
      `;
      userPostsContainer.appendChild(postDiv);

      // Delete post button
      const deleteBtn = postDiv.querySelector(".deleteBtn");
      deleteBtn.addEventListener("click", async () => {
        if (confirm("Delete this post?")) {
          await setDoc(doc(db, "posts", docSnap.id), {}, { merge: true }); // or deleteDoc if you want full removal
          alert("Post deleted");
        }
      });
    });
  });

  // Nav buttons
  homeBtn.addEventListener("click", () => window.location.href = "feed.html");
  logoutBtn.addEventListener("click", () => signOut(auth).then(() => window.location.href = "index.html"));
});
