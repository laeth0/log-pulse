/** Provides the current time to application services. */
export abstract class Clock {
  abstract now(): Date;
}
