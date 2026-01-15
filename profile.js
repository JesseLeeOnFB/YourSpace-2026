import { auth, db, storage } from "./script.js";
import {
  doc, getDoc, setDoc, updateDoc
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import {
  ref, uploadBytes, getDownloadURL
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js";

const profilePhoto = document.getElementById("profilePhoto");
const profilePhotoInput = document.getElementById("profilePhotoInput");
const saveProfilePhotoBtn = document.getElementById("saveProfilePhotoBtn");

const usernameInput = document.getElementById("usernameInput");
const locationInput = document.getElementById("locationInput");
const bioInput = document.getElementById("bioInput");
const musicInput = document.getElementById("musicInput");
const saveProfileBtn = document.getElementById("saveProfileBtn");

const themeSelect = document.getElementById("themeSelect");
const saveThemeBtn = document.getElementById("saveThemeBtn");

const customHTMLInput = document.getElementById("customHTMLInput");
const saveCustomHTMLBtn = document.getElementById("saveCustomHTMLBtn");
const customHTMLContainer = document.getElementById("customHTMLContainer");

const homeBtn = document.getElementById("homeBtn");
const feedBtn = document.getElementById("feedBtn");
const logoutBtn = document.getElementById("logoutBtn");

homeBtn.onclick = () => location.href = "feed.html";
feedBtn.onclick = () => location.href = "feed.html";
logoutBtn.onclick = () => auth.signOut().then(() => location.href = "index.html");

auth.onAuthStateChanged(async user => {
  if (!user) return location.href = "index.html";

  const userRef = doc(db, "users", user.uid);
  const snap = await getDoc(userRef);

  if (snap.exists()) {
    const data = snap.data();

    usernameInput.value = data.username || "";
    locationInput.value = data.location || "";
    bioInput.value = data.bio || "";
    musicInput.value = data.music || "";
    themeSelect.value = data.theme || "default";

    document.body.className = data.theme || "default";

    if (data.profilePhoto) profilePhoto.src = data.profilePhoto;

    if (data.customHTML) {
      customHTMLContainer.innerHTML = data.customHTML;
    }

    if (data.music) {
      customHTMLContainer.insertAdjacentHTML("beforeend", `
        <iframe width="100%" height="200"
        src="https://www.youtube.com/embed/${extractYouTubeID(data.music)}"
        frameborder="0" allow="autoplay"></iframe>
      `);
    }
  } else {
    await setDoc(userRef, { theme: "default" });
  }

  saveProfileBtn.onclick = async () => {
    await updateDoc(userRef, {
      username: usernameInput.value,
      location: locationInput.value,
      bio: bioInput.value,
      music: musicInput.value
    });
    alert("Profile saved");
  };

  saveProfilePhotoBtn.onclick = async () => {
    const file = profilePhotoInput.files[0];
    if (!file) return alert("Choose a photo");

    const photoRef = ref(storage, `profileImages/${user.uid}/${Date.now()}_${file.name}`);
    const snap = await uploadBytes(photoRef, file);
    const url = await getDownloadURL(snap.ref);

    await updateDoc(userRef, { profilePhoto: url });
    profilePhoto.src = url;
  };

  saveThemeBtn.onclick = async () => {
    const theme = themeSelect.value;
    await updateDoc(userRef, { theme });

    document.body.className = "";
    void document.body.offsetWidth;
    document.body.classList.add(theme);

    alert(`Theme set to ${theme}`);
  };

  saveCustomHTMLBtn.onclick = async () => {
    const html = customHTMLInput.value;
    await updateDoc(userRef, { customHTML: html });
    customHTMLContainer.innerHTML = html;
  };
});

function extractYouTubeID(url) {
  const match = url.match(/(?:v=|\/)([0-9A-Za-z_-]{11})/);
  return match ? match[1] : "";
}
