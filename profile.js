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
const storage = getStorage(app);
const auth = getAuth(app);

// --------------------- DOM Elements ---------------------
const usernameInput = document.getElementById("usernameInput");
const bioInput = document.getElementById("bioInput");
const themeSelect = document.getElementById("themeSelect");
const saveProfileBtn = document.getElementById("saveProfileBtn");
const profilePfp = document.getElementById("profilePfp");
const pfpInput = document.getElementById("pfpInput");
const customHtmlInput = document.getElementById("customHtmlInput");
const applyCustomHtmlBtn = document.getElementById("applyCustomHtmlBtn");
const customHtmlPreview = document.getElementById("customHtmlPreview");
const top10Container = document.getElementById("top10Container");
const top10EditPanel = document.getElementById("top10EditPanel");
const top10EditList = document.getElementById("top10EditList");
const wallCommentsContainer = document.getElementById("wallCommentsContainer");
const wallCommentInput = document.getElementById("wallCommentInput");
const postWallCommentBtn = document.getElementById("postWallCommentBtn");

const navFeedBtn = document.getElementById("feedNavBtn");
const navProfileBtn = document.getElementById("profileNavBtn");
const logoutBtn = document.getElementById("logoutBtn");

// --------------------- Navigation ---------------------
navFeedBtn?.addEventListener("click", () => window.location.href = "feed.html");
navProfileBtn?.addEventListener("click", () => window.location.href = "profile.html");
logoutBtn?.addEventListener("click", async () => { await signOut(auth); window.location.href = "login.html"; });

// --------------------- Helpers ---------------------
async function getUsername(userId) {
  try { const snap = await getDoc(doc(db, "users", userId)); return snap.exists() ? snap.data().username : "Anonymous"; } 
  catch { return "Anonymous"; }
}

// --------------------- Load Profile ---------------------
async function loadProfile(uid) {
  const snap = await getDoc(doc(db, "users", uid));
  if (!snap.exists()) return;
  const data = snap.data();
  usernameInput.value = data.username || "";
  bioInput.value = data.bio || "";
  document.body.className = data.theme || "default-theme";
  profilePfp.src = data.pfpURL || "default-avatar.png";

  // Show edit panel only if viewing own profile
  if (uid === auth.currentUser.uid) top10EditPanel.style.display = "block";
  else top10EditPanel.style.display = "none";

  // Load Top 10 Friends
  top10Container.innerHTML = "";
  (data.top10Friends || []).forEach(f => {
    const div = document.createElement("div");
    div.className = "top-friend";
    div.innerHTML = `<img src="${f.pfpURL || 'default-avatar.png'}"> ${f.username || 'Unknown'}`;
    top10Container.appendChild(div);
  });

  // Load Wall Comments
  wallCommentsContainer.innerHTML = "";
  const wallSnap = await getDocs(query(collection(db, "users", uid, "wallComments"), orderBy("createdAt","asc")));
  wallSnap.forEach(commentSnap => {
    const c = commentSnap.data();
    const div = document.createElement("div");
    div.className = "wall-comment";
    div.innerHTML = `${c.username || 'Anonymous'}: ${c.text} ${c.userId===auth.currentUser.uid||uid===auth.currentUser.uid?'<button class="delete-comment">Delete</button>':''}`;
    const deleteBtn = div.querySelector(".delete-comment");
    if(deleteBtn) deleteBtn.addEventListener("click", async()=>{ await deleteDoc(doc(db,"users",uid,"wallComments",commentSnap.id)); div.remove(); });
    wallCommentsContainer.appendChild(div);
  });
}

// --------------------- Save Profile ---------------------
saveProfileBtn?.addEventListener("click", async()=>{
  const pfpFile = pfpInput.files[0];
  let pfpURL = profilePfp.src;

  if(pfpFile){
    const storageRef = ref(storage, `pfp/${auth.currentUser.uid}_${Date.now()}`);
    await uploadBytes(storageRef, pfpFile);
    pfpURL = await getDownloadURL(storageRef);
  }

  await setDoc(doc(db,"users",auth.currentUser.uid),{
    username: usernameInput.value,
    bio: bioInput.value,
    theme: themeSelect.value,
    pfpURL
  }, { merge: true });

  profilePfp.src = pfpURL;
  document.body.className = themeSelect.value;
});

// --------------------- Custom HTML ---------------------
applyCustomHtmlBtn?.addEventListener("click", ()=>{
  customHtmlPreview.innerHTML = customHtmlInput.value;
});

// --------------------- Post Wall Comment ---------------------
postWallCommentBtn?.addEventListener("click", async()=>{
  const text = wallCommentInput.value.trim();
  if(!text) return;
  await addDoc(collection(db,"users",auth.currentUser.uid,"wallComments"),{
    text, userId: auth.currentUser.uid, username: usernameInput.value || 'Anonymous', createdAt: new Date()
  });
  wallCommentInput.value="";
  loadProfile(auth.currentUser.uid);
});

// --------------------- Auth State ---------------------
onAuthStateChanged(auth,user=>{
  if(!user) window.location.href="login.html";
  else loadProfile(user.uid);
});
