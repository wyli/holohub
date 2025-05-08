function getBaseUrl() {
  const baseTag = document.querySelector('base');
  if (baseTag && baseTag.href) {
    return new URL(baseTag.href).pathname;
  }
  const pathParts = window.location.pathname.split('/');
  if (pathParts.length > 2 && pathParts[1] === 'holohub') {
    return '/holohub/';
  }
  return '';
}

// Remove unnecessary cache version constant
let cacheBuster = '';

// Add CSS to hide initial non-dynamic content until ready
(function addInitialStyles() {
  const style = document.createElement('style');
  style.id = 'tag-sidebar-initial-styles';
  style.textContent = `
    .md-content__inner {
      opacity: 0;
      transition: opacity 0.3s ease-in-out;
    }

    body.tag-sidebar-ready .md-content__inner {
      opacity: 1;
    }

    .tag-sidebar-loading-indicator {
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      z-index: 999;
      background: rgba(255, 255, 255, 0.9);
      border-radius: 5px;
      padding: 20px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      text-align: center;
      transition: opacity 0.3s ease-out;
    }

    .tag-sidebar-loading-indicator.hidden {
      opacity: 0;
      pointer-events: none;
    }

    .tag-sidebar-loading-spinner {
      display: inline-block;
      width: 30px;
      height: 30px;
      border: 3px solid rgba(0, 0, 0, 0.1);
      border-radius: 50%;
      border-top-color: #2196F3;
      animation: spin 1s ease-in-out infinite;
      margin-bottom: 10px;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    /* Prepare sidebar structure early */
    .tag-sidebar {
      opacity: 0;
      transition: opacity 0.3s ease-in-out;
    }

    body.tag-sidebar-ready .tag-sidebar {
      opacity: 1;
    }
  `;

  document.head.appendChild(style);
})();

// Create loading indicator
function createLoadingIndicator() {
  const loadingEl = document.createElement('div');
  loadingEl.className = 'tag-sidebar-loading-indicator';
  loadingEl.innerHTML = `
    <div class="tag-sidebar-loading-spinner"></div>
    <div>Loading application data...</div>
  `;
  document.body.appendChild(loadingEl);

  return {
    el: loadingEl,
    hide: function() {
      loadingEl.classList.add('hidden');
      setTimeout(() => {
        loadingEl.remove();
      }, 300);
    }
  };
}

let loading = null;
let preloadStarted = false;

// Start preloading as early as possible during script parsing
document.addEventListener('readystatechange', function() {
  if (document.readyState === 'interactive' && !preloadStarted) {
    preloadStarted = true;
    loading = createLoadingIndicator();
    preloadData();
  }
}, { once: true });

// Begin preload immediately if document is already interactive or complete
if ((document.readyState === 'interactive' || document.readyState === 'complete') && !preloadStarted) {
  preloadStarted = true;
  loading = createLoadingIndicator();
  preloadData();
}

// Immediately start preloading data as early as possible
function preloadData() {
  console.log("Preloading tag sidebar data...");
  window.tagSidebarData = window.tagSidebarData || {
    categories: null,
    appCardsData: null,
    isLoading: false,
    preloadStarted: false,
    preloadComplete: false
  };

  // Don't start preload twice
  if (window.tagSidebarData.preloadStarted) {
    return;
  }

  window.tagSidebarData.preloadStarted = true;
  window.tagSidebarData.isLoading = true;

  // Get the base URL early
  const baseUrl = getBaseUrl();
  const dataPath = `${baseUrl}_data/`;

  // Check if force refresh needed
  const urlParams = new URLSearchParams(window.location.search);
  const forceRefresh = urlParams.has('refresh_cache');
  const cacheParam = forceRefresh ? `?v=${Date.now()}` : '';

  // Start requests immediately and store the promises
  window.tagSidebarData.categoriesPromise = fetch(`${dataPath}tmp_tag-categories.json${cacheParam}`, {
    headers: {
      'Cache-Control': forceRefresh ? 'no-cache' : '',
      'Pragma': forceRefresh ? 'no-cache' : ''
    }
  }).then(response => {
    if (!response.ok) {
      throw new Error(`Failed to fetch categories: ${response.status}`);
    }
    return response.json();
  }).catch(error => {
    console.error("Error preloading categories:", error);
    return null;
  });

  window.tagSidebarData.appCardsPromise = fetch(`${dataPath}tmp_app_cards.json${cacheParam}`, {
    headers: {
      'Cache-Control': forceRefresh ? 'no-cache' : '',
      'Pragma': forceRefresh ? 'no-cache' : ''
    }
  }).then(response => {
    if (!response.ok) {
      throw new Error(`Failed to fetch app cards: ${response.status}`);
    }
    return response.json();
  }).catch(error => {
    console.error("Error preloading app cards:", error);
    return null;
  });

  // Process both promises together to resolve data
  Promise.allSettled([
    window.tagSidebarData.categoriesPromise,
    window.tagSidebarData.appCardsPromise
  ]).then(results => {
    if (results[0].status === 'fulfilled' && results[0].value) {
      window.tagSidebarData.categories = results[0].value;
      console.log("Categories preloaded:", window.tagSidebarData.categories.length);
    }

    if (results[1].status === 'fulfilled' && results[1].value) {
      window.tagSidebarData.appCardsData = results[1].value;
      console.log("App cards preloaded:", Object.keys(window.tagSidebarData.appCardsData || {}).length);
    }

    window.tagSidebarData.isLoading = false;
    window.tagSidebarData.preloadComplete = true;

    // If DOM is already interactive/complete, initialize the UI immediately
    if (document.readyState === 'interactive' || document.readyState === 'complete') {
      initializeUI();
    }
  });
}

