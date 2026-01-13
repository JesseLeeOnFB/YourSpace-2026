// File: profile.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut, updateProfile } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-storage.js";
import { firebaseConfig } from './firebase-config.js';

const app = initializeApp(firebaseConfig);
const auth = getAuth();
const db = getFirestore(app);
const storage = getStorage(app);

const profilePicInput = document.getElementById("profilePic");
const profilePicPreview = document.getElementById("profilePicPreview");
const usernameInput = document.getElementById("username");
const bioInput = document.getElementById("bio");
const locationInput = document.getElementById("location");
const musicInput = document.getElementById("musicURL");
const backgroundInput = document.getElementById("backgroundCSS");
const saveBtn = document.getElementById("saveProfileBtn");
const logoutBtn = document.getElementById("logoutBtn");

// Logout
logoutBtn.addEventListener("click", async ()=>{ await signOut(auth); window.location.href="index.html"; });

// Load profile
onAuthStateChanged(auth, async (user)=>{
  if(!user){ window.location.href="index.html"; return; }
  const userRef = doc(db, "users", user.uid);
  const userSnap = await getDoc(userRef);
  if(userSnap.exists()){
    const data = userSnap.data();
    usernameInput.value = data.username || "";
    bioInput.value = data.bio || "";
    locationInput.value = data.location || "";
    musicInput.value = data.musicURL || "";
    backgroundInput.value = data.backgroundCSS || "";
    profilePicPreview.src = data.profilePic || "https://via.placeholder.com/80";
  }
});

// Save profile
saveBtn.addEventListener("click", async ()=>{
  const user = auth.currentUser;
  if(!user) return;
  let profilePicURL = profilePicPreview.src;

  // Upload profile pic if changed
  if(profilePicInput.files.length > 0){
    const file = profilePicInput.files[0];
    const storageRef = ref(storage, `profilePics/${user.uid}`);
    await uploadBytes(storageRef, file);
    profilePicURL = await getDownloadURL(storageRef);
  }

  // Update profile in Firestore
  await setDoc(doc(db, "users", user.uid), {
    username: usernameInput.value,
    bio: bioInput.value,
    location: locationInput.value,
    musicURL: musicInput.value,
    backgroundCSS: backgroundInput.value,
    profilePic: profilePicURL
  }, { merge:true });

  // Update Auth displayName
  await updateProfile(user, { displayName: usernameInput.value });
  alert("Profile updated!");
});
