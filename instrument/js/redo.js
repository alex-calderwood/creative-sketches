let base_url = 'http://localhost:5000';
let performance; // the performance tab
let expectedOrigin = "https://localhost:8101"

let deformInterval;
let deformRate = 5000;

const frameRateSetting = 26;
let frames = 0;
const llamaCoolDownSec = 0.5
let lastLlamaCall = -1;
let lastLlamaWordID = null;

let library = {
    "cutup":  "ALL WRITING IS IN FACT CUT UPS OF GAMES AND ECONOMIC BEHAVIOR OVERHEARD? WHAT ELSE? ASSUME THAT THE WORST HAS HAPPENED EXPLICIT AND SUBJECT TO STRATEGY IS AT SOME POINT CLASSICAL PROSE. CUTTING AND REARRANGING FACTOR YOUR OPPONENT WILL GAIN INTRODUCES A NEW DIMENSION YOUR STRATEGY. HOW MANY DISCOVERIES SOUND TO KINESTHETIC? WE CAN NOW PRODUCE ACCIDENT TO HIS COLOR OF VOWELS. AND NEW DIMENSION TO FILMS CUT THE SENSES. THE PLACE OF SAND. GAMBLING SCENES ALL TIMES COLORS TASTING SOUNDS SMELL STREETS OF THE WORLD. WHEN YOU CAN HAVE THE BET ALL: \"POETRY IS FOR EVERYONE\" DOCTOR NEUMAN IN A COLLAGE OF WORDS READ HEARD INTRODUCED THE CUT UP SCISSORS RENDERS THE PROCESS GAME AND MILITARY STRATEGY, VARIATION CLEAR AND ACT ACCORDINGLY. IF YOU POSED ENTIRELY OF REARRANGED CUT DETERMINED BY RANDOM A PAGE OF WRITTEN WORDS NO ADVANTAGE FROM KNOWING INTO WRITER PREDICT THE MOVE. THE CUT VARIATION IMAGES SHIFT SENSE ADVANTAGE IN PROCESSING TO SOUND SIGHT TO SOUND. HAVE BEEN MADE BY ACCIDENT IS WHERE RIMBAUD WAS GOING WITH ORDER THE CUT UPS COULD \"SYSTEMATIC DERANGEMENT\" OF THE GAMBLING SCENE IN WITH A TEA HALLUCINATION: SEEING AND PLACES. CUT BACK. CUT FORMS. REARRANGE THE WORD AND IMAGE TO OTHER FIELDS THAN WRITING.",
    "pataphysics": "pataphysics is the science of the realm beyond metaphysics… It will study the laws which govern exceptions and will explain the universe supplementary to this one; or, less ambitiously, it will describe a universe which one can see — must see perhaps — instead of the traditional one… Definition: pataphysics is the science of imaginary solutions, which symbolically attributes the properties of objects, described by their virtuality, to their lineaments (Jarry 1963: 131).",
    // https://dbanach.com/enneads/enneads-study2.htm
    "deconstruction": "Certainly, Derrida’s style is not traditional. In the same speech from 1980 at the time of him being awarded a doctorate, Derrida tells us that, in the Seventies, he devoted himself to developing a style of writing. The most clearest example is his 1974 Glas (“Death Knell” would be an approximate English translation; the current English translation simply uses the word “glas”); here Derrida writes in two columns, with the left devoted to a reading of Hegel and the right devoted to a reading of the French novelist-playwright Jean Genet. Another example would be his 1980 Postcard from Socrates to Freud and Beyond; the opening two hundred pages of this book consist of love letters addressed to no one in particular. It seems that sometime around this time (1980), Derrida reverted back to the more linear and somewhat argumentative style, the very style that defined his texts from the Sixties. He never however renounced a kind of evocation, a calling forth that truly defines deconstruction. Derrida takes the idea of a call from Heidegger. Starting in 1968 with “The Ends of Man,” Derrida devoted a number of texts to Heidegger’s thought. But, it is really with the 1978 publication of The Truth in Painting, and then throughout the 1980s, that Derrida intensified his reading of Heidegger. In particular, he wrote a series of essays on the question of sex or race in Heidegger (“Geschlecht I–IV”). While frequently critical, these essays often provide new insights into Heidegger’s thought. The culminating essay in Derrida’s series on Heidegger is his 1992 Aporias.",
    // "genres": "comedy tragedy history romance tragicomedy fantasy musical melodrama",
    "declaration": "When in the Course of human events, it becomes necessary for one people to dissolve the political bands which have connected them with another, and to assume among the powers of the earth, the separate and equal station to which the Laws of Nature and of Nature's God entitle them, a decent respect to the opinions of mankind requires that they should declare the causes which impel them to the separation. We hold these truths to be self-evident, that all men are created equal, that they are endowed by their Creator with certain unalienable Rights, that among these are Life, Liberty and the pursuit of Happiness",
    "enneads": "To live at ease is There and to these divine beings verity is mother and nurse existence and sustenance all that is not of process but of authentic being they see and themselves in all for all is transparent nothing dark nothing resistant every being is lucid to every other in breadth and depth light runs through light. And each of them contains all within itself, and at the same time sees all in every other, so that everywhere there is all, and all is all and each all, and infinite the glory. Each of them is great; the small is great; the sun, There, is all the stars; and every star, again, is all the stars and sun. While some one manner of being is dominant in each, all are mirrored in every other.  Movement There is pure [as self-caused] for the moving principle is not a separate thing to complicate it as it speeds.  So, too, Repose is not troubled, for there is no admixture of the unstable; and the Beauty is all beauty since it is not merely resident [as an attribute or addition] in some beautiful object. Each There walks upon no alien soil; its place is its essential self; and, as each moves, so to speak, towards what is Above, it is attended by the very ground from which it starts: there is no distinguishing between the Being and the Place; all is Intellect, the Principle and",
    "to_be": "To be, or not to be, that is the question: Whether 'tis nobler in the mind to suffer The slings and arrows of outrageous fortune, Or to take arms against a sea of troubles And by opposing end them. To die—to sleep, No more; and by a sleep to say we end The heart-ache and the thousand natural shocks That flesh is heir to: 'tis a consummation Devoutly to be wish'd. To die, to sleep; To sleep, perchance to dream—ay, there's the rub: For in that sleep of death what dreams may come, When we have shuffled off this mortal coil, Must give us pause—there's the respect That makes calamity of so long life. For who would bear the whips and scorns of time, Th'oppressor's wrong, the proud man's contumely, The pangs of dispriz'd love, the law's delay, The insolence of office, and the spurns That patient merit of th'unworthy takes, When he himself might his quietus make With a bare bodkin? Who would fardels bear, To grunt and sweat under a weary life, But that the dread of something after death, The undiscovere'd country, from whose bourn No traveller returns, puzzles the will, And makes us rather bear those ills we have Than fly to others that we know not of? Thus conscience doth make cowards of us all, And thus the native hue of resolution Is sicklied o'er with the pale cast of thought, And enterprises of great pith and moment With this regard their currents turn awry And lose the name of action.",
    "wake": "riverrun, past Eve and Adam’s, from swerve of shore to bend of bay, brings us by a commodius vicus of recirculation back to Howth Castle and Environs. Sir Tristram, violer d’amores, fr’over the short sea, had passencore rearrived from North Armorica on this side the scraggy isthmus of Europe Minor to wielderfight his penisolate war: nor had topsawyer’s rocks by the stream Oconee exaggerated themselse to Laurens County’s gorgios while they went doublin their mumper all the time: nor avoice from afire bellowsed mishe mishe to tauftauf thuartpeatrick not yet, though venissoon after, had a kidscad buttended a bland old isaac: not yet, though all’s fair in vanessy, were sosie sesthers wroth with twone nathandjoe. Rot a peck of pa’s malt had Jhem or Shen br",
    "gilgamesh": "He who has seen everything, I will make known (?) to the lands. I will teach (?) about him who experienced all things, ... alike, Anu granted him the totality of knowledge of all. He saw the Secret, discovered the Hidden, he brought information of (the time) before the Flood. He went on a distant journey, pushing himself to exhaustion, but then was brought to peace. He carved on a stone stela all of his toils, and built the wall of Uruk-Haven, the wall of the sacred Eanna Temple, the holy sanctuary. Look at its wall which gleams like copper(?), inspect its inner wall, the likes of which no one can equal! Take hold of the threshold stone--it dates from ancient times! Go close to the Eanna Temple, the residence of Ishtar, such as no later king or man ever equaled! Go up on the wall of Uruk and walk around, examine its foundation, inspect its brickwork thoroughly. Is not (even the core of) the brick structure made of kiln-fired brick, and did not the Seven Sages themselves lay out its plans? One league city, one league palm gardens, one league lowlands, the open area(?) of the Ishtar Temple, three leagues and the open area(?) of Uruk it (the wall) encloses. Find the copper tablet box, open the ... of its lock of bronze, undo the fastening of its secret opening. Take and read out from the lapis lazuli tablet how Gilgamesh went through every hardship.",
}

