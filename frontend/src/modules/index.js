import { coreModule } from './core.js';
import { processModule } from './process.js';
import { networkModule } from './network.js';
import { memoryModule } from './memory.js';
import { signalModule } from './signal.js';
import { archiveModule } from './archive.js';
import { systemLogModule } from './systemLog.js';
import { settingsModule } from './settings.js';
import { detectionModule } from './detection.js';
import { prototypeModule } from './prototype.js';
import { messagesModule } from './messages.js';

export const modules = [
  coreModule,
  processModule,
  networkModule,
  memoryModule,
  signalModule,
  archiveModule,
  detectionModule,
  systemLogModule,
  prototypeModule,
  messagesModule,
  settingsModule,
];
