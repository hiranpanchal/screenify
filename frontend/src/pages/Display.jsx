import { useState, useEffect, useRef, useCallback } from 'react';
import api from '../api/client';

const DISPLAY_STYLES = `
  body { background: #000 !important; overflow: hidden !important; }
  .slide-container { position: fixed; inset: 0; background: #000; overflow: hidden; }
  .slide {
    position: absolute; inset: 0;
    display: flex; align-items: center; justify-content: center;
  }
  .slide img   { width: 100%; height: 100%; object-fit: contain; }
  .slide video { width: 100%; height: 100%; object-fit: contain; }

  /* Fade */
  .enter-fade { animation: fadeIn  var(--spd) ease both; }
  .leave-fade { animation: fadeOut var(--spd) ease both; }
  @keyframes fadeIn  { from { opacity: 0; } to { opacity: 1; } }
  @keyframes fadeOut { from { opacity: 1; } to { opacity: 0; } }

  /* Slide Left */
  .enter-slide { animation: slideInRight var(--spd) ease both; }
  .leave-slide { animation: slideOutLeft var(--spd) ease both; }
  @keyframes slideInRight  { from { transform: translateX(100%); } to { transform: translateX(0); } }
  @keyframes slideOutLeft  { from { transform: translateX(0); }    to { transform: translateX(-100%); } }

  /* Slide Up */
  .enter-slide-up { animation: slideInUp  var(--spd) ease both; }
  .leave-slide-up { animation: slideOutUp var(--spd) ease both; }
  @keyframes slideInUp  { from { transform: translateY(100%); } to { transform: translateY(0); } }
  @keyframes slideOutUp { from { transform: translateY(0); }    to { transform: translateY(-100%); } }

  /* Zoom */
  .enter-zoom { animation: zoomIn  var(--spd) ease both; }
  .leave-zoom { animation: fadeOut var(--spd) ease both; }
  @keyframes zoomIn { from { opacity: 0; transform: scale(1.06); } to { opacity: 1; transform: scale(1); } }

  /* Cut */
  .enter-none { opacity: 1; }
  .leave-none { opacity: 0; }

  .progress-bar {
    position: fixed; bottom: 0; left: 0; height: 3px;
    background: rgba(255,255,255,0.6);
    z-index: 100; pointer-events: none;
  }
  .sched-label {
    position: fixed; bottom: 14px; right: 14px;
    background: rgba(0,0,0,0.4); color: rgba(255,255,255,0.5);
    font-size: 11px; padding: 4px 9px; border-radius: 5px;
    font-family: -apple-system, system-ui, sans-serif;
    z-index: 101; pointer-events: none;
  }
`;

/*
 * Each entry in `layers` has a STABLE `id` that never changes while
 * the slide is visible. Only the `phase` field changes (entering →
 * stable → leaving), so React updates the className in-place instead
 * of remounting — which is what allows CSS animations to play.
 */

let layerCounter = 0;
const makeLayer = (item, phase) => ({ item, phase, id: `layer-${layerCounter++}` });

