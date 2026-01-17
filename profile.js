import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import { getFirestore, doc, getDoc, setDoc, collection, addDoc, getDocs, query, orderBy, deleteDoc } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-storage.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";

// ------------------ Firebase Config ------------------
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

// ------------------ DOM Elements ------------------
const profilePFP = document.getElementById("profilePFP");
const changePFPInput = document.getElementById("changePFPInput");
const savePFPBtn = document.getElementById("savePFPBtn");

const bioInput = document.getElementById("bioInput");
const saveBioBtn = document.getElementById("saveBioBtn");

const top10Container = document.getElementById("top10Container");
const wallPostsContainer = document.getElementById("wallPostsContainer");
const wallCommentInput = document.getElementById("wallCommentInput");
const postWallCommentBtn = document.getElementById("postWallCommentBtn");

const customHtmlInput = document.getElementById("customHtmlInput");
const applyCustomBtn = document.getElementById("applyCustomBtn");
const resetCustomBtn = document.getElementById("resetCustomBtn");

const presetThemes = document.getElementById("presetThemes");
const resetThemeBtn = document.getElementById("resetThemeBtn");

const musicInput = document.getElementById("musicInput");
const saveMusicBtn = document.getElementById("saveMusicBtn");
const musicPlayer = document.getElementById("musicPlayer");

const navFeedBtn = document.getElementById("feedNavBtn");
const navProfileBtn = document.getElementById("profileNavBtn");
const logoutBtn = document.getElementById("logoutBtn");

// ------------------ Navigation ------------------
navFeedBtn?.addEventListener("click", ()=>window.location.href="feed.html");
navProfileBtn?.addEventListener("click", ()=>window.location.href="profile.html");
logoutBtn?.addEventListener("click", async ()=>{await signOut(auth); window.location.href="login.html";});

// ------------------ Helpers ------------------
async function getUserData(uid){
    const snap = await getDoc(doc(db,"users",uid));
    return snap.exists()?snap.data():null;
}

function createClickableUsername(uid, username){
    const span = document.createElement("span");
    span.textContent=username;
    span.style.cursor="pointer";
    span.style.fontWeight="bold";
    span.addEventListener("click", ()=>window.location.href=`profile.html?uid=${uid}`);
    return span;
}

// ------------------ Profile PFP ------------------
savePFPBtn.addEventListener("click", async ()=>{
    const file = changePFPInput.files[0];
    if(!file)return alert("Select a file");
    const storageRef=ref(storage, `profilePFPs/${auth.currentUser.uid}`);
    await uploadBytes(storageRef,file);
    const url = await getDownloadURL(storageRef);
    await setDoc(doc(db,"users",auth.currentUser.uid),{pfpURL:url},{merge:true});
    profilePFP.src=url;
});

// ------------------ Bio ------------------
saveBioBtn.addEventListener("click", async ()=>{
    const text = bioInput.value.trim();
    await setDoc(doc(db,"users",auth.currentUser.uid),{bio:text},{merge:true});
});

// ------------------ Preset Themes ------------------
presetThemes.addEventListener("change", ()=>{
    document.body.className=`theme-${presetThemes.value}`;
});
resetThemeBtn.addEventListener("click", ()=>document.body.className="");

// ------------------ Custom HTML ------------------
applyCustomBtn.addEventListener("click", ()=>{eval(customHtmlInput.value)});
resetCustomBtn.addEventListener("click", ()=>customHtmlInput.value="");

// ------------------ Music Player ------------------
saveMusicBtn.addEventListener("click", ()=>{
    const url=musicInput.value.trim();
    if(!url)return alert("Enter a music URL");
    let embedURL="";
    if(url.includes("youtube")){embedURL=url.replace("watch?v=","embed/")+"?autoplay=0";}
    musicPlayer.innerHTML=`<iframe src="${embedURL}" frameborder="0" allowfullscreen></iframe>`;
});

// ------------------ Wall Comments ------------------
async function loadWallComments(uid){
    wallPostsContainer.innerHTML="";
    const snap = await getDocs(query(collection(db,"users",uid,"wall"),orderBy("createdAt","asc")));
    snap.forEach(docSnap=>{
        const data=docSnap.data();
        const div=document.createElement("div");
        div.className="wallPost";
        const header=document.createElement("div");
        header.className="wallPostHeader";
        const usernameSpan=createClickableUsername(data.userId,data.username||"Anonymous");
        header.appendChild(usernameSpan);
        if(data.userId===auth.currentUser.uid){
            const delBtn=document.createElement("button");
            delBtn.textContent="Delete";
            delBtn.addEventListener("click", async ()=>{
                await deleteDoc(doc(db,"users",uid,"wall",docSnap.id));
                div.remove();
            });
            header.appendChild(delBtn);
        }
        div.appendChild(header);
        const p=document.createElement("p");
        p.textContent=data.text;
        div.appendChild(p);
        wallPostsContainer.appendChild(div);
    });
}

postWallCommentBtn.addEventListener("click", async ()=>{
    const text=wallCommentInput.value.trim();
    if(!text)return;
    const urlParams=new URLSearchParams(window.location.search);
    const profileUid=urlParams.get("uid")||auth.currentUser.uid;
    const userData=await getUserData(auth.currentUser.uid);
    await addDoc(collection(db,"users",profileUid,"wall"),{
        userId:auth.currentUser.uid,
        username:userData.username||"Anonymous",
        text,
        createdAt:new Date()
    });
    wallCommentInput.value="";
    loadWallComments(profileUid);
});

// ------------------ Load Top 10 Friends ------------------
async function loadTop10(uid){
    top10Container.innerHTML="";
    const userData=await getUserData(uid);
    const friends=userData.top10Friends||[];
    friends.forEach(f=>{
        const div=document.createElement("div");
        div.className="topFriend";
        div.appendChild(createClickableUsername(f.uid,f.username||"Unknown"));
        const img=document.createElement("img");
        img.src=f.pfpURL||"default-avatar.png";
        div.insertBefore(img,div.firstChild);
        top10Container.appendChild(div);
    });
}

// ------------------ Load Profile ------------------
onAuthStateChanged(auth, async user=>{
    if(!user){window.location.href="login.html"; return;}
    const urlParams=new URLSearchParams(window.location.search);
    const profileUid=urlParams.get("uid")||user.uid;

    const data=await getUserData(profileUid);
    if(!data)return;

    // Load bio & PFP
    bioInput.value=data.bio||"";
    profilePFP.src=data.pfpURL||"default-avatar.png";

    // Load wall comments
    loadWallComments(profileUid);

    // Load top 10
    loadTop10(profileUid);
});
