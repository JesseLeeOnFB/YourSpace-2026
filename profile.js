// =========================
// CONFIG
// =========================
const firebaseConfig = {
  apiKey: "AIzaSyAHMbxr7rJS88ZefVJzt8p_9CCTstLmLU8",
  authDomain: "yourspace-2026.firebaseapp.com",
  projectId: "yourspace-2026",
  storageBucket: "yourspace-2026.firebasestorage.app",
  messagingSenderId: "72667267302",
  appId: "1:72667267302:web:2bed5f543e05d49ca8fb27",
  measurementId: "G-FZ4GFXWGSS"
};
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();
const storage = firebase.storage();

// =========================
// DOM ELEMENTS
// =========================
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
const resetThemeBtn = document.getElementById('resetThemeBtn');
const customHtmlInput = document.getElementById('customHtmlInput');

const musicLinkInput = document.getElementById('musicLinkInput');
const loadMusicBtn = document.getElementById('loadMusicBtn');
const musicIframe = document.getElementById('musicIframe');

// =========================
// CACHE-BUSTER HELPER
// =========================
function cacheBust(url){ return `${url}?cb=${Date.now()}`; }

// =========================
// CUSTOM INJECTION HELPER
// =========================
function injectCustom(html) {
  // Remove previous custom elements
  document.querySelectorAll('[data-custom]').forEach(el => el.remove());

  if (!html) return;

  const temp = document.createElement('div');
  temp.innerHTML = html;

  // Extract and inject styles to head
  const styles = Array.from(temp.querySelectorAll('style'));
  styles.forEach(s => {
    s.setAttribute('data-custom', 'true');
    document.head.appendChild(s);
  });

  // Extract and inject scripts to body (they will execute)
  const scripts = Array.from(temp.querySelectorAll('script'));
  scripts.forEach(s => {
    s.setAttribute('data-custom', 'true');
    document.body.appendChild(s);
  });

  // Inject remaining fragments to body, but insert before the profile-main to keep controls on top
  const remaining = Array.from(temp.childNodes);
  remaining.forEach(node => {
    if (node.nodeType === Node.ELEMENT_NODE) {
      const tag = node.tagName.toLowerCase();
      if (tag !== 'style' && tag !== 'script') {
        node.setAttribute('data-custom', 'true');
        document.body.insertBefore(node, document.querySelector('.profile-main'));
      }
    } else if (node.nodeType === Node.TEXT_NODE || node.nodeType === Node.COMMENT_NODE) {
      document.body.insertBefore(node.cloneNode(true), document.querySelector('.profile-main'));
    }
  });
}

// =========================
// PROFILE LOADING
// =========================
async function loadProfile() {
  const user = auth.currentUser;
  if(!user) {
    console.warn('No authenticated user - profile not loading. Add login?');
    return;
  }
  const userDocRef = db.collection('users').doc(user.uid);
  const docSnap = await userDocRef.get();
  if(!docSnap.exists) {
    console.warn('No user doc in Firestore - creating on next save.');
    return;
  }
  const data = docSnap.data();
  const profileUid = user.uid;

  console.log('Loading profile data:', data);
  usernameInput.value = data.username || '';
  bioInput.value = data.bio || '';
  locationInput.value = data.location || '';
  if(data.pfpURL) {
    const bustedUrl = cacheBust(data.pfpURL);
    profilePfp.src = bustedUrl;
    console.log('Setting PFP src to:', bustedUrl);
    profilePfp.onerror = () => console.error('PFP failed to load from URL:', bustedUrl);
    profilePfp.onload = () => console.log('PFP loaded successfully!');
  } else {
    profilePfp.src = 'https://via.placeholder.com/150'; // Fallback for no URL
  }

  // Wall comments
  wallCommentsContainer.innerHTML = '';
  if(data.wallComments){
    data.wallComments.forEach(c=>{
      const div=document.createElement('div');
      div.className='wall-comment';
      div.innerHTML=`<strong>${c.username||'Unknown'}</strong>: ${c.text} ${
        (c.userId===user.uid || user.uid===profileUid)?'<button class="deleteWallCommentBtn">Delete</button>':''
      }`;
      const btn=div.querySelector('.deleteWallCommentBtn');
      if(btn) btn.addEventListener('click', async()=>{
        const updatedComments=data.wallComments.filter(x=>x!==c);
        await userDocRef.update({wallComments:updatedComments});
        loadProfile();
      });
      wallCommentsContainer.appendChild(div);
    });
  }

  // Top 10 friends
  top10FriendsContainer.innerHTML='';
  if(data.top10Friends){
    data.top10Friends.forEach(f=>{
      const div=document.createElement('div');
      div.className='top-friend';
      div.innerHTML=`<img src="${f.pfpURL||''}" width="30" height="30" style="border-radius:50%;"> ${f.username||'Unknown'}`;
      top10FriendsContainer.appendChild(div);
    });
  }

  // Theme & custom HTML
  if(data.theme) document.body.className=data.theme;
  if(data.customHtml) injectCustom(data.customHtml);
}

