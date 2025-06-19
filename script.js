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
  if (e.key === 'ArrowRight') {
    nextBtn.click();
  } else if (e.key === 'ArrowLeft') {
    prevBtn.click();
  } else if (e.key === ' ') {
    e.preventDefault(); // Prevent page from scrolling
    cardEl.click();
  }
}); 