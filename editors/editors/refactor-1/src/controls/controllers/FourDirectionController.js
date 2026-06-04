import { Controller as Controller } from './Controller.js';
import soundManager from '../../../sound.js';
import { Token } from '../../corpus/Token.js';

  
/**
 * Arrow-specific control manager for tetris-like games
 * Handles moveLeft, moveRight, moveUp, moveDown, and drop actions
 */
export class FourDirectionController extends Controller {
    constructor(game, options = {}) {
      super(game);
  
      // Configure whether to auto-drop on move actions
      this.dropOnMove = options.dropOnMove ?? false;

      // TODO this should probably be in game.js?
      this.tenseIndex = 0;
      this.inflectionIndex = 0;

      // Use the new declareActions method to set up all handlers at once
      this.declareActions({
        'Left': this._moveLeft.bind(this),
        'Right': this._moveRight.bind(this),
        'Up': this._moveUp.bind(this),
        'Down': this._moveDown.bind(this),
        'Drop': this._drop.bind(this),
        'Number': this._number.bind(this),
        'Next': this._next.bind(this),
        'Delete': this._delete.bind(this),
        'ChangeTense': this._changeVerb.bind(this),
        'ChangeInflection': this._changeInflection.bind(this),
      });
    }
    
    _updateColorFromMidiData(data) {
      if (data?.midiData?.note !== undefined) {
        this.game.updateTokenColors(data.midiData.note);
      }
    }
    
    _moveRight(data) {
      if (this.dropOnMove) this._drop(data);

      this.game.state.showCursor = false;
      this.game.moveCurrent(1, 0);
      this.game.drawMove();
    }
  
    _moveLeft(data) {
      if (this.dropOnMove) this._drop(data);

      this.game.state.showCursor = false;
      this.game.moveCurrent(-1, 0);
      this.game.drawMove();
    }
  
    _moveUp(data) {
      if (this.dropOnMove) this._drop(data);

      this.game.state.showCursor = false;
      this.game.moveCurrent(0, -1);
      this.game.drawMove();
    }
  
    _moveDown(data) {
      if (this.dropOnMove) this._drop(data);

      this.game.state.showCursor = false;
      this.game.moveCurrent(0, 1);
      this.game.drawMove();
    }
  
     // Drop a block onto the grid and apply any necessary effects
    _drop(data) {
      this._updateColorFromMidiData(data);

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

    _number(data) {
      let index = data.event.key - 1;
      let oldToken = this.game.stream.textStream.getToken(index);
      let newText = oldToken.text.split('').reverse().join('');
      this.game.stream.textStream.setToken(index, new Token(
        { text: newText, }
      ))
    }

    _next(data) {
      this.game.deleteCurrentBlock();
      this.game.nextBlockUp();
    }

    // delete the block at the current X, Y
    _delete(data) {
      this.game.delete(this.game.state.curX, this.game.state.curY);
    }

    _changeVerb(data) {
      let tenses = ['present', 'past', 'future', 'infinitive', 'gerund', 'toNegative', 'present', 'past', 'future', 'infinitive', 'gerund', 'toPositive'];
      let tense = tenses[this.tenseIndex++ % tenses.length];


      let changeTense = (view, tense) => {

        // var toChange = view.tag('verb').verbs().first();
        // // or don't coerce https://observablehq.com/@spencermountain/verbs#cell-374
        // // let toChange = token.term.verbs().first();

        // Create a new isolated nlp document from just this term's text
        // to prevent it from searching the parent document
        let termText = view.text();
        let isolatedDoc = nlp(termText);
        
        var toChange = isolatedDoc.tag('verb').verbs();
        if (toChange.length === 0) {
          return null; // Not a verb
        }

        let newView; 
        switch (tense) {
          case 'present':
            newView = toChange.toPresentTense();
            break;
          case 'past':
            newView = toChange.toPastTense();
            break;
          case 'future':
            newView = toChange.toFutureTense();
            break;
          case 'infinitive':
            newView = toChange.toInfinitive();
            break;
          case 'gerund':
            newView = toChange.toGerund();
            break;
          case 'toNegative':
            newView = toChange.toNegative();
            break;
          case 'toPositive':
            newView = toChange.toPositive();
            break;
          default:
            console.error("Invalid tense", tense);
            return;
        }
      
        return newView;
      }

      for (let i = 0; i < this.game.stream.textStream.size; i++) {
        let token = this.game.stream.textStream.getToken(i);
        let newView = changeTense(token.term, tense);
        if (newView == null || newView.length < 1) {
          continue;
        }

        let newToken = Token.fromToken(token);
        newToken.term = newView;
        newToken.text = newView.text();

        this.game.stream.textStream.setToken(i, newToken);

      }


      // also change the current token
      let token = this.game.currentToken;
      let newView = changeTense(token.term, tense);
      if (newView == null || newView.length < 1) {
        return;
      }

      this.game.changeCurrentToken(newView.text());
    }

    _changeInflection(data) {
      let inflections = ['singular', 'plural'];
      let inflection = inflections[this.inflectionIndex++ % inflections.length];

      let changePlurality = (view, plurality) => {
        // the probably more correct way, but the problem is that .nouns() searches the parents context for some reason
        // var toChange = view.nouns().first();
        // console.log("toChange", toChange)

        // Create a new isolated nlp document from just this term's text
        // to prevent it from searching the parent document
        let termText = view.text();
        let isolatedDoc = nlp(termText);
        
        var toChange = isolatedDoc.nouns();
        if (toChange.length === 0) {
          return null; // Not a noun
        }
        
        var newView;
        switch (plurality) {
          case 'singular':
            newView = toChange.toPlural();
            break;
          case 'plural':
            newView = toChange.toSingular();
            break;
          default:
            console.error("Invalid plurality", plurality);
            return;
        }
        return newView;
      }

      for (let i = 0; i < this.game.stream.textStream.size; i++) {
        let token = this.game.stream.textStream.getToken(i);
        let newView = changePlurality(token.term, inflection);
        if (newView == null || newView.length < 1) {
          continue;
        }

        let newToken = Token.fromToken(token);
        newToken.term = newView;
        newToken.text = newView.text();

        this.game.stream.textStream.setToken(i, newToken);

      }


      let token = this.game.currentToken;
      let newView = changePlurality(token.term, inflection);
      if (newView == null || newView.length < 1) {
        return;
      }

      // also change the current token
      this.game.changeCurrentToken(newView.text());
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
