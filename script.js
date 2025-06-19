// Fetch cards data and handle UI interactions
let cards = [],
    i = 0,
    showingFront = true;

const cardEl     = document.getElementById('card');
const prevBtn    = document.getElementById('prev');
const nextBtn    = document.getElementById('next');
const shuffleBtn = document.getElementById('shuffle');
const progressEl = document.getElementById('progress');

fetch('cards.json')
  .then(res => res.json())
  .then(data => {
    cards = data;
    render();
  })
  .catch(err => {
    cardEl.textContent = 'Kunne ikke indlæse kort :(';
    console.error('Error loading cards.json', err);
  });

// Update the card display & progress
function render() {
  if (!cards.length) return;
  const card = cards[i];
  cardEl.textContent = showingFront ? card.front : card.back_answer;
  cardEl.classList.toggle('is-back', !showingFront);
  progressEl.textContent = `${i + 1} / ${cards.length}`;
}

// Event listeners
cardEl.addEventListener('click', () => {
  showingFront = !showingFront;
  render();
});

nextBtn.addEventListener('click', () => {
  i = (i + 1) % cards.length;
  showingFront = true;
  render();
});

prevBtn.addEventListener('click', () => {
  i = (i - 1 + cards.length) % cards.length;
  showingFront = true;
  render();
});

shuffleBtn.addEventListener('click', () => {
  cards.sort(() => Math.random() - 0.5);
  i = 0;
  showingFront = true;
  render();
});

// Keyboard shortcuts: ⬅️ / ➡️ for nav, Space to flip
document.addEventListener('keydown', (e) => {
  // Ignér tastaturgenveje, hvis chatten er aktiv eller fokus er i et input/textarea
  if (chatModal?.classList.contains('active') || ['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) {
    return;
  }
  if (e.key === 'ArrowRight') {
    nextBtn.click();
  } else if (e.key === 'ArrowLeft') {
    prevBtn.click();
  } else if (e.key === ' ') {
    e.preventDefault(); // Prevent page from scrolling
    cardEl.click();
  }
});

// =====================
// Chatbot integration
// =====================
const X_USER_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6InVzZXJfMDFKWTNSRVJCSDM5MkFZRFpORFcwMkoxNVYiLCJpYXQiOjE3NTAzMjU0ODV9.X2KZgVyb85IlQ0qYq_VstxPtq4TH2BjrWU8pjEGl3Mc';
const BASE_URL   = 'https://chat.botpress.cloud/782cb6d5-57fb-4164-92ae-3ac86604bd0b';
const CURRENT_USER_ID = 'user_01JY3RERBH392AYDZNDW02J15V'; // Extract from JWT token

let conversationId = localStorage.getItem('bp_conversation_id') || null;
let displayedMessageIds = new Set();
let pollInterval = null;

// Elements
const askBtn       = document.getElementById('ask');
const chatModal    = document.getElementById('chatModal');
const closeChatBtn = document.getElementById('closeChat');
const newConversationBtn = document.getElementById('newConversation');
const chatMessages = document.getElementById('chatMessages');
const chatForm     = document.getElementById('chatForm');
const chatInput    = document.getElementById('chatInput');

if (askBtn) {
  askBtn.addEventListener('click', () => {
    openChat();
  });
}

if (closeChatBtn) {
  closeChatBtn.addEventListener('click', () => {
    closeChat();
  });
}

if (newConversationBtn) {
  newConversationBtn.addEventListener('click', () => {
    startNewConversation();
  });
}

if (chatForm) {
  chatForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const text = chatInput.value.trim();
    if (!text) return;
    chatInput.value = '';
    await sendMessage(text);
    // Quick poll after sending
    setTimeout(pollMessages, 800);
  });
}

