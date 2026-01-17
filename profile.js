import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  collection,
  addDoc,
  deleteDoc,
  query,
  orderBy,
  getDocs
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";
import {
  getStorage,
  ref,
  uploadBytes,
  getDownloadURL
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-storage.js";

/* -------------------- FIREBASE INIT -------------------- */
const firebaseConfig = {
  apiKey: "AIzaSyAHMbxr7rJS88ZefVJzt8p_9CCTstLmLU8",
  authDomain: "yourspace-2026.firebaseapp.com",
  projectId: "yourspace-2026",
  storageBucket: "yourspace-2026.firebasestorage.app",
  messagingSenderId: "72667267302",
  appId: "1:72667267302:web:2bed5f543e05d49ca8fb27"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

let currentUser = null;
let profileOwnerId = null;

/* -------------------- AUTH -------------------- */
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    location.href = "login.html";
    return;
  }

  currentUser = user;
  profileOwnerId = user.uid;

  await loadProfile();
  await loadWallComments();
  loadTop10();
  loadMessages();
});

/* -------------------- NAVIGATION -------------------- */
navFeed.onclick = () => location.href = "feed.html";
navProfile.onclick = () => location.href = "profile.html";
navMessages.onclick = () => location.href = "messages.html";
navSettings.onclick = () => location.href = "settings.html";
navLogout.onclick = () => signOut(auth);

/* -------------------- PROFILE -------------------- */
async function loadProfile() {
  const snap = await getDoc(doc(db, "users", currentUser.uid));
  if (!snap.exists()) return;

  const d = snap.data();

  usernameInput.value = d.username || "";
  bioInput.value = d.bio || "";
  locationInput.value = d.location || "";
  themeSelect.value = d.theme || "default-theme";
  document.body.className = d.theme || "default-theme";

  if (d.pfpUrl) profilePfp.src = d.pfpUrl;
  if (d.musicUrl) loadMusic(d.musicUrl);
  if (d.customHtml) customHtmlContainer.innerHTML = d.customHtml;
}

saveProfileBtn.onclick = async () => {
  await updateDoc(doc(db, "users", currentUser.uid), {
    username: usernameInput.value,
    bio: bioInput.value,
    location: locationInput.value,
    theme: themeSelect.value
  });
  document.body.className = themeSelect.value;
};

/* -------------------- PROFILE PICTURE -------------------- */
savePfpBtn.onclick = async () => {
  const file = pfpInput.files[0];
  if (!file) return;

  const pfpRef = ref(storage, `profilePictures/${currentUser.uid}/pfp.jpg`);
  await uploadBytes(pfpRef, file);
  const url = await getDownloadURL(pfpRef);

  await updateDoc(doc(db, "users", currentUser.uid), { pfpUrl: url });
  profilePfp.src = url;
};

/* -------------------- MUSIC -------------------- */
function loadMusic(url) {
  let embed = "";

  if (url.includes("youtube")) {
    const id = url.split("v=")[1]?.split("&")[0];
    embed = `https://www.youtube.com/embed/${id}?autoplay=1`;
  }

  musicIframe.src = embed;
}

saveMusicBtn.onclick = async () => {
  await updateDoc(doc(db, "users", currentUser.uid), {
    musicUrl: musicUrlInput.value
  });
  loadMusic(musicUrlInput.value);
};

/* -------------------- WALL COMMENTS (FIXED) -------------------- */
async function loadWallComments() {
  wallComments.innerHTML = "";

  const q = query(
    collection(db, "users", profileOwnerId, "wallComments"),
    orderBy("createdAt", "desc")
  );

  const snap = await getDocs(q);

  snap.forEach((docSnap) => {
    const data = docSnap.data();

    const div = document.createElement("div");
    div.className = "wall-comment";

    const text = document.createElement("span");
    text.innerHTML = `<strong>${data.authorUsername}</strong>: ${data.text}`;

    div.appendChild(text);

    // DELETE PERMISSIONS
    if (
      currentUser.uid === data.authorId ||
      currentUser.uid === profileOwnerId
    ) {
      const del = document.createElement("button");
      del.textContent = "Delete";
      del.onclick = async () => {
        await deleteDoc(
          doc(db, "users", profileOwnerId, "wallComments", docSnap.id)
        );
        loadWallComments();
      };
      div.appendChild(del);
    }

    wallComments.appendChild(div);
  });
}

postCommentBtn.onclick = async () => {
  if (!wallCommentInput.value.trim()) return;

  const userSnap = await getDoc(doc(db, "users", currentUser.uid));
  const username = userSnap.data()?.username || "Unknown";

  await addDoc(
    collection(db, "users", profileOwnerId, "wallComments"),
    {
      text: wallCommentInput.value,
      authorId: currentUser.uid,
      authorUsername: username,
      createdAt: Date.now()
    }
  );

  wallCommentInput.value = "";
  loadWallComments();
};

/* -------------------- TOP 10 -------------------- */
async function loadTop10() {
  const snap = await getDoc(doc(db, "users", currentUser.uid));
  const list = snap.data()?.top10Friends || [];
  renderTop10(list);
}

function renderTop10(list) {
  top10FriendsContainer.innerHTML = "";
  list.forEach((name, i) => {
    const div = document.createElement("div");
    div.className = "top-friend";
    div.textContent = `${i + 1}. ${name}`;
    top10FriendsContainer.appendChild(div);
  });
}

saveTop10Btn.onclick = async () => {
  const list = [...top10FriendsContainer.children].map(el =>
    el.textContent.replace(/^\d+\.\s/, "")
  );

  await updateDoc(doc(db, "users", currentUser.uid), {
    top10Friends: list
  });
};

/* -------------------- CUSTOM HTML -------------------- */
saveCustomHtmlBtn.onclick = async () => {
  await updateDoc(doc(db, "users", currentUser.uid), {
    customHtml: customHtmlInput.value
  });
  customHtmlContainer.innerHTML = customHtmlInput.value;
};

/* -------------------- MESSAGES (STUB, SAFE) -------------------- */
function loadMessages() {
  // Messaging UI wired later — does not affect profile stability
}
