let speaker = new Speaker();

allPhonemes = new Set()

let has_clicked;
window.addEventListener('click', () => {has_clicked = true;});
window.addEventListener('touchstart', () => {has_clicked = true;});

function playSound(path) {
    if (!has_clicked)
    return;

    let audio = new Audio(path); 
    audio.play(); 
    audio.loop = true;
}

function say(phoneme) {
  // const audio = new Audio(`assets/${phoneme}.mp4a`);
  // audio.play()
  let id = `${phoneme}-phoneme`;
  let elt = document.getElementById(id)
  console.log({id, elt})
  elt.play();
}


// let text = `The starting point for host-to-host communication on the ARPANET in 1969 was the 1822 protocol which defined the transmission of messages to an IMP.[82] The message format was designed to work unambiguously with a broad range of computer architectures. An 1822 message essentially consisted of a message type a numeric host address and a data field. To send a data message to another host the transmitting host formatted a data message containing the destination hosts address and the data message being sent and then transmitted the message through the 1822 hardware interface. The IMP then delivered the message to its destination address either by delivering it to a locally connected host or by delivering it to another IMP. When the message was ultimately delivered to the destination host the receiving IMP would transmit a Ready for Next Message (RFNM) acknowledgment to the sending host IMP.[citation needed] Network Control Protocol Unlike modern Internet datagrams the ARPANET was designed to reliably transmit 1822 messages and to inform the host computer when it loses a message; the contemporary IP is unreliable whereas the TCP is reliable. Nonetheless the 1822 protocol proved inadequate for handling multiple connections among different applications residing in a host computer. This problem was addressed with the Network Control Protocol (NCP) which provided a standard method to establish reliable flow-controlled bidirectional communications links among different processes in different host computers. The NCP interface allowed application software to connect across the ARPANET by implementing higher-level communication protocols an early example of the protocol layering concept later incorporated in the OSI model. NCP was developed under the leadership of Steve Crocker then a graduate student at UCLA. Crocker created and led the Network Working Group (NWG) which was made up of a collection of graduate students at universities and research laboratories including Jon Postel and Vint Cerf at UCLA. They were sponsored by ARPA to carry out the development of the ARPANET and the software for the host computers that supported applications. Stephen J. Lukasik directed DARPA to focus on internetworking research in the early 1970s. Bob Kahn moved from BBN to DARPA in 1972 first as program manager for the ARPANET under Larry Roberts then as director of the IPTO when Roberts left to found Telenet. Kahn worked on bdoth satellite packet networks and ground-based radio packet networks and recognized the value of being able to communicate across both. Steve Crocker now at DARPA and the leaders of British and French network projects founded the International Network Working Group in 1972 and on Crockers recommendation Vint Cerf now on the faculty at Stanford University became its Chair.[83][84][85] This group considered how to interconnect packet switching networks with different specifications that is internetworking. Research led by Kahn and Cerf resulted in the formulation of the Transmission Control Program[13] which incorporated concepts from the French CYCLADES project directed by Louis Pouzin.[86] Its specification was written by Cerf with Yogen Dalal and Carl Sunshine at Stanford in December 1974 (RFC 675). The following year testing began through concurrent implementations at Stanford BBN and University College London.[87] At first a monolithic design the software was redesigned as a modular protocol stack in version 3 in 1978. Version 4 was installed in the ARPANET for production use in January 1983 replacing NCP. The development of the complete Internet protocol suite by 1989 as outlined in RFC 1122 and RFC 1123 and partnerships with the telecommunication and computer industry laid the foundation for the adoption of TCP/IP as a comprehensive protocol suite as the core component of the emerging Internet. rom Chapter A for Hans Arp  Awkward grammar appals a craftsman A Dada bard as daft as Tzara damns stagnant art and scrawls an alpha a slapdash arc and a backward zag that mars all stanzas and jams all ballads what a scandal A madcap vandal crafts a small black ankh  a hand stamp that can stamp a wax pad and at last plant a mark that sparks an ars magna an abstract art that charts a phrasal anagram A pagan skald chants a dark saga a Mahabharata as a papal cabal blackballs all annals and tracts all dramas and psalms Kant and Kafka Marx and Marat A law as harsh as a fatwa bans all paragraphs that lack an A as a standard hallmark  from Chapter E for Ren Crevel  Enfettered these sentences repress free speech The text deletes selected letters We see the revered exegete reject metred verse the sestet the tercet  even les scnes leves en grec He rebels He sets new precedents He lets cleverness exceed decent levels He eschews the esteemed genres the expected themes  even les belles lettres en vers He prefers the perverse French esthetes Verne Pret Genet Perec  hence he pens fervent screeds then enters the street where he sells these let terpress newsletters three cents per sheet He engen ders perfect newness wherever we need fresh terms  from Chapter I for Dick Higgins  Writing is inhibiting Sighing I sit scribbling in ink this pidgin script I sing with nihilistic witticism disciplining signs with triing gimmicks  impish hijinks which highlight stick sigils Isnt it glib Isnt it chic I t childish insights within rigid limits writing shtick which might instill priggish misgiv ings in critics blind with hindsight I dismiss nit picking criticism which irts with philistinism I bitch I kibitz  griping whilst criticizing dimwits sniping whilst indicting nitwits dismissing simplis tic thinking in which philippic wit is still illicit  from Chapter O for Yoko Ono  Loops on bold fonts now form lots of words for books Books form cocoons of comfort  tombs to hold book worms Profs from Oxford show frosh who do post docs how to gloss works of Wordsworth Dons who work for proctors or provosts do not fob off school to work on crosswords nor do dons go off to dorm rooms to loll on cots Dons go crosstown to look for bookshops known to stock lots of topnotch goods cookbooks workbooks  room on room of howto books for jocks how to jog how to box books on pro sports golf or polo Old colophons on school books from schoolrooms sport two sorts of logo ob long whorls rococo scrolls  both on worn morocco  from Chapter U for Zhu Yu  Kultur spurns Ubu  thus Ubu pulls stunts Ubu shuns Skulptur Uruk urns plus busts Zulu jugs plus tusks Ubu sculpts junk fr Kunst und Glck Ubu busks Ubu drums drums plus Ubu strums cruths such hubbub such ruckus thump thump thrum thrum Ubu puns puns Ubu blurts untruth much bunkum plus bull much humbug plus bunk  but trustful schmucks trust such untruthful stuff thus Ubu cult guru must bluff dumbstruck numbskulls such chumps Ubu mulcts surplus funds trust funds plus slush funds Ubu usurps much usufruct Ubu sums up lump sums Ubu trumps dumb luck  from The New Ennui  Eunoia is the shortest word in English to contain all five vowels and the word quite literally means beauti ful thinking Eunoia is a univocal lipogram in which each chapter restricts itself to the use of a single vowel Eunoia is directly inspired by the exploits of Oulipo lOuvroir de Litterature Potentielle  the avantgarde coterie renowned for its literary experimentation with extreme formalistic constraints The text makes a Sisyphean spectacle of its labour wilfully crippling its language in order to show that even under such improbable conditions of duress language can still express an uncanny if not sublime thought  Eunoia abides by many subsidiary rules All chapters must allude to the art of writing All chapters must de scribe a culinary banquet a prurient debauch a pas toral tableau and a nautical voyage All sentences must accent internal rhyme through the use of syntactical parallelism The text must exhaust the lexicon for each vowel citing at least  of the available repertoire although a few words do go unused despite efforts to include them parallax belvedere gingivitis mono chord and tumulus The text must minimize repeti tion of substantive vocabulary so that ideally no word appears more than once The letter Y is suppressed`