// Initialize UI when data is available
async function initializeUI() {
  try {
    await checkForCacheRefreshParam();

    // Get the base URL
    const baseUrl = getBaseUrl();

    const isTagsPageResult = isTagsPage();
    const isHoloHub = window.location.pathname.endsWith('/holohub/');
    if (!isHoloHub && !isTagsPageResult) {
      console.log("Not on HoloHub root or tags page, skipping sidebar loading");
      return;
    }

    // Create global tag popup instance if it doesn't exist yet
    if (!globalTagPopup) {
      globalTagPopup = new TagPopup();
    }
    window.showAllTags = function(element, allTags) {
      const tags = JSON.parse(allTags);
      if (globalTagPopup) {
        globalTagPopup.show(element, tags);
      } else {
        console.error("Tag popup not initialized");
      }
      return false;
    };

    // Wait for data if still loading
    if (window.tagSidebarData.isLoading) {
      console.log("Waiting for data to complete loading...");
      await new Promise(resolve => {
        const checkInterval = setInterval(() => {
          if (!window.tagSidebarData.isLoading) {
            clearInterval(checkInterval);
            resolve();
          }
        }, 50);
      });
    }

    const categories = window.tagSidebarData.categories;
    const appCardsData = window.tagSidebarData.appCardsData;

    if (!categories || !appCardsData) {
      console.error("Required data could not be loaded");
      if (loading) loading.hide();
      return;
    }

    // Render sidebar only once
    renderSidebar(categories, appCardsData);

    // Handle initial URL parameters - only updates the highlights
    handleCategoryParamChange();

    // Handle browser back/forward navigation
    window.addEventListener('popstate', function(event) {
      handleCategoryParamChange();
    });

    // Handle window resize - only add the listener once
    if (!sidebarCache.initialized) {
      let resizeTimeout;
      window.addEventListener('resize', function() {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(function() {
          const sidebar = sidebarCache.sidebarElement || document.querySelector('.tag-sidebar.md-sidebar');
          if (sidebar) {
            sidebar.style.height = `calc(100vh - ${document.querySelector('.md-header').offsetHeight}px)`;
          }
        }, 100);
      });
      sidebarCache.initialized = true;
    }

    console.log("Tag sidebar ready");

    // Mark the body as ready to trigger CSS transitions
    document.body.classList.add('tag-sidebar-ready');

    // Hide loading indicator
    if (loading) {
      loading.hide();
    }
  } catch (error) {
    console.error('Error initializing UI:', error);
    if (loading) loading.hide();
  }
}

// Main initialization on DOMContentLoaded - will execute if readystatechange hasn't triggered yet
document.addEventListener('DOMContentLoaded', function() {
  // If preloading hasn't started yet, start it now
  if (!preloadStarted) {
    preloadStarted = true;
    loading = createLoadingIndicator();
    preloadData();
  }

  // If data is already preloaded, initialize the UI
  if (window.tagSidebarData && window.tagSidebarData.preloadComplete) {
    initializeUI();
  }
});

// Second event listener is no longer needed since we handle everything in initializeUI

