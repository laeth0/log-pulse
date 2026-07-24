import { Injectable } from '@nestjs/common';

import { Clock } from './clock';

/** Uses the system clock in production. */
@Injectable()
export class SystemClock implements Clock {
  now(): Date {
    return new Date();
  }
}
