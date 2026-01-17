import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import { getFirestore, doc, getDoc, setDoc, updateDoc, collection, addDoc, getDocs, deleteDoc, orderBy, query } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-storage.js";

// --------------------- Firebase Config ---------------------
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

// --------------------- DOM Elements ---------------------
const feedNavBtn = document.getElementById("feedNavBtn");
const logoutBtn = document.getElementById("logoutBtn");

const profilePfp = document.getElementById("profilePfp");
const pfpInput = document.getElementById("pfpInput");
const pfpSaveBtn = document.getElementById("pfpSaveBtn");

const bioInput = document.getElementById("bioInput");
const bioSaveBtn = document.getElementById("bioSaveBtn");

const wallCommentsContainer = document.getElementById("wallComments");
const wallCommentInput = document.getElementById("wallCommentInput");
const wallCommentBtn = document.getElementById("wallCommentBtn");

const top10List = document.getElementById("top10List");

const musicInput = document.getElementById("musicInput");
const musicBtn = document.getElementById("musicBtn");
const musicEmbed = document.getElementById("musicEmbed");

const customHTML = document.getElementById("customHTML");
const applyThemeBtn = document.getElementById("applyThemeBtn");
const resetThemeBtn = document.getElementById("resetThemeBtn");

// --------------------- Navigation ---------------------
feedNavBtn?.addEventListener("click", () => window.location.href = "feed.html");
logoutBtn?.addEventListener("click", async () => {
  await signOut(auth);
  window.location.href = "login.html";
});

// --------------------- Helpers ---------------------
async function getUserDoc(uid) {
  const snap = await getDoc(doc(db, "users", uid));
  return snap.exists() ? snap.data() : null;
}

async function getUsername(uid) {
  const user = await getUserDoc(uid);
  return user?.username || "Anonymous";
}

// --------------------- Profile PFP ---------------------
pfpSaveBtn?.addEventListener("click", async () => {
  const file = pfpInput.files[0];
  if (!file) return alert("Select a file");
  const pfpRef = ref(storage, `users/${auth.currentUser.uid}/pfp.png`);
  await uploadBytes(pfpRef, file);
  const url = await getDownloadURL(pfpRef);
  await updateDoc(doc(db, "users", auth.currentUser.uid), { pfpURL: url });
  profilePfp.src = url;
  pfpInput.value = "";
});

// --------------------- Bio ---------------------
bioSaveBtn?.addEventListener("click", async () => {
  await updateDoc(doc(db, "users", auth.currentUser.uid), { bio: bioInput.value });
  alert("Bio saved!");
});

// --------------------- Wall Comments ---------------------
async function loadWallComments(uid) {
  wallCommentsContainer.innerHTML = "";
  const commentsSnap = await getDocs(query(collection(db, "users", uid, "wallComments"), orderBy("createdAt")));
  commentsSnap.forEach(async cSnap => {
    const data = cSnap.data();
    const username = await getUsername(data.userId);
    const p = document.createElement("p");
    p.innerHTML = `<strong class="clickable-user" data-uid="${data.userId}">${username}:</strong> ${data.text} ${data.userId===auth.currentUser.uid||uid===auth.currentUser.uid?'<button class="deleteComment">X</button>':''}`;
    const deleteBtn = p.querySelector(".deleteComment");
    deleteBtn?.addEventListener("click", async () => {
      await deleteDoc(doc(db, "users", uid, "wallComments", cSnap.id));
      loadWallComments(uid);
    });
    wallCommentsContainer.appendChild(p);
  });

  // Make usernames clickable
  document.querySelectorAll(".clickable-user").forEach(el => {
    el.addEventListener("click", e => {
      const uid = e.target.dataset.uid;
      window.location.href = `profile.html?uid=${uid}`;
    });
  });
}

wallCommentBtn?.addEventListener("click", async () => {
  const text = wallCommentInput.value.trim();
  if (!text) return;
  await addDoc(collection(db, "users", auth.currentUser.uid, "wallComments"), {
    userId: auth.currentUser.uid,
    text,
    createdAt: new Date()
  });
  wallCommentInput.value = "";
  loadWallComments(auth.currentUser.uid);
});

// --------------------- Top 10 ---------------------
async function loadTop10(uid) {
  top10List.innerHTML = "";
  const user = await getUserDoc(uid);
  const top10 = user?.top10Friends || [];
  top10.forEach(f => {
    const div = document.createElement("div");
    div.className = "top10Friend";
    div.innerHTML = `<img src="${f.pfpURL||'default-avatar.png'}"><span class="clickable-user" data-uid="${f.uid}">${f.username||'Unknown'}</span>`;
    top10List.appendChild(div);
  });

  document.querySelectorAll(".clickable-user").forEach(el=>{
    el.addEventListener("click", e=>{
      const uid = e.target.dataset.uid;
      window.location.href = `profile.html?uid=${uid}`;
    });
  });
}

// --------------------- Music Player ---------------------
musicBtn?.addEventListener("click", () => {
  const url = musicInput.value.trim();
  if (!url) return;
  let embedHTML = "";
  if (url.includes("youtube.com") || url.includes("youtu.be")) {
    const id = url.split("v=")[1] || url.split("/").pop();
    embedHTML = `<iframe width="100%" height="100" src="https://www.youtube.com/embed/${id}" frameborder="0" allowfullscreen></iframe>`;
  } else if (url.includes("spotify.com")) {
    embedHTML = `<iframe src="https://open.spotify.com/embed/${url.split(".com/")[1]}" width="100%" height="80" frameborder="0" allowtransparency="true" allow="encrypted-media"></iframe>`;
  }
  musicEmbed.innerHTML = embedHTML;
});

// --------------------- Custom HTML ---------------------
applyThemeBtn?.addEventListener("click", () => {
  const code = customHTML.value.trim();
  if (!code) return;
  const styleEl = document.createElement("style");
  styleEl.id = "customHTMLStyle";
  styleEl.innerHTML = code;
  document.head.appendChild(styleEl);
});

resetThemeBtn?.addEventListener("click", () => {
  document.getElementById("customHTMLStyle")?.remove();
});

// --------------------- Auth ---------------------
onAuthStateChanged(auth, async user => {
  if (!user) return window.location.href="login.html";
  const urlParams = new URLSearchParams(window.location.search);
  const uid = urlParams.get("uid") || user.uid;
  
  const profileData = await getUserDoc(uid);
  profilePfp.src = profileData?.pfpURL||"default-avatar.png";
  bioInput.value = profileData?.bio||"This is the bio lol";
  
  loadWallComments(uid);
  loadTop10(uid);
});
