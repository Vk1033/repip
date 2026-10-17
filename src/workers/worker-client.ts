import { WorkerInMessage, WorkerOutMessage } from './protocol';

export class WorkerClient {
  private worker: Worker;
  private listeners: Set<(msg: WorkerOutMessage) => void> = new Set();

  constructor(worker?: Worker) {
    this.worker = worker ?? new Worker(
      new URL('./simulation.worker.ts', import.meta.url),
      { type: 'module' }
    );

    this.worker.onmessage = (event: MessageEvent<WorkerOutMessage>) => {
      this.listeners.forEach(fn => fn(event.data));
    };
  }

  send(message: WorkerInMessage): void {
    this.worker.postMessage(message);
  }

  onMessage(callback: (msg: WorkerOutMessage) => void): () => void {
    this.listeners.add(callback);
    return () => {
      this.listeners.delete(callback);
    };
  }

  terminate(): void {
    this.worker.terminate();
    this.listeners.clear();
  }
}