// const qwerty = "qwertyuiopasdfghjklzxcvbnm"      // first version
const qwerty = "qwertyuiop[]asdfghjkl;'zxcvbnm,./"  // second version
function qwertyIndex(c) {
    return qwerty.indexOf(c);
}

let worder;
let guitar;

// populate the html with the corpus values by selecting the corpus textareas by their ids (corpus1, corpus2, corpus3)
// and setting their values to the keys of the library
for (let i = 1; i <= 3; i++) {
    let corpusTextArea = document.getElementById("corpus" + i);
    if (i == 1) {
        corpusTextArea.value = Object.values(library)[0].toUpperCase();
    }
    else {
        let randomIndex = Math.floor(Math.random() * Object.values(library).length);
        corpusTextArea.value = Object.values(library)[randomIndex].toUpperCase();
    }
}

function parseText(text) {
    let doc = nlp(text);
    let sentences = doc.json();
    let words = sentences.map(sentence => sentence.terms.map(term => term.text)).flat()
    return words;
}

function taggedText(text, tag) {
    let doc = nlp(text);
    let match = doc.match(tag).out('array');
    return match;
}

let grammar;
let nouns;
let adjectives; 
let verbs;

function setGlobalGrammars(text) {
    grammar     = parseText(text);
    nouns       = taggedText(text, '#Noun');
    adjectives  = taggedText(text, '#Adjective');
    verbs       = taggedText(text, '#Verb');
}

