import { auth, db } from './firebase.js';
import { collection, doc, getDocs, setDoc, onSnapshot, query, orderBy, serverTimestamp } from 'firebase/firestore';

const threadsContainer = document.getElementById('threadsContainer');
const recipientInput = document.getElementById('recipientInput');
const messageInput = document.getElementById('messageInput');
const sendMessageBtn = document.getElementById('sendMessageBtn');

let currentUser;

// NAV BUTTONS
document.getElementById('navFeed').addEventListener('click', () => alert('Feed placeholder'));
document.getElementById('navProfile').addEventListener('click', () => alert('Profile placeholder'));
document.getElementById('navMessages').addEventListener('click', () => alert('Messages placeholder'));
document.getElementById('navSettings').addEventListener('click', () => alert('Settings placeholder'));

// LOAD CURRENT USER
auth.onAuthStateChanged(async (user) => {
  if (!user) return;
  currentUser = user;
  loadThreads();
});

// CREATE OR GET THREAD ID
async function getThreadId(otherUsername) {
  if (!currentUser) return null;
  const usersSnap = await getDocs(collection(db, 'users'));
  let otherUserId = null;
  usersSnap.forEach(docSnap => {
    if (docSnap.data().username === otherUsername) otherUserId = docSnap.id;
  });
  if (!otherUserId) return null;
  const threadId = [currentUser.uid, otherUserId].sort().join('_');
  return threadId;
}

// LOAD MESSAGES FOR ALL THREADS
async function loadThreads() {
  if (!currentUser) return;
  const threadsSnap = await getDocs(collection(db, 'messages'));
  threadsContainer.innerHTML = '';
  threadsSnap.forEach(threadDoc => {
    const div = document.createElement('div');
    div.className = 'thread';
    div.textContent = `Thread: ${threadDoc.id}`;
    div.addEventListener('click', () => showThread(threadDoc.id));
    threadsContainer.appendChild(div);
  });
}

// SHOW MESSAGES FOR SELECTED THREAD
async function showThread(threadId) {
  threadsContainer.innerHTML = `<h4>Thread: ${threadId}</h4><div id="messagesList"></div>`;
  const messagesList = document.getElementById('messagesList');
  const messagesQuery = query(collection(db, 'messages', threadId, 'items'), orderBy('timestamp', 'asc'));
  onSnapshot(messagesQuery, snapshot => {
    messagesList.innerHTML = '';
    snapshot.forEach(msg => {
      const data = msg.data();
      const msgDiv = document.createElement('div');
      msgDiv.className = 'message';
      msgDiv.textContent = `${data.senderName}: ${data.text}`;
      messagesList.appendChild(msgDiv);
    });
  });
}

// SEND MESSAGE
sendMessageBtn.addEventListener('click', async () => {
  const text = messageInput.value.trim();
  const recipient = recipientInput.value.trim();
  if (!text || !recipient) return alert('Enter message and recipient username');
  const threadId = await getThreadId(recipient);
  if (!threadId) return alert('User not found');

  const msgRef = doc(collection(db, 'messages', threadId, 'items'));
  await setDoc(msgRef, {
    senderId: currentUser.uid,
    senderName: currentUser.displayName || 'Unknown',
    text,
    timestamp: serverTimestamp()
  });
  messageInput.value = '';
});
