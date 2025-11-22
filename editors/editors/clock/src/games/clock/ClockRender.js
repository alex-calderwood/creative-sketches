import { createBlockAt, rotateTo, rotate, setColor } from '../../../block.js';
import { Token } from '../../corpus/Token.js';
import { moveTo } from '../../../utils.js';

export class ClockRender {
    constructor(params={}) {
        this.params = {
            radius: 100,
            period: 6000, // milliseconds
            tickEvery: 10, // period at which to update
            center: {
                x: window.innerWidth / 2,
                y: window.innerHeight / 2,
            },
            blockWidth: 100,
            blockHeight: 80,
        }
        this.params = { ...this.params, ...params };

        this.state = {
            hands: [],
            time: Date.now(),
            lastTick: 0,
        }

        // The function to read from the stream
        this._readFromStreamI = []
    }

    setStreams(streams) {
        this.streams = streams;
        this._readFromStreamI = [];
        
        // Initialize hands array with position objects
        this.state.hands = [];
        // const maxRadius = Math.min(window.innerWidth, window.innerHeight) / 2 - this.params.blockWidth * 2;
        let radius = this.params.blockHeight;
        
        for (let i = 0; i < streams.length; i++) {
            this._readFromStreamI.push(() => {
                return this.streams[i].pop().block;
            });
            
            // Initialize each hand with its own position, radius, and period
            // Each hand gets a smaller radius (concentric circles)
            // Use blockHeight to match the vertical spacing of text streams
            const radiusStep = this.params.blockWidth;
            radius += radiusStep;
            
            // Each hand gets a different period (speed)
            // Hand 0 is slowest, each subsequent hand is faster
            const handPeriod = (i + 1) * (i + 1) * 2110;
            
            this.state.hands.push({
                element: null,
                position: {
                    radius:radius,
                    theta: 0,
                },
                period: handPeriod,
            });
        }
            
    }

    setTime(time) {
        this.state.time = time;
    }

    tick() {
        let now = Date.now();
        let timeSinceLastTick = now - this.state.lastTick;
        let shouldTick = timeSinceLastTick >= this.params.tickEvery;
        if (!shouldTick) {
            return;
        }
        // console.log("tick()", now);
        this.state.time += timeSinceLastTick;
        this.state.lastTick = now;
        
        // Update each hand's theta based on its own period
        for (let i = 0; i < this.state.hands.length; i++) {
            const hand = this.state.hands[i];
            hand.position.theta = (this.state.time / hand.period) * 2 * Math.PI;
        }

        this.render(timeSinceLastTick);
    }

    getLoc(hand) {
        let radius = hand.position.radius;
        let theta = hand.position.theta;
        return {
            left: this.params.center.x + radius * Math.cos(theta),
            top: this.params.center.y + radius * Math.sin(theta),
        }
    }

    initialize() {
        for (let i = 0; i < this.streams.length; i++) {
            this.nextBlockUp(i);
        }
    }
    
    nextBlockUp(i) {
        if (i >= this.state.hands.length) {
            console.error("nextBlockUp(): index out of bounds", i, this.state.hands.length);
            return null;
        }

        let hand = this.state.hands[i];

        // Get the current position based on current theta
        let loc = this.getLoc(hand);

        // remove the current element at index i
        if (hand.element) {
            hand.element.remove();
        }

        hand.element = this._readFromStreamI[i]()
        setColor(hand.element, "#ffffff");
        console.log("nextBlockUp(): hand", hand.element, this.params.center);
        
        // Position new element at current theta position (instant)
        moveTo(hand.element, loc.left, loc.top, 1000);
        
        // Rotate element around its own center to match current orientation (instant)
        // rotate(hand.element, hand.position.theta, 0);
        
        // The render() loop will continue moving and rotating from current theta
        return hand.element;
    }

    render(time) {
        // rotate all hands around the center
        for (let i = 0; i < this.state.hands.length; i++) {
            let hand = this.state.hands[i];
            if (!hand || !hand.element) {
                console.error(`render(): hand[${i}] or element is null`);
                continue;
            }

            let newPosition = this.getLoc(hand);

            // console.log("render(): handPosition", newPosition, this.params.center, hand.position);

            // Move the element to the correct position on the circle
            moveTo(hand.element, newPosition.left, newPosition.top, time);
            
            // Rotate the element around its own center
            // rotate(hand.element, hand.position.theta, time);
        }
    }

}