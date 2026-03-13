import { useState, useEffect, useRef, useCallback } from 'react';
import api from '../api/client';

// CSS injected directly for the display (no sidebar, no chrome)
const DISPLAY_STYLES = `
  body { background: #000 !important; overflow: hidden !important; }
  .slide-container {
    position: fixed; inset: 0; background: #000;
    display: flex; align-items: center; justify-content: center;
  }
  .slide { position: absolute; inset: 0; }
  .slide img, .slide video { width: 100%; height: 100%; object-fit: contain; }

  /* Transitions */
  .entering-fade { animation: fadeIn var(--speed) forwards; }
  .leaving-fade  { animation: fadeOut var(--speed) forwards; }
  @keyframes fadeIn  { from { opacity: 0; } to { opacity: 1; } }
  @keyframes fadeOut { from { opacity: 1; } to { opacity: 0; } }

  .entering-slide { animation: slideIn var(--speed) forwards; }
  .leaving-slide  { animation: slideOut var(--speed) forwards; }
  @keyframes slideIn  { from { transform: translateX(100%); } to { transform: none; } }
  @keyframes slideOut { from { transform: none; } to { transform: translateX(-100%); } }

  .entering-slide-up { animation: slideUpIn var(--speed) forwards; }
  .leaving-slide-up  { animation: slideUpOut var(--speed) forwards; }
  @keyframes slideUpIn  { from { transform: translateY(100%); } to { transform: none; } }
  @keyframes slideUpOut { from { transform: none; } to { transform: translateY(-100%); } }

  .entering-zoom { animation: zoomIn var(--speed) forwards; }
  .leaving-zoom  { animation: fadeOut var(--speed) forwards; }
  @keyframes zoomIn { from { opacity: 0; transform: scale(1.05); } to { opacity: 1; transform: scale(1); } }

  .entering-none { opacity: 1; }
  .leaving-none  { opacity: 0; }

  .progress-bar {
    position: fixed; bottom: 0; left: 0; height: 3px;
    background: rgba(99,102,241,0.8);
    transition: width linear;
    z-index: 100;
  }
  .info-overlay {
    position: fixed; bottom: 12px; right: 12px;
    background: rgba(0,0,0,0.5); color: rgba(255,255,255,0.6);
    font-size: 11px; padding: 4px 8px; border-radius: 4px;
    font-family: monospace; z-index: 101;
  }
`;

export default function Display() {
  const [slides, setSlides] = useState([]);
  const [config, setConfig] = useState({ transition: 'fade', slide_duration: 8, transition_speed: 800, loop: true, show_progress: true });
  const [currentIdx, setCurrentIdx] = useState(0);
  const [prevIdx, setPrevIdx] = useState(null);
  const [transitioning, setTransitioning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [schedName, setSchedName] = useState(null);
  const [lastTimestamp, setLastTimestamp] = useState(null);
  const timerRef = useRef(null);
  const progressRef = useRef(null);
  const videoRef = useRef(null);

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
      }
    } catch (e) {
      console.error('Failed to fetch slideshow', e);
    }
  }, [lastTimestamp]);

  useEffect(() => {
    fetchSlideshow();
    // Poll for content changes every 30 seconds
    const poll = setInterval(fetchSlideshow, 30000);
    return () => clearInterval(poll);
  }, [fetchSlideshow]);

  // Advance to next slide
  const nextSlide = useCallback(() => {
    if (slides.length === 0) return;
    setTransitioning(true);
    setPrevIdx(currentIdx);
    const next = (currentIdx + 1) % slides.length;
    if (next === 0 && !config.loop) return;

    setTimeout(() => {
      setCurrentIdx(next);
      setTransitioning(false);
      setPrevIdx(null);
    }, config.transition_speed || 800);
  }, [slides.length, currentIdx, config.loop, config.transition_speed]);

  // Progress bar and auto-advance
  useEffect(() => {
    if (slides.length === 0) return;
    const current = slides[currentIdx];
    if (!current) return;

    // Videos auto-advance via onEnded
    if (current.type === 'video') {
      setProgress(0);
      return;
    }

    const dur = (current.duration || config.slide_duration || 8) * 1000;
    const start = Date.now();

    setProgress(0);
    clearInterval(progressRef.current);
    clearTimeout(timerRef.current);

    progressRef.current = setInterval(() => {
      const elapsed = Date.now() - start;
      setProgress(Math.min((elapsed / dur) * 100, 100));
    }, 50);

    timerRef.current = setTimeout(() => {
      clearInterval(progressRef.current);
      nextSlide();
    }, dur);

    return () => {
      clearTimeout(timerRef.current);
      clearInterval(progressRef.current);
    };
  }, [currentIdx, slides, config.slide_duration]);

  const current = slides[currentIdx];
  const prev = prevIdx !== null ? slides[prevIdx] : null;
  const transition = config.transition || 'fade';
  const speed = `${config.transition_speed || 800}ms`;

  const renderMedia = (item, className) => {
    if (!item) return null;
    const src = `/uploads/${item.filename}`;
    if (item.type === 'video') {
      return (
        <div className={`slide ${className}`}>
          <video
            ref={videoRef}
            src={src}
            autoPlay
            muted={false}
            onEnded={nextSlide}
            style={{ width: '100%', height: '100%', objectFit: 'contain' }}
          />
        </div>
      );
    }
    return (
      <div className={`slide ${className}`}>
        <img src={src} alt={item.original_name} />
      </div>
    );
  };

  if (slides.length === 0) {
    return (
      <>
        <style>{DISPLAY_STYLES}</style>
        <div className="slide-container" style={{ flexDirection: 'column', gap: '16px' }}>
          <div style={{ fontSize: '48px', opacity: 0.3 }}>📺</div>
          <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '16px' }}>No content to display</div>
          <div style={{ color: 'rgba(255,255,255,0.2)', fontSize: '12px' }}>Upload media in the back office</div>
        </div>
      </>
    );
  }

  return (
    <>
      <style>{`${DISPLAY_STYLES} :root { --speed: ${speed}; }`}</style>
      <div className="slide-container">
        {/* Previous slide (leaving) */}
        {transitioning && prev && renderMedia(prev, `leaving-${transition}`)}
        {/* Current slide (entering or static) */}
        {current && renderMedia(current, transitioning ? `entering-${transition}` : '')}

        {/* Progress bar */}
        {config.show_progress && current?.type !== 'video' && (
          <div className="progress-bar" style={{ width: `${progress}%` }} />
        )}

        {/* Schedule indicator (fades after 3s) */}
        {schedName && (
          <div className="info-overlay">{schedName}</div>
        )}
      </div>
    </>
  );
}