setGlobalGrammars(library["cutup"]);

// USER SETTINGS
const virtualMidiKeyboard = true;
var userSpecifiedHeight = 250;
let userSpecifiedNumTracks = 16;
const baseSpeed = 7;
const maxSpeed = 20; // pixels / frame
const shiftAmount = 35; // pixels
const visualDebug = false;
let maxTextWidth = 40; // pixels

let backgroundColor = (0, 0, 0);

let prevMidiNote = -1;

const keyboardMode = 'ableton';
let knobRange;
if (keyboardMode === 'ableton') {
    knobRange = [1, 8];
}

let maxTracksNum;
let start;

let textS = 16
let startX;

let midiAccess;
let curMessage;
let textLocation = [0, 40];
let color = [0, 0, 0];
let monoSynth;
let command, note, velocity;
let range = [40, 89] // [0, 120];

let slidyWindow;
let sampleView;
let knobs;

let grammarIndex = 0;

let channels = [1, 2, 10]; // The channel number must be in this list to be displayed

let selectedSample = 0;

let uiScaleState = 1;
let uiScaleStateTracker = 1;

function getCreative(leftwords, rightwords, badwords) {
    return fetch(base_url + '/bert', {
        method: 'POST',
        headers: {
        'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            leftwords: leftwords,
            rightwords: rightwords,
            badwords: badwords,
        }),
        mode: 'cors'
    }).then(response => {
        return response.json()
    })
    .then(word => {
        return word.toUpperCase();
    })
}

class Realization {
    constructor() {
        this.realization = [];
        this.currentLine = [];
    }

    static realizationToRender(wordArray) {
        // if there is a word that starts with ##, concatenate it with the previous word
        let lineCopy = wordArray.slice();
        for (let i = 0; i < lineCopy.length; i++) {
            if (lineCopy[i].startsWith("##")) {
                lineCopy[i - 1] += lineCopy[i].slice(2);
                lineCopy.splice(i, 1);
            }
        }
        return lineCopy;
    }
    
    newLine() {
        /*
         * push the current line to the realization
         * avoiding duplicates
         */
        let lineToPush = Realization.realizationToRender(this.currentLine);

        if (this.realization.length > 0 && this.realization[this.realization.length - 1].join(" ") == lineToPush.join(" ")) {
            return;
        }
        
        this.realization.push(lineToPush);
    }

    update() {
        // tell the realization that the current line has changed
        this.currentLine = slidyWindow.tracks.map(track => track.text);
        
        // update the realization textarea        
        let realizationTextArea = document.getElementsByClassName('realization')[0];
        if (this.realization.length > 0) {
            realizationTextArea.value = this.realization.map(line => line.join(" ")).join("\n");
        }
    }

    draw() {
        let charsToDisplay = Math.floor(width / textWidth("A"));
        let slicedLine = this.currentLine.slice(this.currentLine.length - charsToDisplay, this.currentLine.length);
        let displayText = Realization.realizationToRender(slicedLine).join(" ");
        
        fill(0);
        if (visualDebug) {
            fill(255, 0, 0);
        }
        
        rect(0, height - textS, width, height) // rectMode is corners
        fill(240);
        textAlign(CENTER, TOP);
        text(displayText, width / 2, height - textS);
        textAlign(LEFT, TOP);
    }

    // edit the realization when someone edits #realization
    edit(newValue) {
        // this.realization = newValue.toUpperCase().split(" ");
        this.realization = newValue.toUpperCase().split("\n").map(line => line.split(" "));
    }
}
let realization = new Realization();
function realizationEditCallback(value) {
    realization.edit(value);
}

function performWord(word) {
    if (performance) {
         performance.postMessage({data:
            {
                type: "addWord",
                word: word,
            }
        }, "*")
    }

    // update the realization
    realization.update();
}

function updatePerformanceWord(id, word) {
    console.log("calling post", id, word);
    if (performance) {
         performance.postMessage({data:
            {
                type: "updateWord",
                id: id,
                word: word,
            }
        }, "*")
    }
}

window.addEventListener("message", (event) => {
    // Always validate the origin of the message!
    if (event.origin !== expectedOrigin) {
        console.log("Message received from unexpected origin: ", event.origin, "which does not match expected origin of ", expectedOrigin);
        return;
    }
    
    let data = event.data.data;
    if (data && data.type === "addWordResponse") {
        let words = data.words;
        // console.log("new words", words)
    }   
});


