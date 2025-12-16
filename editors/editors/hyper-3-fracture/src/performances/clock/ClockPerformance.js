import { createBlockAt, rotateTo, rotate, setColor } from '../../../block.js';
import { Token } from '../../corpus/Token.js';
import { moveTo, resizeToken } from '../../../utils.js';

export class ClockPerformance {
    constructor(params={}) {
        this.params = {
            // period: 6000, // milliseconds
            tickEvery: 10, // period at which to update
            center: {
                x: window.innerWidth / 2,
                y: window.innerHeight / 2,
            },
            blockWidth: 100,
            blockHeight: 80,
            handRatio: 2,
            basePeriod: 900,
            speedMode: 'exponential',
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
        // let period = streams.length ** this.params.handRatio * 1000;
        let basePeriod = this.params.basePeriod;
        let radius = 0;
        let width = this.params.blockWidth;
        let height = this.params.blockHeight;
        let period = basePeriod;


        for (let i = 0; i < streams.length; i++) {
            this._readFromStreamI.push(() => {
                return this.streams[i].pop().block;
            });
            
            // Initialize each hand with its own position, radius, and period
            // Each hand gets a smaller radius (concentric circles)
            // Use blockHeight to match the vertical spacing of text streams
            
            // Each hand gets a different period (speed)
            // Hand 0 is slowest, each subsequent hand is faster

            switch(this.params.speedMode) {
                case 'similar':
                    period = radius * 2 * Math.PI * basePeriod / this.params.blockWidth;
                    if (period === 0) {
                        period = basePeriod;
                    }
                    break;
                case 'linear':
                    period = (i + 1) * basePeriod;
                    break;
                case 'exponential':
                    period = period * 2;
                    break;
                default:
                    throw new Error(`Unknown speed mode: ${this.params.speedMode}`);
            }
            
            
            this.state.hands.push({
                element: null,
                position: {
                    radius: radius,
                    theta: 0,
                },
                period: period,
                width: width,
                height: height,
                i: i,
            });

            radius += width;
            width *= 0.9;
            height *= 0.9;
            // period = period / this.params.handRatio;
            // period *= this.params.handRatio;
            // period += 1000;
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
            // the number of times theta has wrapped around the circle
            hand.position.numTicks = Math.floor(hand.position.theta / (2 * Math.PI));
            if (hand.position.numTicks > hand.position.prevNumTicks) {
                this.nextBlockUp(i);
            }
            hand.position.prevNumTicks = hand.position.numTicks;
        }

        this.render(timeSinceLastTick);
    }

    getLoc(hand) {
        // let radius = hand.position.radius;
        // sum of all smaller radii
        let radius = hand.position.radius;
        let theta = hand.position.theta - Math.PI / 2;
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

        let rotateTiem = 50;

        // remove the current element at index i
        if (hand.element) {
            hand.element.style.setProperty('--rotate-time', rotateTiem + 'ms');
            hand.element.classList.add('remove');
            let toRemove = hand.element;
            setTimeout(() => {
                toRemove.remove();
            }, rotateTiem);
        }

        hand.element = this._readFromStreamI[i]()
        setColor(hand.element, "#ffffff");
        
        // Position new element at current theta position (instant)
        moveTo(hand.element, loc.left, loc.top, 0);
        
        resizeToken(hand.element, hand.width, hand.height);
        
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