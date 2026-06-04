
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

class PhoneSpeaker {
  constructor() {
    this.audioContext = null;
    this.phonemeFiles = {};
    
    // Initialize phoneme file mapping
    CMU_DICT.forEach((phoneme) => {
      this.phonemeFiles[phoneme] = `assets/eric2/${phoneme}.mp3`;
    });
  }

  async initAudioContext() {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }
  }

  async playSound(path) {
    await this.initAudioContext();
    
    const response = await fetch(path);
    const arrayBuffer = await response.arrayBuffer();
    const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
    
    const source = this.audioContext.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(this.audioContext.destination);
    source.loop = false;
    source.start();
  }

  async say(phoneme) {
    const filePath = this.phonemeFiles[phoneme];
    if (!filePath) return;
    
    await this.playSound(filePath);
  }

  getPronunciation(word) { // -> Optional[List[str]]
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
}