// let pronouncings = text.split(' ').map(pronouncing.phonesForWord).map(s => s.join(" ").replaceAll( /[0-9]/g, '')).join(" ").split(" ")
// let all = new Set(pronouncings)


const CMU_DICT = [
  "S",
  "T",
  "AA",
  "R",
  "IH",
  "NG",
  "P",
  "OY",
  "N",
  "F",
  "AO",
  "ER",
  "K",
  "AH",
  "M",
  "Y",
  "UW",
  "EY",
  "SH",
  "DH",
  "IY",
  "W",
  "Z",
  "OW",
  "L",
  "CH",
  "HH",
  "D",
  "AY",
  "AE",
  "V",
  "EH",
  "JH",
  "B",
  "G",
  "TH",
  "UH",
  "AW",
  "ZH"
]

CMU_DICT.forEach((phoneme) => {
  let elt = document.createElement("audio")
  elt.setAttribute("id", phoneme + "-phoneme"); 
  elt.setAttribute("src", `assets/${phoneme}.m4a`);
  document.body.appendChild(elt);
  console.log(elt)
})

function getPronunciation(word) { // -> Optional[List[str]]
  if (!word) {
    return [];
  }


  let pronunciations = pronouncing.phonesForWord(word);

  while (!pronunciations || !pronunciations.length) {
    console.log({word})
    word = word.slice(1);
    if (!word) { return []; }
    pronunciations = pronouncing.phonesForWord(word);
  }

  let acceptedPronunciation = pronunciations[0].split(' ').map(s => s.replaceAll( /[0-9]/g, ''));
  return acceptedPronunciation;
}

