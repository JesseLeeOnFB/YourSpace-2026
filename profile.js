import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import { getFirestore, doc, getDoc, setDoc, collection, addDoc, getDocs, orderBy, query, updateDoc, deleteDoc, increment } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-storage.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";

// ---------------- Firebase ----------------
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

// ---------------- DOM ----------------
const profilePic = document.getElementById("profilePic");
const profilePicInput = document.getElementById("profilePicInput");
const savePfpBtn = document.getElementById("savePfpBtn");

const bioInput = document.getElementById("bioInput");
const locationInput = document.getElementById("locationInput");
const saveBioBtn = document.getElementById("saveBioBtn");

const top10FriendsContainer = document.getElementById("top10Friends");

const wallInput = document.getElementById("wallInput");
const postWallBtn = document.getElementById("postWallBtn");
const wallPostsContainer = document.getElementById("wallPostsContainer");

const musicUrlInput = document.getElementById("musicUrlInput");
const playMusicBtn = document.getElementById("playMusicBtn");
const musicPlayer = document.getElementById("musicPlayer");

const customHtmlInput = document.getElementById("customHtmlInput");
const applyCustomHtmlBtn = document.getElementById("applyCustomHtmlBtn");
const resetCustomHtmlBtn = document.getElementById("resetCustomHtmlBtn");

const themeSelect = document.getElementById("themeSelect");
const applyThemeBtn = document.getElementById("applyThemeBtn");
const resetThemeBtn = document.getElementById("resetThemeBtn");

const feedNavBtn = document.getElementById("feedNavBtn");
const profileNavBtn = document.getElementById("profileNavBtn");
const logoutBtn = document.getElementById("logoutBtn");

// ---------------- Navigation ----------------
feedNavBtn.addEventListener("click",()=>window.location.href="feed.html");
profileNavBtn.addEventListener("click",()=>window.location.href="profile.html");
logoutBtn.addEventListener("click", async ()=>{
    await signOut(auth);
    window.location.href="login.html";
});

// ---------------- Auth ----------------
onAuthStateChanged(auth, async user=>{
    if(!user){window.location.href="login.html"; return;}
    await loadProfile();
    await loadTop10();
    await loadWall();
});

// ---------------- Helpers ----------------
async function getUsername(uid){
    try{
        const snap=await getDoc(doc(db,"users",uid));
        return snap.exists()?snap.data().username||"Anonymous":"Anonymous";
    }catch{ return "Anonymous";}
}

// ---------------- Profile Pic ----------------
savePfpBtn.addEventListener("click", async ()=>{
    const file = profilePicInput.files[0];
    if(!file){alert("Select a file!"); return;}
    const storageRef = ref(storage, `pfps/${auth.currentUser.uid}`);
    await uploadBytes(storageRef,file);
    const url = await getDownloadURL(storageRef);
    profilePic.src = url;
    await updateDoc(doc(db,"users",auth.currentUser.uid), { pfpURL: url });
});

// ---------------- Bio / Location ----------------
saveBioBtn.addEventListener("click", async ()=>{
    await updateDoc(doc(db,"users",auth.currentUser.uid),{
        bio: bioInput.value,
        location: locationInput.value
    });
});

// ---------------- Load Profile ----------------
async function loadProfile(){
    const snap = await getDoc(doc(db,"users",auth.currentUser.uid));
    if(snap.exists()){
        const data = snap.data();
        profilePic.src = data.pfpURL || "default-avatar.png";
        bioInput.value = data.bio || "";
        locationInput.value = data.location || "";
    }
}

// ---------------- Top 10 Friends ----------------
async function loadTop10(){
    const snap = await getDoc(doc(db,"users",auth.currentUser.uid));
    if(!snap.exists()) return;
    const friends = snap.data().top10Friends || [];
    top10FriendsContainer.innerHTML = "";
    friends.forEach(f=>{
        const div = document.createElement("div");
        div.className = "top-friend";
        div.innerHTML=`<img src="${f.pfpURL||'default-avatar.png'}"> ${f.username||'Unknown'}`;
        top10FriendsContainer.appendChild(div);
    });
}

// ---------------- Wall ----------------
postWallBtn.addEventListener("click", async ()=>{
    const text = wallInput.value.trim();
    if(!text) return;
    await addDoc(collection(db,"users",auth.currentUser.uid,"wallPosts"),{
        userId: auth.currentUser.uid,
        text,
        createdAt: new Date()
    });
    wallInput.value="";
    await loadWall();
});

async function loadWall(){
    wallPostsContainer.innerHTML="";
    const q = query(collection(db,"users",auth.currentUser.uid,"wallPosts"), orderBy("createdAt","desc"));
    const snap = await getDocs(q);
    snap.forEach(docSnap=>{
        const data = docSnap.data();
        const div = document.createElement("div");
        div.className="wall-post";
        div.textContent=`${data.text}`;
        // Delete button for poster
        if(data.userId === auth.currentUser.uid){
            const del = document.createElement("button");
            del.textContent="Delete";
            del.addEventListener("click", async ()=>{
                await deleteDoc(doc(db,"users",auth.currentUser.uid,"wallPosts",docSnap.id));
                loadWall();
            });
            div.appendChild(del);
        }
        wallPostsContainer.appendChild(div);
    });
}

// ---------------- Music Player ----------------
playMusicBtn.addEventListener("click", ()=>{
    const url = musicUrlInput.value.trim();
    if(!url) return;
    let embed="";
    if(url.includes("youtube.com") || url.includes("youtu.be")){
        const id = url.includes("youtu.be") ? url.split("/").pop() : new URL(url).searchParams.get("v");
        embed=`<iframe width="300" height="150" src="https://www.youtube.com/embed/${id}" frameborder="0" allowfullscreen></iframe>`;
    }else if(url.includes("soundcloud.com")){
        embed=`<iframe width="300" height="150" scrolling="no" frameborder="no" allow="autoplay" src="https://w.soundcloud.com/player/?url=${encodeURIComponent(url)}"></iframe>`;
    }
    musicPlayer.innerHTML=embed;
});

// ---------------- Custom HTML ----------------
applyCustomHtmlBtn.addEventListener("click", ()=>{
    const code = customHtmlInput.value;
    const container = document.getElementById("profileContainer");
    container.innerHTML += code;
});
resetCustomHtmlBtn.addEventListener("click", ()=>{
    customHtmlInput.value="";
    loadProfile(); loadTop10(); loadWall();
});

// ---------------- Themes ----------------
applyThemeBtn.addEventListener("click", ()=>{
    document.body.className=themeSelect.value;
});
resetThemeBtn.addEventListener("click", ()=>{
    document.body.className="";
});
