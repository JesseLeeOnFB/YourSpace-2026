// PROFILE.JS
document.addEventListener("DOMContentLoaded", () => {
  // NAVIGATION BUTTONS
  const homeBtn = document.getElementById("homeBtn");
  const profileBtn = document.getElementById("profileBtn");
  const logoutBtn = document.getElementById("logoutBtn");

  if (homeBtn) homeBtn.addEventListener("click", () => window.location.href = "feed.html");
  if (profileBtn) profileBtn.addEventListener("click", () => window.location.href = "profile.html");
  if (logoutBtn) logoutBtn.addEventListener("click", async () => {
    try {
      await auth.signOut();
      window.location.href = "index.html";
    } catch(err) { console.error(err); alert("Logout failed."); }
  });

  // PROFILE DATA ELEMENTS
  const displayNameInput = document.getElementById("displayNameInput");
  const bioInput = document.getElementById("bioInput");
  const locationInput = document.getElementById("locationInput");
  const saveProfileBtn = document.getElementById("saveProfileBtn");

  // PROFILE PICTURE ELEMENTS
  const profilePicInput = document.getElementById("profilePicInput");
  const profilePicDisplay = document.getElementById("profilePicDisplay");
  const saveProfilePicBtn = document.getElementById("saveProfilePicBtn");

  // MUSIC PLAYER ELEMENTS
  const musicLinkInput = document.getElementById("musicLinkInput");
  const saveMusicBtn = document.getElementById("saveMusicBtn");
  const musicPlayerContainer = document.getElementById("musicPlayerContainer");

  // TOP FRIENDS
  const topFriendsInput = document.getElementById("topFriendsInput");
  const addTopFriendBtn = document.getElementById("addTopFriendBtn");
  const topFriendsList = document.getElementById("topFriendsList");

  // WALL COMMENTS
  const wallCommentInput = document.getElementById("wallCommentInput");
  const postWallCommentBtn = document.getElementById("postWallCommentBtn");
  const wallCommentsContainer = document.getElementById("wallCommentsContainer");

  // ===== Load Saved Profile Data =====
  async function loadProfile() {
    const userDoc = await getUserDoc(); // Implement to pull current user's Firestore document
    if (!userDoc) return;

    displayNameInput.value = userDoc.displayName || "";
    bioInput.value = userDoc.bio || "";
    locationInput.value = userDoc.location || "";

    profilePicDisplay.src = userDoc.profilePic || "default-avatar.png";
    musicLinkInput.value = userDoc.music || "";

    topFriendsList.innerHTML = "";
    (userDoc.topFriends || []).forEach(f => {
      const li = document.createElement("li");
      li.textContent = f;
      topFriendsList.appendChild(li);
    });

    loadWallComments(userDoc.wallComments || []);
  }

  function loadWallComments(comments) {
    wallCommentsContainer.innerHTML = "";
    comments.forEach(c => {
      const div = document.createElement("div");
      div.classList.add("wall-comment");
      div.innerHTML = `<strong>${c.username}:</strong> ${c.comment}`;
      wallCommentsContainer.appendChild(div);
    });
  }

  loadProfile();

  // ===== Save Profile Info =====
  saveProfileBtn.addEventListener("click", async () => {
    const updates = {
      displayName: displayNameInput.value,
      bio: bioInput.value,
      location: locationInput.value
    };
    await updateUserDoc(updates); // Implement Firestore update
    alert("Profile info saved!");
  });

  // ===== Save Profile Picture =====
  saveProfilePicBtn.addEventListener("click", async () => {
    if (!profilePicInput.files[0]) return alert("Select an image!");
    const file = profilePicInput.files[0];

    // Preview
    const reader = new FileReader();
    reader.onload = () => profilePicDisplay.src = reader.result;
    reader.readAsDataURL(file);

    // Upload file to Firebase storage and update user profileDoc
    await uploadProfileImage(file);
    alert("Profile picture saved!");
  });

  // ===== Save Music Link =====
  saveMusicBtn.addEventListener("click", () => {
    const url = musicLinkInput.value.trim();
    if (!url) return alert("Enter a music link!");
    let embedHTML = "";

    if (url.includes("youtube.com") || url.includes("youtu.be")) {
      const videoId = url.split("v=")[1] || url.split("youtu.be/")[1];
      embedHTML = `<iframe width="300" height="150" src="https://www.youtube.com/embed/${videoId}" frameborder="0" allow="autoplay; encrypted-media" allowfullscreen></iframe>`;
    } else if (url.includes("soundcloud.com")) {
      embedHTML = `<iframe width="100%" height="166" scrolling="no" frameborder="no" src="https://w.soundcloud.com/player/?url=${encodeURIComponent(url)}"></iframe>`;
    } else if (url.includes("spotify.com")) {
      embedHTML = `<iframe src="https://open.spotify.com/embed${url.split("spotify.com")[1]}" width="300" height="80" frameborder="0" allowtransparency="true" allow="encrypted-media"></iframe>`;
    } else if (url.includes("pandora.com")) {
      embedHTML = `<iframe src="${url}" width="300" height="80" frameborder="0" allowtransparency="true" allow="encrypted-media"></iframe>`;
    } else return alert("Unsupported music platform!");

    musicPlayerContainer.innerHTML = embedHTML;
    alert("Music saved!");
  });

  // ===== Add Top Friend =====
  addTopFriendBtn.addEventListener("click", async () => {
    const friendUsername = topFriendsInput.value.trim();
    if (!friendUsername) return;

    await addTopFriend(friendUsername); // Implement check for accepted friend
    topFriendsInput.value = "";
    loadProfile();
    alert("Top friend added!");
  });

  // ===== Post Wall Comment =====
  postWallCommentBtn.addEventListener("click", async () => {
    const commentText = wallCommentInput.value.trim();
    if (!commentText) return;

    await postWallComment(commentText); // Implement Firestore add comment
    wallCommentInput.value = "";
    loadProfile();
  });
});
