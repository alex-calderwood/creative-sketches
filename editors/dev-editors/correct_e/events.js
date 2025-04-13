const mistakesElement = document.getElementById('mistakes');
const wordCount = document.getElementById('word-count');

const WORD_GOAL = 50;

onMistake(demoSpellChecker.numMistakes());
onWordCount(0);
    
demoSpellChecker.eventTarget.addEventListener('misspellingsChanged', (event) => {
  onMistake(demoSpellChecker.numMistakes(), event.detail.newMistake);
})

demoSpellChecker.eventTarget.addEventListener('wordCountChanged', (event) => {
  onWordCount(event.detail.count);
});

function onMistake(count, newMistake) {
  if (mistakesElement) {
    mistakesElement.textContent = `You have made ${count} mistakes`;

    if (newMistake) {
      // shake the #editor a bit
      const editor = document.getElementById('editor');
      editor.classList.add('shake');
      setTimeout(() => {
        editor.classList.remove('shake');
      }, 100);
    }
  }

  checkComplete();
}

function onWordCount(count) {
  if (wordCount) {
    let owed = Math.max(0, WORD_GOAL - count);
    wordCount.textContent = `You owe ${owed} words`;
  }

  checkComplete();
}

function checkComplete() {
  if (demoSpellChecker.numMistakes() == 0 && demoSpellChecker.wordCount() >= WORD_GOAL) {
    document.getElementById('editor').classList.add('complete');
  }
}