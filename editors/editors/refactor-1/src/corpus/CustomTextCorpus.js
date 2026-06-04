import { TextCorpus } from './TextCorpus.js';

/**
 * CustomTextCorpus extends TextCorpus to allow users to provide custom text
 * or select from a collection of example texts.
 */
export class CustomTextCorpus extends TextCorpus {
  static EXAMPLE_TEXTS = [
    {
      title: 'A Tale of Two Cities',
      filename: 'corpora/books/tale_of_two_cities_small.txt',
    },
    {
      title: 'Finnegans Wake - This the Way to the Museyroom',
      filename: 'corpora/short/chapters/this_the_way_to_the_museyroom_finnegans_wake.txt',
    },
    // Commented out examples that can be enabled
    // {
    //   title: 'Sacred Emily',
    //   filename: 'corpora/short/sacred_emily.txt',
    // },
    // {
    //   title: 'Love - André Breton',
    //   filename: 'corpora/short/love_breton.txt',
    // },
    // {
    //   title: 'Less Time',
    //   filename: 'corpora/short/less_time.txt',
    // },
    // {
    //   title: 'EIS',
    //   filename: 'corpora/short/eis.txt',
    // },
    // {
    //   title: 'A Tale of Two Cities (Full)',
    //   filename: 'corpora/books/tale_of_two_cities.txt',
    // },
    // {
    //   title: 'EIS Wiki',
    //   filename: 'corpora/short/eis_wiki.txt',
    // },
    // {
    //   title: 'Here',
    //   filename: 'corpora/short/here.txt',
    // },
    // {
    //   title: 'Art',
    //   filename: 'corpora/short/art.txt',
    // },
    // {
    //   title: 'Nadja',
    //   filename: 'corpora/books/nadja.txt',
    // },
    // {
    //   title: 'Harry Potter - Chapter 1',
    //   filename: 'corpora/short/harry_potter_ch1.txt',
    // },
  ];

  constructor(source = 'custom') {
    super(source);
  }

  /**
   * Get a random example text from the collection
   */
  static getRandomExample() {
    const examples = CustomTextCorpus.EXAMPLE_TEXTS;
    const randomIndex = Math.floor(Math.random() * examples.length);
    return examples[randomIndex];
  }

  /**
   * Load a random example text into the corpus
   */
  async loadRandomExample() {
    const example = CustomTextCorpus.getRandomExample();
    await this.setTextFromFile(example.filename);
    this.source = example.title;
    return example;
  }

  /**
   * Load a specific example by index
   */
  async loadExampleByIndex(index) {
    const examples = CustomTextCorpus.EXAMPLE_TEXTS;
    if (index < 0 || index >= examples.length) {
      throw new Error(`Invalid example index: ${index}`);
    }
    const example = examples[index];
    await this.setTextFromFile(example.filename);
    this.source = example.title;
    return example;
  }

  /**
   * Load a specific example by title
   */
  async loadExampleByTitle(title) {
    const example = CustomTextCorpus.EXAMPLE_TEXTS.find(ex => ex.title === title);
    if (!example) {
      throw new Error(`Example not found: ${title}`);
    }
    await this.setTextFromFile(example.filename);
    this.source = example.title;
    return example;
  }

  /**
   * Set custom user-provided text
   */
  setCustomText(text, title = 'Custom Text') {
    this.setText(text);
    this.source = title;
  }

  /**
   * Get list of all available example texts
   */
  static getExampleList() {
    return CustomTextCorpus.EXAMPLE_TEXTS.map((example, index) => ({
      index,
      title: example.title,
      filename: example.filename,
    }));
  }
}