// TODO we don't want this anymore?
class Corpus {
      updateCorpus(n) {
        // get the value of corpus<n> from the html
        let corpusValue = document.getElementById("corpus" + n).value;
        setGlobalGrammars(corpusValue);
        worder.setCorpus(corpusValue);
        sampleView.updateWorder(worder);
      }
}
let corpus = new Corpus();
function submitCallback(n) {
    corpus.updateCorpus(n);
}

function openPerformTab() {
    performance = window.open("../html/wiggle_performance.html", "performance");
    if (performance) {
        performance.onload = function() {
            performance.postMessage({data: "hello from the original tab"}, "*");
        };
    }
}

class Knobs {
    constructor() {
        this.knobs = new Array(8).fill(0);
    }

    set(index, value) {
        this.knobs[index] = value;
        this.draw();
    }

    get(index) {
        return this.knobs[index];
    }

    draw() {
        let baseX = 0;
        let baseY = slidyWindow.loc[3];
        let fullW = 40;
        let fullH = 20;
        noStroke();
        for (let i = 0; i < this.knobs.length; i++) {
            let x = baseX + (i % (this.knobs.length / 2)) * fullW;
            let y = baseY + Math.floor(i / (this.knobs.length / 2)) * fullH
            let w = this.knobs[i] / 127 * fullW;
            let h = fullH;

            fill(0);
            rect(x, y, x + fullW, y + fullH);
            fill(255);
            rect(x, y, x + w, y + h);
        }
    }
}

class SampleView {
    constructor(worder, loc) {
        this.updateWorder(worder);
        this.loc = loc;
        this.textS = 16;
        this.xSpacing = 140;
        this.ySpacing = 15;
        this.notePlayed = -1;
    }

    updateWorder(worder) {
        this.worder = worder;
        this.sample = worder.corpus;
    }

    updateNote(noteData) {
        this.notePlayed = this.worder._preprocessNote(noteData).note;
    }

    draw() {
        fill(0);
        noStroke();
        rect(this.loc[0], this.loc[1], this.loc[2], this.loc[3]);
        let visTextSize = 12;
        textSize(visTextSize);
        let wordIndex = 0;
        for(let j = 0; j < this.loc[3] - this.loc[1]; j += this.ySpacing) {
            for (let i = 0; i < this.loc[2] - this.loc[0] - this.xSpacing; i += this.xSpacing) {
                if (wordIndex >= this.sample.length) {
                    break;
                }

                if (wordIndex == this.notePlayed) {
                    fill(255, 0, 0);
                } else {
                    fill(255);
                }
                text(this.sample[wordIndex], this.loc[0] + i, this.loc[1] + j);
                wordIndex++;
            }
        }
    }
    
//     let currentX = 0;
//     let currentY = 0;

// // for (let wordID of this.wordOrder) {
//     for (let i = 0; i < this.sample.length; i++) {
//         let word = this.words[wordID];
//         textSize(word.size);
//         let wordWidth = textWidth(word.word);

//         if (currentX + wordWidth > windowWidth) {
//             currentX = 0;
//             currentY += this.lineHeight;
//         }
//         if (currentY + word.size > windowHeight) {
//             background(0);
//             currentX = 0;
//             currentY = 0;
//         }

//         word.x = currentX;
//         word.y = currentY;

//         fill(word.backgroundColor[0], word.backgroundColor[1], word.backgroundColor[2]); // set the color to the word's background color
//         rect(word.x, word.y, word.x + word.wordWidth, word.y + word.size); // draw the background
//         fill(word.color[0], word.color[1], word.color[2]); // set the color to the word's color
//         text(word.word, word.x, word.y + word.size); // draw the word

//         currentX += word.width + textWidth(" ");
//         }    
//     }
}


class Multitrack {
    constructor(loc) {
        this.loc = loc;
        this.selectedTrack = 0;
        this.knobOffset = 0
        this.selectedTrackBaseIndex = 0;
        this.numTracks = userSpecifiedNumTracks;
        this.trackHeight = (this.loc[3] - this.loc[1]) / this.numTracks;
        this.tracks = [];

        for (let i = 0; i < this.numTracks; i++) {
            this.initTrack(i);
        }
    }

    changeTrackCount(newTrackCount) {
        let origTrackCount = this.numTracks;
        if (newTrackCount > origTrackCount) {
            for (let i = origTrackCount; i < newTrackCount; i++) {
                this.initTrack(i);
            }
        } else {
            this.tracks = this.tracks.slice(0, newTrackCount);
        }

        this.numTracks = newTrackCount;
        this.trackHeight =  (this.loc[3] - this.loc[1]) / this.numTracks;
    }

    reset() {
        // TODO: reset all tracks
        for (let i = 0; i < this.numTracks; i++) {
            this.tracks[i].text = '';
            this.tracks[i].position = startX;
            this.tracks[i].speed = baseSpeed;
        }
        this.updateSelectedTrack(0, this.knobOffset);
    }

