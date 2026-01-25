// ============================================
// YourSpace Feed JS
// ============================================

import { auth, db, storage } from "./firebase.js"; // Make sure your Firebase config is imported

// ============================================
// GLOBAL VARIABLES
// ============================================
let currentUser = null;
let postsContainer = document.getElementById("postsContainer");
let giftDialog = document.getElementById("giftDialog");
let giftOptions = document.getElementById("giftOptions");

// ============================================
// AUTH STATE
// ============================================
auth.onAuthStateChanged(async (user) => {
  if (!user) {
    window.location.href = "login.html";
    return;
  }
  currentUser = user;
  loadPosts();
});

// ============================================
// NAVIGATION BUTTONS
// ============================================
document.getElementById("feedNavBtn").onclick = () => window.location.href = "feed.html";
document.getElementById("profileNavBtn").onclick = () => window.location.href = "profile.html";
document.getElementById("messagesNavBtn").onclick = () => window.location.href = "messages.html";
document.getElementById("notificationsNavBtn").onclick = () => window.location.href = "notifications.html";
document.getElementById("dashboardNavBtn").onclick = () => window.location.href = "dashboard.html";
document.getElementById("adminNavBtn").onclick = () => window.location.href = "admin.html";
document.getElementById("contactNavBtn").onclick = () => window.location.href = "contact.html";
document.getElementById("logoutBtn").onclick = () => auth.signOut();

// Hamburger menu toggle
const hamburger = document.getElementById("hamburger");
const navLinks = document.getElementById("navLinks");
hamburger.addEventListener("click", () => {
  hamburger.classList.toggle("active");
  navLinks.classList.toggle("active");
});

// ============================================
// NEW POST
// ============================================
document.getElementById("postBtn").addEventListener("click", async () => {
  const text = document.getElementById("postText").value.trim();
  const fileInput = document.getElementById("postFileInput");
  let fileURL = null;

  if (fileInput.files.length > 0) {
    const file = fileInput.files[0];
    const storageRef = storage.ref().child(`postImages/${Date.now()}_${file.name}`);
    await storageRef.put(file);
    fileURL = await storageRef.getDownloadURL();
  }

  if (text || fileURL) {
    await db.collection("posts").add({
      userId: currentUser.uid,
      userName: currentUser.displayName || "Anonymous",
      text,
      mediaURL: fileURL || null,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    document.getElementById("postText").value = "";
    fileInput.value = "";
    loadPosts();
  }
});

// ============================================
// LOAD POSTS
// ============================================
async function loadPosts() {
  postsContainer.innerHTML = "";
  const postsSnapshot = await db.collection("posts")
    .orderBy("createdAt", "desc")
    .get();

  postsSnapshot.forEach(doc => {
    const post = doc.data();
    const postId = doc.id;

    const postCard = document.createElement("div");
    postCard.className = "post-card";

    // Post header
    const header = document.createElement("div");
    header.className = "post-header";
    header.innerHTML = `<strong>${post.userName}</strong> <small>${post.createdAt?.toDate?.()?.toLocaleString() || ""}</small>`;
    postCard.appendChild(header);

    // Post content
    if (post.text) {
      const textEl = document.createElement("p");
      textEl.textContent = post.text;
      postCard.appendChild(textEl);
    }

    // Media
    if (post.mediaURL) {
      const mediaEl = post.mediaURL.endsWith(".mp4") 
        ? document.createElement("video") 
        : document.createElement("img");
      mediaEl.src = post.mediaURL;
      if(mediaEl.tagName === "VIDEO"){
        mediaEl.controls = true;
      }
      mediaEl.className = "post-media";
      postCard.appendChild(mediaEl);
    }

    // Post actions
    const actions = document.createElement("div");
    actions.className = "post-actions";

    const giftBtn = document.createElement("button");
    giftBtn.textContent = "🎁 Gift";
    giftBtn.onclick = () => openGiftDialog(postId, post.userId);
    actions.appendChild(giftBtn);

    postCard.appendChild(actions);
    postsContainer.appendChild(postCard);
  });
}

// ============================================
// GIFT MODAL
// ============================================
function openGiftDialog(postId, recipientId) {
  giftDialog.style.display = "flex";
  giftOptions.innerHTML = "";

  // Example gifts
  const gifts = [
    { name: "💎 Diamond", amount: 2 },
    { name: "🍫 Chocolate", amount: 1 },
    { name: "🌹 Rose", amount: 1.5 }
  ];

  gifts.forEach(gift => {
    const giftBtn = document.createElement("div");
    giftBtn.className = "gift-option";
    giftBtn.innerHTML = `<strong>${gift.name}</strong><small>$${gift.amount.toFixed(2)}</small>`;
    giftBtn.onclick = async () => {
      // Call backend webhook for Stripe checkout session
      await fetch("/create-checkout-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          senderId: currentUser.uid,
          recipientId,
          giftName: gift.name,
          giftAmount: gift.amount
        })
      }).then(res => res.json())
        .then(data => window.location.href = data.checkoutURL);
    };
    giftOptions.appendChild(giftBtn);
  });

  document.getElementById("giftCancelBtn").onclick = () => {
    giftDialog.style.display = "none";
  };
}