// Function to handle data loading with HTTP caching
async function loadDataWithCache(dataPath, forceRefresh = false) {
  // Initialize data structure
  let data = {
    categories: null,
    appCardsData: null
  };

  // If preload has completed or is in progress, use those results
  if (window.tagSidebarData.preloadStarted) {
    console.log("Using preloaded data...");

    // If preload is complete, use the cached results
    if (window.tagSidebarData.preloadComplete) {
      return {
        categories: window.tagSidebarData.categories,
        appCardsData: window.tagSidebarData.appCardsData
      };
    }

    // If preload is still in progress, wait for it to complete
    if (window.tagSidebarData.isLoading) {
      console.log("Waiting for preload to complete...");
      try {
        const [categories, appCards] = await Promise.all([
          window.tagSidebarData.categoriesPromise,
          window.tagSidebarData.appCardsPromise
        ]);
        return {
          categories: categories,
          appCardsData: appCards
        };
      } catch (error) {
        console.error("Error while waiting for preload:", error);
      }
    }
  }

  // If we're forcing a refresh or preload failed, make new requests
  if (forceRefresh || !window.tagSidebarData.preloadComplete) {
    // Add cache buster for forced refresh only
    const cacheParam = forceRefresh ? `?v=${Date.now()}` : '';

    // Fetch from server with appropriate cache headers
    try {
      console.log("Fetching data from server with HTTP caching");

      // Use Promise.allSettled to handle partial failures
      const responses = await Promise.allSettled([
        fetch(`${dataPath}tmp_tag-categories.json${cacheParam}`, {
          headers: {
            'Cache-Control': forceRefresh ? 'no-cache' : '',
            'Pragma': forceRefresh ? 'no-cache' : ''
          }
        }),
        fetch(`${dataPath}tmp_app_cards.json${cacheParam}`, {
          headers: {
            'Cache-Control': forceRefresh ? 'no-cache' : '',
            'Pragma': forceRefresh ? 'no-cache' : ''
          }
        })
      ]);

      // Process responses
      if (responses[0].status === 'fulfilled' && responses[0].value.ok) {
        data.categories = await responses[0].value.json();
      } else {
        console.error("Failed to fetch categories:",
                      responses[0].status === 'rejected' ? responses[0].reason :
                      `HTTP ${responses[0].value.status}`);
      }

      if (responses[1].status === 'fulfilled' && responses[1].value.ok) {
        data.appCardsData = await responses[1].value.json();
      } else {
        console.error("Failed to fetch app cards data:",
                      responses[1].status === 'rejected' ? responses[1].reason :
                      `HTTP ${responses[1].value.status}`);
      }

      return data;
    } catch (error) {
      console.error("Error fetching data:", error);
      return data;
    }
  }

  // Fallback to whatever we have
  return {
    categories: window.tagSidebarData.categories,
    appCardsData: window.tagSidebarData.appCardsData
  };
}

// Global cache state to prevent duplicate loads
let dataLoadPromise = null;

// Function to handle cache loading with a shared promise
function loadDataWithCacheShared(dataPath, forceRefresh = false) {
  // If already loading, return the existing promise
  if (dataLoadPromise) {
    return dataLoadPromise;
  }

  // Create a new loading promise
  dataLoadPromise = loadDataWithCache(dataPath, forceRefresh);

  // Once resolved, clear the promise so it can be recreated if needed
  dataLoadPromise.finally(() => {
    setTimeout(() => {
      dataLoadPromise = null;
    }, 100); // Small delay to prevent race conditions
  });

  return dataLoadPromise;
}

// Add a function to force refresh the cache
window.refreshTagSidebarCache = async function() {
  console.log("Force refreshing tag sidebar cache");
  const baseUrl = getBaseUrl();
  let dataPath = `${baseUrl}_data/`;

  // Clear the existing promise
  dataLoadPromise = null;

  // Reset global data
  window.tagSidebarData = {
    categories: null,
    appCardsData: null,
    isLoading: true,
    preloadStarted: false,
    preloadComplete: false
  };

  try {
    const data = await loadDataWithCacheShared(dataPath, true);
    window.tagSidebarData.categories = data.categories;
    window.tagSidebarData.appCardsData = data.appCardsData;
    window.tagSidebarData.preloadComplete = true;
    console.log("Cache refresh complete");
    return true;
  } catch (error) {
    console.error("Cache refresh failed:", error);
    return false;
  } finally {
    window.tagSidebarData.isLoading = false;
  }
};

