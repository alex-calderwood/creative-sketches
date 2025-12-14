import { TextStreamComponent } from '../../streams/TextStreamComponent.js';
import { createBlockAt, updateBlockColor } from '../../../block.js';
import { moveTo } from '../../../utils.js';

export class HyperTextStreamComponent extends TextStreamComponent {
  constructor(game, params={}) {
    super(game);

    this.tokens = [];
    this.tokensToBlocks = {};
    this.container = null;

    // Set default params
    const defaultParams = {
      from: { left: 0, top: 0 },
      to: { left: 0, top: 0 },
      blockHeight: 100,
      blockWidth: 100,
      clipRect: null,   // bounding box { left, top, width, height } for clipping
      hideOverflow: true,
    };

    this.params = { ...defaultParams, ...params };

    this.blockWidth = this.params.blockWidth;
    this.blockHeight = this.params.blockHeight;
    this.clipRect = this.params.clipRect;

    // Positions are relative to container (0,0 is top-left)
    this.params.from = { left: 0, top: 0 - this.params.blockHeight };
    // this.params.to = { left: 0, top: rect.height * 10 };

  }

  createContainer() {
    if (!this.clipRect) {
      console.error("TextStreamComponent.createContainer(): no clipRect", this.params);
      return;
    }
    
    const rect = this.clipRect;
    this.container = document.createElement('div');
    this.container.className = 'mask-container';
    this.container.style.position = 'absolute';
    this.container.style.left = `${rect.left}px`;
    this.container.style.top = `${rect.top}px`;
    this.container.style.width = `${rect.width}px`;
    this.container.style.height = `${rect.height}px`;
    this.container.style.overflow = this.params.hideOverflow ? 'hidden' : 'visible';
    document.body.appendChild(this.container);
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
    if (removed) {
      this.deleteToken(removed);
    }
    this.render();
  }

  empty() {
    for (let tokenId in this.tokensToBlocks) {
      let token = this.tokensToBlocks[tokenId];
      token.remove();
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
    console.log("TextStreamComponent.updateWidth():", width);
    this.blockWidth = width;
    if (this.container) {
      this.container.style.width = `${width}px`;
    }
  }

  updateHeight(height) {
    this.blockHeight = height;
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
        console.error("TextStreamComponent.render(): null token at index", i, this.tokens);
        continue;
      }

      let speed = this.params.slideRate;
      moveTo(block, newLoc.left, newLoc.top, speed);

      newLoc.left += delta.left;
      newLoc.top += delta.top;
    }
  }

  deleteToken(token) {
    let block = this.tokensToBlocks[token.id];
    console.log("deleting", {token, block})
    
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

    // Move block into container, which allows clipping
    // Block's position will now be relative to container
    if (this.container && block) {
      this.container.appendChild(block);
    } else {
      console.error("TextStreamComponent.blockFromToken(): no container or block", {container: this.container, block})
    }

    this.tokensToBlocks[token.id] = block;
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