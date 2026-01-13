console.log("🔥 profile.js loaded");

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getFirestore, doc, setDoc, getDoc, collection, query, orderBy, onSnapshot } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-storage.js";

import { firebaseConfig } from "./firebase-config.js"; // replace if inlined

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

const profileUsername = document.getElementById("profileUsername");
const profilePic = document.getElementById("profilePic");
const profileImageInput = document.getElementById("profileImageInput");
const bioInput = document.getElementById("bioInput");
const locationInput = document.getElementById("locationInput");
const themeInput = document.getElementById("themeInput");
const musicInput = document.getElementById("musicInput");
const saveProfileBtn = document.getElementById("saveProfileBtn");
const userPostsContainer = document.getElementById("userPostsContainer");
const logoutBtn = document.getElementById("logoutBtn");

// Check if user is logged in
auth.onAuthStateChanged(async user => {
  if(!user){
    window.location.href = "index.html";
    return;
  }

  const userRef = doc(db, "users", user.uid);
  const userSnap = await getDoc(userRef);

  if(userSnap.exists()){
    const data = userSnap.data();
    profileUsername.textContent = data.username || user.email;
    bioInput.value = data.bio || "";
    locationInput.value = data.location || "";
    themeInput.value = data.theme || "";
    musicInput.value = data.music || "";
    profilePic.src = data.photoURL || "placeholder.png";
    document.body.style = data.theme || ""; // apply custom theme
  }

  loadUserPosts(user.uid);
});

// Save profile
saveProfileBtn.addEventListener("click", async () => {
  const user = auth.currentUser;
  if(!user) return;

  let photoURL = profilePic.src;
  if(profileImageInput.files[0]){
    const storageRef = ref(storage, `users/${user.uid}/profilePic`);
    await uploadBytes(storageRef, profileImageInput.files[0]);
    photoURL = await getDownloadURL(storageRef);
    profilePic.src = photoURL;
  }

  const data = {
    username: profileUsername.textContent,
    bio: bioInput.value,
    location: locationInput.value,
    theme: themeInput.value,
    music: musicInput.value,
    photoURL
  };

  await setDoc(doc(db, "users", user.uid), data, { merge: true });
  alert("Profile saved!");
  document.body.style = themeInput.value; // apply new theme
});

// Load user's posts
function loadUserPosts(uid){
  const q = query(collection(db, "posts"), orderBy("timestamp", "desc"));
  onSnapshot(q, snapshot => {
    userPostsContainer.innerHTML = "";
    snapshot.forEach(docSnap => {
      const post = docSnap.data();
      if(post.userId === uid){
        const div = document.createElement("div");
        div.classList.add("post");
        div.innerHTML = `
          <p>${post.content}</p>
          ${post.imageURL ? `<img src="${post.imageURL}" />` : ""}
        `;
        userPostsContainer.appendChild(div);
      }
    });
  });
}

// Logout
logoutBtn.addEventListener("click", () => auth.signOut().then(() => window.location.href = "index.html"));
