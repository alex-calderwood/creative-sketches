let base_url = 'http://127.0.0.1:5000';

let library = {
    "cutup":  "ALL WRITING IS IN FACT CUT UPS OF GAMES AND ECONOMIC BEHAVIOR OVERHEARD? WHAT ELSE? ASSUME THAT THE WORST HAS HAPPENED EXPLICIT AND SUBJECT TO STRATEGY IS AT SOME POINT CLASSICAL PROSE. CUTTING AND REARRANGING FACTOR YOUR OPPONENT WILL GAIN INTRODUCES A NEW DIMENSION YOUR STRATEGY. HOW MANY DISCOVERIES SOUND TO KINESTHETIC? WE CAN NOW PRODUCE ACCIDENT TO HIS COLOR OF VOWELS. AND NEW DIMENSION TO FILMS CUT THE SENSES. THE PLACE OF SAND. GAMBLING SCENES ALL TIMES COLORS TASTING SOUNDS SMELL STREETS OF THE WORLD. WHEN YOU CAN HAVE THE BET ALL: \"POETRY IS FOR EVERYONE\" DOCTOR NEUMAN IN A COLLAGE OF WORDS READ HEARD INTRODUCED THE CUT UP SCISSORS RENDERS THE PROCESS GAME AND MILITARY STRATEGY, VARIATION CLEAR AND ACT ACCORDINGLY. IF YOU POSED ENTIRELY OF REARRANGED CUT DETERMINED BY RANDOM A PAGE OF WRITTEN WORDS NO ADVANTAGE FROM KNOWING INTO WRITER PREDICT THE MOVE. THE CUT VARIATION IMAGES SHIFT SENSE ADVANTAGE IN PROCESSING TO SOUND SIGHT TO SOUND. HAVE BEEN MADE BY ACCIDENT IS WHERE RIMBAUD WAS GOING WITH ORDER THE CUT UPS COULD \"SYSTEMATIC DERANGEMENT\" OF THE GAMBLING SCENE IN WITH A TEA HALLUCINATION: SEEING AND PLACES. CUT BACK. CUT FORMS. REARRANGE THE WORD AND IMAGE TO OTHER FIELDS THAN WRITING.",
    "pataphysics": "pataphysics is the science of the realm beyond metaphysics… It will study the laws which govern exceptions and will explain the universe supplementary to this one; or, less ambitiously, it will describe a universe which one can see — must see perhaps — instead of the traditional one… Definition: pataphysics is the science of imaginary solutions, which symbolically attributes the properties of objects, described by their virtuality, to their lineaments (Jarry 1963: 131).",
    // https://dbanach.com/enneads/enneads-study2.htm
    "deconstruction": "Certainly, Derrida’s style is not traditional. In the same speech from 1980 at the time of him being awarded a doctorate, Derrida tells us that, in the Seventies, he devoted himself to developing a style of writing. The most clearest example is his 1974 Glas (“Death Knell” would be an approximate English translation; the current English translation simply uses the word “glas”); here Derrida writes in two columns, with the left devoted to a reading of Hegel and the right devoted to a reading of the French novelist-playwright Jean Genet. Another example would be his 1980 Postcard from Socrates to Freud and Beyond; the opening two hundred pages of this book consist of love letters addressed to no one in particular. It seems that sometime around this time (1980), Derrida reverted back to the more linear and somewhat argumentative style, the very style that defined his texts from the Sixties. He never however renounced a kind of evocation, a calling forth that truly defines deconstruction. Derrida takes the idea of a call from Heidegger. Starting in 1968 with “The Ends of Man,” Derrida devoted a number of texts to Heidegger’s thought. But, it is really with the 1978 publication of The Truth in Painting, and then throughout the 1980s, that Derrida intensified his reading of Heidegger. In particular, he wrote a series of essays on the question of sex or race in Heidegger (“Geschlecht I–IV”). While frequently critical, these essays often provide new insights into Heidegger’s thought. The culminating essay in Derrida’s series on Heidegger is his 1992 Aporias.",
    "genres": "comedy tragedy history romance tragicomedy fantasy musical melodrama",
    "enneads": "To live at ease is There and to these divine beings verity is mother and nurse existence and sustenance all that is not of process but of authentic being they see and themselves in all for all is transparent nothing dark nothing resistant every being is lucid to every other in breadth and depth light runs through light. And each of them contains all within itself, and at the same time sees all in every other, so that everywhere there is all, and all is all and each all, and infinite the glory. Each of them is great; the small is great; the sun, There, is all the stars; and every star, again, is all the stars and sun. While some one manner of being is dominant in each, all are mirrored in every other.  Movement There is pure [as self-caused] for the moving principle is not a separate thing to complicate it as it speeds.  So, too, Repose is not troubled, for there is no admixture of the unstable; and the Beauty is all beauty since it is not merely resident [as an attribute or addition] in some beautiful object. Each There walks upon no alien soil; its place is its essential self; and, as each moves, so to speak, towards what is Above, it is attended by the very ground from which it starts: there is no distinguishing between the Being and the Place; all is Intellect, the Principle and",
    "funny": "This trick has to do with the words you choose. Some words are inherently funnier than others according to humor experts (there’s always an expert). Words that contain the consonants p, b, d, g, t or k (known as plosives for anyone who cares) are funnier. Some examples of funnier words: brouhaha, pandemonium, or hullabaloo instead of chaos scamper, bustle, or skedaddle instead of hurry hoodwink, dupe, or bamboozle instead of mislead Make friends with your Thesaurus to find funnier sounding synonyms. Another way to add humor through word choice is to use specific words. When writing, it’s easy to opt for weak words. And that’s okay when you’re in draft mode. But when you edit your writing, try to replace those unimaginative nouns with more specific ones. For example if you’re writing about the last experience at your auto repair shop. Describe your car. What type of repair did it need? Discovering your 2003 Ford Focus had loose lug nuts seems funnier than taking your car in for a rattle. (Almost true experience. I don’t drive a Ford Focus, but my car did suffer loose lug nuts.)",
    "wake": "riverrun, past Eve and Adam’s, from swerve of shore to bend of bay, brings us by a commodius vicus of recirculation back to Howth Castle and Environs. Sir Tristram, violer d’amores, fr’over the short sea, had passencore rearrived from North Armorica on this side the scraggy isthmus of Europe Minor to wielderfight his penisolate war: nor had topsawyer’s rocks by the stream Oconee exaggerated themselse to Laurens County’s gorgios while they went doublin their mumper all the time: nor avoice from afire bellowsed mishe mishe to tauftauf thuartpeatrick not yet, though venissoon after, had a kidscad buttended a bland old isaac: not yet, though all’s fair in vanessy, were sosie sesthers wroth with twone nathandjoe. Rot a peck of pa’s malt had Jhem or Shen br",
}

