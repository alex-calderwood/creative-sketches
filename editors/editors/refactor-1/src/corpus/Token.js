export function uuid(name) {
  return name + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

export class Token {
  constructor(data) {
    this.text = data.text;
    this.type = data.type || 'word';
    this.pos = data.pos;
    this.source = data.source;
    this.id = data.id || uuid('token-');
    this.display = data.display || {};
  }

  toString() {
    return `Token(text: ${this.text}, type: ${this.type}, pos: ${this.pos}, source: ${this.source})`;
  }

  /* 
   * Create a token from another token, but ID is not preserved
   */
  static fromToken(oldToken) {
    return new Token(oldToken.toJSON().except('id'));
  }

  toJSON() {
    return {
      text: this.text,
      type: this.type,
      pos: this.pos,
      source: this.source,
      id: this.id,
      display: this.display,
    };
  }
}