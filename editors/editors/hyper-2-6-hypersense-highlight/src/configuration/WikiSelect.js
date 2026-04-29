import { ReaderSelect } from './ReaderSelect.js';
import { WikiCorpus } from '../corpus/WikiCorpus.js';
import { TextReader } from '../readers/TextReader.js';
import { createModal } from './uiUtils.js';

export class WikiSelect extends ReaderSelect {

  /**
   * Fetches random Wikipedia article URLs
   * @param {number} count - Number of random articles to fetch
   * @returns {Promise<Array<{title: string, url: string}>>}
   */
  async fetchRandomArticles(count = 3) {
    const articles = [];
    
    try {
      // Fetch multiple random articles
      for (let i = 0; i < count; i++) {
        const response = await fetch('https://en.wikipedia.org/api/rest_v1/page/random/summary');
        const data = await response.json();
        
        articles.push({
          title: data.title,
          url: data.content_urls.desktop.page,
          description: data.extract || 'No description available'
        });
      }
    } catch (error) {
      console.error('Error fetching random Wikipedia articles:', error);
    }
    
    return articles;
  }

  /**
   * Returns the HTML for the Wikipedia selection section
   * @returns {string} HTML string for the section
   */
  getSectionHTML() {
    return `
      <div style="margin-bottom: 15px;">
        <label style="display: block; margin-bottom: 5px; font-weight: bold; font-size: 0.9em;">Random articles:</label>
        <div id="random-articles" style="text-align: center; padding: 10px; color: #888;">
          <div style="font-size: 0.9em; margin-bottom: 5px;">Loading...</div>
          <div style="font-size: 1.5em;">⏳</div>
        </div>
      </div>
      <div style="border-top: 1px solid #eee; padding-top: 10px;">
        <label style="display: block; margin-bottom: 5px; font-weight: bold; font-size: 0.9em;">Or custom URL:</label>
        <input type="text" id="wikipedia-url" placeholder="Wikipedia URL" style="width: 100%; padding: 6px; font-size: 0.9em;">
        <button id="select-wiki" class="control-btn" style="width: 100%; margin-top: 8px;">Load Wikipedia URL</button>
      </div>
    `;
  }

  /**
   * Sets up event listeners for the Wikipedia section
   * @param {Function} onSelect - Callback function when a selection is made
   * @param {Function} removeModal - Function to remove the modal
   */
  setupSection(onSelect, removeModal) {
    // Set up Wikipedia URL button
    document.getElementById('select-wiki').addEventListener('click', async () => {
      const url = document.getElementById('wikipedia-url').value;
      if (!url || url.trim() === '') {
        alert('Please enter a Wikipedia URL');
        return;
      }
      removeModal();
      await this.loadWikipediaArticle(url, onSelect);
    });

    // Fetch and display random articles
    this.fetchRandomArticles(3).then(randomArticles => {
      const randomArticlesContainer = document.getElementById('random-articles');
      if (randomArticlesContainer) {
        const randomArticlesHtml = randomArticles.map((article, index) => `
          <div class="wiki-article-option" data-url="${article.url}" style="cursor: pointer; padding: 8px; margin: 4px 0; border: 1px solid #ddd; border-radius: 4px; background: white; font-size: 0.85em;">
            <strong>${article.title}</strong>
            <p style="font-size: 0.9em; margin: 3px 0 0 0; color: #666;">${article.description.substring(0, 80)}...</p>
          </div>
        `).join('');
        
        randomArticlesContainer.innerHTML = randomArticlesHtml;
        
        const articleOptions = document.querySelectorAll('.wiki-article-option');
        articleOptions.forEach(option => {
          option.addEventListener('mouseenter', () => option.style.backgroundColor = '#f0f0f0');
          option.addEventListener('mouseleave', () => option.style.backgroundColor = 'white');
          option.addEventListener('click', async () => {
            const url = option.getAttribute('data-url');
            removeModal();
            await this.loadWikipediaArticle(url, onSelect);
          });
        });
      }
    });
  }

  /**
   * Loads a Wikipedia article and creates a reader
   * @param {string} url - Wikipedia URL
   * @param {Function} onSelect - Callback to call with the reader
   */
  async loadWikipediaArticle(url, onSelect) {
    const loadingModal = createModal(`
      <div class="modal-content">
        <div class="modal-header">
          <h3>Loading Article</h3>
        </div>
        <div class="modal-body" style="text-align: center; padding: 40px;">
          <div style="font-size: 1.2em; margin-bottom: 15px;">Fetching article content...</div>
          <div style="font-size: 3em;">⏳</div>
        </div>
      </div>
    `);
    
    const corpus = new WikiCorpus(url);
    await corpus.fromWikipedia(url);
    const reader = new TextReader(corpus);
    
    loadingModal.remove();
    
    if (onSelect) {
      onSelect(reader);
    } else {
      this.onReaderSelected(reader);
    }
  }

