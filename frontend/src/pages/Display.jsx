import { useState, useEffect, useRef, useCallback } from 'react';
import api from '../api/client';

const DISPLAY_STYLES = `
  body { background: #000 !important; overflow: hidden !important; }
  .slide-container {
    position: fixed; inset: 0; background: #000; overflow: hidden;
  }
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
  .enter-slide { animation: slideEnter var(--spd) ease both; }
  .leave-slide { animation: slideLeave var(--spd) ease both; }
  @keyframes slideEnter { from { transform: translateX(100%); } to { transform: translateX(0); } }
  @keyframes slideLeave { from { transform: translateX(0); }    to { transform: translateX(-100%); } }

  /* Slide Up */
  .enter-slide-up { animation: slideUpEnter var(--spd) ease both; }
  .leave-slide-up { animation: slideUpLeave var(--spd) ease both; }
  @keyframes slideUpEnter { from { transform: translateY(100%); } to { transform: translateY(0); } }
  @keyframes slideUpLeave { from { transform: translateY(0); }    to { transform: translateY(-100%); } }

  /* Zoom */
  .enter-zoom { animation: zoomEnter var(--spd) ease both; }
  .leave-zoom { animation: fadeOut  var(--spd) ease both; }
  @keyframes zoomEnter { from { opacity: 0; transform: scale(1.06); } to { opacity: 1; transform: scale(1); } }

  /* Cut */
  .enter-none { opacity: 1; }
  .leave-none { opacity: 0; }

  /* Progress bar */
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

export default function Display() {
  const [slides, setSlides]     = useState([]);
  const [config, setConfig]     = useState({
    transition: 'fade', slide_duration: 8,
    transition_speed: 800, loop: true, show_progress: true
  });
  // currentIdx  = the slide currently visible (or leaving)
  // incomingIdx = the slide animating in (null when idle)
  const [currentIdx, setCurrentIdx]   = useState(0);
  const [incomingIdx, setIncomingIdx] = useState(null);
  const [progress, setProgress]       = useState(0);
  const [schedName, setSchedName]     = useState(null);
  const [lastTimestamp, setLastTimestamp] = useState(null);

  const slidesRef      = useRef([]);
  const configRef      = useRef(config);
  const currentIdxRef  = useRef(0);
  const busyRef        = useRef(false); // true while transition is running
  const timerRef       = useRef(null);
  const progressRef    = useRef(null);
  const transitionRef  = useRef(null);

  useEffect(() => { slidesRef.current  = slides;  }, [slides]);
  useEffect(() => { configRef.current  = config;  }, [config]);
  useEffect(() => { currentIdxRef.current = currentIdx; }, [currentIdx]);

  // ── Fetch & poll ──────────────────────────────────────────
  const fetchSlideshow = useCallback(async () => {
    try {
      const res = await api.get('/slideshow/current');
      const { media, config: cfg, timestamp } = res.data;
      if (timestamp !== lastTimestamp) {
        slidesRef.current    = media || [];
        configRef.current    = cfg;
        currentIdxRef.current = 0;
        busyRef.current      = false;
        setSlides(media || []);
        setConfig(cfg);
        setSchedName(cfg.schedule_name);
        setLastTimestamp(timestamp);
        setCurrentIdx(0);
        setIncomingIdx(null);
      }
    } catch (e) { console.error('Fetch error', e); }
  }, [lastTimestamp]);

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

    const speed = Number(configRef.current.transition_speed) || 800;
    busyRef.current = true;

    // Show the incoming slide (it will play its enter-* animation)
    setIncomingIdx(next);

    clearTimeout(transitionRef.current);
    transitionRef.current = setTimeout(() => {
      // Swap: incoming becomes current, hide old slide
      currentIdxRef.current = next;
      setCurrentIdx(next);
      setIncomingIdx(null);
      busyRef.current = false;
    }, speed);
  }, []);

  // ── Timer + progress bar ──────────────────────────────────
  useEffect(() => {
    if (slides.length === 0) return;
    const slide = slides[currentIdx];
    if (!slide || slide.type === 'video') return;

    clearTimeout(timerRef.current);
    clearInterval(progressRef.current);
    setProgress(0);

    const dur   = (Number(slide.duration) || Number(config.slide_duration) || 8) * 1000;
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
  }, [currentIdx, slides, config.slide_duration, advance]);

  // ── Helpers ───────────────────────────────────────────────
  const t       = config.transition || 'fade';
  const speed   = Number(config.transition_speed) || 800;
  const current = slides[currentIdx];
  const incoming = incomingIdx !== null ? slides[incomingIdx] : null;

  // Keys are FIXED ('a' and 'b') so React never unmounts/remounts the divs.
  // We swap which key is on top and change the src, letting the CSS animation play.
  const renderMedia = (item) => {
    if (!item) return null;
    const src = `/uploads/${item.filename}`;
    if (item.type === 'video') {
      return (
        <video key={item.id} src={src} autoPlay muted={false} onEnded={advance}
          style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
      );
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

  return (
    <>
      <style>{`${DISPLAY_STYLES} :root { --spd: ${speed}ms; }`}</style>
      <div className="slide-container">

        {/* Current slide — plays leave animation when incomingIdx is set */}
        <div className={`slide ${incoming ? `leave-${t}` : ''}`}>
          {renderMedia(current)}
        </div>

        {/* Incoming slide — plays enter animation, sits on top */}
        {incoming && (
          <div className={`slide enter-${t}`} style={{ zIndex: 2 }}>
            {renderMedia(incoming)}
          </div>
        )}

        {/* Progress bar */}
        {config.show_progress && !incoming && current?.type !== 'video' && (
          <div className="progress-bar" style={{ width: `${progress}%`, transition: 'width 50ms linear', zIndex: 3 }} />
        )}

        {schedName && <div className="sched-label">{schedName}</div>}
      </div>
    </>
  );
}
