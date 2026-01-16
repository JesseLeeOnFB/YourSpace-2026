// PROFILE.JS - Direct Firebase connection, cache-busting included
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";
import { getFirestore, doc, getDoc, updateDoc, arrayUnion } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-storage.js";

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

const wallCommentsContainer = document.getElementById('wallCommentsContainer');
const wallCommentInput = document.getElementById('wallCommentInput');
const addWallCommentBtn = document.getElementById('addWallCommentBtn');

const top10FriendsContainer = document.getElementById('top10FriendsContainer');

const musicLinkInput = document.getElementById('musicLinkInput');
const saveMusicBtn = document.getElementById('saveMusicBtn');
const musicEmbedContainer = document.getElementById('musicEmbedContainer');

const presetThemes = document.getElementById('presetThemes');
const customHTML = document.getElementById('customHTML');
const applyThemeBtn = document.getElementById('applyThemeBtn');

// Cache-busting helper
function uniqueURL(url){ return url + "?cb=" + Date.now(); }

// Load user profile
async function loadProfile(user) {
  const userDocRef = doc(db, "users", user.uid);
  const docSnap = await getDoc(userDocRef);
  if (!docSnap.exists()) return;
  const data = docSnap.data();

  usernameInput.value = data.username || '';
  bioInput.value = data.bio || '';
  locationInput.value = data.location || '';
  if (data.pfpURL) profilePfp.src = uniqueURL(data.pfpURL);

  // Load Wall Comments
  wallCommentsContainer.innerHTML = '';
  if (data.wallComments){
    data.wallComments.forEach(comment=>{
      const div = document.createElement('div');
      div.className = 'wall-comment';
      div.innerHTML = `<strong>${comment.username || 'Unknown'}</strong>: ${comment.text}`;
      wallCommentsContainer.appendChild(div);
    });
  }

  // Load Top 10 Friends
  top10FriendsContainer.innerHTML = '';
  if (data.top10Friends){
    data.top10Friends.forEach((friend,i)=>{
      const div = document.createElement('div');
      div.className = 'top-friend';
      div.innerHTML = `<span>${i+1}. ${friend.username || 'Unknown'}</span>`;
      top10FriendsContainer.appendChild(div);
    });
  }

  // Load Music
  if (data.musicURL){
    musicEmbedContainer.innerHTML = getEmbedHTML(data.musicURL);
  }

  // Apply theme
  if (data.themeHTML) document.body.style.background = '';
  if (data.themeHTML) document.body.insertAdjacentHTML('beforeend', data.themeHTML);
}

// Save Profile Info
saveProfileBtn.addEventListener('click', async ()=>{
  const user = auth.currentUser;
  if (!user) return;
  const userDocRef = doc(db,'users',user.uid);
  await updateDoc(userDocRef,{
    username: usernameInput.value,
    bio: bioInput.value,
    location: locationInput.value
  });
  alert('Profile info saved!');
});

// Save Profile Picture
saveProfilePfpBtn.addEventListener('click', async ()=>{
  const file = profilePfpInput.files[0];
  if (!file) return alert('Select a picture!');
  const user = auth.currentUser;
  const storageRef = ref(storage, `profileImages/${user.uid}/${Date.now()}_${file.name}`);
  await uploadBytes(storageRef, file);
  const url = await getDownloadURL(storageRef);
  profilePfp.src = uniqueURL(url);
  await updateDoc(doc(db,'users',user.uid), {pfpURL:url});
  alert('Profile picture updated!');
});

// Add Wall Comment
addWallCommentBtn.addEventListener('click', async ()=>{
  const text = wallCommentInput.value.trim();
  if(!text) return;
  const user = auth.currentUser;
  const comment = {text,username:usernameInput.value||'Unknown',userId:user.uid,timestamp:Date.now()};
  await updateDoc(doc(db,'users',user.uid), {wallComments:arrayUnion(comment)});
  wallCommentInput.value='';
  loadProfile(user);
});

// Save Music
saveMusicBtn.addEventListener('click', async ()=>{
  const user = auth.currentUser;
  if(!user) return;
  const link = musicLinkInput.value.trim();
  if(!link) return alert('Enter a music link!');
  await updateDoc(doc(db,'users',user.uid),{musicURL:link});
  musicEmbedContainer.innerHTML = getEmbedHTML(link);
});

// Music Embed Converter
function getEmbedHTML(url){
  if(url.includes('youtube.com')||url.includes('youtu.be')){
    let vid = url.split('v=')[1]||url.split('youtu.be/')[1];
    if(vid.includes('&')) vid = vid.split('&')[0];
    return `<iframe src="https://www.youtube.com/embed/${vid}?autoplay=1" allow="autoplay" allowfullscreen></iframe>`;
  }
  if(url.includes('spotify.com')){
    const id = url.split('/track/')[1].split('?')[0];
    return `<iframe src="https://open.spotify.com/embed/track/${id}" allow="autoplay" allowfullscreen></iframe>`;
  }
  if(url.includes('soundcloud.com')){
    return `<iframe width="100%" height="80" scrolling="no" frameborder="no" src="https://w.soundcloud.com/player/?url=${encodeURIComponent(url)}&auto_play=true"></iframe>`;
  }
  return 'Invalid music link';
}

// Apply Theme
applyThemeBtn.addEventListener('click', async ()=>{
  const user = auth.currentUser;
  if(!user) return;
  let html='';
  if(customHTML.value.trim()) html=customHTML.value.trim();
  else if(presetThemes.value){
    switch(presetThemes.value){
      case 'gradientRed': html='<style>body{background:linear-gradient(to right,#ff0000,#ff9999)}</style>'; break;
      case 'gradientBlue': html='<style>body{background:linear-gradient(to right,#0000ff,#99ccff)}</style>'; break;
      case 'gradientGreen': html='<style>body{background:linear-gradient(to right,#00ff00,#99ff99)}</style>'; break;
      case 'neonBlack': html='<style>body{background:black;color:#0f0;}</style>'; break;
      case 'animatedRainbow': html='<style>@keyframes rainbow{0%{background:red;}25%{background:orange;}50%{background:green;}75%{background:blue;}100%{background:red;}}body{animation: rainbow 10s infinite;}</style>'; break;
    }
  }
  await updateDoc(doc(db,'users',user.uid),{themeHTML:html});
  document.body.insertAdjacentHTML('beforeend',html);
});

// INIT
onAuthStateChanged(auth, user=>{
  if(!user) return;
  loadProfile(user);
});
