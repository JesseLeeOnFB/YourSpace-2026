import { auth, db, storage } from "./config.js";
import { doc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-storage.js";

const usernameInput = document.getElementById("username");
const bioInput = document.getElementById("bio");
const locationInput = document.getElementById("location");
const musicInput = document.getElementById("music");
const themeInput = document.getElementById("theme");
const profilePhoto = document.getElementById("profilePhoto");
const saveProfileBtn = document.getElementById("saveProfileBtn");

async function loadProfile() {
  const user = auth.currentUser;
  if (!user) return;
  const docRef = doc(db, "users", user.uid);
  const docSnap = await getDoc(docRef);
  if (docSnap.exists()) {
    const data = docSnap.data();
    usernameInput.value = data.username || "";
    bioInput.value = data.bio || "";
    locationInput.value = data.location || "";
    musicInput.value = data.music || "";
    themeInput.value = data.theme || "";
  }
}

saveProfileBtn?.addEventListener("click", async () => {
  const user = auth.currentUser;
  if (!user) return alert("Not logged in");

  let photoURL = "";
  if (profilePhoto.files[0]) {
    const storageRef = ref(storage, `profilePhotos/${user.uid}`);
    await uploadBytes(storageRef, profilePhoto.files[0]);
    photoURL = await getDownloadURL(storageRef);
  }

  await setDoc(doc(db, "users", user.uid), {
    username: usernameInput.value,
    bio: bioInput.value,
    location: locationInput.value,
    music: musicInput.value,
    theme: themeInput.value,
    photoURL
  });
  alert("Profile saved!");
});

auth.onAuthStateChanged(loadProfile);
