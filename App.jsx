import React, { useState, useCallback, useRef, useEffect } from 'react';
import ImageGrid from './ImageGrid.jsx';
import FloatingProductInfo from './FloatingProductInfo.jsx';
import FloatingCTA from './FloatingCTA.jsx';
import FloatingTagsContainer from './FloatingTagsContainer.jsx';
import TagFilter from './TagFilter.jsx'; // Import TagFilter for direct use
import { mockImageData } from './data.js';
import './index.css';

const getAllTagOptions = (products) => {
  const options = { type: new Set(), texture: new Set(), color: new Set() };
  if (!products || products.length === 0) return { type: [], texture: [], color: [] };

  products.forEach(p => {
    if (p.tags) {
      if (p.tags.type) options.type.add(p.tags.type);
      if (p.tags.texture) options.texture.add(p.tags.texture);
      if (p.tags.color) options.color.add(p.tags.color);
    }
  });

  return {
    type: Array.from(options.type).sort(),
    texture: Array.from(options.texture).sort(),
    color: Array.from(options.color).sort(),
  };
};

const tagCategories = [ 
  { key: 'type', displayName: 'Category' },
  { key: 'texture', displayName: 'Material' },
  { key: 'color', displayName: 'Color' },
];

export default function App() {
  const [focusedProduct, setFocusedProduct] = useState(null);
  const [isGridSettled, setIsGridSettled] = useState(true); 
  const [isInteracting, setIsInteracting] = useState(false); // New state for interaction

  const [allTagOptions, setAllTagOptions] = useState({ type: [], texture: [], color: [] });
  const [pinnedTags, setPinnedTags] = useState({ type: null, texture: null, color: null });
  const [productsToDisplay, setProductsToDisplay] = useState(mockImageData);
  const [historyStack, setHistoryStack] = useState([]);
  const [openDropdown, setOpenDropdown] = useState(null); 

  useEffect(() => {
    const options = getAllTagOptions(mockImageData);
    setAllTagOptions(options);
    if (mockImageData.length > 0 && !focusedProduct) {
      // Initial focus is handled by ImageGrid
    }
  }, [focusedProduct]);

  const pushToHistory = (currentState) => {
    setHistoryStack(prev => [...prev.slice(-10), currentState]);
  };

  const applyFilters = useCallback((currentPins) => {
    let filtered = mockImageData;
    Object.entries(currentPins).forEach(([key, value]) => {
      if (value) {
        filtered = filtered.filter(p => p.tags && p.tags[key] === value);
      }
    });
    if (filtered.length === 0) {
      setProductsToDisplay(mockImageData.slice(0,1)); 
    } else {
      setProductsToDisplay(filtered);
    }
  }, []);

  const handleSetFocusedProduct = useCallback((product) => {
    setFocusedProduct(product);
  }, []);

  const handleIsGridSettledChange = useCallback((settled) => {
    setIsGridSettled(settled);
  }, []);

  const handleInteractingChange = useCallback((interacting) => {
    setIsInteracting(interacting);
  }, []);

  const handlePinToggle = useCallback((categoryKey) => {
    pushToHistory({ products: productsToDisplay, pins: pinnedTags, focus: focusedProduct?.id });
    setPinnedTags(prevPins => {
      const currentTagValueOnProduct = focusedProduct?.tags?.[categoryKey];
      let newPinValue;
      if (prevPins[categoryKey] === currentTagValueOnProduct && currentTagValueOnProduct) {
        newPinValue = null; 
      } else {
        newPinValue = currentTagValueOnProduct || null; 
      }
      const newPins = { ...prevPins, [categoryKey]: newPinValue };
      applyFilters(newPins);
      return newPins;
    });
  }, [focusedProduct, productsToDisplay, pinnedTags, applyFilters]);

  const handleSwapTag = useCallback((categoryKey, newValue) => {
    pushToHistory({ products: productsToDisplay, pins: pinnedTags, focus: focusedProduct?.id });
    let newPins = {};
    if (categoryKey === 'type') { 
      newPins = { type: newValue, texture: null, color: null };
    } else {
      newPins = { ...pinnedTags, [categoryKey]: newValue };
    }
    setPinnedTags(newPins);
    applyFilters(newPins);
    setOpenDropdown(null); 
  }, [pinnedTags, productsToDisplay, focusedProduct, applyFilters]);


  const handleFindSimilar = useCallback(() => {
    if (!focusedProduct) return;
    pushToHistory({ products: productsToDisplay, pins: pinnedTags, focus: focusedProduct?.id });
    alert(`Finding similar items to ${focusedProduct.name}. (Clearing current filters)`);
    setPinnedTags({ type: null, texture: null, color: null });
    setProductsToDisplay(mockImageData);
    setFocusedProduct(mockImageData.length > 0 ? mockImageData[0] : null);
  }, [focusedProduct, productsToDisplay, pinnedTags]);

  const handleProductImageClick = useCallback((product) => {
    // ImageGrid handles centering. This is for potential navigation.
  }, []);
  
  const handlePrevious = () => {
    if (historyStack.length > 0) {
      const prevState = historyStack[historyStack.length - 1];
      setProductsToDisplay(prevState.products);
      setPinnedTags(prevState.pins);
      setFocusedProduct(
        prevState.products.find(p => p.id === prevState.focus) || prevState.products[0] || mockImageData[0]
      );
      setHistoryStack(prev => prev.slice(0, -1));
    } else {
      alert("No previous state.");
    }
  };

  const handleRestart = () => {
    setPinnedTags({ type: null, texture: null, color: null });
    setProductsToDisplay(mockImageData);
    setFocusedProduct(mockImageData.length > 0 ? mockImageData[0] : null);
    setHistoryStack([]);
    alert("Canvas reset to initial view.");
  };

  const showBottomPane = isGridSettled && focusedProduct && !isInteracting;
  const showFallbackTopInfoCTA = focusedProduct && !isGridSettled && !isInteracting;
  const showTopTagsBarInFloatingContainer = !showBottomPane && !isInteracting;


  return (
    <div className="app-container product-explorer full-canvas">
      <FloatingTagsContainer
        focusedProduct={focusedProduct}
        allTagOptions={allTagOptions}
        pinnedTags={pinnedTags}
        onPinToggle={handlePinToggle}
        onSwapTag={handleSwapTag}
        openDropdown={openDropdown}
        setOpenDropdown={setOpenDropdown}
        onPrevious={handlePrevious}
        onRestart={handleRestart}
        renderTopTags={showTopTagsBarInFloatingContainer} 
      />
      <ImageGrid 
        images={productsToDisplay} 
        onFocusedProductChange={handleSetFocusedProduct}
        onIsSettledChange={handleIsGridSettledChange}
        onProductImageClick={handleProductImageClick}
        onInteractingChange={handleInteractingChange} // Pass new callback
        isInteracting={isInteracting} // Pass state down
      />

      {showBottomPane && (
        <div className="focused-product-details-pane">
          <FloatingProductInfo 
            product={focusedProduct} 
            isGridSettled={isGridSettled} 
          />
          <FloatingCTA 
            onFindSimilar={handleFindSimilar} 
            isGridSettled={isGridSettled} 
          />
          <div className="focused-pane-tags-wrapper">
            {tagCategories.map(({ key, displayName }) => {
              const optionsForCategory = allTagOptions[key] || [];
              if (optionsForCategory.length === 0 && !(focusedProduct?.tags?.[key]) && !pinnedTags[key]) return null;

              return (
                <TagFilter
                  key={key}
                  categoryKey={key}
                  categoryDisplayName={displayName}
                  currentTagValue={focusedProduct?.tags?.[key] || null}
                  pinnedValue={pinnedTags[key]}
                  options={optionsForCategory}
                  onPinToggle={handlePinToggle} 
                  onSelectOption={handleSwapTag} 
                  isOpen={openDropdown === key}
                  onToggleDropdown={() => setOpenDropdown(prev => (prev === key ? null : key))}
                />
              );
            })}
          </div>
        </div>
      )}

      {showFallbackTopInfoCTA && (
         <>
            <div className="floating-product-info-top">
                <h3>{focusedProduct.name}</h3>
                {focusedProduct.price && <p className="price">{focusedProduct.price}</p>}
            </div>
            <div className="floating-cta-container-top">
                 <button 
                    className="find-similar-btn-floating" 
                    onClick={handleFindSimilar}
                    aria-label="Find similar items"
                  >
                    Find Similar
                  </button>
            </div>
         </>
      )}
    </div>
  );
}