class SpellChecker {
    constructor(options = {}) {
      this.options = {
        checkDelay: 100,        // Milliseconds to wait after typing stops
        squiggleColor: 'red',
        ...options
      };
      
      this.targetElement = null;
      this.textState = {
        tokens: [],
        misspellings: [],
        wordCount: 0,
      }
      this.isChecking = false;    
      this.checkNeeded = false;
      this.eventTarget = new EventTarget();
    }

    numMistakes() {
      return this.textState.misspellings.length;
    }

    wordCount() {
      return this.textState.wordCount;
    }

    // Set the element to check for spelling
    setElement(element) {
      if (!element) return;
      
      // Clear previous element's listener if any
      if (this.targetElement) {
        this.targetElement.removeEventListener('input', this.handleInput.bind(this));
      }
      
      // Set new element and initialize
      this.targetElement = element;
      this.textState.misspellings = [];
      
      // Set up event listeners for content changes
      element.addEventListener('input', this.handleInput.bind(this));
      
      this.checkSpelling();
      
      return this;
    }

    handleInput(event) {
      this.checkNeeded = true;
      this.event = event; // log the most recent event
      
      // If not already checking, start the check process
      if (!this.isChecking) {
        this.processCheck();
      }
    }

    // Process spell checking
    processCheck() {
      if (!this.checkNeeded) {
        this.isChecking = false;
        return;
      }
      
      this.isChecking = true;
      this.checkNeeded = false;
      
      // Perform the check
      this.performSpellCheck().then(() => {
        // Check if another check is needed when this one is done
        requestAnimationFrame(() => this.processCheck());
      });
    }

    // Perform the actual spell check (returns a promise)
    async performSpellCheck() {
      if (!this.targetElement) return;

      let tokens = iterateContentEditableWords(this.targetElement);

      const prevTokens = this.textState.tokens;
      const newTokens = this.findNewTokens(prevTokens, tokens);

      this.textState.tokens = tokens;
      this.textState.wordCount = tokens.length;

      console.log("new tokens", {tokens, newTokens})

      let mostRecentWord = newTokens.length > 0 ? newTokens[0] : undefined;
      
      console.log("most recent", {mostRecentWord})

      let phonemes = getPronunciation(mostRecentWord?.text)
      console.log({phonemes})

      if (!phonemes || !phonemes.length) {
        return;
      }

      let phoneme = phonemes[phonemes.length - 1];
      say(phoneme)
    }

    checkSpelling() {
      this.checkNeeded = true;
      if (!this.isChecking) {
        this.processCheck();
      }
    }

    getMispellings(words) {
      const misspelledRanges = words.filter(word => !this.isWordCorrect(word.text));
      const correctRanges = words.filter(word => this.isWordCorrect(word.text));
      return [correctRanges, misspelledRanges];
    }

    // Check if a word is spelled correctly
    isWordCorrect(word) {
      const normalizedWord = word.toLowerCase();
      return !normalizedWord.includes('e');
    }

