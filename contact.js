// contact.js - Handle contact form submissions

import { initializeApp } from “https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js”;
import { getFirestore, collection, addDoc, serverTimestamp } from “https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js”;

const firebaseConfig = {
apiKey: “AIzaSyAHMbxr7rJS88ZefVJzt8p_9CCTstLmLU8”,
authDomain: “yourspace-2026.firebaseapp.com”,
projectId: “yourspace-2026”,
storageBucket: “yourspace-2026.firebasestorage.app”,
messagingSenderId: “72667267302”,
appId: “1:72667267302:web:2bed5f543e05d49ca8fb27”
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

document.getElementById(“contactForm”).addEventListener(“submit”, async (e) => {
e.preventDefault();

const name = document.getElementById(“name”).value;
const email = document.getElementById(“email”).value;
const subject = document.getElementById(“subject”).value;
const message = document.getElementById(“message”).value;

try {
await addDoc(collection(db, “contactMessages”), {
name,
email,
subject,
message,
createdAt: serverTimestamp(),
status: “new”
});

```
document.getElementById("contactForm").reset();
document.getElementById("formSuccess").style.display = "block";

setTimeout(() => {
  document.getElementById("formSuccess").style.display = "none";
}, 5000);
```

} catch (error) {
console.error(“Error submitting form:”, error);
alert(“Error sending message. Please try again.”);
}
});
