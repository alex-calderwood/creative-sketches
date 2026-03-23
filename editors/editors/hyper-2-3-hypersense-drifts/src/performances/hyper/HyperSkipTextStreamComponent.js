import { TextStreamComponent } from '../../streams/TextStreamComponent.js';
import { createBlockAt, updateBlockColor } from '../../../block.js';
import { moveTo, resizeToken } from '../../../utils.js';

export class HyperSkipTextStreamComponent extends TextStreamComponent {
  constructor(game, params={}) {
    super(game);

    this.tokens = [];
    this.tokensToBlocks = {};
    this.container = null;

    this.params = { 
      // Defaults
      from: { left: 0, top: 0 },
      to: { left: 0, top: 0 },
      blockHeight: 100,
      blockWidth: 100,
      clipRect: null,   // bounding box { left, top, width, height } for clipping
      hideOverflow: true,
      hidden: false,
      // Overwrite with passed in params
      ...params
    };

    // Positions are relative to container (0,0 is top-left)
    this.params.from = { left: 0, top: 0 - this.params.blockHeight };
    // this.params.to = { left: 0, top: rect.height * 10 };
  }

  createContainer() {
    if (!this.params.clipRect) {
      console.error("TextStreamComponent.createContainer(): no clipRect", this.params);
      return;
    }
    
    const rect = this.params.clipRect;
    this.container = document.createElement('div');
    this.container.className = 'mask-container';
    this.container.style.position = 'absolute';
    this.container.style.left = `${rect.left}px`;
    this.container.style.top = `${rect.top}px`;
    this.container.style.width = `${rect.width}px`;
    this.container.style.height = `${rect.height}px`;
    this.container.style.overflow = this.params.hideOverflow ? 'hidden' : 'visible';
    this.game.overlay.appendChild(this.container);

    this.setHidden(this.params.hidden);
  }

  /*
  The component has one hidden token above the clip box, so the word being displayed is the second token.
  */
  getDisplayWord() {
    return this.getWordAtIndex(1);
  }

  getWordAtIndex(index) {
    return this.tokens[index]?.text || '';
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

  setHidden(hidden) {
    this.params.hidden = hidden;
    if (this.container) {
      this.container.style.opacity = hidden ? 0 : 1;
    }
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
    if (removed) {
      this.deleteToken(removed);
    }
    this.render();
  }

  empty() {
    // Clear any pending timeout
    if (this.popTimeoutId) {
      clearTimeout(this.popTimeoutId);
      this.popTimeoutId = null;
    }
    for (let token of this.tokens) {
      let block = this.tokensToBlocks[token.id];
      block.remove();
    }
    this.tokensToBlocks = {};
    this.tokens = [];
    
    // Remove container if we created one
    if (this.container) {
      this.container.remove();
      this.container = null;
    }
  }

  updateWidth(width) {
    this.params.blockWidth = width;
    this.params.from = { left: 0, top: 0 - this.params.blockHeight };

    if (this.container) {
      this.container.style.width = `${width}px`;
    }
  }

  updateWord(word) {
    // this.updateRect(rect);
    // this.updateWidth(width);
    
    // Update the second token (index 1) with the new word
    // const token = this.tokens[1];
    // if (!token) return;
    
    // const block = this.tokensToBlocks[token.id];
    // if (!block) return;
    
    // // Update the token text and re-create the block
    // token.text = word;
    // const { left, top } = block.style;
    // this.deleteToken(token);
    // this.blockFromToken(token, left, top);
    // this.render();
  }

  updateRect(rect) {
    this.params.blockHeight = rect.height;
    this.params.blockWidth = rect.width;
    this.params.clipRect = rect;

    this.params.from = { left: 0, top: 0 - this.params.blockHeight };

    if (this.container) {
      this.container.style.width = `${rect.width}px`;
      this.container.style.height = `${rect.height}px`;
      this.container.style.left = `${rect.left}px`;
      this.container.style.top = `${rect.top}px`;
    }

  }

  updateHeight(height) {
    this.params.blockHeight = height;
  }

  /**
   * Render all tokens
   */
  render() {
    let from = this.params.from;
    // let to = this.params.to;

    let newLoc = {
      left: from.left,
      top: from.top,
    }

    // let nSteps = this.tokens.length;

    let delta = {
      left: 0,
      top: this.params.blockHeight,
    }

    for (let i = 0; i < this.tokens.length; i++) {
      let curToken = this.tokens[i];
      let block = this.tokensToBlocks[curToken.id];
      if (!block) {
        console.error("TextStreamComponent.render(): null block at index", i, this.tokens, this.tokensToBlocks);
        continue;
      }

      moveTo(block, newLoc.left, newLoc.top, this.params.animationSpeed);

      newLoc.left += delta.left;
      newLoc.top += delta.top;
    }
  }

  deleteToken(token) {
    let block = this.tokensToBlocks[token.id];
    
    if (block) {
      // Fade out the block before removing it
      block.style.transition = 'opacity 1s';
      block.style.opacity = 0;
      block.remove();
      delete this.tokensToBlocks[token.id];
    } else {
      console.error("TextStreamComponent.deleteToken(): token not found in tokenToBlocks mapping", token.id, token.text, this.tokensToBlocks);
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
    width = width ?? this.params.blockWidth;
    height = height ?? this.params.blockHeight;
    
    const block = createBlockAt(
      token,
      left, 
      top, 
      width, 
      height,
      "random"
    );

    // Move block into container, which allows clipping
    // Block's position will now be relative to container
    if (this.container && block) {
      this.container.appendChild(block);
      this.tokensToBlocks[token.id] = block;
    } else {
      console.error("TextStreamComponent.blockFromToken(): no container or block", {container: this.container, block, token})
    }

    return block;
  }
  
  /**
   * Initialize component with an array of tokens
   * @param {Array} tokens - Array of tokens to initialize with
   */
  initialize(tokens) {
    // Clear any existing tokens (this also removes the container)
    this.empty();
    
    // Recreate container after empty()
    this.createContainer();

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