    initTrack(i) {
        let track = new IndexTrack(i, this.trackHeight, this.loc)
        this.tracks.push(track);
    }

    moveWord(track, offset) {
        // manually update the location of a word
        this.tracks[track].position += offset;

        // this.sortTracks();
    }

    sortTracks() {
        let baseline = this.tracks[0].position;
        let modWidth = this.loc[2] - this.loc[0];

        let xs = this.tracks.map(track => [track.i, track.position]);
        // sort the tracks by their position
        console.log("original", xs);
        xs = xs.sort((a, b) => {
            let aLoc = a[1];
            let bLoc = b[1];
            if (aLoc < baseline) {
                aLoc += modWidth;
            }
            if (bLoc < baseline) {
                bLoc += modWidth;
            }
            return aLoc - bLoc;
        });
        console.log("sorted", xs);

        // update the tracks to be in the correct order
        let newTracks = [];
        for (let i = 0; i < xs.length; i++) {
            let track = this.tracks[xs[i][0]];
            track.i = i;
            newTracks.push(track);
        }

        this.tracks = newTracks;

        this.selectedTrack = 0;

        // for (let i = 0; i < newTracks.length; i++) {
        //     newTracks[i].i = i;
        // }
        // this.tracks = newTracks;
        // this.selectedTrack = 0;
    }

    draw() {
        fill(0);
        noStroke();
        rect(this.loc[0], this.loc[1], this.loc[2], this.loc[3]);

        textS = slidyWindow.trackHeight;
        textSize(textS);

        for (let i = 0; i < this.tracks.length; i++) {
            this.tracks[i].draw();
        }
    }

    updateSelectedTrack(baseIndex, knobOffset) {
        this.selectedTrackBaseIndex = baseIndex;
        this.knobOffset = knobOffset;
        this.selectedTrack = this.selectedTrack < 0 ? maxTracksNum : this.selectedTrack;
        this.selectedTrack = (this.selectedTrackBaseIndex + this.knobOffset) % maxTracksNum;

        for (let i = 0; i < this.tracks.length; i++) {
            this.tracks[i].selected = this.selectedTrack == i;
        }
    }
}

class Track {
    constructor(i, trackHeight, multiLoc) {
        this.i = i;
        this.multiLoc = multiLoc;
        this.trackHeight = trackHeight;
        this.trackWidth = this.multiLoc[2] - this.multiLoc[0];
        this.isAdvanced = true;
        this.selected = false;

        this.text = '';
        this.note = 0; // the midi note that triggered this track
        this.position = startX;
        this.speed = baseSpeed;

        // [x1, y1, x2, y2]
        this.bounds = [this.multiLoc[0], this.multiLoc[1] + this.i * this.trackHeight, this.trackWidth, this.multiLoc[1] + this.i * this.trackHeight + this.trackHeight];

        this.mainColor = 255;
        this.secondaryColor = 0;
    }

    setIsAdvanced(newValue) {
        this.isAdvanced = newValue;
        this.mainColor = newValue ? 0 : 255;
        this.secondaryColor = newValue ? 255 : 0;
    }

    async updateNote(note) {
        this.note = note.note;
        this.basicResetNote();

        sampleView.updateNote(note);

        let words = worder.noteToWords(note);
        if (text instanceof Promise) {
            words = await words;
        }
        this.text = words.map(w => w.word).join(' ')

        let lastWord;
        for (let word of words) {
            performWord(word); // send the word to the performance tab
            worder.addWordToContext(word);
            lastWord = word;
        }

        if (lastLlamaWordID) {
            let index = worder.wordOrder.indexOf(lastLlamaWordID);
            const leftIDs = worder.wordOrder.slice(index - bertContextLength, index);
            const rightIDs = worder.wordOrder.slice(index + 1, index + bertContextLength + 1);

            let left = leftIDs.map(id => worder.words[id].word);
            let right = rightIDs.map(id => worder.words[id].word);

            let newword = callBERT(left, right, []);
            newword = await newword;
            newword = worder.formatWord(newword);
            newword.deform = true;

            worder.updateWord(lastLlamaWordID, newword);
            updatePerformanceWord(lastLlamaWordID, newword);
        }

        if (frames - lastLlamaCall > frameRateSetting * llamaCoolDownSec) {
            let promisedWord = worder.noteToWordsByLlama(note) // worder.noteToWordsByLlama(note);
            let aiText = await promisedWord;
            let prevID = lastWord.id;
            for(let aiWord of aiText) {
                aiWord.ai = true;
                aiWord.after = prevID; // tell the performer to put it after the original word
                performWord(aiWord);
                worder.addWordToContext(aiWord);
                prevID = aiWord.id;
                lastLlamaWordID = aiWord.id;
            }
            lastLlamaCall = frames;
        }


        realization.update();
    }

    doBasicResetNote() {
        this.position = startX;
        this.speed = baseSpeed;

        if (this.i == 0) {
            realization.newLine();
        }
    }

    hardResetNote() {
        this.text = '';
        this.position = startX;
        this.speed = baseSpeed;
    }

