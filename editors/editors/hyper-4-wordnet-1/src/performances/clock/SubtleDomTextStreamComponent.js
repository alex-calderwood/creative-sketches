import { TextStreamComponent } from '../../streams/TextStreamComponent.js';
import { createBlockAt, updateBlockColor } from '../../../block.js';
import { moveTo } from '../../../utils.js';

export class SubtleDomTextStreamComponent extends TextStreamComponent {
  constructor(game, params={}) {
    super(game);

    this.tokens = [];
    this.tokensToBlocks = {};

    // Set default params
    const defaultParams = {
      from: {
        left: window.innerWidth - this.blockWidth,
        top: 200,
      },
      to: {
        left: 0,
        top: 200,
      },
      blockHeight: 100,
      blockWidth: 100,
      spaceWidth: 10,
    };

    // Deep merge params to properly handle nested from/to objects
    // this.params = {
    //   from: { ...defaultParams.from, ...params.from },
    //   to: { ...defaultParams.to, ...params.to },
    // };
    this.params = { ...defaultParams, ...params };

    this.blockWidth = params.blockWidth;
    this.blockHeight = params.blockHeight;

    // If from.top was specified but to.top wasn't, match them
    if (params.from?.top !== undefined && params.to?.top === undefined) {
      this.params.to.top = this.params.from.top;
    }

  }

  
  /**
   * Handle token change events
   * @param {number} index - The index of the changed token
   * @param {Object} event - The event data
   */
  onChange(index, event) {
    console.log("TextStreamComponent.onChange()", index, event);

    if (event?.token == null) {
      console.error("TextStreamComponent.onChange(): no token in event", event);
      return;
    }

    // get the previous location
    let previousToken = this.tokens[index];
    let previousBlock = this.tokensToBlocks[previousToken.id];

    // Update our local copy of the tokens
    if (this.tokens[index]) {
      this.tokens[index] = event.token;
    }

    const {left, top} = previousBlock.style;
    console.log("TextStreamComponent.onChange(): previousBlock", left, top);
    let block = this.blockFromToken(event.token, left, top);
    this.deleteToken(previousToken);

    this.render();
  }
  
  /**
   * Handle stream shift events
   * @param {Object} event - The event data
   */
  onPush(event) {
    if (event?.token == null) {
      console.error("TextStreamComponent.onPush(): no token in event", event);
      return;
    }

    this.tokens.push(event.token);
    
    this.blockFromToken(event.token);
    this.render();
  }

  onPop(event) {
    if (event?.token == null) {
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
      let from = this.params.from;
      let to = this.params.to;

    let newLoc = {
      left: to.left,
      top: to.top,
    }

    const width = this.blockWidth;
    const height = this.blockHeight;

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
      newLoc.left += width + this.params.spaceWidth;
    }
  }

  deleteToken(token) {
    let block = this.tokensToBlocks[token.id];
    if (block) {
      // Fade out the block before removing it
      block.style.transition = 'opacity 1s';
      block.style.opacity = 0;
      setTimeout(() => {
        block.remove();
      }, 400);
      delete this.tokensToBlocks[token.id];
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

  blockFromToken(token, left=null, top=null, width=null, height=null) {
    left = left ?? this.params.from.left;
    top = top ?? this.params.from.top;
    width = width ?? this.blockWidth;
    height = height ?? this.blockHeight;
    
    const block = createBlockAt(
      token,
      left, 
      top, 
      width, 
      height,
      "random"

    );
    this.tokensToBlocks[token.id] = block;
    return block;
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
      this.blockFromToken(token);
      this.tokens.push(token);
    });
    
    // Render the initial state
    this.render();
  }

  updateColor(hue) {
    for (let token of this.tokens) {
      let block = this.tokensToBlocks[token.id];
      updateBlockColor(block, hue);
    }
  }
}