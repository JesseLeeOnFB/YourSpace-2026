// profile.js
import { auth, db, storage } from "./firebase.js";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { doc, getDoc, updateDoc, arrayUnion, arrayRemove, serverTimestamp } from "firebase/firestore";

document.addEventListener("DOMContentLoaded", async () => {
  // -------------------------------
  // NAVIGATION BUTTONS
  // -------------------------------
  const homeBtn = document.getElementById("homeBtn");
  const profileBtn = document.getElementById("profileBtn");
  const logoutBtn = document.getElementById("logoutBtn");

  if (homeBtn) {
    homeBtn.addEventListener("click", () => {
      window.location.href = "feed.html";
    });
  }
  if (profileBtn) {
    profileBtn.addEventListener("click", () => {
      window.location.href = "profile.html";
    });
  }
  if (logoutBtn) {
    logoutBtn.addEventListener("click", async () => {
      try {
        await auth.signOut();
        alert("Logged out successfully.");
        window.location.href = "index.html";
      } catch (err) {
        console.error("Logout failed:", err);
        alert("Failed to logout. Check console.");
      }
    });
  }

  // -------------------------------
  // GET CURRENT USER
  // -------------------------------
  const user = auth.currentUser;
  if (!user) {
    alert("No user logged in. Redirecting to login.");
    window.location.href = "index.html";
    return;
  }

  const userDocRef = doc(db, "users", user.uid);

  // -------------------------------
  // PROFILE INPUT ELEMENTS
  // -------------------------------
  const usernameInput = document.getElementById("usernameInput");
  const bioInput = document.getElementById("bioInput");
  const locationInput = document.getElementById("locationInput");
  const musicInput = document.getElementById("musicInput");
  const themeSelect = document.getElementById("themeSelect");
  const topFriendsInputs = Array.from(document.querySelectorAll(".topFriendInput"));
  const profilePhotoInput = document.getElementById("profilePhotoInput");
  const saveProfileBtn = document.getElementById("saveProfileBtn");
  const saveThemeBtn = document.getElementById("saveThemeBtn");
  const saveMusicBtn = document.getElementById("saveMusicBtn");
  const profilePhotoPreview = document.getElementById("profilePhotoPreview");

  // -------------------------------
  // LOAD USER DATA
  // -------------------------------
  const loadUserProfile = async () => {
    const docSnap = await getDoc(userDocRef);
    if (docSnap.exists()) {
      const data = docSnap.data();
      usernameInput.value = data.username || "";
      bioInput.value = data.bio || "";
      locationInput.value = data.location || "";
      musicInput.value = data.music || "";
      themeSelect.value = data.theme || "default";
      profilePhotoPreview.src = data.profilePic || "defaultProfile.png";
      if (data.topFriends && topFriendsInputs.length) {
        data.topFriends.forEach((friend, idx) => {
          if (topFriendsInputs[idx]) topFriendsInputs[idx].value = friend;
        });
      }
    }
  };
  loadUserProfile();

  // -------------------------------
  // SAVE PROFILE INFO (bio, username, location)
  // -------------------------------
  saveProfileBtn.addEventListener("click", async () => {
    try {
      await updateDoc(userDocRef, {
        username: usernameInput.value.trim(),
        bio: bioInput.value.trim(),
        location: locationInput.value.trim(),
        topFriends: topFriendsInputs.map(inp => inp.value.trim()),
        updatedAt: serverTimestamp()
      });
      alert("Profile updated successfully!");
    } catch (err) {
      console.error("Error saving profile:", err);
      alert("Failed to save profile.");
    }
  });

  // -------------------------------
  // SAVE THEME
  // -------------------------------
  saveThemeBtn.addEventListener("click", async () => {
    try {
      await updateDoc(userDocRef, {
        theme: themeSelect.value,
        updatedAt: serverTimestamp()
      });
      document.body.className = themeSelect.value;
      alert("Theme updated!");
    } catch (err) {
      console.error("Error saving theme:", err);
      alert("Failed to save theme.");
    }
  });

  // -------------------------------
  // SAVE MUSIC PLAYER URL
  // -------------------------------
  saveMusicBtn.addEventListener("click", async () => {
    try {
      await updateDoc(userDocRef, {
        music: musicInput.value.trim(),
        updatedAt: serverTimestamp()
      });
      alert("Music link saved!");
      // Optional: dynamically update embedded player here
    } catch (err) {
      console.error("Error saving music:", err);
      alert("Failed to save music link.");
    }
  });

  // -------------------------------
  // PROFILE PHOTO UPLOAD
  // -------------------------------
  if (profilePhotoInput) {
    profilePhotoInput.addEventListener("change", async () => {
      const file = profilePhotoInput.files[0];
      if (!file) return;

      const contentType = file.type || "image/jpeg";
      const storageRef = ref(storage, `profileImages/${user.uid}/${Date.now()}_${file.name}`);

      try {
        const snapshot = await uploadBytes(storageRef, file, { contentType });
        const downloadURL = await getDownloadURL(snapshot.ref);
        profilePhotoPreview.src = downloadURL;

        await updateDoc(userDocRef, {
          profilePic: downloadURL,
          updatedAt: serverTimestamp()
        });

        alert("Profile photo updated!");
      } catch (err) {
        console.error("Error uploading profile photo:", err);
        alert("Failed to upload profile photo.");
      }
    });
  }

  // -------------------------------
  // FRIEND SEARCH AND MANAGEMENT (basic step, safe)
  // -------------------------------
  const searchUserBtn = document.getElementById("searchUserBtn");
  const searchUserInput = document.getElementById("searchUserInput");
  const searchResultsContainer = document.getElementById("searchResultsContainer");

  if (searchUserBtn) {
    searchUserBtn.addEventListener("click", async () => {
      const queryUsername = searchUserInput.value.trim();
      if (!queryUsername) return alert("Enter a username to search.");

      try {
        const usersCollection = doc(db, "users", queryUsername); // example safe fetch
        const snap = await getDoc(usersCollection);
        if (snap.exists()) {
          searchResultsContainer.innerHTML = `<div>
            <span>${snap.data().username}</span>
            <button class="addFriendBtn" data-uid="${snap.id}">Add Friend</button>
          </div>`;
          // Event listener for add friend buttons
          document.querySelectorAll(".addFriendBtn").forEach(btn => {
            btn.addEventListener("click", async (e) => {
              const friendUid = e.target.dataset.uid;
              await updateDoc(userDocRef, { friends: arrayUnion(friendUid) });
              alert("Friend request sent!");
            });
          });
        } else {
          searchResultsContainer.innerHTML = "<div>User not found.</div>";
        }
      } catch (err) {
        console.error(err);
        alert("Search failed. Check console.");
      }
    });
  }
});