// const qwerty = "qwertyuiopasdfghjklzxcvbnm"      // first version
const qwerty = "qwertyuiop[]asdfghjkl;'zxcvbnm,./"  // second version
function qwertyIndex(c) {
    return qwerty.indexOf(c);
}

// populate the html with the corpus values by selecting the corpus textareas by their ids (corpus1, corpus2, corpus3)
// and setting their values to the keys of the library
for (let i = 1; i <= 3; i++) {
    let corpusTextArea = document.getElementById("corpus" + i);
    if (i == 1) {
        corpusTextArea.value = Object.values(library)[0].toUpperCase();
    }
    else {
        let randomIndex = Math.floor(Math.random() * Object.keys(library).length) + 1;
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
let userSpecifiedHeight = 250;
let userSpecifiedNumTracks = 20;

const baseSpeed = 7;
const maxSpeed = 20; // pixels / frame
const shiftAmount = 35; // pixels
const visualDebug = false;
let maxTextWidth = 40; // pixels

let backgroundColor = (0, 0, 110);

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
let range = [0, 120];

let slidyWindow;
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


class Corpus {
      updateCorpus(n) {
        // get the value of corpus<n> from the html
        let corpusValue = document.getElementById("corpus" + n).value;
        setGlobalGrammars(corpusValue);
      }
}
let corpus = new Corpus();
function submitCallback(n) {
    corpus.updateCorpus(n);
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

class Multitrack {
    constructor(loc) {
        this.loc = loc;
        this.selectedTrack = 0;
        this.knobOffset = 0
        this.selectedTrackBaseIndex = 0;
        this.numTracks = userSpecifiedNumTracks;
        this.trackHeight = this.loc[3] / this.numTracks;
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
        this.trackHeight = this.loc[3] / this.numTracks;
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
        let track = new IndexTrack(this.tracks.length, this.trackHeight)
        this.tracks.push(track);
    }

    moveWord(track, offset) {
        // manually update the location of a word
        this.tracks[track].position += offset;

        // this.sortTracks();
    }

    sortTracks() {
        let baseline = this.tracks[0].position;
        let modWidth = this.loc[2]

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

        // draw the tracks
        // console.log("drawing", this.tracks.length, "tracks")
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
    constructor(i, height) {
        this.i = i;
        this.trackHeight = height;
        this.trackWidth = width;
        this.isAdvanced = true;
        this.selected = false;

        this.text = '';
        this.note = 0; // the midi note that triggered this track
        this.position = startX;
        this.speed = baseSpeed;

        // [x1, y1, x2, y2]
        this.bounds = [0, this.i * this.trackHeight, this.trackWidth, this.i * this.trackHeight + this.trackHeight];

        this.mainColor = 255;
        this.secondaryColor = 0;
    }

    setIsAdvanced(newValue) {
        this.isAdvanced = newValue;
        this.mainColor = newValue ? 0 : 255;
        this.secondaryColor = newValue ? 255 : 0;
    }

    updateNote(note) {
        this.note = note;

        if (this.text === '') {
            this.basicResetNote();
        }

        this.text    = grammar[note % grammar.length];
        realization.update();

        // this.setIsAdvanced(true);
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
                realization.update();
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
            
            // strokeWeight(2);
            // noFill();
            // rect(thi s.bounds[0], this.bounds[1], this.bounds[2], this.bounds[3]);
            
            noStroke();
            noFill()
        }

        fill(this.selected ? this.secondaryColor : this.mainColor);
        text(lineText, this.position, this.i * this.trackHeight);
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
    constructor(i, height) {
        super(i, height);
    }

    static doDrawTrackIndicator(color, bounds) { }
}

class POSTrack extends Track {
    constructor(i, height) {
        super(i, height);
        this.pos = "#Noun";
    }

    updateNote(note) {
        this.note = note;
        if (this.text === '') {
            this.basicResetNote();
        }

        if (this.pos === "#Noun") {
            this.text = nouns[note % nouns.length];
        } else if (this.pos === "#Adjective") {
            this.text = adjectives[note % adjectives.length];
        }
        else if (this.pos === "#Verb"){
            this.text = verbs[note % verbs.length];
        } else {
            console.log("Error: unknown part of speech", this.pos);
        }

        realization.update();
        // this.setIsAdvanced(true);
    }

    basicResetNote() {
        super.advancedResetNote();          // reloop 
                                            // don't update the note
    }

    advancedResetNote() {
        super.advancedResetNote();          // reloop 
        this.updateNote(this.note + 1);     // update the note
    }

    draw() {
        super.draw();
    }

    static doDrawTrackIndicator(color, bounds, pos="#Noun") {
        fill(color);
        let h = (bounds[3] - bounds[1]);

        // rect(
        //     bounds[0] + h/4, 
        //     bounds[1] + h/4 * uiScaleState, 
        //     bounds[0] + h * 3/4,            
        //     bounds[1] + h * (1 - (1/4 * uiScaleState)),
        // );
        text(
            pos[1], 
            bounds[0] + h/4, 
            bounds[1] + h/4 * uiScaleState
        );
    }
}

class NounTrack extends POSTrack {
    static pos = "#Noun";
    constructor(i, height) {
        super(i, height);
        this.pos = NounTrack.pos;
    }

    static doDrawTrackIndicator(color, bounds) {
        POSTrack.doDrawTrackIndicator(color, bounds, NounTrack.pos);
    }
}

class AdjectiveTrack extends POSTrack {
    static pos = "#Adjective";
    constructor(i, height) {
        super(i, height);
        this.pos = AdjectiveTrack.pos;
    }

    static doDrawTrackIndicator(color, bounds) {
        POSTrack.doDrawTrackIndicator(color, bounds, AdjectiveTrack.pos);
    }
}

class VerbTrack extends POSTrack {
    static pos = "#Verb";
    constructor(i, height) {
        super(i, height);
        this.pos = VerbTrack.pos;
    }

    static doDrawTrackIndicator(color, bounds) {
        POSTrack.doDrawTrackIndicator(color, bounds, VerbTrack.pos);
    }
}

class CreativeTrack extends Track {
    constructor(i, height) {
        super(i, height);
        this.history = [];
    }

    draw() {
        super.draw();           
    }

    hardResetNote() {
        super.hardResetNote();
        this.history = [];
    }

    basicResetNote() {
        super.advancedResetNote();   // reloop 
                                     // don't update the note
    }

    advancedResetNote() {
        super.advancedResetNote();   // reloop 
        this.updateNote(0);          // update the note
    }

    updateNote(note) {
        this.note = note;

        if (this.text === '') {
            this.basicResetNote();
        }

        // more elegant way to do this:
        let leftwords = slidyWindow.tracks.slice(0, this.i).map(track => track.text);
        let rightwords = slidyWindow.tracks.slice(this.i + 1, slidyWindow.tracks.length).map(track => track.text);

        getCreative(leftwords, rightwords, this.history).then(word => {
            this.text = word
            realization.update();
            this.history.push(word);
        })
    }

    static doDrawTrackIndicator(color, bounds) {
        fill(color);
        let h = (bounds[3] - bounds[1]);

        rect(
            bounds[0] + h/4 * uiScaleState, 
            bounds[1] + h/4, // * uiScaleState, 
            bounds[0] + h * (1 - (1/4 * uiScaleState)),            
            bounds[1] + h * 3/4, // (1 - (1/4 * uiScaleState)),
        );
    }
}

let trackCycle = [IndexTrack, AdjectiveTrack, NounTrack, VerbTrack, CreativeTrack];
function getNextTrackType(trackType) {
    return trackCycle[(trackCycle.indexOf(trackType) + 1) % trackCycle.length];
}

function setup() {
    noStroke();
    userSpecifiedHeight = windowHeight * 0.5;
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
    frameRate(26);

    slidyWindow = new Multitrack([0, 0, width, height - 100]);
    textLocation = [width - 100, slidyWindow.loc[3] + 200];
    maxTracksNum = slidyWindow.loc[3] / slidyWindow.trackHeight;

    knobs = new Knobs();
    knobs.draw();

    // change the .submit_button class size to be the same as the track height
    // let submitButtons = document.getElementsByClassName('submit_button');
    // for (let i = 0; i < submitButtons.length; i++) {
    //     submitButtons[i].style.height = 2 * slidyWindow.trackHeight + "px";
    // }
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

    command = message.data[0]; // https://computermusicresource.com/MIDI.Commands.html
    note = message.data[1] ? message.data[1] : 0;
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

    console.log("Channel", channelNumber, "Command", command, "Note", note, "Velocity", velocity, "Event", eventType)

    if (eventType === 9) { // Note on message
        let x = s(range[0], range[1], 0, width, note);
        let y = s(0, 127, 0, height, velocity);
        y = height - y;
        fill(color[0], color[1], color[2]);
        updateColor();

        // playSynth();

        slidyWindow.tracks[slidyWindow.selectedTrack].updateNote(note);
        slidyWindow.updateSelectedTrack(slidyWindow.selectedTrackBaseIndex + 1, slidyWindow.knobOffset);

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
        changeTrackType(slidyWindow.selectedTrack);
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
            ]
        });
        return false; // suppress default
    }
  }

function keyPressed() {
    if (keyCode === ENTER) {
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

// function playSynth() {
//   monoSynth.triggerAttack(note, velocity);
// }

// function offSynth() {
//     monoSynth.triggerRelease();
// }


function preload() {
    // pass
}

function reset() {
    background(40);
    slidyWindow.reset();
}

function draw() {
    // main draw call
    realization.draw();
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
}

function mousePressed() {
    if (slidyWindow) {
        //get the track that was clicked on
        let trackIndex = Math.floor(mouseY / slidyWindow.trackHeight);
        let track = slidyWindow.tracks[trackIndex];

        if (track) {
            // if the shift button is being held
            if (keyIsDown(SHIFT)) {
                track.setIsAdvanced(!track.isAdvanced);
            } else {
                // change the type of this to be the other type
                let nextTrackType = getNextTrackType(track.constructor);
                let newTrack =  new nextTrackType(track.i, track.trackHeight);
                newTrack.text = track.text;
                newTrack.position = track.position;
                newTrack.speed = track.speed;
                newTrack.setIsAdvanced(track.isAdvanced);
                newTrack.selected = track.selected;
                slidyWindow.tracks[track.i] = newTrack;
            }
        }
    }
}

function changeTrackType(trackIndex) {
    let track = slidyWindow.tracks[trackIndex];
    let nextTrackType = getNextTrackType(track.constructor);
    let newTrack =  new nextTrackType(track.i, track.trackHeight);
    newTrack.text = track.text;
    newTrack.position = track.position;
    newTrack.speed = track.speed;
    newTrack.setIsAdvanced(track.isAdvanced);
    newTrack.selected = track.selected;
    slidyWindow.tracks[track.i] = newTrack;
}