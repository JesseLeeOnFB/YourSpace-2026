import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getFirestore, collection, query, getDocs, orderBy } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

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
const db = getFirestore(app);

const feedDiv = document.getElementById("feed");
const trendingDiv = document.getElementById("trendingPost");

async function loadFeed(){
  feedDiv.innerHTML=""; let topPost=null;
  const q = query(collection(db,"posts"),orderBy("timestamp","desc"));
  const snapshot = await getDocs(q);

  snapshot.forEach(docSnap=>{
    const post = docSnap.data();
    const div = document.createElement("div");
    div.className = "post";
    div.innerHTML = `<p><b>${post.username}</b>: ${post.content}</p>
    ${post.imageUrl?`<img src="${post.imageUrl}" class="post-img"/>`:""}
    <p>Likes: ${post.likes||0}</p>
    <button onclick="sharePost('${encodeURIComponent(post.content)}')">Share</button>`;
    feedDiv.appendChild(div);

    if(!topPost || (post.likes||0) > (topPost.likes||0)) topPost=post;
  });

  if(topPost){
    trendingDiv.innerHTML=`<div class="trending"><b>${topPost.username}</b>: ${topPost.content}</div>
    <button onclick="sharePost('${encodeURIComponent(topPost.content)}')">Share</button>`;
  }
}

function sharePost(text){
  const fbUrl = `https://www.facebook.com/sharer/sharer.php?u=&quote=${text}`;
  window.open(fbUrl,"_blank");
}

window.onload = loadFeed;