// Allow triggering a reload via URL
function checkForCacheRefreshParam() {
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.has('refresh_cache')) {
    // Remove the parameter from URL to prevent endless refreshing
    urlParams.delete('refresh_cache');
    const newUrl = window.location.pathname + (urlParams.toString() ? '?' + urlParams.toString() : '');
    window.history.replaceState({}, document.title, newUrl);

    // Refresh the cache
    return window.refreshTagSidebarCache();
  }
  return Promise.resolve(false);
}

// Global reference to sidebar elements to avoid repeated querying
let sidebarCache = {
  initialized: false,
  sidebarElement: null,
  categoryItems: null,
  renderedCategories: false
};

// Function to create and render the sidebar only once
function renderSidebar(categories, appCardsData) {
  // Skip if already rendered or no data
  if (sidebarCache.renderedCategories || !categories || !appCardsData) {
    return sidebarCache.sidebarElement;
  }

  console.log("Rendering sidebar structure...");

  // Find or create sidebar element
  let tagSidebar = document.querySelector('.tag-sidebar');

  if (!tagSidebar) {
    // Create new sidebar
    const primarySidebar = document.querySelector('.md-sidebar--primary');

    if (primarySidebar) {
      // Use existing primary sidebar
      tagSidebar = document.createElement('div');
      tagSidebar.className = 'tag-sidebar';

      const scrollWrap = primarySidebar.querySelector('.md-sidebar__scrollwrap') ||
                        (function() {
                          const newScrollWrap = document.createElement('div');
                          newScrollWrap.className = 'md-sidebar__scrollwrap';
                          primarySidebar.appendChild(newScrollWrap);
                          return newScrollWrap;
                        })();

      scrollWrap.appendChild(tagSidebar);
      primarySidebar.style.display = 'block';
    } else {
      // Create standalone sidebar
      const mainInner = document.querySelector('.md-main__inner');
      if (!mainInner) {
        console.error("Could not find main inner container");
        return null;
      }

      const sidebarWrapper = document.createElement('div');
      sidebarWrapper.className = 'tag-sidebar-wrapper';
      sidebarWrapper.style.position = 'relative';

      tagSidebar = document.createElement('div');
      tagSidebar.className = 'tag-sidebar md-sidebar md-sidebar--primary';

      if (mainInner.firstChild) {
        mainInner.insertBefore(sidebarWrapper, mainInner.firstChild);
      } else {
        mainInner.appendChild(sidebarWrapper);
      }

      sidebarWrapper.appendChild(tagSidebar);
    }
  }

  // Build simplified category list
  const baseUrl = getBaseUrl();
  const tagsPath = `${baseUrl}tags/`;

  // Create sidebar content with title
  const content = document.createElement('div');
  content.className = 'tag-sidebar-content';
  content.innerHTML = '<h2>Application Categories</h2>';

  // Create category list
  const categoryList = document.createElement('ul');
  categoryList.className = 'tag-category-list md-nav__list';

  // Sort categories alphabetically for better UX
  const sortedCategories = [...categories].sort((a, b) => a.title.localeCompare(b.title));

  // Add categories to list
  sortedCategories.forEach(category => {
    const count = category.count || 0;
    const categoryItem = document.createElement('li');
    categoryItem.className = 'tag-category-item md-nav__item';
    categoryItem.dataset.category = category.title.toLowerCase();

    // Create simplified category header with icon, title, and count
    categoryItem.innerHTML = `
      <div class="tag-category-header md-nav__link">
        <span class="material-icons tag-category-icon">${category.icon}</span>
        <span class="tag-category-title">${category.title}</span>
        <span class="tag-category-count">(${count})</span>
      </div>
    `;

    // Add click event to navigate to category
    const header = categoryItem.querySelector('.tag-category-header');
    if (header) {
      // Navigate on click
      header.addEventListener('click', e => {
        e.preventDefault();
        window.location.href = `${tagsPath}?category=${encodeURIComponent(category.title)}`;
      });

      // Add hover effects
      header.addEventListener('mouseenter', () => header.classList.add('hover'));
      header.addEventListener('mouseleave', () => header.classList.remove('hover'));
    }

    categoryList.appendChild(categoryItem);
  });

  content.appendChild(categoryList);
  tagSidebar.appendChild(content);

  // Cache references and mark as rendered
  sidebarCache.sidebarElement = tagSidebar;
  sidebarCache.categoryItems = categoryList.querySelectorAll('.tag-category-item');
  sidebarCache.renderedCategories = true;

  document.body.classList.add('tag-sidebar-ready');
  console.log("Tag sidebar rendered");

  return tagSidebar;
}

