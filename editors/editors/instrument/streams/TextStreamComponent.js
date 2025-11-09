class TextStreamComponent {
  constructor(game) {
    this.game = game;
    this.setupListeners();
  }
  
  /**
   * Set up event listeners for this component
   */
  setupListeners() {
    // Listen for token change events
    eventBus.on('token-change', (data) => {
      // Only handle events from our stream
      if (data.stream.id === this.streamId) {
        this.onChange(data.index, data);
      }
    });
    
    // Listen for stream shift events
    eventBus.on('stream-push', (data) => {
      // Only handle events from our stream
      if (data.stream.id === this.streamId) {
        this.onPush(data);
      }
    });

    // Listen for stream pop events
    eventBus.on('stream-pop', (data) => {
      // Only handle events from our stream
      if (data.stream.id === this.streamId) {
        this.onPop(data);
      }
    });
  }
  
  /**
   * Render all tokens
   */
  render() {
    throw new Error("render() not implemented");
  }
  
  /**
   * Handle token change events
   */
  onChange(index, event) {
    throw new Error("onChange() not implemented");
  }
  
  /**
   * Handle new token
   */
  onPush(event) {
    throw new Error("onPush() not implemented");
  }

  /**
   * Handle stream pop events
   */
  onPop(event) {
    throw new Error("onPop() not implemented");
  }

  /**
   * Initialize component with an array of tokens
   * @param {Array} tokens - Array of tokens to initialize with
   */
  initialize(tokens) {
    throw new Error("initialize() not implemented");
  }

  /**
   * Empty the component (reset its state)
   */
  empty() {
    // don't do anything by default
  }
  
}

class ClassicDomTextStreamComponent extends TextStreamComponent {
  constructor(game) {
    super(game);

    this.tokens = [];
    this.tokensToBlocks = {};

    this.origin = {
      left: this.game.gridStartX * this.game.numColumns * this.game.cellWidth, 
      top: this.game.gridStartY
    };

    this.tokenStart = {
      left: this.game.getColumnLeft(this.game.numColumns - 1) + this.game.cellWidth,
      top: this.game.gridStartY,
    }
  }
  
  /**
   * Handle token change events
   * @param {number} index - The index of the changed token
   * @param {Object} event - The event data
   */
  onChange(index, event) {
    // Update our local copy of the tokens
    if (this.tokens[index]) {
      this.tokens[index] = event.token;
    }
    this.render();
  }
  
  /**
   * Handle stream shift events
   * @param {Object} event - The event data
   */
  onPush(event) {
    if (event?.token === null) {
      console.error("TextStreamComponent.onPush(): no token in event", event);
      return;
    }

    this.tokens.push(event.token);
    
    let elt = this.blockFromToken(event.token);
    this.tokensToBlocks[event.token.id] = elt;
    this.render();
  }

  onPop(event) {
    if (event?.token === null) {
      console.error("TextStreamComponent.onPop(): no token in event", event);
      return;
    }
    let removed = this.tokens.shift();
    this.render();
  }

  empty() {
    for (let tokenId in this.tokensToBlocks) {
      let token = this.tokensToBlocks[tokenId];
      token.remove();
    }
    this.tokensToBlocks = {};
  }

  /**
   * Render all tokens
   */
  render() {
    let from = this.origin;
      let to = {left: this.game.gridStartX, top: this.game.gridStartY - this.game.cellHeight }

    let newLoc = {
      left: to.left,
      top: to.top,
    }

    const width = this.game.cellWidth;
    const height = this.game.cellHeight;

    // for (let i = this.tokens.length - 1; i >= 0; i--) { // for each token
    for (let i = 0; i < this.tokens.length; i++) { // for each token
      let curToken = this.tokens[i];
      let block = this.tokensToBlocks[curToken.id];
      if (!block) {
        console.error("TextStreamComponent.render(): null token at index", i, this.tokens);
        continue;
      }

      // let speed = 180 * (this.tokens.length + 1 - i) ** 0.5;
      let speed = 300;
      // resizeToken(block, width, height);
      moveTo(block, newLoc.left, newLoc.top, speed);
      newLoc.left += width;
    }
  }

  tokenToComponent(token) {
    let dom = this.tokensToBlocks[token.id];
    if (!dom) {
      console.error("TextStreamComponent.tokenToComponent(): token not found in tokenToDom mapping", token.id, token.text, this.tokensToBlocks);
      return;
    }
    return dom;
  }

  blockFromToken(token) {
    return createBlockAt(
      token,
      this.tokenStart.left, 
      this.tokenStart.top, 
      this.game.cellWidth, 
      this.game.cellHeight
    );
  }
  
  /**
   * Initialize component with an array of tokens
   * @param {Array} tokens - Array of tokens to initialize with
   */
  initialize(tokens) {
    // Clear any existing tokens
    this.empty();
    
    // Add each token to our tracking
    tokens.forEach(token => {
      let elt = this.blockFromToken(token);
      this.tokens.push(token);
      this.tokensToBlocks[token.id] = elt;
    });
    
    // Render the initial state
    this.render();
  }
}