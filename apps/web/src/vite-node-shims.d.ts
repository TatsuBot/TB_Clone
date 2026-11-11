declare module 'node:fs/promises' {
  export function mkdir(path: string, options: { recursive: true }): Promise<void>;
  export function readFile(path: string, encoding: 'utf8'): Promise<string>;
  export function readdir(path: string): Promise<string[]>;
  export function stat(path: string): Promise<{ mtime: Date }>;
  export function writeFile(path: string, data: string, options: { flag: 'wx' }): Promise<void>;
}

declare module 'node:url' {
  export function fileURLToPath(url: URL): string;
}