  /**
   * Shows the reader select screen.
   * Brings up an HTML screen that allows user to select a reader. 
   * When implemented, selecting a reader should trigger
   * onReaderSelected(). which will return a Reader and emit an event.
   * @returns {void}
   * @throws {Error} If not implemented by subclass.
   */
  async showReaderSelect() {
    console.log("WikiReaderSelect.showReaderSelect()");
    
    // Show modal immediately with loading state for random articles
    const modal = createModal(`
      <div class="modal-content">
        <div class="modal-header">
          <h3>Where should we read from?</h3>
        </div>
        <div class="modal-body">
          <div style="margin-bottom: 15px;">
            <label style="display: block; margin-bottom: 5px; font-weight: bold;">Choose a random wikipedia article:</label>
            <div id="random-articles" style="text-align: center; padding: 20px; color: #888;">
              <div style="font-size: 1em; margin-bottom: 10px;">Loading random articles...</div>
              <div style="font-size: 2em;">⏳</div>
            </div>
          </div>
          <div style="border-top: 1px solid #ddd; padding-top: 15px;">
            <label style="display: block; margin-bottom: 5px; font-weight: bold;">Or enter a custom URL:</label>
            <input type="text" id="wikipedia-url" placeholder="Enter a Wikipedia URL" style="width: 100%; padding: 8px;">
          </div>
        </div>
        <div class="modal-footer">
          <button id="cancel" class="control-btn">Cancel</button>
          <button id="select" class="control-btn">Select</button>
        </div>
      </div>
    `);
    
    // Set up event listeners for custom URL input
    document.getElementById('select').addEventListener('click', async () => {
      // Read the URL value BEFORE removing the modal
      const url = document.getElementById('wikipedia-url').value;
      
      if (!url || url.trim() === '') {
        alert('Please enter a Wikipedia URL');
        return;
      }
      
      modal.remove();
      
      // Show loading screen while fetching article content
      const loadingModal = createModal(`
        <div class="modal-content">
          <div class="modal-header">
            <h3>Loading Article</h3>
          </div>
          <div class="modal-body" style="text-align: center; padding: 40px;">
            <div style="font-size: 1.2em; margin-bottom: 15px;">Fetching article content...</div>
            <div style="font-size: 3em;">⏳</div>
          </div>
        </div>
      `);
      
      await this.onReaderSelected(url);
      loadingModal.remove();
    });
    
    document.getElementById('cancel').addEventListener('click', () => {
      modal.remove();
    });
    
    // Fetch random articles in the background
    this.fetchRandomArticles(3).then(randomArticles => {
      // Update the random articles section if modal still exists
      const randomArticlesContainer = document.getElementById('random-articles');
      if (randomArticlesContainer) {
        // Create options HTML for random articles
        const randomArticlesHtml = randomArticles.map((article, index) => `
          <div class="wiki-article-option" data-url="${article.url}" style="cursor: pointer; padding: 10px; margin: 5px 0; border: 1px solid #ddd; border-radius: 4px; background: white;">
            <strong>${article.title}</strong>
            <p style="font-size: 0.85em; margin: 5px 0 0 0; color: #666;">${article.description.substring(0, 100)}...</p>
          </div>
        `).join('');
        
        randomArticlesContainer.innerHTML = randomArticlesHtml;
        
        // Add hover effect and click handlers to article options
        const articleOptions = document.querySelectorAll('.wiki-article-option');
        articleOptions.forEach(option => {
          option.addEventListener('mouseenter', () => {
            option.style.backgroundColor = '#f0f0f0';
          });
          option.addEventListener('mouseleave', () => {
            option.style.backgroundColor = 'white';
          });
          option.addEventListener('click', async () => {
            // Select this article
            const url = option.getAttribute('data-url');
            document.getElementById('wikipedia-url').value = url;
            modal.remove();
            
            // Show loading screen while fetching article content
            const loadingModal = createModal(`
              <div class="modal-content">
                <div class="modal-header">
                  <h3>Loading Article</h3>
                </div>
                <div class="modal-body" style="text-align: center; padding: 40px;">
                  <div style="font-size: 1.2em; margin-bottom: 15px;">Fetching article content...</div>
                  <div style="font-size: 3em;">⏳</div>
                </div>
              </div>
            `);
            
            await this.onReaderSelected(url);
            loadingModal.remove();
          });
        });
      }
    });
    
    return modal;
  }
  
  /**
   * Creates a reader from the selected Wikipedia URL
   * @param {string} [providedUrl] - Optional URL provided externally
   * @returns {Promise<Reader>} The reader that was selected
   */
  async onReaderSelected(providedUrl) {
    const url = providedUrl || document.getElementById('wikipedia-url').value;
    const corpus = new WikiCorpus(url);
    await corpus.fromWikipedia(url);
    const reader = new TextReader(corpus);
    super.onReaderSelected(reader);
    return reader;
  }

  
}
