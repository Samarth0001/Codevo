
/**
 * A utility function to merge Tailwind CSS classes
 */
export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(' ');
}

// Simple event bus for AI ↔ editor communication
type EventMap = {
  'ai:requestSelection': void;
  'editor:selection': { text: string; range?: any };
  'ai:applyGenerated': { code: string; strategy?: 'replaceSelection' | 'insertAtCursor' | 'replaceFile' };
  'ai:requestFileContext': void;
  'editor:fileContext': { path?: string; content: string };
  'ai:requestFileList': void;
  'editor:fileList': { files: string[]; active?: string };
  'ai:requestSpecificFile': { path: string };
  'ai:showDiff': { oldCode: string; newCode: string; fileName: string };
};

class SimpleEventBus {
  private listeners: { [K in keyof EventMap]?: Array<(payload: EventMap[K]) => void> } = {};

  on<K extends keyof EventMap>(event: K, handler: (payload: EventMap[K]) => void) {
    const arr = (this.listeners[event] as Array<(payload: EventMap[K]) => void> | undefined) || [];
    arr.push(handler);
    this.listeners[event] = arr as any;
    return () => this.off(event, handler);
  }

  off<K extends keyof EventMap>(event: K, handler: (payload: EventMap[K]) => void) {
    const arr = this.listeners[event] as Array<(payload: EventMap[K]) => void> | undefined;
    if (!arr) return;
    this.listeners[event] = arr.filter(h => h !== handler) as any;
  }

  emit<K extends keyof EventMap>(event: K, payload: EventMap[K]) {
    const arr = this.listeners[event] as Array<(payload: EventMap[K]) => void> | undefined;
    if (!arr) return;
    arr.forEach(h => h(payload));
  }
}

export const aiBus = new SimpleEventBus();