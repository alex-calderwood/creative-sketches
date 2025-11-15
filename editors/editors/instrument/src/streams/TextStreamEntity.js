export class TextStreamEntity {
  constructor(game, stream, component) {
    this.game = game;
    this.textStream = stream;
    this.component = component;
    
    // Initialize component with all current tokens in the stream
    const tokens = this.textStream.getStream();
    this.component.initialize(tokens);
  }

  render() {
    this.component.render();
  }

  pop() {
    let token = this.textStream.pop();
    let block = this.component.tokenToComponent(token);
    return {
      token: token,
      block: block,
    }
  }

  fill() {
    this.textStream.fillStream();
  }

  clear() {
    this.component.empty();
    // TextStream doesn't have a clear method either, so we'll skip it
    // this.textStream.clear();
  }

  tokenToComponent(token) {
    if (!token) {
      return null;
    }
    return this.component.tokenToComponent(token);
  }
}
