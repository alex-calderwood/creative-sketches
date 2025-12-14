export function uuid(name) {
  return name + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

export class Token {
  constructor(data) {
    this.text = data.text;
    this.term = data.term || null; // the NLP term/token object from compromise.js
    this.idx = data.idx || null;   // the index of the token in its parent term
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
    if (oldToken == null) {
      throw new Error("Token.fromToken(): oldToken is null");
    }

    let json = oldToken.toJSON();
    delete json.id;
    return new Token(json);
  }

  toJSON() {
    // Return only "own" non-function properties (excluding methods)
    return Object.fromEntries(
      Object.entries(this).filter(([key, value]) => typeof value !== 'function')
    );
  }
}