import { TextCorpus } from './TextCorpus.js';

export class WikiCorpus extends TextCorpus {
  constructor(url) {
    super(url);
  }

  /**
   * Creates a proxy URL to bypass CORS restrictions
   * @param {string} url - The original Wikipedia URL
   * @returns {string} The proxied URL
   */
  createProxyUrl(url) {
    // Use a CORS proxy service
    // Options:
    // 1. cors-anywhere: https://cors-anywhere.herokuapp.com/
    // 2. allorigins: https://api.allorigins.win/raw?url=
    // 3. corsproxy.io: https://corsproxy.io/?
    return `https://corsproxy.io/?${encodeURIComponent(url)}`;
  }

  /**
   * Extract text content from Wikipedia HTML
   * @param {string} html - The HTML content
   * @returns {string} The extracted text
   */
  extractTextFromWikipedia(html) {
    // Create a temporary DOM element to parse the HTML
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    
    // Get the main content
    const content = doc.querySelector('#content');
    
    // If we found the content element, extract the text
    if (content) {
      // Remove unwanted elements
      const elementsToRemove = content.querySelectorAll(
        'script, style, .mw-jump-link, .mw-editsection, .navbox, .reference, #toc'
      );
      elementsToRemove.forEach(el => el.remove());
      
      // Get the paragraphs
      const paragraphs = content.querySelectorAll('p');
      
      // Join the paragraph texts
      return Array.from(paragraphs)
        .map(p => p.textContent.trim())
        .filter(text => text.length > 0)
        .join('\n\n');
    }
    
    // Fallback to the entire HTML if we couldn't extract the content
    return html;
  }

  async fromWikipedia(url) {
    try {
      const proxyUrl = this.createProxyUrl(url);
      console.log("WikiCorpus: Fetching from proxy URL:", proxyUrl);
      
      const response = await fetch(proxyUrl);
      const html = await response.text();
      
      // Extract the text content from the HTML
      const text = this.extractTextFromWikipedia(html);
      
      console.log("WikiCorpus: Extracted text:", text);
      this.setText(text);
    } catch (error) {
      console.error("WikiCorpus: Error fetching Wikipedia content:", error);
      this.setText("Error loading Wikipedia content. Please try again.");
    }
  }
}