import { Controller as Controller } from '../../controls/controllers/Controller.js';
import soundManager from '../../sound.js';
import { Token } from '../../corpus/Token.js';

  
/**
 * Arrow-specific control manager for tetris-like games
 * Handles moveLeft, moveRight, moveUp, moveDown, and drop actions
 */
export class ClockController extends Controller {
    constructor(game, options = {}) {
      super(game);

      this.options = options;

      // Use the new declareActions method to set up all handlers at once
      this.declareActions({
        'Drop': this._drop.bind(this),
        'Tick': this._tick.bind(this),
        // 'Number': this._number.bind(this),
        // 'Next': this._next.bind(this),
        // 'Delete': this._delete.bind(this),
        // 'ChangeTense': this._changeVerb.bind(this),
        // 'ChangeInflection': this._changeInflection.bind(this),
      });
    }

     // Drop a block onto the grid and apply any necessary effects
    _drop(data) {
      let handNumber = parseInt(data.event.key) - 1;
      if (handNumber === -1) { handNumber = this.game.numHands - 1; }
      this.game.nextBlockUp(handNumber);
    }

    _tick(data) {
      this.game.nextBlockUp(0);
    }

    // _number(data) {
    //   let index = data.event.key - 1;
    //   let oldToken = this.game.stream.textStream.getToken(index);
    //   let newText = oldToken.text.split('').reverse().join('');
    //   this.game.stream.textStream.setToken(index, new Token(
    //     { text: newText, }
    //   ))
    // }

    // _next(data) {
    //   this.game.deleteCurrentBlock();
    //   this.game.nextBlockUp();
    // }

    // // delete the block at the current X, Y
    // _delete(data) {
    //   this.game.delete(this.game.state.curX, this.game.state.curY);
    // }

    // _changeVerb(data) {
    //   let tenses = ['present', 'past', 'future', 'infinitive', 'gerund', 'toNegative', 'present', 'past', 'future', 'infinitive', 'gerund', 'toPositive'];
    //   let tense = tenses[this.tenseIndex++ % tenses.length];


    //   let changeTense = (view, tense) => {

    //     // var toChange = view.tag('verb').verbs().first();
    //     // // or don't coerce https://observablehq.com/@spencermountain/verbs#cell-374
    //     // // let toChange = token.term.verbs().first();

    //     // Create a new isolated nlp document from just this term's text
    //     // to prevent it from searching the parent document
    //     let termText = view.text();
    //     let isolatedDoc = nlp(termText);
        
    //     var toChange = isolatedDoc.tag('verb').verbs();
    //     if (toChange.length === 0) {
    //       return null; // Not a verb
    //     }

    //     let newView; 
    //     switch (tense) {
    //       case 'present':
    //         newView = toChange.toPresentTense();
    //         break;
    //       case 'past':
    //         newView = toChange.toPastTense();
    //         break;
    //       case 'future':
    //         newView = toChange.toFutureTense();
    //         break;
    //       case 'infinitive':
    //         newView = toChange.toInfinitive();
    //         break;
    //       case 'gerund':
    //         newView = toChange.toGerund();
    //         break;
    //       case 'toNegative':
    //         newView = toChange.toNegative();
    //         break;
    //       case 'toPositive':
    //         newView = toChange.toPositive();
    //         break;
    //       default:
    //         console.error("Invalid tense", tense);
    //         return;
    //     }
      
    //     return newView;
    //   }

    //   for (let i = 0; i < this.game.stream.textStream.size; i++) {
    //     let token = this.game.stream.textStream.getToken(i);
    //     let newView = changeTense(token.term, tense);
    //     if (newView == null || newView.length < 1) {
    //       continue;
    //     }

    //     let newToken = Token.fromToken(token);
    //     newToken.term = newView;
    //     newToken.text = newView.text();

    //     this.game.stream.textStream.setToken(i, newToken);

    //   }


    //   // also change the current token
    //   let token = this.game.currentToken;
    //   let newView = changeTense(token.term, tense);
    //   if (newView == null || newView.length < 1) {
    //     return;
    //   }

    //   this.game.changeCurrentToken(newView.text());
    // }

    // _changeInflection(data) {
    //   let inflections = ['singular', 'plural'];
    //   let inflection = inflections[this.inflectionIndex++ % inflections.length];

    //   let changePlurality = (view, plurality) => {
    //     // the probably more correct way, but the problem is that .nouns() searches the parents context for some reason
    //     // var toChange = view.nouns().first();
    //     // console.log("toChange", toChange)

    //     // Create a new isolated nlp document from just this term's text
    //     // to prevent it from searching the parent document
    //     let termText = view.text();
    //     let isolatedDoc = nlp(termText);
        
    //     var toChange = isolatedDoc.nouns();
    //     if (toChange.length === 0) {
    //       return null; // Not a noun
    //     }
        
    //     var newView;
    //     switch (plurality) {
    //       case 'singular':
    //         newView = toChange.toPlural();
    //         break;
    //       case 'plural':
    //         newView = toChange.toSingular();
    //         break;
    //       default:
    //         console.error("Invalid plurality", plurality);
    //         return;
    //     }
    //     return newView;
    //   }

    //   for (let i = 0; i < this.game.stream.textStream.size; i++) {
    //     let token = this.game.stream.textStream.getToken(i);
    //     let newView = changePlurality(token.term, inflection);
    //     if (newView == null || newView.length < 1) {
    //       continue;
    //     }

    //     let newToken = Token.fromToken(token);
    //     newToken.term = newView;
    //     newToken.text = newView.text();

    //     this.game.stream.textStream.setToken(i, newToken);

    //   }


    //   let token = this.game.currentToken;
    //   let newView = changePlurality(token.term, inflection);
    //   if (newView == null || newView.length < 1) {
    //     return;
    //   }

    //   // also change the current token
    //   this.game.changeCurrentToken(newView.text());
    // }
  }