// Separate function to only update the active category highlight
function highlightActiveCategory(categoryName) {
  if (!categoryName || !sidebarCache.renderedCategories) return;

  // Only deal with DOM if sidebar is rendered
  if (!sidebarCache.categoryItems) {
    const sidebar = document.querySelector('.tag-sidebar');
    if (!sidebar) return;

    sidebarCache.categoryItems = sidebar.querySelectorAll('.tag-category-item');
    if (!sidebarCache.categoryItems.length) return;
  }

  // Normalize category name for comparison
  const categoryLower = categoryName.toLowerCase();

  // Efficiently update only what's necessary
  let activeItem = null;

  // Remove active class from all and find matching item
  for (const item of sidebarCache.categoryItems) {
    const header = item.querySelector('.tag-category-header');
    if (header) {
      if (item.dataset.category === categoryLower) {
        header.classList.add('active');
        activeItem = item;
      } else if (header.classList.contains('active')) {
        header.classList.remove('active');
      }
    }
  }

  // Scroll the matching item into view if found
  if (activeItem && sidebarCache.sidebarElement) {
    const sidebar = sidebarCache.sidebarElement;
    const itemTop = activeItem.offsetTop;
    const sidebarScrollTop = sidebar.scrollTop;
    const sidebarHeight = sidebar.clientHeight;

    // Only scroll if the item isn't fully visible
    if (itemTop < sidebarScrollTop || itemTop > sidebarScrollTop + sidebarHeight) {
      // Smooth scroll to position the item in the middle
      sidebar.scrollTo({
        top: itemTop - (sidebarHeight / 2),
        behavior: 'smooth'
      });
    }
  }
}

// Function to toggle category filter message visibility
function toggleCategoryFilterMessage(isVisible) {
  const filterMessage = document.querySelector('.category-filter-message');
  const resultsSection = document.querySelector('.category-results');
  if (filterMessage && resultsSection) {
    filterMessage.style.display = isVisible ? 'block' : 'none';
    resultsSection.style.display = isVisible ? 'none' : 'block';
  }
}

// Function to handle URL parameter changes - now just updates highlights
function handleCategoryParamChange() {
  const urlParams = new URLSearchParams(window.location.search);
  const categoryParam = urlParams.get('category');

  if (categoryParam) {
    highlightActiveCategory(categoryParam);
    if (isTagsPage()) {
      loadCategoryContent(categoryParam);
    }
  } else if (isTagsPage()) {
    toggleCategoryFilterMessage(true);
  }
}

// Function to check if we're on the tags page
function isTagsPage() {
  return window.location.pathname.endsWith('/tags/') ||
         window.location.pathname.endsWith('/tags') ||
         window.location.pathname.includes('/tags/index');
}

