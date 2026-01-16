import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";
import { getFirestore, doc, getDoc, updateDoc, arrayUnion } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-storage.js";

// Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyAHMbxr7rJS88ZefVJzt8p_9CCTstLmLU8",
  authDomain: "yourspace-2026.firebaseapp.com",
  projectId: "yourspace-2026",
  storageBucket: "yourspace-2026.firebasestorage.app",
  messagingSenderId: "72667267302",
  appId: "1:72667267302:web:2bed5f543e05d49ca8fb27",
  measurementId: "G-FZ4GFXWGSS"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

document.addEventListener('DOMContentLoaded', async () => {

  const usernameInput = document.getElementById('usernameInput');
  const bioInput = document.getElementById('bioInput');
  const locationInput = document.getElementById('locationInput');
  const saveProfileBtn = document.getElementById('saveProfileBtn');

  const profilePfp = document.getElementById('profilePfp');
  const profilePfpInput = document.getElementById('profilePfpInput');
  const saveProfilePfpBtn = document.getElementById('saveProfilePfpBtn');

  const wallCommentsContainer = document.getElementById('wallCommentsContainer');
  const wallCommentInput = document.getElementById('wallCommentInput');
  const addWallCommentBtn = document.getElementById('addWallCommentBtn');

  const top10FriendsContainer = document.getElementById('top10FriendsContainer');
  const editTop10Btn = document.getElementById('editTop10Btn');

  const themeSelect = document.getElementById('themeSelect');
  const saveThemeBtn = document.getElementById('saveThemeBtn');

  const musicInput = document.getElementById('musicInput');
  const loadMusicBtn = document.getElementById('loadMusicBtn');
  const musicPlayerContainer = document.getElementById('musicPlayerContainer');

  async function loadProfile() {
    const user = auth.currentUser;
    if (!user) return;

    const userDocRef = doc(db, "users", user.uid);
    const docSnap = await getDoc(userDocRef);
    if (!docSnap.exists()) return;

    const data = docSnap.data();

    usernameInput.value = data.username || "";
    bioInput.value = data.bio || "";
    locationInput.value = data.location || "";
    if(data.pfpURL) profilePfp.src = data.pfpURL + `?cachebust=${Date.now()}`;

    wallCommentsContainer.innerHTML = "";
    if(data.wallComments) {
      data.wallComments.forEach(c=>{
        const div = document.createElement("div");
        div.className = "wall-comment";
        div.textContent = `${c.username || 'Unknown'}: ${c.text}`;
        wallCommentsContainer.appendChild(div);
      });
    }

    top10FriendsContainer.innerHTML = "";
    if(data.top10 && data.top10.length>0){
      data.top10.forEach(f=>{
        const div = document.createElement("div");
        div.className = "top-friend";
        div.innerHTML = `<img src="${f.pfp || ''}" alt=""><span>${f.username}</span>`;
        top10FriendsContainer.appendChild(div);
      });
    }
  }

  saveProfileBtn.addEventListener("click", async ()=>{
    const user = auth.currentUser;
    if(!user) return;
    const refDoc = doc(db,"users",user.uid);
    await updateDoc(refDoc,{
      username: usernameInput.value,
      bio: bioInput.value,
      location: locationInput.value
    });
    alert("Profile info updated!");
  });

  saveProfilePfpBtn.addEventListener("click", async ()=>{
    const user = auth.currentUser;
    if(!user) return;
    const file = profilePfpInput.files[0];
    if(!file) return alert("Select a picture");
    const storageRef = ref(storage, `profileImages/${user.uid}/${Date.now()}_${file.name}`);
    await uploadBytes(storageRef, file);
    const url = await getDownloadURL(storageRef);
    profilePfp.src = url + `?cachebust=${Date.now()}`;
    await updateDoc(doc(db,"users",user.uid), {pfpURL:url});
    alert("Profile picture updated!");
  });

  addWallCommentBtn.addEventListener("click", async ()=>{
    const user = auth.currentUser;
    if(!user) return;
    const text = wallCommentInput.value.trim();
    if(!text) return;
    await updateDoc(doc(db,"users",user.uid), {
      wallComments: arrayUnion({
        text,
        username: usernameInput.value || "Unknown",
        userId: user.uid,
        timestamp: Date.now()
      })
    });
    wallCommentInput.value="";
    loadProfile();
  });

  saveThemeBtn.addEventListener("click", ()=>{
    const t = themeSelect.value;
    document.body.className = t;
  });

  loadMusicBtn.addEventListener("click", ()=>{
    const url = musicInput.value.trim();
    if(!url) return alert("Enter a music URL");
    let embed = "";
    if(url.includes("youtube.com") || url.includes("youtu.be")){
      const id = url.split("v=")[1] || url.split("/").pop();
      embed = `<iframe width="300" height="80" src="https://www.youtube.com/embed/${id}?autoplay=1" frameborder="0" allow="autoplay; encrypted-media" allowfullscreen></iframe>`;
    }
    else if(url.includes("soundcloud.com")){
      embed = `<iframe width="300" height="80" scrolling="no" frameborder="no" allow="autoplay" src="https://w.soundcloud.com/player/?url=${encodeURIComponent(url)}&auto_play=true"></iframe>`;
    }
    musicPlayerContainer.innerHTML = embed;
  });

  onAuthStateChanged(auth, user=>{
    if(user) loadProfile();
  });

});
