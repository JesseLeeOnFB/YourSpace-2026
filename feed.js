import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";
import { getFirestore, collection, addDoc, getDocs, query, orderBy, serverTimestamp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-storage.js";

// Firebase Init
const firebaseConfig = {
  apiKey: "AIzaSyAHMbxr7rJS88ZefVJzt8p_9CCTstLmLU8",
  authDomain: "yourspace-2026.firebaseapp.com",
  projectId: "yourspace-2026",
  storageBucket: "yourspace-2026.appspot.com",
  messagingSenderId: "72667267302",
  appId: "1:72667267302:web:2bed5f543e05d49ca8fb27"
};
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

// DOM
const postInput = document.getElementById("postInput");
const postFile = document.getElementById("postFile");
const postBtn = document.getElementById("postBtn");
const postsContainer = document.getElementById("postsContainer");

// Navigation
document.getElementById("navFeed").onclick = ()=>window.location.href="feed.html";
document.getElementById("navProfile").onclick = ()=>window.location.href="profile.html";
document.getElementById("navMessages").onclick = ()=>window.location.href="messages.html";
document.getElementById("navLogout").onclick = ()=>signOut(auth).then(()=>window.location.href="login.html");

// Auth
let currentUser=null;
onAuthStateChanged(auth, user=>{
  if(!user) return window.location.replace("login.html");
  currentUser=user;
  loadPosts();
});

// Create Post
postBtn?.addEventListener("click", async()=>{
  if(!postInput.value.trim() && !postFile.files[0]) return;

  let fileUrl="";
  if(postFile.files[0]){
    const fRef = ref(storage, `posts/${Date.now()}_${postFile.files[0].name}`);
    await uploadBytes(fRef, postFile.files[0]);
    fileUrl = await getDownloadURL(fRef);
  }

  await addDoc(collection(db,"posts"),{
    text: postInput.value.trim(),
    fileUrl,
    userId: currentUser.uid,
    createdAt: serverTimestamp()
  });

  postInput.value="";
  postFile.value="";
  loadPosts();
});

// Load Posts
async function loadPosts(){
  postsContainer.innerHTML="";
  const q=query(collection(db,"posts"), orderBy("createdAt","desc"));
  const snap=await getDocs(q);

  for(const docSnap of snap.docs){
    const data=docSnap.data();
    const postDiv=document.createElement("div");
    postDiv.className="post";

    postDiv.innerHTML=`
      <strong>${data.userId}</strong>: ${data.text || ""}
      ${data.fileUrl ? (data.fileUrl.endsWith(".mp4")? `<video src="${data.fileUrl}" controls></video>` : `<img src="${data.fileUrl}">`) : ""}
    `;
    postsContainer.appendChild(postDiv);
  }
}