// Function to load category content without page reload
async function loadCategoryContent(category) {
  if (!category) return;

  console.log(`Loading content for category: ${category}`);

  try {
    // Find or create the main content container
    let contentContainer = document.querySelector('.category-content');
    if (!contentContainer) {
      // Create the container if it doesn't exist
      contentContainer = document.createElement('div');
      contentContainer.className = 'category-content';

      // Create the required child elements
      const filterMessage = document.createElement('div');
      filterMessage.className = 'category-filter-message';
      filterMessage.textContent = 'Select a category from the sidebar to view applications';

      const resultsSection = document.createElement('div');
      resultsSection.className = 'category-results';
      resultsSection.style.display = 'none';

      const cardsContainer = document.createElement('div');
      cardsContainer.className = 'category-cards';

      // Assemble the structure
      resultsSection.appendChild(cardsContainer);
      contentContainer.appendChild(filterMessage);
      contentContainer.appendChild(resultsSection);

      // Find the main content area and insert our container
      const mainContent = document.querySelector('.md-content__inner');
      if (mainContent) {
        mainContent.appendChild(contentContainer);
      } else {
        console.error("Could not find main content area");
        return;
      }
    }

    // Get references to message and results sections
    const filterMessage = contentContainer.querySelector('.category-filter-message');
    const resultsSection = contentContainer.querySelector('.category-results');
    const cardsContainer = contentContainer.querySelector('.category-cards');

    if (!filterMessage || !resultsSection || !cardsContainer) {
      console.error("Could not find required content elements");
      return;
    }

    // Add loading indicator
    contentContainer.classList.add('loading');
    toggleCategoryFilterMessage(false);
    cardsContainer.innerHTML = '<div class="loading-message">Loading applications...</div>';

    // Update page title
    document.title = `${category} - Applications - HoloHub`;

    // Highlight the active category in the sidebar
    highlightActiveCategory(category);

    // Use cached data from the global store
    const categoriesData = window.tagSidebarData.categories;
    const appCardsData = window.tagSidebarData.appCardsData || {};

    // Find matching category in categoriesData
    const matchingCategory = categoriesData.find(cat =>
      cat.title.toLowerCase() === category.toLowerCase()
    );

    if (!matchingCategory) {
      cardsContainer.innerHTML = '<p>No matching category found.</p>';
      contentContainer.classList.remove('loading');
      return;
    }

    renderCategoryContent(cardsContainer, matchingCategory, appCardsData);
  } catch (error) {
    console.error('Error loading category content:', error);
    const cardsContainer = document.querySelector('.category-cards');
    if (cardsContainer) {
      cardsContainer.innerHTML = `<p>Error loading applications: ${error.message}</p>`;
    }
  } finally {
    // Remove loading indicator
    const contentContainer = document.querySelector('.category-content');
    if (contentContainer) {
      contentContainer.classList.remove('loading');
    }
  }
}

// Simplified function to render category content
function renderCategoryContent(container, matchingCategory, appCardsData) {
  if (!container || !matchingCategory || !appCardsData) return;

  // Filter apps based on the category
  const categoryLower = matchingCategory.title.toLowerCase();
  const filteredApps = filterAppsByCategory(appCardsData, categoryLower);

  // Get base URL
  const baseUrl = getBaseUrl();

  // Clear previous content
  container.innerHTML = '';

  if (filteredApps.length === 0) {
    container.innerHTML = '<p>No applications found for this category.</p>';
    return;
  }

  // Add category header
  const header = document.createElement('h2');
  header.className = 'category-title';
  header.textContent = matchingCategory.title;
  container.appendChild(header);

  // Create grid for cards
  const appGrid = document.createElement('div');
  appGrid.className = 'app-cards';

  // Sort apps alphabetically
  filteredApps.sort((a, b) => a[0].localeCompare(b[0]));

  // Create app cards
  filteredApps.forEach(([appName, appData]) => {
    const card = createAppCard(appName, appData.tags, appData, baseUrl);
    appGrid.appendChild(card);
  });

  container.appendChild(appGrid);
}

// Method to create an app card with the enhanced tag count functionality
function createAppCard(appName, tags, cardData, baseUrl) {
  const simpleName = appName.split('/').pop(); // Extract just the application name, no path
  const card = document.createElement('div');
  card.className = 'app-card';

  // Create thumbnail element
  const thumbnail = document.createElement('div');
  thumbnail.className = 'app-thumbnail';

  // Generate a placeholder color based on app name
  const hash = appName.split('').reduce((a, b) => (((a << 5) - a) + b.charCodeAt(0))|0, 0);
  const hue = Math.abs(hash) % 360;
  const bgColor = `hsl(${hue}, 70%, 85%)`;

  // Get first letter of app title for placeholder
  const appInitial = (cardData.app_title || simpleName || appName).charAt(0).toUpperCase();

  // Add placeholder with app initial
  const placeholder = document.createElement('div');
  placeholder.className = 'image-placeholder';
  placeholder.style.backgroundColor = bgColor;
  placeholder.textContent = appInitial;
  thumbnail.appendChild(placeholder);

  // Add image if available
  if (cardData.image_url) {
    const img = document.createElement('img');
    img.src = cardData.image_url;
    img.alt = cardData.name || cardData.app_title;
    img.loading = 'lazy';
    img.onload = () => thumbnail.classList.add('loaded');
    thumbnail.appendChild(img);
  }

  // Create details section
  const details = document.createElement('div');
  details.className = 'app-details';
  details.innerHTML = `
    <h5>${cardData.app_title}</h5>
    <p>${cardData.description}</p>
  `;
  const tagsContainer = document.createElement('div');
  tagsContainer.className = 'app-tags';
  // Add up to 3 tags
  tags.slice(0, 3).forEach(tag => {
    const tagSpan = document.createElement('span');
    tagSpan.className = 'tag';
    tagSpan.textContent = tag;
    tagSpan.addEventListener('click', function(e) {
      e.stopPropagation(); // Prevent card click
      window.handleTagClick(tag);
      return false;
    });
    tagsContainer.appendChild(tagSpan);
  });

  // Add tag count if more than 3
  if (tags.length > 3) {
    const tagCount = document.createElement('span');
    tagCount.className = 'tag-count';
    tagCount.textContent = `+${tags.length - 3}`;
    tagCount.setAttribute('data-tags', JSON.stringify(tags));
    tagCount.addEventListener('click', function(e) {
      e.stopPropagation(); // Prevent card click
      if (typeof window.showAllTags === 'function') {
        window.showAllTags(this, this.getAttribute('data-tags'));
      }
      return false;
    });
    tagsContainer.appendChild(tagCount);
  }

  details.appendChild(tagsContainer);
  card.appendChild(thumbnail);
  card.appendChild(details);
  card.addEventListener('click', () => window.location.href = `${baseUrl}${cardData.app_url}`);
  card.style.cursor = 'pointer';

  return card;
}

