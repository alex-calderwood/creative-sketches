import { createBlockAt, rotateTo, rotate, setColor } from '../../../block.js';
import { Token } from '../../corpus/Token.js';
import { moveTo, resizeToken } from '../../../utils.js';

export class BasePerformance {
    constructor(params={}) {
        this.params = {
            tickEvery: 10, // period at which to update
            blockWidth: 100,
            blockHeight: 80,
        }
        this.params = { ...this.params, ...params };

        this.state = {
            
        }

    }

    initialize() {

    }

    tick() {

    }

    render(time) {
        // // rotate all hands around the center
        // for (let i = 0; i < this.state.hands.length; i++) {
        //     let hand = this.state.hands[i];
        //     if (!hand || !hand.element) {
        //         console.error(`render(): hand[${i}] or element is null`);
        //         continue;
        //     }

        //     let newPosition = this.getLoc(hand);

        //     // console.log("render(): handPosition", newPosition, this.params.center, hand.position);

        //     // Move the element to the correct position on the circle
        //     moveTo(hand.element, newPosition.left, newPosition.top, time);
            
        //     // Rotate the element around its own center
        //     // rotate(hand.element, hand.position.theta, time);
        // }
    }

}