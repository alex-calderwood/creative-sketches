import { Controller as Controller } from './Controller.js';
import soundManager from '../../sound.js';
import { Token } from '../corpus/Token.js';

  
/**
 * Arrow-specific control manager for tetris-like games
 * Handles moveLeft, moveRight, moveUp, moveDown, and drop actions
 */
export class FourDirectionController extends Controller {
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
        'Number': this.number.bind(this),
      });
    }
    
    updateColorFromMidiData(data) {
      if (data?.midiData?.note !== undefined) {
        this.game.updateTokenColors(data.midiData.note);
      }
    }
    
    moveRight(data) {
      if (this.dropOnMove) this.drop(data);

      this.game.state.showCursor = false;
      this.game.moveCurrent(1, 0);
      this.game.drawMove();
    }
  
    moveLeft(data) {
      if (this.dropOnMove) this.drop(data);

      this.game.state.showCursor = false;
      this.game.moveCurrent(-1, 0);
      this.game.drawMove();
    }
  
    moveUp(data) {
      if (this.dropOnMove) this.drop(data);

      this.game.state.showCursor = false;
      this.game.moveCurrent(0, -1);
      this.game.drawMove();
    }
  
    moveDown(data) {
      if (this.dropOnMove) this.drop(data);

      this.game.state.showCursor = false;
      this.game.moveCurrent(0, 1);
      this.game.drawMove();
    }
  
     // Drop a block onto the grid and apply any necessary effects
    drop(data) {
      this.updateColorFromMidiData(data);

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

    number(data) {
      let oldToken = this.game.stream.textStream.getToken(data.event.key);
      let newText = oldToken.text.split('').reverse().join('');
      let index = data.event.key - 1;
      this.game.stream.textStream.setToken(index, new Token(
        { text: newText, }
    ))
    }
  }

/**
 * FieldGameControls with automatic drop on move enabled
 */
export class AutoDropFourDirectionControls extends FourDirectionController {
  constructor(game) {
    super(game, { dropOnMove: true });
  }
}
