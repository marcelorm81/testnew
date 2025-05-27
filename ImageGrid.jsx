import React, { useState, useRef, useCallback, useEffect } from 'react';
import { motion, useMotionValue, animate } from 'framer-motion';
import ImageTile from './ImageTile.jsx';

const MIN_SPACING_DESKTOP = 30; 
const MAX_SPACING_DESKTOP = 70;
const MIN_SPACING_MOBILE = 15;
const MAX_SPACING_MOBILE = 25;

const BASE_ASPECT_RATIO = 3 / 4; 
const RENDER_BUFFER_FACTOR = 0.8; 
const MAX_RANDOM_OFFSET_FACTOR = 0.2; 

const ImageGrid = ({ 
    images, 
    onFocusedProductChange, 
    onIsSettledChange, 
    onProductImageClick,
    onInteractingChange, // New prop
    isInteracting // New prop
}) => {
  const viewportRef = useRef(null);
  const gridRef = useRef(null);

  const panX = useMotionValue(0);
  const panY = useMotionValue(0);
  const rotateX = useMotionValue(0); 
  const rotateY = useMotionValue(0); 

  const [layoutConfig, setLayoutConfig] = useState({
    imageWidth: 0,
    imageHeight: 0,
    spacing: 30,
    numColsEffective: 3,
    tileAndSpacingWidth: 0,
    tileAndSpacingHeight: 0,
  });

  const lastFocusedVirtualCellRef = useRef(null); 
  // isUserInteractingOrSnapping is now primarily for onIsSettledChange, 
  // while App.jsx's isInteracting handles broader UI state.
  const [isUserInteractingOrSnappingLocal, setIsUserInteractingOrSnappingLocal] = useState(false);


  useEffect(() => {
    if (onIsSettledChange) {
      onIsSettledChange(!isUserInteractingOrSnappingLocal);
    }
  }, [isUserInteractingOrSnappingLocal, onIsSettledChange]);

  const mapVirtualCellToImageIndex = ({vr, vc}, imageArray, numColsForPattern) => {
    if (imageArray.length === 0) return 0;
    const safeNumCols = Math.max(1, numColsForPattern);
    const intVr = Math.floor(vr);
    const intVc = Math.floor(vc);
    const flatIndex = intVr * safeNumCols + intVc;
    return ((flatIndex % imageArray.length) + imageArray.length) % imageArray.length;
  };

  const calculateLayoutConstants = useCallback(() => {
    if (!viewportRef.current || images.length === 0) return {
        imageWidth: 0, imageHeight: 0, spacing: 0, numColsEffective: 0, tileAndSpacingWidth: 0, tileAndSpacingHeight: 0
    };

    const viewportWidth = viewportRef.current.offsetWidth;
    
    const isSmallMobile = viewportWidth < 480;
    const isMobile = viewportWidth < 768;
    
    let targetCols;
    if (isSmallMobile) {
        targetCols = 3; 
    } else if (isMobile) {
        targetCols = 4; 
    } else if (viewportWidth < 1024) {
        targetCols = 5;
    } else if (viewportWidth < 1440) {
        targetCols = 6;
    } else {
        targetCols = 7;
    }
    targetCols = Math.max(1, targetCols);

    let numCols = targetCols;
    let currentSpacing = isMobile ? MIN_SPACING_MOBILE : MIN_SPACING_DESKTOP;

    const minImageWidthMobile = 60; 
    const maxImageWidthMobile = 100; 
    const minImageWidthDesktop = 120;
    const maxImageWidthDesktop = 250;

    const minAcceptableImageWidth = isMobile ? minImageWidthMobile : minImageWidthDesktop;
    const maxAcceptableImageWidth = isMobile ? maxImageWidthMobile : maxImageWidthDesktop;
    
    const maxColsMobile = 6; 
    const maxColsDesktop = 10;
    const maxCols = isMobile ? maxColsMobile : maxColsDesktop;

    let calculatedImageWidth = (viewportWidth - (numCols + 1) * currentSpacing) / numCols;
    
    while (calculatedImageWidth < minAcceptableImageWidth && numCols > 1) {
        numCols--;
        currentSpacing = isMobile ? MIN_SPACING_MOBILE : MIN_SPACING_DESKTOP; 
        calculatedImageWidth = (viewportWidth - (numCols + 1) * currentSpacing) / numCols;
    }
    
    while (calculatedImageWidth > maxAcceptableImageWidth && numCols < maxCols) {
        numCols++;
        currentSpacing = isMobile ? MIN_SPACING_MOBILE : MIN_SPACING_DESKTOP; 
        calculatedImageWidth = (viewportWidth - (numCols + 1) * currentSpacing) / numCols;
    }
    
    calculatedImageWidth = Math.max(isMobile ? 50 : 100, calculatedImageWidth); 
    
    currentSpacing = (viewportWidth - numCols * calculatedImageWidth) / (numCols + 1);
    currentSpacing = Math.max(
        isMobile ? MIN_SPACING_MOBILE : MIN_SPACING_DESKTOP,
        Math.min(currentSpacing, isMobile ? MAX_SPACING_MOBILE : MAX_SPACING_DESKTOP)
    );
    
    calculatedImageWidth = (viewportWidth - (numCols + 1) * currentSpacing) / numCols;
    calculatedImageWidth = Math.max(isMobile ? 50 : 100, calculatedImageWidth);

    const calculatedImageHeight = calculatedImageWidth / BASE_ASPECT_RATIO;
    
    const newLayoutConfig = {
      imageWidth: calculatedImageWidth,
      imageHeight: calculatedImageHeight,
      spacing: currentSpacing,
      numColsEffective: numCols,
      tileAndSpacingWidth: calculatedImageWidth + currentSpacing,
      tileAndSpacingHeight: calculatedImageHeight + currentSpacing,
    };
    setLayoutConfig(newLayoutConfig);
    return newLayoutConfig;
  }, [images]);

  const centerOnVirtualCell = useCallback((vr, vc, currentLayout, useAnimation = true) => {
    if (!viewportRef.current || !currentLayout || currentLayout.imageWidth === 0 || currentLayout.tileAndSpacingWidth === 0 || images.length === 0) return;

    const itemCenterXInVirtualPlane = vc * currentLayout.tileAndSpacingWidth + currentLayout.imageWidth / 2;
    const itemCenterYInVirtualPlane = vr * currentLayout.tileAndSpacingHeight + currentLayout.imageHeight / 2;
    
    let targetPanX = window.innerWidth / 2 - itemCenterXInVirtualPlane;
    let targetPanY = window.innerHeight / 2 - itemCenterYInVirtualPlane;
    targetPanX -= window.innerWidth * 0.5;
    targetPanY -= window.innerHeight * 0.5;

    const updateFocusStateAndInteractionEnd = () => {
      const imageIndex = mapVirtualCellToImageIndex({ vr, vc }, images, currentLayout.numColsEffective);
      const product = images[imageIndex];
      if (product) {
        const newUniqueId = `${product.id}-${vr}-${vc}`;
        if (onFocusedProductChange) {
            onFocusedProductChange(product);
        }
        lastFocusedVirtualCellRef.current = { vr, vc, uniqueId: newUniqueId, productId: product.id };
      }
      setIsUserInteractingOrSnappingLocal(false);
      if (onInteractingChange) onInteractingChange(false);
    };

    if (useAnimation) {
      setIsUserInteractingOrSnappingLocal(true); 
      if (onInteractingChange) onInteractingChange(true);
      const animX = animate(panX, targetPanX, { 
        type: "spring", 
        stiffness: 80,
        damping: 15,
        mass: 1.2,
        velocity: 0
      });
      const animY = animate(panY, targetPanY, { 
        type: "spring", 
        stiffness: 80,
        damping: 15,
        mass: 1.2,
        velocity: 0
      });
      
      Promise.all([
          animX.then ? animX : Promise.resolve(), 
          animY.then ? animY : Promise.resolve()  
      ]).then(() => {
        updateFocusStateAndInteractionEnd();
      }).catch(error => {
        console.error("Error during snap animation:", error);
        updateFocusStateAndInteractionEnd();
      });
    } else {
      panX.set(targetPanX);
      panY.set(targetPanY);
      if (onInteractingChange) onInteractingChange(false);
      updateFocusStateAndInteractionEnd();
    }
  }, [panX, panY, images, onFocusedProductChange, onInteractingChange]);

  useEffect(() => {
    const vpCurrent = viewportRef.current;
    if (!vpCurrent || images.length === 0) return;

    const performLayoutAndFocus = () => {
        const currentLayout = calculateLayoutConstants();
        if (currentLayout.imageWidth > 0) {
            if (!lastFocusedVirtualCellRef.current || !images.find(img => img.id === lastFocusedVirtualCellRef.current.productId) ) { 
                const initialVr = Math.floor(images.length / (currentLayout.numColsEffective * 2)); 
                const numColsForInitial = Math.max(1, currentLayout.numColsEffective);
                const initialVc = Math.floor(numColsForInitial / 2); 
                centerOnVirtualCell(initialVr, initialVc, currentLayout, false);
            } else { 
                const { vr, vc } = lastFocusedVirtualCellRef.current;
                centerOnVirtualCell(vr, vc, currentLayout, false);
            }
        }
    };

    performLayoutAndFocus(); 
    const resizeObserver = new ResizeObserver(performLayoutAndFocus);
    resizeObserver.observe(vpCurrent);
    return () => {
      if (vpCurrent) { 
        resizeObserver.unobserve(vpCurrent);
      }
    };
  }, [images, calculateLayoutConstants, centerOnVirtualCell]); 
  
  const handlePanStart = () => {
    setIsUserInteractingOrSnappingLocal(true);
    if (onInteractingChange) onInteractingChange(true);
  };

  const handlePan = (event, info) => {
    // Direct 1:1 movement with the user's drag
    panX.set(panX.get() + info.delta.x);
    panY.set(panY.get() + info.delta.y);
  };

  const handlePanEnd = (event, info) => {
    if (
      !viewportRef.current ||
      !layoutConfig.imageWidth ||
      layoutConfig.tileAndSpacingWidth === 0 ||
      layoutConfig.tileAndSpacingHeight === 0 ||
      images.length === 0
    ) {
      setIsUserInteractingOrSnappingLocal(false);
      if (onInteractingChange) onInteractingChange(false);
      return;
    }

    // Find the tile visually closest to the center of the screen
    const centerX = window.innerWidth / 2;
    const centerY = window.innerHeight / 2;

    let closestTile = null;
    let minDistance = Infinity;

    tilesToRender.forEach(tile => {
      const tileCenterX = panX.get() + tile.styleProps.left + tile.styleProps.width / 2;
      const tileCenterY = panY.get() + tile.styleProps.top + tile.styleProps.height / 2;
      const dx = tileCenterX - centerX;
      const dy = tileCenterY - centerY;
      const dist = dx * dx + dy * dy;
      if (dist < minDistance) {
        minDistance = dist;
        closestTile = tile;
      }
    });

    if (!closestTile || closestTile.vr === undefined || closestTile.vc === undefined) {
      console.warn("Could not find closest tile or its grid coordinates.");
      setIsUserInteractingOrSnappingLocal(false);
      if (onInteractingChange) onInteractingChange(false);
      return;
    }

    // Calculate final pan to center the exact visible tile
    const targetTileCenterX = closestTile.styleProps.left + closestTile.styleProps.width / 2;
    const targetTileCenterY = closestTile.styleProps.top + closestTile.styleProps.height / 2;
    const targetPanX = centerX - targetTileCenterX;
    const targetPanY = centerY - targetTileCenterY;

    setIsUserInteractingOrSnappingLocal(true);
    if (onInteractingChange) onInteractingChange(true);

    const animX = animate(panX, targetPanX, {
      type: "spring",
      stiffness: 100,
      damping: 20,
      mass: 0.8,
      velocity: info.velocity.x * 0.1
    });

    const animY = animate(panY, targetPanY, {
      type: "spring",
      stiffness: 100,
      damping: 20,
      mass: 0.8,
      velocity: info.velocity.y * 0.1
    });

    Promise.all([
      animX.then ? animX : Promise.resolve(),
      animY.then ? animY : Promise.resolve()
    ]).then(() => {
      centerOnVirtualCell(closestTile.vr, closestTile.vc, layoutConfig, false);
    }).catch(error => {
      console.error("Error during snap animation:", error);
      centerOnVirtualCell(closestTile.vr, closestTile.vc, layoutConfig, false);
    });
  };

  useEffect(() => {
    images.forEach(image => {
      const img = new Image();
      img.src = image.src;
    });
  }, [images]);

  const getDeterministicOffsetFactor = (seedPart1, seedPart2) => {
      let hash = seedPart1;
      hash = (hash << 5) - hash + seedPart2; 
      hash = hash & hash; 
      const random = Math.sin(hash);
      return random * 0.5; 
  };

  const getVisibleTiles = () => {
    if (!viewportRef.current || !layoutConfig.imageWidth || layoutConfig.tileAndSpacingWidth === 0 || layoutConfig.tileAndSpacingHeight === 0 || images.length === 0) {
        return [];
    }
    
    const vpElementWidth = viewportRef.current.offsetWidth;
    const vpElementHeight = viewportRef.current.offsetHeight; 
    const currentPanX = panX.get();
    const currentPanY = panY.get();
    const { imageWidth, imageHeight, tileAndSpacingWidth, tileAndSpacingHeight, numColsEffective, spacing } = layoutConfig;

    const bufferX = vpElementWidth * RENDER_BUFFER_FACTOR;
    const bufferY = vpElementHeight * RENDER_BUFFER_FACTOR;

    if (tileAndSpacingWidth <= 0 || tileAndSpacingHeight <= 0) return [];

    const minVisibleVc = Math.floor((-currentPanX - bufferX) / tileAndSpacingWidth);
    const maxVisibleVc = Math.ceil((-currentPanX + vpElementWidth + bufferX) / tileAndSpacingWidth);
    const minVisibleVr = Math.floor((-currentPanY - bufferY) / tileAndSpacingHeight);
    const maxVisibleVr = Math.ceil((-currentPanY + vpElementHeight + bufferY) / tileAndSpacingHeight);
    
    const visibleTiles = [];
    for (let vr = minVisibleVr; vr <= maxVisibleVr; vr++) {
      for (let vc = minVisibleVc; vc <= maxVisibleVc; vc++) {
        const imageIndex = mapVirtualCellToImageIndex({vr, vc}, images, numColsEffective);
        const originalImage = images[imageIndex];
        
        if (!originalImage) continue; 
        
        const uniqueId = `${originalImage.id}-${vr}-${vc}`;
        const isTileCurrentlyFocused = !isUserInteractingOrSnappingLocal && lastFocusedVirtualCellRef.current?.uniqueId === uniqueId;

        const tileX_final = vc * tileAndSpacingWidth;
        const tileY_final = vr * tileAndSpacingHeight;
        
        const tileCenterXInPannableViewport = currentPanX + tileX_final + imageWidth / 2;
        const tileCenterYInPannableViewport = currentPanY + tileY_final + imageHeight / 2;

        const screenCenterX = window.innerWidth / 2;
        const screenCenterY = window.innerHeight / 2;

        const dx = tileCenterXInPannableViewport - screenCenterX;
        const dy = tileCenterYInPannableViewport - screenCenterY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const maxDist = Math.sqrt(Math.pow(screenCenterX, 2) + Math.pow(screenCenterY, 2));
        const distanceFactor = Math.min(1, distance / (maxDist * 0.8 + 1e-6)); 

        visibleTiles.push({
          ...originalImage,
          uniqueId,
          vr,
          vc,
          styleProps: { left: tileX_final, top: tileY_final, width: imageWidth, height: imageHeight },
          isFocused: isTileCurrentlyFocused,
          distanceFactor,
          key: uniqueId, 
          isInteracting: isInteracting,
        });
      }
    }
    return visibleTiles;
  };
  
  const tilesToRender = getVisibleTiles();

  if (images.length === 0 && !isUserInteractingOrSnappingLocal) {
    return <div ref={viewportRef} className="image-grid-viewport loading-placeholder">No matching products. Try adjusting filters.</div>;
  }
  if (layoutConfig.imageWidth === 0) {
     return <div ref={viewportRef} className="image-grid-viewport loading-placeholder">Loading Products...</div>;
  }

  return (
    <motion.div 
      ref={viewportRef} 
      className="image-grid-viewport"
      onPanStart={handlePanStart}
      onPan={handlePan}
      onPanEnd={handlePanEnd}
    >
      <motion.div
        ref={gridRef}
        className="image-grid-container"
        style={{ 
            x: panX, 
            y: panY,
            rotateX: rotateX, 
            rotateY: rotateY,
        }}
      >
        {tilesToRender.map((tile) => (
            <ImageTile
              key={tile.key} 
              image={{id: tile.id, src: tile.src, alt: tile.alt, name: tile.name, price: tile.price, uniqueId: tile.uniqueId}}
              styleProps={tile.styleProps}
              isFocused={tile.isFocused}
              distanceFactor={tile.distanceFactor}
              onClick={() => onProductImageClick(tile)} 
              isInteracting={tile.isInteracting}
            />
        ))}
      </motion.div>
    </motion.div>
  );
};

export default ImageGrid;