    basicResetNote() {
        this.doBasicResetNote();
    }

    advancedResetNote() {
        this.doBasicResetNote();
    }

    draw() {
        fill(this.secondaryColor);
        rect(this.bounds[0], this.bounds[1], this.bounds[2], this.bounds[3]);

        let lineText = this.text.toUpperCase();
        // replace ## with -
        lineText = lineText.replace(/##/g, "-");
        if (visualDebug) {
            fill(255, 0, 0)
            rect(this.position, this.i * this.trackHeight, this.position + 4, this.i * this.trackHeight + this.trackHeight);
        }

        if (this.position < -maxTextWidth) {
            if (this.isAdvanced) {
                // reset to the right side of the screen
                this.advancedResetNote();
            } else {
                // reset to the right side of the screen, and clear the text
                this.basicResetNote();
            }
        }
        
        // Draw the selected track indicator
        if (this.selected) {
            let strokeColor = this.mainColor;
            stroke(strokeColor, strokeColor, strokeColor);

            // hatching
            strokeWeight(2);            
            let spacing = 5; // Distance between lines
            // Draw first set of diagonal lines
                for (let x = -this.trackWidth; x < this.trackWidth + this.trackHeight; x += spacing) {
                    line(x, this.bounds[1], x + this.trackHeight, this.bounds[3]);
            }
            // Draw second set of diagonal lines in the opposite direction
            for (let x = this.trackWidth + this.trackHeight; x > -this.trackWidth; x -= spacing) {
                line(x, this.bounds[1], x - this.trackHeight, this.bounds[3]);
            }
            
            noStroke();
            noFill()
        }

        fill(this.selected ? this.secondaryColor : this.mainColor);
        text(lineText, this.position, this.bounds[1]);
        this.position -= this.speed;

        if (mouseX > this.bounds[0] && mouseX < this.bounds[2] && mouseY > this.bounds[1] && mouseY < this.bounds[3]) {
            this.constructor.doDrawTrackIndicator(this.mainColor, this.bounds);
        } else {
            this.constructor.doDrawTrackIndicator(this.mainColor, this.bounds);
        }
        this.constructor.doDrawTrackIndicator(this.mainColor, this.bounds);

        
    }

    static doDrawTrackIndicator(color, bounds) {
        // do nothing
    }
}


class IndexTrack extends Track {
    constructor(i, trackHeight, multiLoc) {
        super(i, trackHeight, multiLoc);
    }

