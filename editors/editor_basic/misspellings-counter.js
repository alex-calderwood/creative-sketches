const mistakesElement = document.getElementById('mistakes');

onMistake(demoSpellChecker.numMistakes());
    
demoSpellChecker.onMisspellingsChanged((event) => {
  onMistake(demoSpellChecker.numMistakes());
});

function onMistake(count) {
  if (mistakesElement) {
    mistakesElement.textContent = `Errors: ${count}`;

    // shake the #editor a bit
    const editor = document.getElementById('editor');
    editor.classList.add('shake');
    setTimeout(() => {
      editor.classList.remove('shake');
    }, 100);
  }
}