const mistakesElement = document.getElementById('mistakes');
const wordCount = document.getElementById('word-count');

const WORD_GOAL = 22;

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
    if (count == 0) {
    //   mistakesElement.classList.add('hidden');
    }

    mistakesElement.textContent = `You have made ${count} mistakes`.replace(' 0', ' no');

    if (newMistake) {
      // shake the #editor a bit
      const editor = document.getElementById('editor-container');
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
    wordCount.textContent = `You owe ${owed} words`.replace(' 0', ' no');
  }

  checkComplete();
}

function checkComplete() {
  let words = demoSpellChecker.wordCount();
  let noMistakes = demoSpellChecker.numMistakes() <= 0;
  let goalComplete = words >= WORD_GOAL;
  let partway = words > WORD_GOAL / 2;

  // if (!noMistakes && !goalComplete) {
  //   return;
  // }

  // if (goalComplete && noMistakes) {
  //   document.getElementById('submit').classList.add('complete');
  // }

  if (goalComplete) {
    // document.getElementById('submit').classList.add('complete');
    let elts = document.querySelectorAll(".wait-until-complete")
    elts.forEach(element => {
      element.classList.add('complete')
    });
  }

  if (goalComplete && !noMistakes) { // finished with mistakes
    document.getElementById('mistakes').classList.add('emphasize')
  }

  // if (!goalComplete && noMistakes && partway) { // not finished but with no mistakes
  //   // document.getElementById('word-count').classList.add('emphasize')
  // }
}
