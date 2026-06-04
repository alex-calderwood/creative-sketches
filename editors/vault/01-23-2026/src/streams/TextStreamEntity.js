/**
 * TextStreamEntity coordinates between TextStream (data) and TextStreamComponent (visuals).
 * 
 * This class ties together a TextStream and a TextStreamComponent. It's a convenience wrapper 
 * that lets you work with the stream without worrying about coordinating data and display separately.
 * 
 * The communication is handled automatically - TextStream emits events, TextStreamComponent
 * listens and updates. TextStreamEntity just owns both and provides helper methods.
 */
export class TextStreamEntity {
  constructor(game, stream, component) {
    this.game = game;
    this.textStream = stream;
    this.component = component;
    
    // Link the component to this stream by setting its streamId
    this.component.streamId = this.textStream.id;
    
    // Initialize component with all current tokens in the stream
    const tokens = this.textStream.getStream();
    this.component.initialize(tokens);
  }

  render() {
    this.component.render();
  }

  peek() {
    let token = this.textStream.tokens[0];
    let block = token ? this.component.tokenToComponent(token) : null;
    return { token, block };
  }

  pop() {
    // Get token and block reference BEFORE popping (pop will delete the block via event)
    const { token, block } = this.peek();
    
    // Now pop - this emits event which deletes the block
    this.textStream.pop();
    
    return { token, block };
  }

  fill() {
    this.textStream.fillStream();
  }

  clear() {
    this.component.empty();
    if (this?.textStream?.clear) {
      this.textStream.clear();
    }
  }

  tokenToComponent(token) {
    if (!token) {
      return null;
    }
    return this.component.tokenToComponent(token);
  }

  updateColor(hue) {
    if (this?.component?.updateColor) {
      this.component.updateColor(hue);
    }
  }
}
