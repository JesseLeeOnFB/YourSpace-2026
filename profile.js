import { auth, db, storage } from './firebase-config.js';
import { doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-storage.js";

const usernameEdit = document.getElementById("usernameEdit");
const bioEdit = document.getElementById("bioEdit");
const locationEdit = document.getElementById("locationEdit");
const profilePicInput = document.getElementById("profilePicInput");
const musicInput = document.getElementById("musicInput");
const themeInput = document.getElementById("themeInput");
const saveProfileBtn = document.getElementById("saveProfileBtn");
const logoutBtn = document.getElementById("logoutBtn");

logoutBtn.addEventListener("click", () => auth.signOut().then(() => window.location.href="index.html"));

async function loadProfile() {
  const docRef = doc(db, "users", auth.currentUser.uid);
  const docSnap = await getDoc(docRef);
  if (docSnap.exists()) {
    const data = docSnap.data();
    usernameEdit.value = data.username || "";
    bioEdit.value = data.bio || "";
    locationEdit.value = data.location || "";
    musicInput.value = data.music || "";
    themeInput.value = data.theme || "";
  }
}

saveProfileBtn.addEventListener("click", async () => {
  let profilePicUrl = "";
  if (profilePicInput.files.length > 0) {
    const file = profilePicInput.files[0];
    const storageRef = ref(storage, `profilePhotos/${auth.currentUser.uid}/${file.name}`);
    await uploadBytes(storageRef, file);
    profilePicUrl = await getDownloadURL(storageRef);
  }
  await setDoc(doc(db, "users", auth.currentUser.uid), {
    username: usernameEdit.value,
    bio: bioEdit.value,
    location: locationEdit.value,
    profilePic: profilePicUrl || "",
    music: musicInput.value,
    theme: themeInput.value
  }, { merge: true });
  alert("Profile saved!");
});

auth.onAuthStateChanged(user => {
  if (!user) window.location.href = "index.html";
  else loadProfile();
});