// =========================
// SAVE PROFILE INFO
// =========================
saveProfileBtn.addEventListener('click', async()=>{
  const user=auth.currentUser;
  if(!user) return;
  await db.collection('users').doc(user.uid).set({
    username:usernameInput.value,
    bio:bioInput.value,
    location:locationInput.value
  }, {merge:true});
  loadProfile();
});

// =========================
// SAVE PROFILE PICTURE
// =========================
saveProfilePfpBtn.addEventListener('click', async()=>{
  const file=profilePfpInput.files[0];
  if(!file) return alert('Select a picture first');
  const user=auth.currentUser;
  if(!user) return alert('Not logged in');
  const storageRef=storage.ref(`profilePictures/${user.uid}/${Date.now()}_${file.name}`);
  await storageRef.put(file);
  const url=await storageRef.getDownloadURL();
  await db.collection('users').doc(user.uid).set({pfpURL:url},{merge:true});
  profilePfp.src=cacheBust(url);
});

// =========================
// WALL COMMENTS
// =========================
addWallCommentBtn.addEventListener('click', async()=>{
  const text=wallCommentInput.value.trim();
  if(!text) return;
  const user=auth.currentUser;
  if(!user) return;
  const userDocRef=db.collection('users').doc(user.uid);
  const comment={text,userId:user.uid,username:usernameInput.value||'Unknown',timestamp:Date.now()};
  await userDocRef.update({wallComments:firebase.firestore.FieldValue.arrayUnion(comment)});
  wallCommentInput.value='';
  loadProfile();
});

// =========================
// THEME & CUSTOM HTML
// =========================
saveThemeBtn.addEventListener('click', async()=>{
  const theme=themeSelect.value;
  const customHtml=customHtmlInput.value;
  const user=auth.currentUser;
  if(!user) return;
  document.body.className=theme;
  injectCustom(customHtml);
  await db.collection('users').doc(user.uid).set({theme,customHtml},{merge:true});
});

// Reset to default
resetThemeBtn.addEventListener('click', async()=>{
  const user=auth.currentUser;
  if(!user) return;
  document.body.className='default-theme';
  injectCustom(''); // Clear custom
  themeSelect.value = 'default-theme';
  customHtmlInput.value = '';
  await db.collection('users').doc(user.uid).set({theme:'default-theme', customHtml:''},{merge:true});
  loadProfile();
});

// =========================
// MUSIC PLAYER
// =========================
loadMusicBtn.addEventListener('click', ()=>{
  const link=musicLinkInput.value.trim();
  let embed='';
  if(link.includes('youtube.com')||link.includes('youtu.be')){
    const id=link.split('v=')[1]||link.split('youtu.be/')[1];
    embed=`https://www.youtube.com/embed/${id}?autoplay=1`;
  } else if(link.includes('soundcloud.com')) embed=`https://w.soundcloud.com/player/?url=${encodeURIComponent(link)}&auto_play=true`;
  else if(link.includes('spotify.com')) embed=`https://open.spotify.com/embed/track/${link.split('/track/')[1]}?autoplay=1`;
  musicIframe.src=embed?cacheBust(embed):'';
});

// =========================
// TOP 10 FRIENDS EDIT (VISUAL ONLY)
// =========================
editTop10Btn.addEventListener('click', ()=>{
  const names=prompt('Enter top 10 friends, comma separated');
  const user=auth.currentUser;
  if(!user) return;
  const friends=names.split(',').slice(0,10).map(n=>({username:n.trim(),pfpURL:''}));
  db.collection('users').doc(user.uid).set({top10Friends:friends},{merge:true});
  loadProfile();
});

// =========================
// NAV BUTTONS
// =========================
document.getElementById('navFeedBtn').addEventListener('click',()=>alert('Navigate to Feed'));
document.getElementById('navProfileBtn').addEventListener('click',()=>alert('Navigate to Profile'));
document.getElementById('navSettingsBtn').addEventListener('click',()=>alert('Navigate to Settings'));

// =========================
// INIT
// =========================
auth.onAuthStateChanged(user=>{
  if(user) {
    console.log('Logged in as UID:', user.uid);
    loadProfile();
  } else {
    // Auto sign in anonymously for testing/simplicity
    auth.signInAnonymously().catch(err => console.error('Anon login failed:', err));
  }
});
