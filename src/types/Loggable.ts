export type ConsoleLogger = Pick<Console, 'debug' | 'error' | 'info' | 'log'>;

export interface Loggable<Logger extends ConsoleLogger> {
  logger: Logger;
}