export default function Display() {
  const [layers, setLayers]           = useState([]);   // active slide layers
  const [slides, setSlides]           = useState([]);
  const [config, setConfig]           = useState({ transition: 'fade', slide_duration: 8, transition_speed: 800, loop: true, show_progress: true });
  const [progress, setProgress]       = useState(0);
  const [schedName, setSchedName]     = useState(null);
  const [lastHash, setLastHash]       = useState(null);

  const slidesRef      = useRef([]);
  const configRef      = useRef(config);
  const currentIdxRef  = useRef(0);
  const busyRef        = useRef(false);
  const timerRef       = useRef(null);
  const progressRef    = useRef(null);

  useEffect(() => { slidesRef.current = slides; }, [slides]);
  useEffect(() => { configRef.current = config; }, [config]);

  // ── Fetch & poll ──────────────────────────────────────────
  const fetchSlideshow = useCallback(async () => {
    try {
      const res = await api.get('/slideshow/current');
      const { media, config: cfg, hash } = res.data;

      if (hash !== lastHash) {
        const items = media || [];
        slidesRef.current   = items;
        configRef.current   = cfg;
        currentIdxRef.current = 0;
        busyRef.current     = false;

        setSlides(items);
        setConfig(cfg);
        setSchedName(cfg.schedule_name);
        setLastHash(hash);

        // Show first slide immediately
        if (items.length > 0) {
          setLayers([makeLayer(items[0], 'entering')]);
          setTimeout(() => {
            setLayers(prev => prev.map(l => ({ ...l, phase: 'stable' })));
          }, Number(cfg.transition_speed) || 800);
        }
      }
    } catch (e) { console.error('Fetch error', e); }
  }, [lastHash]);

  useEffect(() => {
    fetchSlideshow();
    const poll = setInterval(fetchSlideshow, 30000);
    return () => clearInterval(poll);
  }, [fetchSlideshow]);

  // ── Advance ───────────────────────────────────────────────
  const advance = useCallback(() => {
    if (busyRef.current) return;
    const total = slidesRef.current.length;
    if (total <= 1) return;

    const cur   = currentIdxRef.current;
    const next  = (cur + 1) % total;
    if (next === 0 && !configRef.current.loop) return;

    const speed     = Number(configRef.current.transition_speed) || 800;
    const nextItem  = slidesRef.current[next];

    busyRef.current = true;
    currentIdxRef.current = next;

    // Mark all existing layers as leaving, add new entering layer
    setLayers(prev => [
      ...prev.map(l => ({ ...l, phase: 'leaving' })),
      makeLayer(nextItem, 'entering'),
    ]);

    // After animation: remove leaving layers, stabilise entering
    setTimeout(() => {
      setLayers(prev => prev
        .filter(l => l.phase !== 'leaving')
        .map(l => ({ ...l, phase: 'stable' }))
      );
      busyRef.current = false;
    }, speed);
  }, []);

  // ── Timer + progress ──────────────────────────────────────
  useEffect(() => {
    const currentItem = slidesRef.current[currentIdxRef.current];
    if (!currentItem || currentItem.type === 'video') return;

    clearTimeout(timerRef.current);
    clearInterval(progressRef.current);
    setProgress(0);

    const dur   = (Number(currentItem.duration) || Number(configRef.current.slide_duration) || 8) * 1000;
    const start = Date.now();

    progressRef.current = setInterval(() => {
      setProgress(Math.min(((Date.now() - start) / dur) * 100, 100));
    }, 50);

    timerRef.current = setTimeout(() => {
      clearInterval(progressRef.current);
      advance();
    }, dur);

    return () => {
      clearTimeout(timerRef.current);
      clearInterval(progressRef.current);
    };
  // Re-run when layers change (i.e. after each advance completes)
  }, [layers, advance]);

  // ── Render ─────────────────────────────────────────────────
  const t     = config.transition || 'fade';
  const speed = Number(config.transition_speed) || 800;

  const renderMedia = (item) => {
    if (!item) return null;
    const src = `/uploads/${item.filename}`;
    if (item.type === 'video') {
      return <video key={item.id} src={src} autoPlay muted={false} onEnded={advance}
        style={{ width: '100%', height: '100%', objectFit: 'contain' }} />;
    }
    return <img key={item.id} src={src} alt={item.original_name} />;
  };

  if (slides.length === 0) {
    return (
      <>
        <style>{DISPLAY_STYLES}</style>
        <div className="slide-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ color: 'rgba(255,255,255,0.2)', fontSize: '14px', fontFamily: 'system-ui, sans-serif' }}>
            No content — upload media in the back office
          </div>
        </div>
      </>
    );
  }

  const isTransitioning = layers.some(l => l.phase === 'leaving');

  return (
    <>
      <style>{`${DISPLAY_STYLES} :root { --spd: ${speed}ms; }`}</style>
      <div className="slide-container">

        {layers.map(({ item, phase, id }, i) => (
          /*
           * The key `id` is STABLE — it never changes while this layer
           * is alive. Phase changes only update the className in place,
           * so the browser fires the CSS animation without a remount.
           */
          <div
            key={id}
            className={`slide ${phase === 'entering' ? `enter-${t}` : phase === 'leaving' ? `leave-${t}` : ''}`}
            style={{ zIndex: i }}
          >
            {renderMedia(item)}
          </div>
        ))}

        {config.show_progress && !isTransitioning && layers[0]?.item?.type !== 'video' && (
          <div className="progress-bar" style={{ width: `${progress}%`, transition: 'width 50ms linear', zIndex: 99 }} />
        )}

        {schedName && <div className="sched-label">{schedName}</div>}
      </div>
    </>
  );
}
