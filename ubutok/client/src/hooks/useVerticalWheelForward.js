import { useEffect } from 'react';

// Intercepts vertical wheel events on a horizontally-scrollable element and
// forwards them to the nearest .feed ancestor as a full-card scroll.
// Needed because overflow-x:scroll containers absorb all wheel events.
export function useVerticalWheelForward(ref, ready = true) {
  useEffect(() => {
    if (!ready) return;
    const el = ref.current;
    if (!el) return;
    let accum = 0;
    let fired = false;
    let idleTimer = null;

    function reset() { accum = 0; fired = false; }

    function onWheel(e) {
      if (Math.abs(e.deltaY) <= Math.abs(e.deltaX)) {
        reset();
        return;
      }
      e.preventDefault();

      clearTimeout(idleTimer);
      idleTimer = setTimeout(reset, 150);

      if (fired) return;
      accum += e.deltaY;
      if (Math.abs(accum) < 50) return;

      const feed = el.closest('.feed');
      if (feed) {
        feed.scrollBy({ top: Math.sign(accum) * window.innerHeight, behavior: 'smooth' });
        fired = true;
        accum = 0;
      }
    }
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => { el.removeEventListener('wheel', onWheel); clearTimeout(idleTimer); };
  }, [ref, ready]);
}
