// rewards.js - Interactive Reward Completion Screen

import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-app.js";
import {
  getFirestore, doc, getDoc, updateDoc, onSnapshot
} from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyAHMbxr7rJS88ZefVJzt8p_9CCTstLmLU8",
  authDomain: "yourspace-2026.firebaseapp.com",
  projectId: "yourspace-2026",
  storageBucket: "yourspace-2026.firebasestorage.app",
  messagingSenderId: "72667267302",
  appId: "1:72667267302:web:2bed5f543e05d49ca8fb27"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

const TOTAL_REWARDS = 12; // Total number of unique rewards

// Back button
document.getElementById("backBtn")?.addEventListener("click", () => {
  window.location.href = "dashboard.html";
});

// Test light up button - lights up random rewards
document.getElementById("testLightUpBtn")?.addEventListener("click", async () => {
  const rewardBoxes = document.querySelectorAll(".reward-box");
  const randomBox = rewardBoxes[Math.floor(Math.random() * rewardBoxes.length)];
  
  // Animate the box
  randomBox.classList.add("lit");
  
  // Play light-up sound effect (if you add one)
  playLightUpEffect(randomBox);
  
  // Update count
  const countEl = randomBox.querySelector(".reward-count");
  const currentCount = parseInt(countEl.textContent) || 0;
  countEl.textContent = currentCount + 1;
  
  // Save to Firebase
  const rewardType = randomBox.getAttribute("data-reward");
  if (auth.currentUser) {
    const userRef = doc(db, "users", auth.currentUser.uid);
    const userDoc = await getDoc(userRef);
    const rewards = userDoc.data()?.rewards || {};
    rewards[rewardType] = (rewards[rewardType] || 0) + 1;
    
    await updateDoc(userRef, { rewards });
    updateProgress(rewards);
  }
});

function playLightUpEffect(box) {
  // Add pulsing animation
  box.style.animation = "none";
  setTimeout(() => {
    box.style.animation = "";
  }, 10);
  
  // Create particle effect
  for (let i = 0; i < 5; i++) {
    const particle = document.createElement("div");
    particle.style.position = "absolute";
    particle.style.width = "10px";
    particle.style.height = "10px";
    particle.style.background = "#00fffc";
    particle.style.borderRadius = "50%";
    particle.style.pointerEvents = "none";
    particle.style.boxShadow = "0 0 10px #00fffc";
    
    const rect = box.getBoundingClientRect();
    particle.style.left = (rect.left + rect.width / 2) + "px";
    particle.style.top = (rect.top + rect.height / 2) + "px";
    particle.style.zIndex = "9999";
    
    document.body.appendChild(particle);
    
    // Animate particle
    const angle = (Math.PI * 2 * i) / 5;
    const distance = 100;
    const duration = 1000;
    
    particle.animate([
      { transform: "translate(0, 0) scale(1)", opacity: 1 },
      { 
        transform: `translate(${Math.cos(angle) * distance}px, ${Math.sin(angle) * distance}px) scale(0)`, 
        opacity: 0 
      }
    ], {
      duration: duration,
      easing: "ease-out"
    }).onfinish = () => {
      particle.remove();
    };
  }
}

function updateProgress(rewards) {
  const litRewards = Object.values(rewards).filter(count => count > 0).length;
  const percentage = Math.round((litRewards / TOTAL_REWARDS) * 100);
  
  document.getElementById("progressPercent").textContent = percentage + "%";
  document.getElementById("progressBar").style.width = percentage + "%";
  
  // Check if complete
  if (litRewards === TOTAL_REWARDS) {
    showCompletionMessage();
  }
}

function showCompletionMessage() {
  const message = document.getElementById("completionMessage");
  message.classList.add("active");
  
  // Create fireworks effect
  createFireworks();
  
  // Auto-hide after 5 seconds
  setTimeout(() => {
    message.classList.remove("active");
  }, 5000);
}

function createFireworks() {
  const colors = ["#00fffc", "#fc00ff", "#fffc00", "#ff0000", "#00ff00"];
  const fireworksContainer = document.querySelector(".fireworks");
  
  for (let i = 0; i < 50; i++) {
    setTimeout(() => {
      const firework = document.createElement("div");
      firework.style.position = "absolute";
      firework.style.width = "5px";
      firework.style.height = "5px";
      firework.style.borderRadius = "50%";
      firework.style.background = colors[Math.floor(Math.random() * colors.length)];
      firework.style.boxShadow = `0 0 10px ${colors[Math.floor(Math.random() * colors.length)]}`;
      firework.style.left = Math.random() * 100 + "%";
      firework.style.top = Math.random() * 100 + "%";
      
      fireworksContainer.appendChild(firework);
      
      firework.animate([
        { transform: "scale(0)", opacity: 1 },
        { transform: "scale(20)", opacity: 0 }
      ], {
        duration: 1000 + Math.random() * 1000,
        easing: "ease-out"
      }).onfinish = () => {
        firework.remove();
      };
    }, i * 50);
  }
}

async function loadRewards() {
  if (!auth.currentUser) return;
  
  const userRef = doc(db, "users", auth.currentUser.uid);
  
  // Real-time listener
  onSnapshot(userRef, (docSnap) => {
    if (!docSnap.exists()) return;
    
    const rewards = docSnap.data()?.rewards || {};
    
    // Update all reward boxes
    document.querySelectorAll(".reward-box").forEach(box => {
      const rewardType = box.getAttribute("data-reward");
      const count = rewards[rewardType] || 0;
      
      box.querySelector(".reward-count").textContent = count;
      
      if (count > 0) {
        box.classList.add("lit");
      } else {
        box.classList.remove("lit");
      }
    });
    
    updateProgress(rewards);
  });
}

onAuthStateChanged(auth, (user) => {
  if (!user) {
    window.location.href = "login.html";
  } else {
    loadRewards();
  }
});

// Click on reward boxes to see animation
document.querySelectorAll(".reward-box").forEach(box => {
  box.addEventListener("click", () => {
    if (box.classList.contains("lit")) {
      playLightUpEffect(box);
    }
  });
});