    mistakeMarkup(mispelledTokens, correctTokens) {
      if (!this.targetElement) return;
      
      let overlay = document.getElementById("overlay");
      overlay.innerHTML = '';
      
      let editorRect = this.targetElement.getBoundingClientRect();
      overlay.style.width = `${editorRect.width}px`;
      overlay.style.height = `${editorRect.height}px`;

      mispelledTokens.forEach(misspelled => {
        const squiggle = document.createElement('div');
        squiggle.classList.add('spell-error-mark');
        squiggle.style.left = `${misspelled.rect.left - editorRect.left}px`;
        squiggle.style.top = `${misspelled.rect.bottom - editorRect.top}px`; // Position at bottom of text
        squiggle.style.width = `${misspelled.rect.width}px`;

        const overlayWord = document.createElement('div');
        overlayWord.classList.add('overlay-word');
        overlayWord.textContent = misspelled.text
        overlayWord.style.left = `${misspelled.rect.left - editorRect.left}px`;
        overlayWord.style.top = `${misspelled.rect.top - editorRect.top}px`; // Position at bottom of text
        
        overlay.appendChild(squiggle);
        overlay.appendChild(overlayWord);
      });

      correctTokens.forEach(correct =>{
        const correctOverlay = document.createElement('div');
        correctOverlay.classList.add('correct-overlay-word');
        correctOverlay.textContent = correct.text
        correctOverlay.style.left = `${correct.rect.left - editorRect.left}px`;
        correctOverlay.style.top = `${correct.rect.top - editorRect.top}px`; // Position at bottom of text
        
        overlay.appendChild(correctOverlay)
      })

    }

    // Find new misspellings that weren't in the previous set
    findNewTokens(previous, current) {
      const hash = (item) => {return `${item.text}-${item.startIndex}-${item.endIndex}`}
      // Create a simple hash of each previous misspelling for comparison
      const previousHashes = previous.map(hash);
      
      // Filter current misspellings to only those not in previous
      return current.filter(item => {
        return !previousHashes.includes(hash(item));
      });
    }

    // Emit misspellings changed event
    emitMisspellingsChanged(misspellings) {
      const event = new CustomEvent('misspellingsChanged', {
        detail: {
          element: this.targetElement,
          misspellings: misspellings,
          newMistake: misspellings.length > 0,
        }
      });
      this.eventTarget.dispatchEvent(event);
    }

    // Add this new method to emit word count events
    emitWordCountChanged(count) {
      const event = new CustomEvent('wordCountChanged', {
        detail: {
          element: this.targetElement,
          count: count
        }
      });
      this.eventTarget.dispatchEvent(event);
    }
  }

  // Initialize the spellchecker with a sample dictionary
  const demoSpellChecker = new SpellChecker({
    checkDelay: 500,
    squiggleColor: 'red'
  });
    
const editor = document.querySelector('#editor');
if (editor) {
  demoSpellChecker.setElement(editor);
}

function onComplete() {
  document.getElementById('editor-container').classList.add('complete');
}

function sample(iterable) {
  return iterable[Math.floor(Math.random() * iterable.length)]
}

/**
 * Unused
 * 
 * Extracts the text content from a contenteditable element, preserving explicit line breaks.
 *
 * It needed to be this complex for when we were doing rich text, but now the <br> and <div> stuff isn't used.
 * 
 * This function clones the provided element to avoid altering the original content. It then
 * replaces <br> tags and the beginnings of <div> tags with newline characters to preserve
 * the visual representation of line breaks. The function does not modify <span> tags, as they
 * are not typically associated with line breaks. The modified content is then returned as a
 * single string with preserved line breaks.
 *
 * @param {HTMLElement} element - The contenteditable element from which to extract text.
 * @returns {string} The text content of the element with \n characters in place of <br> and <div> tags.
*/
function getTextWithWhitespace(element) {
  let clone = element.cloneNode(true);

  // Replace <br> tags with \n
  clone.querySelectorAll('br').forEach(br => br.replaceWith('\n'));

  // Replace block elements like <div> with \n and maintain their content
  clone.querySelectorAll('div').forEach(div => {
    div.replaceWith('\n', ...div.childNodes);
  });

  // Extract the textContent from the cloned element
  return clone.textContent;
}