import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc, updateDoc, collection, addDoc, query, orderBy, getDocs } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-storage.js";

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

onAuthStateChanged(auth, async user => {
  if (!user) return location.href = "login.html";
  currentUser = user;
  loadProfile();
  loadWall();
  loadTop10();
  loadMessages();
});

document.getElementById("navFeed").onclick = () => location.href = "feed.html";
document.getElementById("navProfile").onclick = () => location.href = "profile.html";
document.getElementById("navMessages").onclick = () => location.href = "messages.html";
document.getElementById("navSettings").onclick = () => location.href = "settings.html";
document.getElementById("navLogout").onclick = () => signOut(auth);

async function loadProfile() {
  const refDoc = doc(db,"users",currentUser.uid);
  const snap = await getDoc(refDoc);
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
  await updateDoc(doc(db,"users",currentUser.uid), {
    username: usernameInput.value,
    bio: bioInput.value,
    location: locationInput.value,
    theme: themeSelect.value
  });
  document.body.className = themeSelect.value;
};

savePfpBtn.onclick = async () => {
  const file = pfpInput.files[0];
  if (!file) return;
  const pfpRef = ref(storage, `profilePictures/${currentUser.uid}/pfp.jpg`);
  await uploadBytes(pfpRef, file);
  const url = await getDownloadURL(pfpRef);
  await updateDoc(doc(db,"users",currentUser.uid), { pfpUrl: url });
  profilePfp.src = url;
};

function loadMusic(url) {
  let embed = "";
  if (url.includes("youtube")) {
    const id = url.split("v=")[1];
    embed = `https://www.youtube.com/embed/${id}?autoplay=1`;
  }
  musicIframe.src = embed;
}

saveMusicBtn.onclick = async () => {
  await updateDoc(doc(db,"users",currentUser.uid), { musicUrl: musicUrlInput.value });
  loadMusic(musicUrlInput.value);
};

async function loadWall() {
  wallComments.innerHTML = "";
  const q = query(collection(db,"users",currentUser.uid,"wallComments"), orderBy("created","desc"));
  const snap = await getDocs(q);
  snap.forEach(d=>{
    const div=document.createElement("div");
    div.className="wall-comment";
    div.textContent=d.data().text;
    wallComments.appendChild(div);
  });
}

postCommentBtn.onclick = async () => {
  await addDoc(collection(db,"users",currentUser.uid,"wallComments"), {
    text: wallCommentInput.value,
    created: Date.now()
  });
  wallCommentInput.value="";
  loadWall();
};

async function loadTop10() {
  const refDoc = doc(db,"users",currentUser.uid);
  const snap = await getDoc(refDoc);
  const list = snap.data().top10Friends || [];
  renderTop10(list);
}

function renderTop10(list) {
  top10FriendsContainer.innerHTML="";
  list.forEach((f,i)=>{
    const d=document.createElement("div");
    d.className="top-friend";
    d.draggable=true;
    d.textContent=`${i+1}. ${f}`;
    top10FriendsContainer.appendChild(d);
  });
}

saveTop10Btn.onclick = async () => {
  const list=[...top10FriendsContainer.children].map(d=>d.textContent.replace(/^\d+\.\s/,""));
  await updateDoc(doc(db,"users",currentUser.uid), { top10Friends:list });
};

async function loadMessages() {
  threads.innerHTML="";
}

saveCustomHtmlBtn.onclick = async () => {
  await updateDoc(doc(db,"users",currentUser.uid), { customHtml: customHtmlInput.value });
  customHtmlContainer.innerHTML = customHtmlInput.value;
};
