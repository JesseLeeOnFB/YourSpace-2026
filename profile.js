// profile.js?v=1
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth, signOut } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { 
  getFirestore, doc, getDoc, setDoc, collection, query, orderBy, onSnapshot 
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
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

document.addEventListener("DOMContentLoaded", async () => {
  const profilePic = document.getElementById("profilePic");
  const profilePicInput = document.getElementById("profilePicInput");
  const displayNameInput = document.getElementById("displayNameInput");
  const bioInput = document.getElementById("bioInput");
  const locationInput = document.getElementById("locationInput");
  const musicInput = document.getElementById("musicInput");
  const customHtmlInput = document.getElementById("customHtmlInput");
  const saveProfileBtn = document.getElementById("saveProfileBtn");
  const profilePostsContainer = document.getElementById("profilePostsContainer");
  const logoutBtn = document.getElementById("logoutBtn");
  const homeBtn = document.getElementById("homeBtn");

  // Nav buttons
  logoutBtn.addEventListener("click", () => signOut(auth).then(() => window.location.href = "index.html"));
  homeBtn.addEventListener("click", () => window.location.href = "feed.html");

  const user = auth.currentUser;
  if (!user) return window.location.href = "index.html";

  const userDocRef = doc(db, "users", user.uid);

  // Load profile
  const userSnap = await getDoc(userDocRef);
  if(userSnap.exists()){
    const data = userSnap.data();
    profilePic.src = data.photoURL || "default.png";
    displayNameInput.value = data.displayName || "";
    bioInput.value = data.bio || "";
    locationInput.value = data.location || "";
    musicInput.value = data.musicURL || "";
    customHtmlInput.value = data.customHTML || "";
    if(data.customHTML) document.body.innerHTML += data.customHTML;
  }

  // Upload profile picture
  profilePicInput.addEventListener("change", async (e) => {
    const file = e.target.files[0];
    if(!file) return;
    const storageRef = ref(storage, `profilePics/${user.uid}`);
    await uploadBytes(storageRef, file);
    const url = await getDownloadURL(storageRef);
    profilePic.src = url;
    await setDoc(userDocRef, { photoURL: url }, { merge: true });
  });

  // Save profile
  saveProfileBtn.addEventListener("click", async () => {
    await setDoc(userDocRef, {
      displayName: displayNameInput.value.trim(),
      bio: bioInput.value.trim(),
      location: locationInput.value.trim(),
      musicURL: musicInput.value.trim(),
      customHTML: customHtmlInput.value.trim()
    }, { merge: true });
    alert("Profile saved!");
  });

  // Load user's posts
  const postsQuery = query(collection(db, "posts"), orderBy("createdAt", "desc"));
  onSnapshot(postsQuery, snapshot => {
    profilePostsContainer.innerHTML = "";
    snapshot.forEach(docSnap => {
      const data = docSnap.data();
      if(data.userId === user.uid){
        const postDiv = document.createElement("div");
        postDiv.classList.add("post");
        postDiv.innerHTML = `
          <div class="post-header">
            <img src="${data.photoURL || 'default.png'}" class="profile-pic">
            <strong>${data.displayName || user.email}</strong>
          </div>
          <p>${data.text}</p>
          <button class="deleteBtn">Delete</button>
        `;
        const deleteBtn = postDiv.querySelector(".deleteBtn");
        deleteBtn.addEventListener("click", async () => {
          await deleteDoc(doc(db, "posts", docSnap.id));
        });
        profilePostsContainer.appendChild(postDiv);
      }
    });
  });

});
