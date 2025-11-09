function uuid(name) {
  return name + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

class Token {
  constructor(data) {
    this.text = data.text;
    this.type = data.type || 'word';
    this.pos = data.pos;
    this.source = data.source;
    this.id = data.id || uuid('token-');
  }

  toString() {
    return `Token(text: ${this.text}, type: ${this.type}, pos: ${this.pos}, source: ${this.source})`;
  }

  toJSON() {
    return {
      text: this.text,
      type: this.type,
      pos: this.pos,
      source: this.source,
    };
  }
}