async function ensureConversation() {
  if (conversationId) return conversationId;
  console.log('Creating new conversation...');
  try {
    const res = await fetch(`${BASE_URL}/conversations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-key': X_USER_KEY
      },
      body: JSON.stringify({})
    });
    console.log('Conversation response status:', res.status);
    const data = await res.json();
    console.log('Conversation data:', data);
    conversationId = data.conversation?.id || data.id;
    if (conversationId) {
      localStorage.setItem('bp_conversation_id', conversationId);
      console.log('Saved conversation ID:', conversationId);
    }
  } catch (err) {
    console.error('Could not create conversation', err);
  }
  return conversationId;
}

function parseMarkdown(text) {
  // Simple markdown parser for common elements
  return text
    // Headers
    .replace(/^### (.*$)/gm, '<h3>$1</h3>')
    .replace(/^## (.*$)/gm, '<h2>$1</h2>')
    .replace(/^# (.*$)/gm, '<h1>$1</h1>')
    // Bold text
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    // Italic text
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    // Line breaks
    .replace(/\n/g, '<br>')
    // Lists (simple implementation)
    .replace(/^- (.*$)/gm, '<li>$1</li>')
    // Wrap consecutive <li> elements in <ul>
    .replace(/(<li>.*<\/li>(?:<br><li>.*<\/li>)*)/g, '<ul>$1</ul>')
    .replace(/<\/li><br><li>/g, '</li><li>')
    .replace(/<ul><li>/g, '<ul><li>')
    .replace(/<\/li><\/ul>/g, '</li></ul>');
}

function appendMessage(who, text) {
  const el = document.createElement('div');
  el.className = `chat-message ${who}`;
  
  if (who === 'bot') {
    // Parse markdown for bot messages
    el.innerHTML = parseMarkdown(text);
  } else {
    // Keep user messages as plain text
    el.textContent = text;
  }
  
  chatMessages.appendChild(el);
  // Scroll to bottom
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

async function sendMessage(text) {
  console.log('Sending message:', text);
  await ensureConversation();
  if (!conversationId) return;
  
  try {
    console.log('Posting to:', `${BASE_URL}/messages`);
    await fetch(`${BASE_URL}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-key': X_USER_KEY
      },
      body: JSON.stringify({
        payload: { type: 'text', text },
        conversationId
      })
    });
    console.log('Message sent successfully');
  } catch (err) {
    console.error('Failed to send message', err);
  }
}

async function pollMessages() {
  if (!conversationId) return;
  console.log('Polling messages for conversation:', conversationId);
  try {
    const res = await fetch(`${BASE_URL}/conversations/${conversationId}/messages`, {
      headers: { 'x-user-key': X_USER_KEY }
    });
    console.log('Poll response status:', res.status);
    const data = await res.json();
    console.log('Poll data:', data);
    const messages = data.messages || data; // API may return array or {messages:[]}
    messages.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    messages.forEach((m) => {
      console.log('Processing message:', m.id, m.userId, m.payload?.text);
      if (!displayedMessageIds.has(m.id) && m.payload && m.payload.text) {
        const who = m.userId === CURRENT_USER_ID ? 'user' : 'bot';
        console.log('Adding message to UI:', who, m.payload.text);
        appendMessage(who, m.payload.text);
        displayedMessageIds.add(m.id);
      }
    });
  } catch (err) {
    console.error('Polling error', err);
  }
}

function openChat() {
  chatModal.classList.add('active');
  pollMessages();
  if (!pollInterval) {
    pollInterval = setInterval(pollMessages, 1500);
  }
}

function closeChat() {
  chatModal.classList.remove('active');
  if (pollInterval) {
    clearInterval(pollInterval);
    pollInterval = null;
  }
}

function startNewConversation() {
  // Clear current conversation state
  conversationId = null;
  localStorage.removeItem('bp_conversation_id');
  
  // Clear displayed messages
  displayedMessageIds.clear();
  chatMessages.innerHTML = '';
  
  // Add welcome message
  appendMessage('bot', 'Hej! Jeg er her for at hjælpe dig med erhvervsjura. Hvad kan jeg hjælpe dig med?');
  
  console.log('Started new conversation');
} 