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

/* -------------------- FIREBASE -------------------- */
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

let currentUser;
let profileOwnerId;

/* -------------------- AUTH -------------------- */
onAuthStateChanged(auth, async (user) => {
  if (!user) return location.href = "login.html";

  currentUser = user;
  profileOwnerId = user.uid;

  await loadProfile();
  await loadWallComments();
  await loadTop10();
});

/* -------------------- PROFILE -------------------- */
async function loadProfile() {
  const snap = await getDoc(doc(db, "users", currentUser.uid));
  if (!snap.exists()) return;

  const d = snap.data();
  usernameInput.value = d.username || "";
  bioInput.value = d.bio || "";
  locationInput.value = d.location || "";
  document.body.className = d.theme || "default-theme";
  themeSelect.value = d.theme || "default-theme";

  if (d.pfpUrl) profilePfp.src = d.pfpUrl;
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

/* -------------------- PFP -------------------- */
savePfpBtn.onclick = async () => {
  const file = pfpInput.files[0];
  if (!file) return;

  const refP = ref(storage, `profilePictures/${currentUser.uid}/pfp.jpg`);
  await uploadBytes(refP, file);
  const url = await getDownloadURL(refP);

  await updateDoc(doc(db, "users", currentUser.uid), { pfpUrl: url });
  profilePfp.src = url;
};

/* -------------------- WALL -------------------- */
async function loadWallComments() {
  wallComments.innerHTML = "";
  const q = query(
    collection(db, "users", profileOwnerId, "wallComments"),
    orderBy("createdAt", "desc")
  );

  const snap = await getDocs(q);
  snap.forEach(docSnap => {
    const d = docSnap.data();

    const div = document.createElement("div");
    div.className = "wall-comment";
    div.innerHTML = `<strong>${d.authorUsername}</strong>: ${d.text}`;

    if (currentUser.uid === d.authorId || currentUser.uid === profileOwnerId) {
      const btn = document.createElement("button");
      btn.textContent = "Delete";
      btn.onclick = async () => {
        await deleteDoc(doc(db, "users", profileOwnerId, "wallComments", docSnap.id));
        loadWallComments();
      };
      div.appendChild(btn);
    }

    wallComments.appendChild(div);
  });
}

postCommentBtn.onclick = async () => {
  if (!wallCommentInput.value.trim()) return;

  const userSnap = await getDoc(doc(db, "users", currentUser.uid));
  await addDoc(collection(db, "users", profileOwnerId, "wallComments"), {
    text: wallCommentInput.value,
    authorId: currentUser.uid,
    authorUsername: userSnap.data().username || "Unknown",
    createdAt: Date.now()
  });

  wallCommentInput.value = "";
  loadWallComments();
};

/* -------------------- TOP 10 (FIXED) -------------------- */
async function loadTop10() {
  const snap = await getDoc(doc(db, "users", currentUser.uid));
  const list = snap.data()?.top10Friends || [];
  renderTop10(list);
}

function renderTop10(list) {
  top10FriendsContainer.innerHTML = "";

  list.forEach((friend, index) => {
    const div = document.createElement("div");
    div.className = "top-friend";
    div.textContent = `${index + 1}. ${friend.username}`;
    top10FriendsContainer.appendChild(div);
  });
}

saveTop10Btn.onclick = async () => {
  const items = [...top10FriendsContainer.children].map(div => ({
    username: div.textContent.replace(/^\d+\.\s/, "")
  }));

  await updateDoc(doc(db, "users", currentUser.uid), {
    top10Friends: items
  });
};
