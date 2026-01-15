// profile.js
document.addEventListener("DOMContentLoaded", async () => {
  // NAVIGATION BUTTONS
  const homeBtn = document.getElementById("homeBtn");
  const profileBtn = document.getElementById("profileBtn");
  const logoutBtn = document.getElementById("logoutBtn");

  if (homeBtn) homeBtn.addEventListener("click", () => window.location.href = "feed.html");
  if (profileBtn) profileBtn.addEventListener("click", () => window.location.href = "profile.html");
  if (logoutBtn) logoutBtn.addEventListener("click", async () => {
    try {
      await auth.signOut();
      alert("Logged out successfully.");
      window.location.href = "index.html";
    } catch (err) {
      console.error("Logout failed:", err);
      alert("Failed to logout.");
    }
  });

  // ELEMENTS
  const bioInput = document.getElementById("bio");
  const locationInput = document.getElementById("location");
  const usernameInput = document.getElementById("username");
  const topFriendsInput = document.getElementById("topFriendsInput");
  const saveProfileBtn = document.getElementById("saveProfileBtn");
  const saveMusicBtn = document.getElementById("saveMusicBtn");
  const musicInput = document.getElementById("musicInput");
  const profilePicInput = document.getElementById("profilePicInput");
  const profilePicDisplay = document.getElementById("profilePicDisplay");
  const wallCommentsContainer = document.getElementById("wallComments");
  const newWallCommentInput = document.getElementById("newWallComment");
  const postWallCommentBtn = document.getElementById("postWallCommentBtn");

  const currentUser = auth.currentUser;
  if (!currentUser) {
    alert("You must be logged in to view your profile.");
    window.location.href = "index.html";
    return;
  }

  const userDocRef = doc(db, "users", currentUser.uid);

  // LOAD USER DATA
  async function loadProfile() {
    const userSnap = await getDoc(userDocRef);
    if (userSnap.exists()) {
      const data = userSnap.data();
      bioInput.value = data.bio || "";
      locationInput.value = data.location || "";
      usernameInput.value = data.username || "";
      topFriendsInput.value = (data.topFriends || []).join(", ");
      musicInput.value = data.music || "";

      if (data.profilePic) {
        profilePicDisplay.src = data.profilePic;
      } else {
        profilePicDisplay.src = "default-profile.png";
      }

      loadWallComments(data.wallComments || []);
    }
  }

  function loadWallComments(comments) {
    wallCommentsContainer.innerHTML = "";
    comments.forEach(c => {
      const div = document.createElement("div");
      div.className = "wall-comment-box";
      div.innerHTML = `<strong>${c.username}</strong>: ${c.text}`;
      wallCommentsContainer.appendChild(div);
    });
  }

  // SAVE PROFILE INFO
  saveProfileBtn.addEventListener("click", async () => {
    try {
      await updateDoc(userDocRef, {
        bio: bioInput.value,
        location: locationInput.value,
        topFriends: topFriendsInput.value.split(",").map(f => f.trim()),
        username: usernameInput.value
      });
      alert("Profile updated!");
    } catch (err) {
      console.error(err);
      alert("Failed to save profile.");
    }
  });

  // SAVE MUSIC
  saveMusicBtn.addEventListener("click", async () => {
    try {
      await updateDoc(userDocRef, {
        music: musicInput.value
      });
      alert("Music link saved!");
    } catch (err) {
      console.error(err);
      alert("Failed to save music.");
    }
  });

  // UPLOAD PROFILE PICTURE
  profilePicInput.addEventListener("change", async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const storageRef = ref(storage, `profileImages/${currentUser.uid}/${file.name}`);
    try {
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);
      await updateDoc(userDocRef, { profilePic: url });
      profilePicDisplay.src = url;
      alert("Profile picture updated!");
    } catch (err) {
      console.error(err);
      alert("Failed to upload profile picture.");
    }
  });

  // POST WALL COMMENT
  postWallCommentBtn.addEventListener("click", async () => {
    const text = newWallCommentInput.value.trim();
    if (!text) return;
    try {
      const comment = { username: usernameInput.value || currentUser.email, text };
      await updateDoc(userDocRef, {
        wallComments: arrayUnion(comment)
      });
      newWallCommentInput.value = "";
      loadWallComments([comment]); // append immediately
    } catch (err) {
      console.error(err);
      alert("Failed to post comment.");
    }
  });

  // INITIAL LOAD
  loadProfile();
});
