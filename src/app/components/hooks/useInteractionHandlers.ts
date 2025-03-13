import { useEffect, useRef } from 'react';
import Decimal from 'decimal.js';

interface InteractionState {
  dragRef: React.MutableRefObject<{
    isDragging: boolean;
    lastX: number;
    lastY: number;
  }>;
  pinchRef: React.MutableRefObject<{
    isPinching: boolean;
    distance: number;
  }>;
  panOffsetRef: React.MutableRefObject<{
    x: Decimal;
    y: Decimal;
  }>;
}

interface UseInteractionHandlersProps {
  canvasRef: React.RefObject<HTMLCanvasElement>;
  zoomLevel: Decimal;
  setZoomLevel: (zoom: Decimal) => void;
  mounted: boolean;
}

export function useInteractionHandlers({
  canvasRef,
  zoomLevel,
  setZoomLevel,
  mounted
}: UseInteractionHandlersProps): InteractionState {
  const dragRef = useRef({ isDragging: false, lastX: 0, lastY: 0 });
  const pinchRef = useRef({ isPinching: false, distance: 0 });
  const panOffsetRef = useRef({ x: new Decimal(0), y: new Decimal(0) });

  useEffect(() => {
    if (!mounted) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    // Calculate distance between two touch points
    const getTouchDistance = (touch1: Touch, touch2: Touch): number => {
      const dx = touch1.clientX - touch2.clientX;
      const dy = touch1.clientY - touch2.clientY;
      return Math.sqrt(dx * dx + dy * dy);
    };

    // Get center point between two touches
    const getTouchCenter = (touch1: Touch, touch2: Touch): { x: number, y: number } => {
      return {
        x: (touch1.clientX + touch2.clientX) / 2,
        y: (touch1.clientY + touch2.clientY) / 2
      };
    };

    // Mouse event handlers
    const handleMouseDown = (e: MouseEvent) => {
      dragRef.current.isDragging = true;
      dragRef.current.lastX = e.clientX;
      dragRef.current.lastY = e.clientY;
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!dragRef.current.isDragging) return;

      const deltaX = new Decimal(e.clientX - dragRef.current.lastX);
      const deltaY = new Decimal(e.clientY - dragRef.current.lastY);
      const zoomAdjustedDeltaX = deltaX.times(0.0015).div(zoomLevel);
      const zoomAdjustedDeltaY = deltaY.times(0.0015).div(zoomLevel);

      panOffsetRef.current.x = panOffsetRef.current.x.minus(zoomAdjustedDeltaX);
      panOffsetRef.current.y = panOffsetRef.current.y.plus(zoomAdjustedDeltaY);

      dragRef.current.lastX = e.clientX;
      dragRef.current.lastY = e.clientY;
    };

    const handleMouseUp = () => {
      dragRef.current.isDragging = false;
    };

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();

      const zoomFactor = new Decimal(1.1);
      const zoomDirection = e.deltaY > 0 ? new Decimal(1).div(zoomFactor) : zoomFactor;

      const ndcX = new Decimal((e.clientX / canvas.clientWidth * 2.0 - 1.0) * (canvas.width / canvas.height));
      const ndcY = new Decimal(-(e.clientY / canvas.clientHeight * 2.0 - 1.0));

      const fractalX = ndcX.div(zoomLevel).plus(panOffsetRef.current.x);
      const fractalY = ndcY.div(zoomLevel).plus(panOffsetRef.current.y);

      const newZoomLevel = zoomLevel.times(zoomDirection);
      setZoomLevel(newZoomLevel);

      panOffsetRef.current.x = fractalX.minus(ndcX.div(newZoomLevel));
      panOffsetRef.current.y = fractalY.minus(ndcY.div(newZoomLevel));
    };

    // Touch event handlers
    const handleTouchStart = (e: TouchEvent) => {
      e.preventDefault();

      if (e.touches.length === 1) {
        dragRef.current.isDragging = true;
        dragRef.current.lastX = e.touches[0].clientX;
        dragRef.current.lastY = e.touches[0].clientY;
      } else if (e.touches.length === 2) {
        dragRef.current.isDragging = false;
        pinchRef.current.isPinching = true;
        pinchRef.current.distance = getTouchDistance(e.touches[0], e.touches[1]);
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      e.preventDefault();

      if (dragRef.current.isDragging && e.touches.length === 1) {
        const touch = e.touches[0];
        const deltaX = new Decimal(touch.clientX - dragRef.current.lastX);
        const deltaY = new Decimal(touch.clientY - dragRef.current.lastY);
        const zoomAdjustedDeltaX = deltaX.times(0.0015).div(zoomLevel);
        const zoomAdjustedDeltaY = deltaY.times(0.0015).div(zoomLevel);

        panOffsetRef.current.x = panOffsetRef.current.x.minus(zoomAdjustedDeltaX);
        panOffsetRef.current.y = panOffsetRef.current.y.plus(zoomAdjustedDeltaY);

        dragRef.current.lastX = touch.clientX;
        dragRef.current.lastY = touch.clientY;
      }
      else if (pinchRef.current.isPinching && e.touches.length === 2) {
        const newDistance = getTouchDistance(e.touches[0], e.touches[1]);
        const zoomFactor = new Decimal(newDistance / pinchRef.current.distance);
        
        const center = getTouchCenter(e.touches[0], e.touches[1]);
        
        const ndcX = new Decimal((center.x / canvas.clientWidth * 2.0 - 1.0) * (canvas.width / canvas.height));
        const ndcY = new Decimal(-(center.y / canvas.clientHeight * 2.0 - 1.0));

        const fractalX = ndcX.div(zoomLevel).plus(panOffsetRef.current.x);
        const fractalY = ndcY.div(zoomLevel).plus(panOffsetRef.current.y);

        const newZoomLevel = zoomLevel.times(zoomFactor);
        setZoomLevel(newZoomLevel);

        panOffsetRef.current.x = fractalX.minus(ndcX.div(newZoomLevel));
        panOffsetRef.current.y = fractalY.minus(ndcY.div(newZoomLevel));

        pinchRef.current.distance = newDistance;
      }
    };

    const handleTouchEnd = (e: TouchEvent) => {
      e.preventDefault();
      
      if (e.touches.length < 2) {
        pinchRef.current.isPinching = false;
      }
      
      if (e.touches.length === 0) {
        dragRef.current.isDragging = false;
      } 
      else if (e.touches.length === 1 && !dragRef.current.isDragging) {
        dragRef.current.isDragging = true;
        dragRef.current.lastX = e.touches[0].clientX;
        dragRef.current.lastY = e.touches[0].clientY;
      }
    };

    // Add event listeners
    canvas.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    canvas.addEventListener('wheel', handleWheel, { passive: false });
    canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
    canvas.addEventListener('touchmove', handleTouchMove, { passive: false });
    canvas.addEventListener('touchend', handleTouchEnd, { passive: false });
    canvas.addEventListener('touchcancel', handleTouchEnd, { passive: false });

    // Cleanup
    return () => {
      canvas.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      canvas.removeEventListener('wheel', handleWheel);
      canvas.removeEventListener('touchstart', handleTouchStart);
      canvas.removeEventListener('touchmove', handleTouchMove);
      canvas.removeEventListener('touchend', handleTouchEnd);
      canvas.removeEventListener('touchcancel', handleTouchEnd);
    };
  }, [mounted, canvasRef, zoomLevel, setZoomLevel]);

  return { dragRef, pinchRef, panOffsetRef };
} 