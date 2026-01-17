// PROFILE.JS - Direct Firebase, cache-busting included
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc, updateDoc, arrayUnion, collection, getDocs } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";
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

// DOM
const usernameInput = document.getElementById('usernameInput');
const bioInput = document.getElementById('bioInput');
const locationInput = document.getElementById('locationInput');
const saveProfileBtn = document.getElementById('saveProfileBtn');
const profilePfp = document.getElementById('profilePfp');
const profilePfpInput = document.getElementById('profilePfpInput');
const saveProfilePfpBtn = document.getElementById('saveProfilePfpBtn');
const themeSelect = document.getElementById('themeSelect');
const saveThemeBtn = document.getElementById('saveThemeBtn');
const customHtmlInput = document.getElementById('customHtmlInput');
const saveCustomHtmlBtn = document.getElementById('saveCustomHtmlBtn');
const wallCommentsContainer = document.getElementById('wallCommentsContainer');
const wallCommentInput = document.getElementById('wallCommentInput');
const addWallCommentBtn = document.getElementById('addWallCommentBtn');
const top10FriendsContainer = document.getElementById('top10FriendsContainer');
const editTop10Btn = document.getElementById('editTop10Btn');
const musicLinkInput = document.getElementById('musicLinkInput');
const loadMusicBtn = document.getElementById('loadMusicBtn');
const musicIframe = document.getElementById('musicIframe');

// Cache buster
function appendCacheBuster(url){ return url + '?cb=' + Date.now(); }

// Load Profile
async function loadProfile() {
  const user = auth.currentUser;
  if (!user) return;

  const userDocRef = doc(db, "users", user.uid);
  const docSnap = await getDoc(userDocRef);
  if (docSnap.exists()) {
    const data = docSnap.data();
    usernameInput.value = data.username || '';
    bioInput.value = data.bio || '';
    locationInput.value = data.location || '';
    profilePfp.src = data.pfpURL ? appendCacheBuster(data.pfpURL) : '';
    document.body.className = data.theme || 'default-theme';
    customHtmlInput.value = data.customHtml || '';

    // Wall comments
    wallCommentsContainer.innerHTML = '';
    if (data.wallComments) {
      data.wallComments.forEach(comment=>{
        const div = document.createElement('div');
        div.className='wall-comment';
        div.innerHTML = `<strong>${comment.username||'Unknown'}</strong>: ${comment.text}
          ${(comment.userId===user.uid)?'<button class="deleteWallCommentBtn">Delete</button>':''}`;
        if(comment.userId===user.uid){
          div.querySelector('.deleteWallCommentBtn').addEventListener('click',async()=>{
            await updateDoc(userDocRef,{wallComments: arrayUnion(comment)}); // remove
            loadProfile();
          });
        }
        wallCommentsContainer.appendChild(div);
      });
    }

    // Top 10 friends (dummy for now)
    top10FriendsContainer.innerHTML='';
    const top10=data.top10Friends||[];
    top10.forEach(friend=>{
      const fdiv=document.createElement('div');
      fdiv.className='top-friend';
      fdiv.innerHTML=`<img src="${friend.pfpURL||''}" width="40" height="40" style="border-radius:50%;"><span>${friend.username||'Unknown'}</span>`;
      top10FriendsContainer.appendChild(fdiv);
    });
  }
}

// Save Profile Info
saveProfileBtn.addEventListener('click', async()=>{
  const user=auth.currentUser;
  if(!user) return;
  const userDocRef = doc(db,"users",user.uid);
  await updateDoc(userDocRef,{
    username: usernameInput.value,
    bio: bioInput.value,
    location: locationInput.value
  });
  alert("Profile info saved!");
});

// Save Profile Picture
saveProfilePfpBtn.addEventListener('click', async()=>{
  const file=profilePfpInput.files[0];
  if(!file)return alert("Select a picture first");
  const user=auth.currentUser;
  const storageRef=ref(storage,`profilePictures/${user.uid}/${Date.now()}_${file.name}`);
  await uploadBytes(storageRef,file);
  const url=await getDownloadURL(storageRef);
  profilePfp.src=appendCacheBuster(url);
  const userDocRef=doc(db,"users",user.uid);
  await updateDoc(userDocRef,{pfpURL:url});
  alert("Profile picture updated!");
});

// Add Wall Comment
addWallCommentBtn.addEventListener('click', async()=>{
  const user=auth.currentUser;
  if(!user) return;
  const comment={
    text: wallCommentInput.value,
    userId: user.uid,
    username: usernameInput.value,
    timestamp: Date.now()
  };
  const userDocRef=doc(db,"users",user.uid);
  await updateDoc(userDocRef,{wallComments: arrayUnion(comment)});
  wallCommentInput.value='';
  loadProfile();
});

// Theme save
saveThemeBtn.addEventListener('click', async()=>{
  const user=auth.currentUser;
  if(!user) return;
  document.body.className = themeSelect.value;
  const userDocRef=doc(db,"users",user.uid);
  await updateDoc(userDocRef,{theme: themeSelect.value});
});

// Custom HTML save
saveCustomHtmlBtn.addEventListener('click', async()=>{
  const user=auth.currentUser;
  if(!user) return;
  const userDocRef=doc(db,"users",user.uid);
  await updateDoc(userDocRef,{customHtml: customHtmlInput.value});
});

// Load Music
loadMusicBtn.addEventListener('click', ()=>{
  let link = musicLinkInput.value.trim();
  if(!link)return;
  // Simple embed conversion for YouTube/Spotify/SoundCloud
  if(link.includes('youtube')){ link = link.replace('watch?v=','embed/'); }
  else if(link.includes('soundcloud')){ link = 'https://w.soundcloud.com/player/?url='+encodeURIComponent(link); }
  musicIframe.src=appendCacheBuster(link);
});

// Edit Top 10 dummy
editTop10Btn.addEventListener('click',()=>{
  alert("Top 10 friends editor coming soon!");
});

// Navigation buttons
document.getElementById('navFeed').addEventListener('click',()=>alert('Navigation placeholder: Feed'));
document.getElementById('navProfile').addEventListener('click',()=>alert('Navigation placeholder: Profile'));
document.getElementById('navNotifications').addEventListener('click',()=>alert('Navigation placeholder: Notifications'));
document.getElementById('navSettings').addEventListener('click',()=>alert('Navigation placeholder: Settings'));

// INIT
onAuthStateChanged(auth,user=>{
  if(user) loadProfile();
});
