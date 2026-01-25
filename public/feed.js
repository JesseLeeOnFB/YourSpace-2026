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

// Elements
const feedContainer = document.getElementById("feedContainer");
const searchInput = document.getElementById("searchInput");
const clearBtn = document.getElementById("clearBtn");
const postInput = document.getElementById("postInput");
const postBtn = document.getElementById("postBtn");

// Clear search
clearBtn.addEventListener("click", () => { searchInput.value=""; loadFeed(); });

// Create post
postBtn.addEventListener("click", async () => {
  const text = postInput.value.trim();
  if(!text) return alert("Post cannot be empty");
  const user = auth.currentUser;
  await db.collection("posts").add({
    username: user.displayName || "Anonymous",
    usernameLower: (user.displayName || "anonymous").toLowerCase(),
    text,
    timestamp: firebase.firestore.FieldValue.serverTimestamp(),
    likes: 0,
    comments: []
  });
  postInput.value = "";
  loadFeed();
});

// Load feed
const loadFeed = async () => {
  feedContainer.innerHTML = "<p>Loading...</p>";
  let query = db.collection("posts").orderBy("timestamp","desc");
  const searchValue = searchInput.value.trim();
  if(searchValue) query = query.where("usernameLower","==",searchValue.toLowerCase());
  const snapshot = await query.get();
  feedContainer.innerHTML = "";
  if(snapshot.empty) return feedContainer.innerHTML="<p>No posts found.</p>";
  
  snapshot.forEach(doc => {
    const data = doc.data();
    const postDiv = document.createElement("div");
    postDiv.classList.add("feed-post");
    postDiv.innerHTML = `
      <p><strong>${data.username}</strong></p>
      <p>${data.text}</p>
      <button class="giftBtn" data-postid="${doc.id}" data-username="${data.username}">Send Gift</button>
      <button class="likeBtn" data-postid="${doc.id}">Like (${data.likes || 0})</button>
      <button class="deleteBtn" data-postid="${doc.id}">Delete</button>
    `;
    feedContainer.appendChild(postDiv);
  });

  // Attach buttons
  document.querySelectorAll(".giftBtn").forEach(btn=>{
    btn.addEventListener("click", async ()=>{
      const postId = btn.dataset.postid;
      const recipient = btn.dataset.username;
      try {
        const res = await fetch("/createCheckoutSession", {
          method:"POST",
          headers:{"Content-Type":"application/json"},
          body:JSON.stringify({postId,recipient})
        });
        const session = await res.json();
        const stripe = Stripe("pk_live_51SsCC2DYg2OK71XSVGO4dsgGVtpUO1XcrgJp1pP5K0fTDVkDaunVwNzhH5ORf8QRJBMA9WDq9FY0Z6SrTWkSPvr100nhHBuJNM");
        await stripe.redirectToCheckout({sessionId:session.id});
      } catch(err){ console.error(err); alert("Error creating checkout session."); }
    });
  });

  document.querySelectorAll(".likeBtn").forEach(btn=>{
    btn.addEventListener("click", async ()=>{
      const postRef = db.collection("posts").doc(btn.dataset.postid);
      await postRef.update({likes: firebase.firestore.FieldValue.increment(1)});
      loadFeed();
    });
  });

  document.querySelectorAll(".deleteBtn").forEach(btn=>{
    const user = auth.currentUser;
    const postRef = db.collection("posts").doc(btn.dataset.postid);
    postRef.get().then(doc=>{
      if(doc.exists && doc.data().username === (user.displayName || "Anonymous")) {
        btn.disabled=false;
      } else btn.disabled=true;
    });
    btn.addEventListener("click", async ()=>{
      await postRef.delete();
      loadFeed();
    });
  });
};

// Search
searchInput.addEventListener("input", loadFeed);

// Navigation
document.querySelectorAll(".navBtn").forEach(btn=>{
  btn.addEventListener("click", e=>{
    window.location.href = e.target.dataset.target;
  });
});

// Auth
auth.onAuthStateChanged(user=>{
  if(!user) window.location.href="login.html";
  else loadFeed();
});
