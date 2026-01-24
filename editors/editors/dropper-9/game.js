let defaultCorpora = [
  // 'corpora/short/here.txt',
  // 'corpora/short/sacred_emily.txt',
  // 'corpora/short/love_breton.txt', 
  // 'corpora/short/less_time.txt', 
  // 'corpora/books/nadja.txt',
  'corpora/short/eis.txt',
  'corpora/short/eis_wiki.txt',

  // uninteresting
  // 'corpora/short/art.txt', 
  // 'corpora/short/harry_potter_ch1.txt', 
];
// let [file1, file2] = defaultCorpora.sort(() => 0.5 - Math.random()).slice(0, 2);
// let defaultCorpus = file1; // Use first file as default

function getNewCorpus() {
  let order = defaultCorpora.sort(() => 0.5 - Math.random());
  return order[0];
}

async function getNewCorpusText(filename) {
  const assetsFolder = '/editors/assets';
  const filePath = `${assetsFolder}/${filename}`;
  const response = await fetch(filePath);
  return response.text();
}

let defaultCorpus = getNewCorpus();

import { Dropper } from './dropper.js';

export class Game {
  constructor(options = {}) {
    this.performance = null;
    this.tickInterval = 2000; // ms between ticks
    this.save = options.save || null;
    this.documentId = options.documentId || null;
  }

  async initialize(options = {}) {
    if (options.save) {
      this.save = options.save;
    }
    let initialText = null;
    if (options.documentId) {
      this.documentId = options.documentId;
      let doc = this.save.getDocument(this.documentId);
      let content = doc?.getField('content');
      initialText = content ? JSON.parse(content).text : '';
    }

    let dropper = new Dropper();
    await dropper.initialize({ corpusFile: defaultCorpus });
    console.log('test', dropper);
    
  }

  saveState() {
    if (!this.performance) return null;
    return this.performance.getState();
  }
}