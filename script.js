import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getFirestore, doc, setDoc, getDoc, collection, addDoc, query, getDocs, orderBy, Timestamp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-storage.js";

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

// DOM elements
const signupBtn = document.getElementById("signupBtn");
const loginBtn = document.getElementById("loginBtn");
const logoutBtn = document.getElementById("logoutBtn");
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");

const usernameInput = document.getElementById("username");
const bioInput = document.getElementById("bio");
const locationInput = document.getElementById("location");
const themeInput = document.getElementById("themeColor");
const musicInput = document.getElementById("musicUrl");
const profileImageInput = document.getElementById("profileImage");
const saveProfileBtn = document.getElementById("saveProfileBtn");

const postContentInput = document.getElementById("postContent");
const postImageInput = document.getElementById("postImageUrl");
const createPostBtn = document.getElementById("createPostBtn");
const userPostsDiv = document.getElementById("userPosts");

// AUTH
signupBtn?.addEventListener("click", async () => {
  const email = emailInput.value;
  const password = passwordInput.value;
  try {
    await createUserWithEmailAndPassword(auth,email,password);
    alert("Account created!"); window.location.reload();
  } catch(e){ alert(e.message); }
});

loginBtn?.addEventListener("click", async () => {
  const email = emailInput.value;
  const password = passwordInput.value;
  try { await signInWithEmailAndPassword(auth,email,password); window.location.reload(); }
  catch(e){ alert(e.message); }
});

logoutBtn?.addEventListener("click", ()=>signOut(auth).then(()=>window.location.href="index.html"));

// PROFILE
saveProfileBtn?.addEventListener("click", async ()=>{
  const user = auth.currentUser;
  if(!user) return alert("Not signed in");

  let profileImageUrl = "";
  if(profileImageInput.files.length>0){
    const file = profileImageInput.files[0];
    const storageRef = ref(storage, `profile_images/${user.uid}/${file.name}`);
    await uploadBytes(storageRef,file);
    profileImageUrl = await getDownloadURL(storageRef);
  }

  await setDoc(doc(db,"users",user.uid),{
    username: usernameInput.value,
    bio: bioInput.value,
    location: locationInput.value,
    themeColor: themeInput.value,
    musicUrl: musicInput.value,
    profileImageUrl
  });

  alert("Profile saved!");
});

// CREATE POST
createPostBtn?.addEventListener("click", async ()=>{
  const user = auth.currentUser;
  if(!user) return alert("Sign in first");

  const userDoc = await getDoc(doc(db,"users",user.uid));
  const username = userDoc.exists()?userDoc.data().username:"Unknown";

  await addDoc(collection(db,"posts"),{
    userId:user.uid,
    username,
    content:postContentInput.value,
    imageUrl:postImageInput.value||"",
    timestamp:Timestamp.now(),
    likes:0
  });

  alert("Post created!"); postContentInput.value=""; postImageInput.value="";
});
