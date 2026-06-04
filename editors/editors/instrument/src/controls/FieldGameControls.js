import { ControlManager } from './ControlManager.js';
import soundManager from '../../sound.js';

  
/**
 * Arrow-specific control manager for tetris-like games
 * Handles moveLeft, moveRight, moveUp, moveDown, and drop actions
 */
export class FourDirectionControls extends ControlManager {
    constructor(game, options = {}) {
      super(game);
  
      // Configure whether to auto-drop on move actions
      this.dropOnMove = options.dropOnMove ?? false;
  
      // Use the new declareActions method to set up all handlers at once
      this.declareActions({
        'Left': this.moveLeft.bind(this),
        'Right': this.moveRight.bind(this),
        'Up': this.moveUp.bind(this),
        'Down': this.moveDown.bind(this),
        'Drop': this.drop.bind(this),
      });
    }
    
    moveRight() {
      if (this.dropOnMove) this.drop();

      this.game.state.showCursor = false;
      this.game.moveCurrent(1, 0);
      this.game.drawMove();
    }
  
    moveLeft() {
      if (this.dropOnMove) this.drop();

      this.game.state.showCursor = false;
      this.game.moveCurrent(-1, 0);
      this.game.drawMove();
    }
  
    moveUp() {
      if (this.dropOnMove) this.drop();

      this.game.state.showCursor = false;
      this.game.moveCurrent(0, -1);
      this.game.drawMove();
    }
  
    moveDown() {
      if (this.dropOnMove) this.drop();

      this.game.moveCurrent(0, 1);
      this.game.drawMove();
    }
  
     // Drop a block onto the grid and apply any necessary effects
    drop() {
      let element = this.game.state.currentBlock;
      if (element == null) {
        console.error("Attempting to drop null element", element)
      }
  
      this.game.state.didDrop = true;
      this.game.drawCursor();
  
      // Remove current-token class and markup
      element.classList.remove('current-token');
      const markup = element.querySelector('.current-markup');
      if (markup) markup.remove();
  
      // drop the block / apply animation
      if (element.classList.contains('delete')) {
        this.game.delete(this.game.state.curX, this.game.state.curY);
        this.game.state.currentBlock.remove();
      } else if (element.classList.contains('constraint')) {
        this.game.applyConstraint(this.game.state.curX, this.game.state.curY);
      } else { // a word token
        this.game.updateGrid(element);
      }
  
      // if (this.game.state.curY != 0) { this.game.moveCurrent(0, -1); }
  
      this.game.nextBlockUp(); // fill the token chain and set current block
  
      if (this.game.isGridFull()) {
        this.game.endGame();
        return;
      }
      this.game.printState();
  
      soundManager.playSound('woof');
    }
  }

/**
 * FieldGameControls with automatic drop on move enabled
 */
export class AutoDropFourDirectionControls extends FourDirectionControls {
  constructor(game) {
    super(game, { dropOnMove: true });
  }
}
