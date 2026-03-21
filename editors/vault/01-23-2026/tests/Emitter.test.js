import { describe, it, expect, vi } from 'vitest';
import { Emitter } from '../src/monitor/Emitter.js';

const EmitterClass = Emitter();

describe('Emitter', () => {
  it('calls listener when event is emitted', () => {
    const obj = new EmitterClass();
    const fn = vi.fn();
    obj.on('test', fn);
    obj._emit('test', { value: 42 });
    expect(fn).toHaveBeenCalledWith({ value: 42 });
  });

  it('supports multiple listeners on the same event', () => {
    const obj = new EmitterClass();
    const fn1 = vi.fn();
    const fn2 = vi.fn();
    obj.on('evt', fn1);
    obj.on('evt', fn2);
    obj._emit('evt', 'data');
    expect(fn1).toHaveBeenCalledWith('data');
    expect(fn2).toHaveBeenCalledWith('data');
  });

  it('does not call listeners for other events', () => {
    const obj = new EmitterClass();
    const fn = vi.fn();
    obj.on('a', fn);
    obj._emit('b', 'x');
    expect(fn).not.toHaveBeenCalled();
  });

  it('removes a listener with off()', () => {
    const obj = new EmitterClass();
    const fn = vi.fn();
    obj.on('evt', fn);
    obj.off('evt', fn);
    obj._emit('evt', 'x');
    expect(fn).not.toHaveBeenCalled();
  });

  it('returns an unsubscribe function from on()', () => {
    const obj = new EmitterClass();
    const fn = vi.fn();
    const unsub = obj.on('evt', fn);
    unsub();
    obj._emit('evt', 'x');
    expect(fn).not.toHaveBeenCalled();
  });

  it('handles emit with no listeners gracefully', () => {
    const obj = new EmitterClass();
    expect(() => obj._emit('nothing', 'data')).not.toThrow();
  });

  it('works as a mixin on an existing class', () => {
    class Base { greet() { return 'hi'; } }
    const Mixed = Emitter(Base);
    const obj = new Mixed();
    expect(obj.greet()).toBe('hi');

    const fn = vi.fn();
    obj.on('evt', fn);
    obj._emit('evt', 99);
    expect(fn).toHaveBeenCalledWith(99);
  });
});
