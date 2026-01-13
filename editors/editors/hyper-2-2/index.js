// Main library entry point
import { Game } from './game.js';
import eventBus from './src/EventBus.js';
import { TextStreamEntity } from './streams/TextStreamEntity.js';
import { TextStream } from './streams/TextStream.js';
import { ClassicDomTextStreamComponent } from './streams/ClassicDomTextStreamComponent.js';

// Export public API
export {
  Game,
  eventBus,
  TextStreamEntity,
  TextStream,
  ClassicDomTextStreamComponent
};

// Default export for convenience
export default {
  Game,
  eventBus,
  TextStreamEntity,
  TextStream,
  ClassicDomTextStreamComponent
};



