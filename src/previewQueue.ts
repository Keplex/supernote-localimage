export type PreviewStatus = 'idle' | 'waiting' | 'rendering';
export const PREVIEW_DELAY = 500;

/** One render at a time; only the latest settled input may reach the screen. */
export class PreviewQueue<Input, Output> {
  private revision = 0;
  private timer: ReturnType<typeof setTimeout> | undefined;
  private pending: {input: Input; revision: number; ready: boolean} | undefined;
  private running = false;
  private render: (input: Input) => Promise<Output>;
  private publish: (output: Output) => void;
  private failed: (error: unknown) => void;
  private status: (status: PreviewStatus) => void;
  constructor(render: (input: Input) => Promise<Output>, publish: (output: Output) => void,
    failed: (error: unknown) => void, status: (status: PreviewStatus) => void) {
    this.render = render; this.publish = publish; this.failed = failed; this.status = status;
  }

  request(input: Input, immediate = false) {
    if (this.timer !== undefined) {clearTimeout(this.timer);}
    this.pending = {input, revision: ++this.revision, ready: immediate};
    this.status(immediate ? 'rendering' : 'waiting');
    if (immediate) {void this.pump();}
    else {this.timer = setTimeout(() => {
      if (this.pending) {this.pending.ready = true; void this.pump();}
    }, PREVIEW_DELAY);}
  }
  cancel() {
    if (this.timer !== undefined) {clearTimeout(this.timer);}
    this.pending = undefined; ++this.revision;
    this.status('idle');
  }
  private async pump() {
    if (this.running || !this.pending?.ready) {return;}
    const job = this.pending; this.pending = undefined; this.running = true;
    this.status('rendering');
    try {
      const result = await this.render(job.input);
      if (job.revision === this.revision) {this.publish(result);}
    } catch (error) {
      if (job.revision === this.revision) {this.failed(error);}
    } finally {
      this.running = false;
      if (job.revision === this.revision) {this.status('idle');}
      void this.pump();
    }
  }
}
