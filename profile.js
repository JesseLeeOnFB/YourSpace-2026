import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import {
  getFirestore, doc, getDoc, setDoc,
  collection, addDoc, onSnapshot
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";
import {
  getAuth, onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";
import {
  getStorage, ref, uploadBytes, getDownloadURL
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-storage.js";

const firebaseConfig = {
  apiKey: "YOUR_KEY",
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

const params = new URLSearchParams(location.search);
const profileUid = params.get("uid");

let currentUser;

/* AUTH */
onAuthStateChanged(auth, async (user) => {
  if (!user) return location.href = "login.html";
  currentUser = user;

  const uidToLoad = profileUid || user.uid;
  loadProfile(uidToLoad);

  if (uidToLoad !== user.uid) {
    document.getElementById("pmBtn").style.display = "inline-block";
    document.getElementById("pmBtn").onclick = () => {
      location.href = `messages.html?uid=${uidToLoad}`;
    };
  }
});

/* PROFILE LOAD */
async function loadProfile(uid) {
  const snap = await getDoc(doc(db, "users", uid));
  if (!snap.exists()) return;

  const data = snap.data();
  document.getElementById("usernameDisplay").textContent = data.username || "";
  document.getElementById("bioDisplay").textContent = data.bio || "";

  if (data.profilePicture) {
    document.getElementById("profilePic").src = data.profilePicture;
  }

  loadWall(uid);
  loadTop10(data.top10Friends || []);
  loadMusic(data.musicPlaylist || []);
}

/* PROFILE PIC UPLOAD */
document.getElementById("savePfpBtn").onclick = async () => {
  const file = document.getElementById("pfpInput").files[0];
  if (!file) return alert("Select a file");

  const fileRef = ref(storage, `profilePictures/${currentUser.uid}/${file.name}`);
  await uploadBytes(fileRef, file);
  const url = await getDownloadURL(fileRef);

  await setDoc(doc(db, "users", currentUser.uid), {
    profilePicture: url
  }, { merge: true });

  document.getElementById("profilePic").src = url;
};

/* WALL */
function loadWall(uid) {
  onSnapshot(collection(db, "users", uid, "wallComments"), snap => {
    const container = document.getElementById("wallComments");
    container.innerHTML = "";
    snap.forEach(docSnap => {
      const d = docSnap.data();
      container.innerHTML += `<div class="wall-comment"><b>${d.authorName}</b>: ${d.text}</div>`;
    });
  });
}

document.getElementById("postWallBtn").onclick = async () => {
  const text = wallText.value.trim();
  if (!text) return;

  await addDoc(collection(db, "users", profileUid || currentUser.uid, "wallComments"), {
    text,
    authorId: currentUser.uid,
    authorName: currentUser.displayName || "User",
    createdAt: new Date()
  });

  wallText.value = "";
};

/* TOP 10 */
async function loadTop10(uids) {
  const container = document.getElementById("top10List");
  container.innerHTML = "";

  for (const uid of uids) {
    const snap = await getDoc(doc(db, "users", uid));
    if (!snap.exists()) continue;
    const d = snap.data();

    container.innerHTML += `
      <div class="top10-item">
        <img src="${d.profilePicture || 'default-pfp.png'}">
        <a href="profile.html?uid=${uid}">${d.username}</a>
      </div>`;
  }
}

/* MUSIC */
document.getElementById("saveMusicBtn").onclick = async () => {
  const url = document.getElementById("musicUrl").value.trim();
  if (!url) return;

  const embed = url.includes("youtube")
    ? url.replace("watch?v=", "embed/")
    : "";

  await setDoc(doc(db, "users", currentUser.uid), {
    musicPlaylist: [embed]
  }, { merge: true });

  loadMusic([embed]);
};

function loadMusic(list) {
  const container = document.getElementById("musicEmbed");
  container.innerHTML = "";
  list.forEach(url => {
    container.innerHTML += `<iframe src="${url}" allow="autoplay"></iframe>`;
  });
}
