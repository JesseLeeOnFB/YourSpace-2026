import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import {
  getFirestore, doc, getDoc, setDoc, addDoc,
  getDocs, deleteDoc, collection, query, orderBy
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-storage.js";

const firebaseConfig = {
  apiKey: "AIzaSyAHMbxr7rJS88ZefVJzt8p_9CCTstLmLU8",
  authDomain: "yourspace-2026.firebaseapp.com",
  projectId: "yourspace-2026",
  storageBucket: "yourspace-2026.appspot.com",
  messagingSenderId: "72667267302",
  appId: "1:72667267302:web:2bed5f543e05d49ca8fb27"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const storage = getStorage(app);

const bioInput = document.getElementById("bioInput");
const locationInput = document.getElementById("locationInput");
const saveProfileBtn = document.getElementById("saveProfileBtn");
const pfpImg = document.getElementById("profilePic");
const pfpUpload = document.getElementById("pfpUpload");

const wallInput = document.getElementById("wallInput");
const wallBtn = document.getElementById("wallPostBtn");
const wallContainer = document.getElementById("wallPosts");

const customCssInput = document.getElementById("customCss");
const saveCustomCssBtn = document.getElementById("saveCustomCss");
const resetCustomCssBtn = document.getElementById("resetCustomCss");

const styleEl = document.createElement("style");
document.head.appendChild(styleEl);

let profileId;
let currentUser;

onAuthStateChanged(auth, async user => {
  if (!user) {
    window.location.href = "login.html";
    return;
  }
  currentUser = user;
  profileId = new URLSearchParams(window.location.search).get("id") || user.uid;
  await loadProfile();
  await loadWall();
});

async function loadProfile() {
  const snap = await getDoc(doc(db, "users", profileId));
  if (!snap.exists()) return;
  const data = snap.data();

  bioInput.value = data.bio || "";
  locationInput.value = data.location || "";
  if (data.pfpURL) pfpImg.src = data.pfpURL;

  if (data.customCss) styleEl.innerHTML = data.customCss;
}

saveProfileBtn.addEventListener("click", async () => {
  await setDoc(doc(db, "users", currentUser.uid), {
    bio: bioInput.value,
    location: locationInput.value
  }, { merge: true });
  alert("Profile saved");
});

pfpUpload.addEventListener("change", async e => {
  const file = e.target.files[0];
  if (!file) return;
  const r = ref(storage, `profilePictures/${currentUser.uid}/${file.name}`);
  await uploadBytes(r, file);
  const url = await getDownloadURL(r);
  await setDoc(doc(db, "users", currentUser.uid), { pfpURL: url }, { merge: true });
  pfpImg.src = url;
});

saveCustomCssBtn.addEventListener("click", async () => {
  await setDoc(doc(db, "users", currentUser.uid), {
    customCss: customCssInput.value
  }, { merge: true });
  styleEl.innerHTML = customCssInput.value;
});

resetCustomCssBtn.addEventListener("click", async () => {
  await setDoc(doc(db, "users", currentUser.uid), { customCss: "" }, { merge: true });
  styleEl.innerHTML = "";
  customCssInput.value = "";
});

async function loadWall() {
  wallContainer.innerHTML = "";
  const q = query(collection(db, "walls", profileId, "posts"), orderBy("createdAt", "desc"));
  const snap = await getDocs(q);
  snap.forEach(d => {
    const p = d.data();
    const div = document.createElement("div");
    div.className = "wall-post";
    div.innerHTML = `<strong>${p.username}</strong>: ${p.text}`;
    if (p.userId === currentUser.uid || profileId === currentUser.uid) {
      const del = document.createElement("button");
      del.textContent = "Delete";
      del.onclick = async () => {
        await deleteDoc(doc(db, "walls", profileId, "posts", d.id));
        loadWall();
      };
      div.appendChild(del);
    }
    wallContainer.appendChild(div);
  });
}

wallBtn.addEventListener("click", async () => {
  if (!wallInput.value.trim()) return;
  await addDoc(collection(db, "walls", profileId, "posts"), {
    userId: currentUser.uid,
    username: currentUser.email,
    text: wallInput.value,
    createdAt: new Date()
  });
  wallInput.value = "";
  loadWall();
});
