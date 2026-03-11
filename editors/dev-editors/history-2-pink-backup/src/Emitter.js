export const Emitter = (Base = class {}) => class extends Base {
  _initEmitter() {
    this._listeners = {};
  }

  on(eventName, fn) {
    if (!this._listeners) this._initEmitter();
    if (!this._listeners[eventName]) this._listeners[eventName] = [];
    this._listeners[eventName].push(fn);
    return () => this.off(eventName, fn);
  }

  off(eventName, fn) {
    if (!this._listeners?.[eventName]) return;
    this._listeners[eventName] = this._listeners[eventName].filter(f => f !== fn);
  }

  _emit(eventName, data) {
    if (!this._listeners?.[eventName]) return;
    for (const fn of this._listeners[eventName]) fn(data);
  }
};