// Function to filter apps by category
function filterAppsByCategory(appCardsData, categoryLower) {
  // Find the category in the categories data
  const categories = window.tagSidebarData.categories;
  const matchingCategory = categories.find(cat =>
    cat.title.toLowerCase() === categoryLower
  );
  if (!matchingCategory || !matchingCategory.ids) {
    return [];
  }
  const categoryIds = matchingCategory.ids.map(id => id.toLowerCase());
  return Object.entries(appCardsData)
    .filter(([appName, appData]) => {
      const appTitle = (appData.app_title || appName).toLowerCase();
      return categoryIds.some(id => appTitle === id || appTitle.includes(id) || id.includes(appTitle));
    });
}

// Function to get card data for an app
function getCardData(appName, tags, category, appCardsData) {
  return appCardsData[appName] || {
    name: appName,
    description: "Application for " + category,
    image_url: null,
    tags: tags,
    app_title: appName.split('/').pop() || appName,
    app_url: `applications/${appName.split('/').pop() || appName}/`
  };
}

// Global function for handling tag clicks across the site
window.handleTagClick = function(tag) {
  const searchInput = document.querySelector('.md-search__input');
  if (searchInput) {
    searchInput.focus();
    searchInput.value = tag;
    searchInput.dispatchEvent(new Event('input', { bubbles: true }));
    const searchButton = document.querySelector('[data-md-toggle="search"]');
    if (searchButton && !searchButton.checked) {
      searchButton.checked = true;
    }
  }
  return false;
};

// TagPopup class for managing tag popups
class TagPopup {
  constructor() {
    this.element = document.createElement('div');
    this.element.className = 'tags-popup';
    this.element.style.display = 'none';
    document.body.appendChild(this.element);

    // Add global click handler to close popup when clicking outside
    document.addEventListener('click', (e) => {
      if (!this.element.contains(e.target) && !e.target.classList.contains('tag-count')) {
        this.hide();
      }
    });
  }

  // Show the popup with the given tags array near the target element
  show(targetElement, tags) {
    // Clear the popup content
    this.element.innerHTML = '';

    // Add title
    const title = document.createElement('div');
    title.className = 'tags-popup-title';
    title.textContent = 'All Tags';
    this.element.appendChild(title);

    // Add tags
    const content = document.createElement('div');
    content.className = 'tags-popup-content';

    tags.forEach(tag => {
      const tagEl = document.createElement('span');
      tagEl.className = 'tags-popup-tag';
      tagEl.textContent = tag;
      tagEl.addEventListener('click', () => {
        this.hide();
        window.handleTagClick(tag);
        return false;
      });
      content.appendChild(tagEl);
    });
    this.element.appendChild(content);

    // Position the popup near the target element
    const rect = targetElement.getBoundingClientRect();
    this.element.style.top = (rect.bottom + window.scrollY + 8) + 'px';
    this.element.style.left = (rect.left + window.scrollX) + 'px';
    this.element.style.display = 'block';
  }

  // Hide the popup
  hide() {
    this.element.style.display = 'none';
  }
}

// Initialize the global tag popup instance
let globalTagPopup;
