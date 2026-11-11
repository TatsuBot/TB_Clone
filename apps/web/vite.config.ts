import { defineConfig } from 'vite';
import { mkdir, readFile, readdir, stat, unlink, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const saveDirectory = fileURLToPath(new URL('../../saves/', import.meta.url));

function saveArchiveEndpoint() {
  return {
    name: 'save-archive-endpoint',
    configureServer(server: { middlewares: { use: (handler: (req: any, res: any, next: () => void) => void) => void } }) {
      server.middlewares.use((req, res, next) => {
        const pathname = new URL(req.url ?? '/', 'http://localhost').pathname;
        if (pathname === '/__save-archives' && req.method === 'GET') {
          void (async () => {
            try {
              const files = (await readdir(saveDirectory)).filter((name) => name === 'current-save.json' || /^save-\d+\.json$/.test(name));
              const saves = await Promise.all(files.map(async (filename) => ({
                filename,
                modifiedAt: (await stat(`${saveDirectory}/${filename}`)).mtime.toISOString(),
              })));
              saves.sort((a, b) => a.filename === 'current-save.json' ? -1 : b.filename === 'current-save.json' ? 1 : b.modifiedAt.localeCompare(a.modifiedAt));
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify(saves));
            } catch (error) {
              if ((error as { code?: string }).code === 'ENOENT') {
                res.setHeader('Content-Type', 'application/json');
                res.end('[]');
              } else {
                res.statusCode = 500;
                res.end('Could not list archived saves');
              }
            }
          })();
          return;
        }
        if (pathname.startsWith('/__save-archives/')) {
          if (req.method !== 'GET') {
            res.statusCode = 405;
            res.end('Method not allowed');
            return;
          }
          const filename = decodeURIComponent(pathname.slice('/__save-archives/'.length));
          if (filename !== 'current-save.json' && !/^save-\d+\.json$/.test(filename)) {
            res.statusCode = 400;
            res.end('Invalid save filename');
            return;
          }
          void readFile(`${saveDirectory}/${filename}`, 'utf8').then((contents) => {
            res.setHeader('Content-Type', 'application/json');
            res.end(contents);
          }).catch(() => {
            res.statusCode = 404;
            res.end('Archived save not found');
          });
          return;
        }
        if (pathname === '/__save-current') {
          if (req.method !== 'POST') {
            res.statusCode = 405;
            res.end('Method not allowed');
            return;
          }
          const decoder = new TextDecoder();
          let body = '';
          let size = 0;
          req.on('data', (chunk: Uint8Array) => {
            size += chunk.length;
            if (size > 5_000_000) {
              res.statusCode = 413;
              res.end('Save is too large');
              req.destroy();
              return;
            }
            body += decoder.decode(chunk, { stream: true });
          });
          req.on('end', async () => {
            try {
              body += decoder.decode();
              const save = JSON.parse(body) as { version?: number; characters?: unknown[]; companions?: unknown[] };
              if (save.version !== 1 || !Array.isArray(save.characters) || !Array.isArray(save.companions)) {
                throw new Error('Invalid save');
              }
              await mkdir(saveDirectory, { recursive: true });
              const currentSavePath = `${saveDirectory}/current-save.json`;
              try { await unlink(currentSavePath); } catch (error) {
                if ((error as { code?: string }).code !== 'ENOENT') throw error;
              }
              await writeFile(currentSavePath, JSON.stringify(save, null, 2), { flag: 'wx' });
              res.statusCode = 200;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ ok: true }));
            } catch {
              res.statusCode = 400;
              res.end('Could not save game');
            }
          });
          return;
        }
        if (pathname !== '/__save-archive') return next();
        if (req.method !== 'POST') {
          res.statusCode = 405;
          res.end('Method not allowed');
          return;
        }

        const decoder = new TextDecoder();
        let body = '';
        let size = 0;
        req.on('data', (chunk: Uint8Array) => {
          size += chunk.length;
          if (size > 5_000_000) {
            res.statusCode = 413;
            res.end('Save archive is too large');
            req.destroy();
            return;
          }
          body += decoder.decode(chunk, { stream: true });
        });
        req.on('end', async () => {
          try {
            body += decoder.decode();
            const payload = JSON.parse(body) as { archivedAt?: string; save?: string };
            if (typeof payload.save !== 'string') throw new Error('Missing save data');
            const archivedAt = typeof payload.archivedAt === 'string' ? payload.archivedAt : new Date().toISOString();
            const timestamp = archivedAt.replace(/[^0-9]/g, '').slice(0, 17) || Date.now().toString();
            await mkdir(saveDirectory, { recursive: true });
            await writeFile(`${saveDirectory}/save-${timestamp}.json`, JSON.stringify({ archivedAt, save: JSON.parse(payload.save) }, null, 2), { flag: 'wx' });
            res.statusCode = 201;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ ok: true }));
          } catch (error) {
            // A repeated archive request for the same timestamp is already safely stored.
            if ((error as { code?: string }).code === 'EEXIST') {
              res.statusCode = 200;
              res.end('Already archived');
              return;
            }
            res.statusCode = 400;
            res.end('Could not archive save');
          }
        });
      });
    },
  };
}

export default defineConfig({ base: './', plugins: [saveArchiveEndpoint()] });
