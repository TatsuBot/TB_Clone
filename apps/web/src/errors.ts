/**
 * Imported FIRST by main.ts so it is installed before any other module runs.
 * Any uncaught error now appears on screen (with a reset-save escape hatch)
 * instead of leaving a silent black page.
 */
const SAVE_KEY = 'pincer-save-v1';

let box: HTMLElement | null = null;

export function reportFatal(err: unknown, where = 'error'): void {
  console.error(`[${where}]`, err);
  const text =
    err instanceof Error ? `${err.name}: ${err.message}\n\n${err.stack ?? ''}` : String(err);

  if (!box) {
    box = document.createElement('div');
    box.id = 'fatal-error';
    const title = document.createElement('h2');
    title.textContent = 'Something went wrong';
    const hint = document.createElement('p');
    hint.textContent =
      'The game hit an error. If it keeps happening, try “Reset saved data” (it deletes your local save).';
    const pre = document.createElement('pre');
    pre.id = 'fatal-error-text';
    const row = document.createElement('div');
    row.className = 'fatal-actions';
    const dismiss = document.createElement('button');
    dismiss.type = 'button';
    dismiss.textContent = 'Dismiss';
    dismiss.addEventListener('click', () => box?.remove(), { once: false });
    const reset = document.createElement('button');
    reset.type = 'button';
    reset.textContent = 'Reset saved data & reload';
    reset.addEventListener('click', () => {
      try {
        localStorage.removeItem(SAVE_KEY);
      } catch {
        /* ignore */
      }
      location.reload();
    });
    row.append(dismiss, reset);
    box.append(title, hint, pre, row);
  }
  const pre = box.querySelector('#fatal-error-text');
  if (pre) pre.textContent = text;
  if (!box.isConnected) document.body.appendChild(box);
}

window.addEventListener('error', (e) => {
  // Ignore noise that is not our code (extensions, benign browser notices)
  if (/^(chrome|moz|safari-web)-extension:/.test(e.filename ?? '')) return;
  if (!e.error && /ResizeObserver/.test(e.message)) return;
  reportFatal(e.error ?? e.message, 'error');
});
window.addEventListener('unhandledrejection', (e) => reportFatal(e.reason, 'unhandledrejection'));
