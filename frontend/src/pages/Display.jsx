import { useState, useEffect, useRef, useCallback } from 'react';
import api from '../api/client';

const DISPLAY_STYLES = `
  body { background: #000 !important; overflow: hidden !important; }
  .slide-container {
    position: fixed; inset: 0; background: #000;
    display: flex; align-items: center; justify-content: center;
    overflow: hidden;
  }
  .slide {
    position: absolute; inset: 0;
    display: flex; align-items: center; justify-content: center;
  }
  .slide img   { width: 100%; height: 100%; object-fit: contain; }
  .slide video { width: 100%; height: 100%; object-fit: contain; }

  /* Fade */
  .enter-fade { animation: fadeIn  var(--spd) ease forwards; }
  .leave-fade { animation: fadeOut var(--spd) ease forwards; }
  @keyframes fadeIn  { from { opacity: 0; } to { opacity: 1; } }
  @keyframes fadeOut { from { opacity: 1; } to { opacity: 0; } }

  /* Slide Left */
  .enter-slide { animation: slideEnter var(--spd) ease forwards; }
  .leave-slide { animation: slideLeave var(--spd) ease forwards; }
  @keyframes slideEnter { from { transform: translateX(100%); } to { transform: translateX(0); } }
  @keyframes slideLeave { from { transform: translateX(0); }    to { transform: translateX(-100%); } }

  /* Slide Up */
  .enter-slide-up { animation: slideUpEnter var(--spd) ease forwards; }
  .leave-slide-up { animation: slideUpLeave var(--spd) ease forwards; }
  @keyframes slideUpEnter { from { transform: translateY(100%); } to { transform: translateY(0); } }
  @keyframes slideUpLeave { from { transform: translateY(0); }    to { transform: translateY(-100%); } }

  /* Zoom */
  .enter-zoom { animation: zoomEnter var(--spd) ease forwards; }
  .leave-zoom { animation: fadeOut  var(--spd) ease forwards; }
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

  /* Schedule label */
  .sched-label {
    position: fixed; bottom: 14px; right: 14px;
    background: rgba(0,0,0,0.4); color: rgba(255,255,255,0.5);
    font-size: 11px; padding: 4px 9px; border-radius: 5px;
    font-family: -apple-system, system-ui, sans-serif;
    z-index: 101; pointer-events: none;
  }
`;

export default function Display() {
  const [slides, setSlides]               = useState([]);
  const [config, setConfig]               = useState({ transition: 'fade', slide_duration: 8, transition_speed: 800, loop: true, show_progress: true });
  const [currentIdx, setCurrentIdx]       = useState(0);
  const [nextIdx, setNextIdx]             = useState(null);
  const [transitioning, setTransitioning] = useState(false);
  const [progress, setProgress]           = useState(0);
  const [schedName, setSchedName]         = useState(null);
  const [lastTimestamp, setLastTimestamp] = useState(null);

  const timerRef      = useRef(null);
  const progressRef   = useRef(null);
  const transitionRef = useRef(null);
  const slidesRef     = useRef(slides);
  const configRef     = useRef(config);
  const transitioningRef = useRef(false);

  // Keep refs in sync so advance() doesn't capture stale state
  useEffect(() => { slidesRef.current = slides; }, [slides]);
  useEffect(() => { configRef.current = config; }, [config]);
  useEffect(() => { transitioningRef.current = transitioning; }, [transitioning]);

  // Fetch current slideshow every 30 seconds
  const fetchSlideshow = useCallback(async () => {
    try {
      const res = await api.get('/slideshow/current');
      const { media, config: cfg, timestamp } = res.data;
      if (timestamp !== lastTimestamp) {
        setSlides(media || []);
        setConfig(cfg);
        setSchedName(cfg.schedule_name);
        setLastTimestamp(timestamp);
        setCurrentIdx(0);
        setNextIdx(null);
        setTransitioning(false);
      }
    } catch (e) {
      console.error('Slideshow fetch error', e);
    }
  }, [lastTimestamp]);

  useEffect(() => {
    fetchSlideshow();
    const poll = setInterval(fetchSlideshow, 30000);
    return () => clearInterval(poll);
  }, [fetchSlideshow]);

  // Advance to the next slide
  const advance = useCallback(() => {
    if (transitioningRef.current) return;
    const total = slidesRef.current.length;
    if (total <= 1) return;

    setCurrentIdx(cur => {
      const next = (cur + 1) % total;
      if (next === 0 && !configRef.current.loop) return cur;

      const speed = Number(configRef.current.transition_speed) || 800;

      setNextIdx(next);
      setTransitioning(true);

      clearTimeout(transitionRef.current);
      transitionRef.current = setTimeout(() => {
        setCurrentIdx(next);
        setNextIdx(null);
        setTransitioning(false);
      }, speed);

      return cur;
    });
  }, []);

  // Auto-advance timer + progress bar
  useEffect(() => {
    if (slides.length === 0) return;
    const current = slides[currentIdx];
    if (!current || current.type === 'video') return;

    clearTimeout(timerRef.current);
    clearInterval(progressRef.current);
    setProgress(0);

    const dur = (Number(current.duration) || Number(config.slide_duration) || 8) * 1000;
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentIdx, slides, config.slide_duration]);

  const t        = config.transition || 'fade';
  const speed    = Number(config.transition_speed) || 800;
  const current  = slides[currentIdx];
  const incoming = nextIdx !== null ? slides[nextIdx] : null;

  const renderSlide = (item, className) => {
    if (!item) return null;
    const src = `/uploads/${item.filename}`;
    return (
      <div key={`${item.id}-${className}`} className={`slide ${className}`}>
        {item.type === 'video'
          ? <video src={src} autoPlay muted={false} onEnded={advance}
              style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
          : <img src={src} alt={item.original_name} />
        }
      </div>
    );
  };

  if (slides.length === 0) {
    return (
      <>
        <style>{DISPLAY_STYLES}</style>
        <div className="slide-container">
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

        {/* Current slide — animates OUT when transitioning */}
        {current && renderSlide(current, transitioning ? `leave-${t}` : '')}

        {/* Incoming slide — animates IN during transition */}
        {transitioning && incoming && renderSlide(incoming, `enter-${t}`)}

        {/* Progress bar */}
        {config.show_progress && !transitioning && current?.type !== 'video' && (
          <div className="progress-bar" style={{ width: `${progress}%`, transition: 'width 50ms linear' }} />
        )}

        {/* Active schedule name */}
        {schedName && <div className="sched-label">{schedName}</div>}
      </div>
    </>
  );
}
