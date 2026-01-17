import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import { getFirestore, doc, getDoc, setDoc, updateDoc, collection, addDoc, getDocs, deleteDoc, query, orderBy } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-storage.js";

// --------------------- Firebase ---------------------
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
const storage = getStorage(app);
const auth = getAuth(app);

// --------------------- DOM ---------------------
const profilePfp = document.getElementById("profilePfp");
const pfpInput = document.getElementById("pfpInput");
const usernameInput = document.getElementById("usernameInput");
const bioInput = document.getElementById("bioInput");
const themeSelect = document.getElementById("themeSelect");
const saveProfileBtn = document.getElementById("saveProfileBtn");

const top10Container = document.getElementById("top10FriendsContainer");
const wallCommentsContainer = document.getElementById("wallCommentsContainer");
const wallCommentInput = document.getElementById("wallCommentInput");
const postWallCommentBtn = document.getElementById("postWallCommentBtn");

const navFeedBtn = document.getElementById("feedNavBtn");
const navProfileBtn = document.getElementById("profileNavBtn");
const logoutBtn = document.getElementById("logoutBtn");

// --------------------- Navigation ---------------------
navFeedBtn?.addEventListener("click", () => window.location.href = "feed.html");
navProfileBtn?.addEventListener("click", () => window.location.href = "profile.html");
logoutBtn?.addEventListener("click", async () => {
  await signOut(auth);
  window.location.href = "login.html";
});

// --------------------- Helpers ---------------------
async function getUsername(userId) {
  const snap = await getDoc(doc(db, "users", userId));
  return snap.exists() ? snap.data().username || "Anonymous" : "Anonymous";
}

// Load profile
async function loadProfile(uid) {
  const snap = await getDoc(doc(db, "users", uid));
  if (!snap.exists()) return;

  const data = snap.data();
  profilePfp.src = data.pfpURL || "default-avatar.png";
  usernameInput.value = data.username || "";
  bioInput.value = data.bio || "";
  document.body.className = data.theme || "default-theme";
}

// --------------------- Top 10 Friends ---------------------
async function loadTop10Friends(uid) {
  const snap = await getDoc(doc(db, "users", uid));
  if (!snap.exists()) return;
  top10Container.innerHTML = "";
  const friends = snap.data().top10Friends || [];
  friends.forEach(f => {
    const div = document.createElement("div");
    div.className = "top-friend";
    div.innerHTML = `<img src="${f.pfpURL||'default-avatar.png'}" width="30" height="30" style="border-radius:50%;"> ${f.username||'Unknown'}`;
    top10Container.appendChild(div);
  });
}

// --------------------- Wall Comments ---------------------
async function loadWallComments(uid) {
  wallCommentsContainer.innerHTML = "";
  const commentsSnap = await getDocs(query(collection(db, "users", uid, "wallComments"), orderBy("createdAt", "asc")));
  commentsSnap.forEach(async cSnap => {
    const data = cSnap.data();
    const div = document.createElement("div");
    div.className = "wall-comment";
    const username = await getUsername(data.userId);
    div.innerHTML = `
      <span>${username}: ${data.text}</span>
      ${(data.userId === auth.currentUser.uid || uid === auth.currentUser.uid) ? `<button data-id="${cSnap.id}">Delete</button>` : ""}
    `;
    div.querySelector("button")?.addEventListener("click", async () => {
      await deleteDoc(doc(db, "users", uid, "wallComments", cSnap.id));
      loadWallComments(uid);
    });
    wallCommentsContainer.appendChild(div);
  });
}

// --------------------- Save Profile ---------------------
saveProfileBtn.addEventListener("click", async () => {
  let pfpURL = profilePfp.src;

  if (pfpInput.files[0]) {
    const file = pfpInput.files[0];
    const storageRef = ref(storage, `pfps/${auth.currentUser.uid}/${Date.now()}_${file.name}`);
    await uploadBytes(storageRef, file);
    pfpURL = await getDownloadURL(storageRef);
  }

  await setDoc(doc(db, "users", auth.currentUser.uid), {
    username: usernameInput.value.trim(),
    bio: bioInput.value.trim(),
    pfpURL,
    theme: themeSelect.value
  }, { merge: true });

  document.body.className = themeSelect.value;
  alert("Profile saved!");
});

// --------------------- Post Wall Comment ---------------------
postWallCommentBtn.addEventListener("click", async () => {
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

// --------------------- Auth State ---------------------
onAuthStateChanged(auth, user => {
  if (!user) window.location.href = "login.html";
  else {
    loadProfile(user.uid);
    loadTop10Friends(user.uid);
    loadWallComments(user.uid);
  }
});
