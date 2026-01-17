import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import {
  getFirestore, doc, getDoc, setDoc, collection, addDoc, getDocs, updateDoc, deleteDoc, orderBy, query
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";
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
const profilePFP = document.getElementById("profilePFP");
const pfpInput = document.getElementById("pfpInput");
const savePFPBtn = document.getElementById("savePFPBtn");

const bioInput = document.getElementById("bioInput");
const saveBioBtn = document.getElementById("saveBioBtn");

const locationInput = document.getElementById("locationInput");
const saveLocationBtn = document.getElementById("saveLocationBtn");

const top10Container = document.getElementById("top10Container");

const wallCommentsContainer = document.getElementById("wallCommentsContainer");
const wallInput = document.getElementById("wallInput");
const postWallBtn = document.getElementById("postWallBtn");

const musicURLInput = document.getElementById("musicURLInput");
const playMusicBtn = document.getElementById("playMusicBtn");
const musicPlayerContainer = document.getElementById("musicPlayerContainer");

const customHTMLInput = document.getElementById("customHTMLInput");
const applyCustomHTMLBtn = document.getElementById("applyCustomHTMLBtn");
const resetCustomHTMLBtn = document.getElementById("resetCustomHTMLBtn");
const presetThemeSelect = document.getElementById("presetThemeSelect");

const navFeedBtn = document.getElementById("feedNavBtn");
const navProfileBtn = document.getElementById("profileNavBtn");
const logoutBtn = document.getElementById("logoutBtn");

// --------------------- Navigation ---------------------
navFeedBtn?.addEventListener("click",()=>window.location.href="feed.html");
navProfileBtn?.addEventListener("click",()=>window.location.href="profile.html");
logoutBtn?.addEventListener("click",async()=>{await signOut(auth); window.location.href="login.html";});

// --------------------- Helpers ---------------------
async function getUserData(uid){return (await getDoc(doc(db,"users",uid))).data()||{};}
async function saveUserField(field,value){await updateDoc(doc(db,"users",auth.currentUser.uid),{[field]:value});}

// --------------------- Profile PFP ---------------------
savePFPBtn?.addEventListener("click",async()=>{
  const file=pfpInput.files[0]; if(!file)return alert("Select image");
  const storageRef=ref(storage,`pfp/${auth.currentUser.uid}_${Date.now()}_${file.name}`);
  await uploadBytes(storageRef,file);
  const url=await getDownloadURL(storageRef);
  profilePFP.src=url;
  saveUserField("pfpURL",url);
});

// --------------------- Bio / Location ---------------------
saveBioBtn?.addEventListener("click",()=>saveUserField("bio",bioInput.value));
saveLocationBtn?.addEventListener("click",()=>saveUserField("location",locationInput.value));

// --------------------- Top 10 Friends ---------------------
async function loadTop10Friends(){
  const data=await getUserData(auth.currentUser.uid);
  const friends=data.top10Friends||[];
  top10Container.innerHTML="";
  friends.forEach(f=>{
    const div=document.createElement("div");
    div.className="top-friend";
    div.draggable=true;
    div.innerHTML=`<img src="${f.pfpURL||'default-avatar.png'}"> ${f.username||'Unknown'}`;
    top10Container.appendChild(div);
  });

  // Drag & Drop Ranking
  let dragSrc=null;
  top10Container.querySelectorAll(".top-friend").forEach(item=>{
    item.addEventListener("dragstart",(e)=>{dragSrc=item;});
    item.addEventListener("dragover",(e)=>{e.preventDefault();});
    item.addEventListener("drop",(e)=>{
      e.preventDefault();
      if(dragSrc!==item){
        const children=[...top10Container.children];
        const srcIndex=children.indexOf(dragSrc);
        const destIndex=children.indexOf(item);
        if(srcIndex<destIndex) item.after(dragSrc); else item.before(dragSrc);
        // Save new order
        const newOrder=[...top10Container.children].map(d=>{
          return {username:d.textContent.trim(),pfpURL:d.querySelector("img").src};
        });
        saveUserField("top10Friends",newOrder);
      }
    });
  });
}

// --------------------- Wall ---------------------
async function loadWall(){
  const snap=await getDocs(query(collection(db,"wall",auth.currentUser.uid,"comments"),orderBy("createdAt")));
  wallCommentsContainer.innerHTML="";
  snap.forEach(docSnap=>{
    const data=docSnap.data();
    const p=document.createElement("p");
    p.textContent=`${data.username||'Anonymous'}: ${data.text}`;
    if(data.userId===auth.currentUser.uid){
      const btn=document.createElement("button");
      btn.textContent="Delete";
      btn.addEventListener("click",async()=>{
        await deleteDoc(doc(db,"wall",auth.currentUser.uid,"comments",docSnap.id));
        loadWall();
      });
      p.appendChild(btn);
    }
    wallCommentsContainer.appendChild(p);
  });
}

postWallBtn?.addEventListener("click",async()=>{
  const text=wallInput.value.trim(); if(!text)return;
  await addDoc(collection(db,"wall",auth.currentUser.uid,"comments"),{
    text, userId:auth.currentUser.uid,
    username:auth.currentUser.displayName||"Anonymous",
    createdAt:new Date()
  });
  wallInput.value="";
  loadWall();
});

// --------------------- Music Player ---------------------
playMusicBtn?.addEventListener("click",()=>{
  const url=musicURLInput.value.trim(); if(!url)return;
  let embed="";
  if(url.includes("youtube.com")||url.includes("youtu.be")){
    let vid=url.split("v=")[1]||url.split("/").pop();
    embed=`<iframe width="100%" height="166" src="https://www.youtube.com/embed/${vid}?autoplay=1" frameborder="0" allowfullscreen></iframe>`;
  }else if(url.includes("soundcloud.com")){
    embed=`<iframe width="100%" height="166" scrolling="no" frameborder="no" src="https://w.soundcloud.com/player/?url=${encodeURIComponent(url)}"></iframe>`;
  }else if(url.includes("spotify.com")){
    embed=`<iframe width="100%" height="166" src="https://open.spotify.com/embed/track/${url.split("/").pop()}" frameborder="0" allow="encrypted-media"></iframe>`;
  }
  musicPlayerContainer.innerHTML=embed;
});

// --------------------- Custom HTML/CSS ---------------------
applyCustomHTMLBtn?.addEventListener("click",()=>{
  const style=document.createElement("style");
  style.id="customHTMLStyle";
  style.innerHTML=customHTMLInput.value;
  document.head.appendChild(style);
});

resetCustomHTMLBtn?.addEventListener("click",()=>{
  const el=document.getElementById("customHTMLStyle"); if(el)el.remove();
  customHTMLInput.value="";
  presetThemeSelect.value="default";
  document.body.className="";
});

presetThemeSelect?.addEventListener("change",()=>{
  document.body.className="";
  if(presetThemeSelect.value!=="default") document.body.classList.add(`theme-${presetThemeSelect.value}`);
});

// --------------------- Load Profile Data ---------------------
onAuthStateChanged(auth,user=>{
  if(!user){window.location.href="login.html"; return;}
  getUserData(user.uid).then(data=>{
    profilePFP.src=data.pfpURL||"default-avatar.png";
    bioInput.value=data.bio||"";
    locationInput.value=data.location||"";
    loadTop10Friends();
    loadWall();
  });
});