    static doDrawTrackIndicator(color, bounds) { }
}

let trackCycle = [IndexTrack];
function getNextTrackType(trackType) {
    return trackCycle[(trackCycle.indexOf(trackType) + 1) % trackCycle.length];
}

function setup() {
    noStroke();
    userSpecifiedHeight = windowHeight * 0.75;
    maxTextWidth = textWidth("APRETTYLONGWORD");

    var canvas = createCanvas(windowWidth, userSpecifiedHeight);
    canvas.parent('canvas-container'); // Attach the canvas to the container

    // userSpecifiedHeight = document.getElementById('canvas-container').offsetHeight;

    rectMode(CORNERS);
    textAlign(LEFT, TOP);
    background(backgroundColor);

    if (navigator.requestMIDIAccess) {
        navigator.requestMIDIAccess({sysex: false}).then(onMIDISuccess, onMIDIFailure);
        console.log('This browser supports WebMIDI!');
    } else {
        console.warn("WebMIDI is not supported in this browser.");
    }

    color = [random(255), random(255), random(255)];
    // monoSynth = new p5.MonoSynth();

    startX = width;
    start = createVector(0, 0)
    frameRate(frameRateSetting);

    worder = new Worder();
    Object.assign(worder, phraseWorderMixin);
    worder.setCorpus(library["cutup"]);
    Object.assign(worder, bertWorderMixin);
    Object.assign(worder, llamaWorderMixin);
    Object.assign(worder, phraseWorderMixin); // Add the mixin to the specific instance (order matters unf)

    sampleView = new SampleView(worder, [0, 0, width, height / 4]);
    // guitar = new GuitarTracker();e
    slidyWindow = new Multitrack([0, sampleView.loc[3], width, height / 4 + 200]);
    textLocation = [width - 100, slidyWindow.loc[3] + 200];
    maxTracksNum = (slidyWindow.loc[3] - slidyWindow.loc[1]) / slidyWindow.trackHeight;

    knobs = new Knobs();
    knobs.draw();

    openPerformTab();
}

function onMIDISuccess(midi) {
    midiAccess = midi;
    let inputs = midiAccess.inputs.values();
    for (let input of inputs) {
        input.onmidimessage = handleMIDIMessage;
    }
}

function onMIDIFailure() {
    console.error('Could not access MIDI devices.');
}

function setSpeeds(newSpeed) {
    baseSpeed = newSpeed;
    for (let track of slidyWindow.tracks) {
        track.speed = newSpeed;
    }
}

function setSpeed(i, newSpeed) {
    baseSpeed = newSpeed;
    slidyWindow.tracks[i].speed = newSpeed;
}

function handleMIDIMessage(message) {
    curMessage = message;
    const channelNumber = (message.data[0] & 0x0F) + 1; // channelNumber is 1 indexed in Ableton, so we are copying that here
    const eventType = message.data[0] >> 4;

    let newNote = message.data[1] ? message.data[1] : 0;

    // Hacky catch for too much incoming data from guitar
    // console.log(newNote, prevMidiNote);
    // if (prevMidiNote === newNote) {
    //     return;
    // }
    // prevMidiNote = newNote;

    command = message.data[0]; // https://computermusicresource.com/MIDI.Commands.html
    note = newNote;
    velocity = (message.data.length > 2) ? message.data[2] : 0;

    // if the int channelIndex is not in the list of indices 'channels', return
    if (!channels.includes(channelNumber)) {
        return;
    }

    if (command === 248 ) { // sync messages, don't want to display
        return;
    }


    if (channelNumber == 10) { // Update the grammar based on the text in the 4 input boxes
        let index;
        if (command == 137) {
            if (note == 40) {
                index = 0;
            } else if (note == 38) {
                index = 1;
            } else if (note == 46) {
                index = 2;
            } else if (note == 44) {
                index = 3;
            }
            submitCallback(index.toString());
        }
    }

    // info dump (for debugging, etc.)
    fill(0);
    textSize(10);
    fill(0);
    rect(textLocation[0], textLocation[1], textLocation[0] + 100, textLocation[1] + 50);
    fill(255);
    text('Channel: '  + channelNumber, textLocation[0], textLocation[1] + 30);
    text('Command: '  + command,       textLocation[0], textLocation[1]);
    text('Note: '     + note,          textLocation[0], textLocation[1] + 10);
    text('Velocity: ' + velocity,      textLocation[0], textLocation[1] + 20);
    text('Event: '    + eventType,     textLocation[0], textLocation[1] + 40);


    if (eventType === 9) { // Note on message
        fill(color[0], color[1], color[2]);
        updateColor();

        let noteData = {
            note: note,
            channel: channelNumber, 
            command: command,
            velocity: velocity,
            eventType: eventType,
            source: message.source ? message.source : 'midi'
        }

        console.log("Note", noteData)

        slidyWindow.tracks[slidyWindow.selectedTrack].updateNote(noteData);
        slidyWindow.updateSelectedTrack(slidyWindow.selectedTrackBaseIndex + 1, slidyWindow.knobOffset);
    
        // Add a new line
        if (worder.curLineLength() > 5) {
            addLineBreak()
        }
    }
    else if (eventType === 8) { // Note off message
        // offSynth();
    }
    else if (eventType === 11) { // Control change message
        if (note === 10) { // Pan
        }
        else if (note === 11) { // Expression
        }
        else if (note === 64) { // Sustain
        }
        else if (knobRange[0] <= note && note <= knobRange[1]) { // General Purpose Controllers
            let knobIndex = note - knobRange[0];
            knobs.set(knobIndex, velocity); // update the knobs visual
            if (knobIndex === 0) {
                setSpeeds((1 - (velocity / 127)) * maxSpeed);
            }
            else if (knobIndex === 4) {
                let offset = Math.floor(s(0, 127, 0, maxTracksNum, velocity));
                slidyWindow.updateSelectedTrack(slidyWindow.selectedTrackBaseIndex, offset);
            }
            else if (knobIndex === 1) {
                setSpeed(slidyWindow.selectedTrack, (1 - (velocity / 127)) * maxSpeed);
            }
        }
        else if (note === 123) { // All notes off
        }
    } else if (eventType == 14) {
        
    }

}

function updateColor() {
  color[0] += random(0, 2);
  color[0] %= 256;
  color[1] += random(0, 2);
  color[1] %= 256;
  color[2] += random(0, 2);
  color[2] %= 256;
}

function s(start, end, newStart, newEnd, val) { 
  let normed = (val - start) / (end - start);
  return ((normed * (newEnd - newStart) ) + newStart);
}

function keyTyped() {
    let index = qwertyIndex(key);
    // console.log("key", key, "index", index, "keyCode", keyCode);

    if (key === '1') {
        slidyWindow.tracks[slidyWindow.selectedTrack].setIsAdvanced(!slidyWindow.tracks[slidyWindow.selectedTrack].isAdvanced);
    } else if (key === '2' || keyCode === 32) { // Spacebar or '2'

    } else if (false) {
        isPaused = !isPaused;
        setSpeeds(isPaused ? 0 : baseSpeed);
    }

    if (index == -1) {
        return;
    }

    if (virtualMidiKeyboard) {
        handleMIDIMessage({
            data: [
                144,
                index,
                100
            ],
            source: 'keyboard',
        });
        return false; // suppress default
    }
  }

function keyPressed() {
    if (keyCode === ENTER) {
        addLineBreak();
    } else if (keyCode === DOWN_ARROW) {
        slidyWindow.updateSelectedTrack(slidyWindow.selectedTrackBaseIndex + 1, slidyWindow.knobOffset);
    } else if (keyCode === UP_ARROW) {
        slidyWindow.updateSelectedTrack(slidyWindow.selectedTrackBaseIndex - 1, slidyWindow.knobOffset);
    } else if (keyCode === LEFT_ARROW) {
        slidyWindow.moveWord(slidyWindow.selectedTrack, -shiftAmount);
    } else if (keyCode === RIGHT_ARROW) {
        slidyWindow.moveWord(slidyWindow.selectedTrack, shiftAmount);
    } else if (keyCode === 8) { // delete
        slidyWindow.tracks[slidyWindow.selectedTrack].hardResetNote();
        slidyWindow.updateSelectedTrack(slidyWindow.selectedTrackBaseIndex + 1, slidyWindow.knobOffset);
    } 
    else if (keyCode === 32) { // spacebar
        // want to pause?   
    }
}

function addLineBreak() {
    let word = worder.formatWord("\n");
    performWord(word);
    worder.addWordToContext(word);
}


function preload() {
    // pass
}

function reset() {
    background(40);
    slidyWindow.reset();
}


function getDeformPrompt() {
    let topicVerb = "friendship"
    let topicNoun = "nice"
    let deformPrompt = ("This strange verse is about " + topicNoun + ". We need to edit it word by word to make it " + topicVerb +  " Poem:").split()
    return deformPrompt;
}

async function deform() {
    if (!doDeform) {
        return;
    }

    let currentContext = worder.getContextData();
    if (currentContext.length == 0) {
        return;
    }
    
    let dontDeformLastLine = true;
    let deformLimit = -1;
    
    deformLimit = dontDeformLastLine ? deformLimit : currentContext.length;
    if (dontDeformLastLine) {
        for (let i = 0; i < currentContext.length; i++) {
            if (currentContext[i].word == '\n') deformLimit = i;
        }
        if (deformLimit === -1) return;
    } else {
        deformLimit = currentContext.length;
    }
    let index = Math.floor(Math.random() * deformLimit)
    let before = currentContext.slice(0, index);
    let word = currentContext[index];
    let after = currentContext.slice(index + 1, currentContext.length);
    let bertResponse = callBERT(getDeformPrompt().concat(before.map(w => w.word)), after.map(w => w.word), []);
    let newWord = await bertResponse;

    if (word.word === newWord || newWord == null) {
        return;
    }

    word.word = newWord;
    word.ai = false;
    word.deform = true;
    worder.words[word.id] = word;
    updatePerformanceWord(word.id, word);
}

let doDeform = false;
function toggleDeform() {
    doDeform = !doDeform;
    // change the class of the button
    let button = document.getElementById("deformButton");
    button.className = doDeform ? "selected submit_button" : "submit_button";
    deformRate = document.getElementById("deformRate").value * 1000;

    clearInterval(deformInterval);
    deformInterval = setInterval(deform, deformRate);
}
toggleDeform();

let minVelocity = 0;
function updateMinVelocity() {
    minVelocity = document.getElementById("minVelocity").value;
    console.log("min velocity set to ", minVelocity);
}
updateMinVelocity();



// main draw call
function draw() {
    realization.draw();
    sampleView.draw();
    slidyWindow.draw();

    uiScaleStateTracker = uiScaleStateTracker + 0.02;
    // if (uiScaleStateTracker > 1) {
    //     uiScaleStateTracker = 0;
    // }
    // easing
    // linear
    // uiScaleState = uiScaleStateTracker;
    // quadratic
    // uiScaleState = uiScaleStateTracker * uiScaleStateTracker;
    // fancy
    // uiScaleState = 1 - Math.pow(1 - uiScaleStateTracker, 2);
    // fancy 2
    // uiScaleState = Math.sin(uiScaleStateTracker * Math.PI / 2);
    // fancy 3
    uiScaleState = Math.pow(Math.sin(uiScaleStateTracker * Math.PI / 2), 2);

    frames++;
}

// function mousePressed() {
//     if (slidyWindow) {
//         //get the track that was clicked on
//         let trackIndex = Math.floor(mouseY / slidyWindow.trackHeight);
//         let track = slidyWindow.tracks[trackIndex];

//         if (track) {
//             // if the shift button is being held
//             if (keyIsDown(SHIFT)) {
//                 track.setIsAdvanced(!track.isAdvanced);
//             } else {
//                 // change the type of this to be the other type
//                 let nextTrackType = getNextTrackType(track.constructor);
//                 let newTrack =  new nextTrackType(track.i, track.trackHeight);
//                 newTrack.text = track.text;
//                 newTrack.position = track.position;
//                 newTrack.speed = track.speed;
//                 newTrack.setIsAdvanced(track.isAdvanced);
//                 newTrack.selected = track.selected;
//                 slidyWindow.tracks[track.i] = newTrack;
//             }
//         }
//     }
// }