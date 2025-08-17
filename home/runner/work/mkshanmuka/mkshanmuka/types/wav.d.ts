declare module 'wav' {
  import { Readable, Writable } from 'stream';

  export class Reader extends Readable {
    constructor(opts?: any);
  }

  export class Writer extends Writable {
    constructor(opts?: any);
  }
}
