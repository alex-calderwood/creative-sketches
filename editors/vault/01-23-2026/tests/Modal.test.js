import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Modal } from '../src/components/Modal.js';

describe('Modal', () => {
  let modal;

  beforeEach(() => {
    Modal.stylesLoaded = false;
    modal = new Modal('test-modal', '<p>Test content</p>');
  });

  afterEach(() => {
    modal.hide();
    modal.destroy();
    document.head.querySelectorAll('link').forEach(l => l.remove());
  });

  describe('constructor', () => {
    it('stores id and content', () => {
      expect(modal.id).toBe('test-modal');
      expect(modal.content).toBe('<p>Test content</p>');
    });

    it('sets default buttons when none provided', () => {
      expect(modal.buttons).toHaveLength(2);
      expect(modal.buttons[0].text).toBe('Cancel');
      expect(modal.buttons[1].text).toBe('Continue');
    });

    it('accepts custom buttons', () => {
      const custom = [{ text: 'OK', handler: () => {} }];
      const m = new Modal('m', '', custom);
      expect(m.buttons).toBe(custom);
      m.destroy();
    });
  });

  describe('create', () => {
    it('creates the modal element in the DOM', async () => {
      await modal.create();
      expect(modal.element).not.toBeNull();
      expect(document.getElementById('test-modal')).toBe(modal.element);
    });

    it('starts hidden', async () => {
      await modal.create();
      expect(modal.element.style.display).toBe('none');
    });

    it('renders the content', async () => {
      await modal.create();
      const content = modal.element.querySelector('.modal-content');
      expect(content.innerHTML).toContain('Test content');
    });

    it('renders buttons with data-action attributes', async () => {
      await modal.create();
      expect(modal.element.querySelector('[data-action="cancel"]')).not.toBeNull();
      expect(modal.element.querySelector('[data-action="continue"]')).not.toBeNull();
    });

    it('loads styles exactly once', async () => {
      await modal.create();
      const links = document.head.querySelectorAll('link[rel="stylesheet"]');
      expect(links.length).toBe(1);

      const modal2 = new Modal('m2', 'x');
      await modal2.create();
      expect(document.head.querySelectorAll('link[rel="stylesheet"]').length).toBe(1);
      modal2.destroy();
    });
  });

  describe('show / hide', () => {
    it('show makes the modal visible', async () => {
      await modal.create();
      modal.show();
      expect(modal.element.style.display).toBe('flex');
    });

    it('hide makes the modal invisible', async () => {
      await modal.create();
      modal.show();
      modal.hide();
      expect(modal.element.style.display).toBe('none');
    });

    it('show can update content', async () => {
      await modal.create();
      modal.show('<p>New stuff</p>');
      expect(modal.element.querySelector('.modal-content').innerHTML).toBe('<p>New stuff</p>');
    });

    it('show returns a promise', async () => {
      await modal.create();
      const result = modal.show();
      expect(result).toBeInstanceOf(Promise);
    });
  });

  describe('button handlers', () => {
    it('cancel button calls onCancel, hides, and resolves false', async () => {
      await modal.create();
      const onCancel = vi.spyOn(modal, 'onCancel');
      const promise = modal.show();

      modal.element.querySelector('[data-action="cancel"]').click();

      expect(onCancel).toHaveBeenCalled();
      expect(modal.element.style.display).toBe('none');
      await expect(promise).resolves.toBe(false);
    });

    it('continue button calls onContinue, hides, and resolves true', async () => {
      await modal.create();
      const onContinue = vi.spyOn(modal, 'onContinue');
      const promise = modal.show();

      modal.element.querySelector('[data-action="continue"]').click();

      expect(onContinue).toHaveBeenCalled();
      expect(modal.element.style.display).toBe('none');
      await expect(promise).resolves.toBe(true);
    });
  });

  describe('destroy', () => {
    it('removes the element from the DOM', async () => {
      await modal.create();
      modal.destroy();
      expect(document.getElementById('test-modal')).toBeNull();
      expect(modal.element).toBeNull();
    });
  });

  describe('keyboard handling', () => {
    it('Enter triggers the continue button when modal is shown', async () => {
      await modal.create();
      const onContinue = vi.spyOn(modal, 'onContinue');
      const promise = modal.show();

      const event = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true });
      document.dispatchEvent(event);

      expect(onContinue).toHaveBeenCalled();
      await expect(promise).resolves.toBe(true);
    });

    it('keyboard listener is removed on hide', async () => {
      await modal.create();
      const clickSpy = vi.fn();
      const continueBtn = modal.element.querySelector('[data-action="continue"]');
      continueBtn.addEventListener('click', clickSpy);

      modal.show();
      modal.hide();

      const event = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true });
      document.dispatchEvent(event);

      expect(clickSpy).not.toHaveBeenCalled();
    });
  });
});
