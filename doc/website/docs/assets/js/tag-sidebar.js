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

document.addEventListener('DOMContentLoaded', async function() {
  console.log("Tag sidebar script loading...");
  try {
    // Get the base URL
    const baseUrl = getBaseUrl();

    // Check if we're on the tags page
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

    let dataPath = `${baseUrl}_data/`;
    console.log("Data path:", dataPath);

    // Initialize global data cache
    window.tagSidebarData = window.tagSidebarData || {
      categories: null,
      appCardsData: null,
      isLoading: false
    };

    if (!window.tagSidebarData.categories || !window.tagSidebarData.appCardsData) {
      window.tagSidebarData.isLoading = true;

      try {
        const [categoriesResponse, appCardsResponse] = await Promise.all([
          fetch(`${dataPath}tmp_tag-categories.json`),
          fetch(`${dataPath}tmp_app_cards.json`)
        ]);

        if (!categoriesResponse.ok) {
          throw new Error(`Failed to fetch categories: ${categoriesResponse.status}`);
        }
        if (!appCardsResponse.ok) {
          throw new Error(`Failed to fetch app cards: ${appCardsResponse.status}`);
        }

        window.tagSidebarData.categories = await categoriesResponse.json();
        window.tagSidebarData.appCardsData = await appCardsResponse.json();

        console.log("Categories loaded:", window.tagSidebarData.categories.length);
        console.log("App cards data loaded:", Object.keys(window.tagSidebarData.appCardsData).length);
      } catch (error) {
        console.error("Error loading tag data:", error);
      } finally {
        window.tagSidebarData.isLoading = false;
      }
    }

    const categories = window.tagSidebarData.categories;
    const appCardsData = window.tagSidebarData.appCardsData;

    if (!categories || !appCardsData) {
      console.error("Required data could not be loaded");
      return;
    }

    let tagSidebar, primarySidebar;

    primarySidebar = document.querySelector('.md-sidebar--primary');
    if (primarySidebar) {
      console.log("Found primary sidebar");

      tagSidebar = primarySidebar.querySelector('.tag-sidebar');
      if (tagSidebar) {
        console.log("Tag sidebar already exists, skipping creation");
        return;
      }
      tagSidebar = document.createElement('div');
      tagSidebar.className = 'tag-sidebar';
      const scrollWrap = primarySidebar.querySelector('.md-sidebar__scrollwrap');
      if (scrollWrap) {
        scrollWrap.appendChild(tagSidebar);
        console.log("Sidebar inserted into primary sidebar scrollwrap");
      } else {
        // If no scrollwrap, create one
        const newScrollWrap = document.createElement('div');
        newScrollWrap.className = 'md-sidebar__scrollwrap';
        newScrollWrap.appendChild(tagSidebar);
        primarySidebar.appendChild(newScrollWrap);
        console.log("Created new scrollwrap and inserted sidebar");
      }
    } else {
      console.warn("Could not find primary sidebar, creating standalone");

      // Check if tag sidebar already exists
      tagSidebar = document.querySelector('.tag-sidebar.md-sidebar');
      if (tagSidebar) {
        console.log("Standalone tag sidebar already exists, skipping creation");
        return;
      }

      // Create standalone sidebar if primary doesn't exist
      const mainInner = document.querySelector('.md-main__inner');
      if (!mainInner) {
        console.error("Could not find main inner container");
        return;
      }

      // Create a wrapper for the sidebar
      const sidebarWrapper = document.createElement('div');
      sidebarWrapper.className = 'tag-sidebar-wrapper';
      sidebarWrapper.style.position = 'relative';

      tagSidebar = document.createElement('div');
      tagSidebar.className = 'tag-sidebar md-sidebar md-sidebar--primary';

      // Insert as first child
      if (mainInner.firstChild) {
        mainInner.insertBefore(sidebarWrapper, mainInner.firstChild);
      } else {
        mainInner.appendChild(sidebarWrapper);
      }
      sidebarWrapper.appendChild(tagSidebar);
      console.log("Created standalone sidebar");
    }

    // Build the sidebar content
    const sidebarContent = document.createElement('div');
    sidebarContent.className = 'tag-sidebar-content';
    const title = document.createElement('h2');
    title.textContent = 'Application Categories';
    sidebarContent.appendChild(title);
    const categoryList = document.createElement('ul');
    categoryList.className = 'tag-category-list md-nav__list';
    const primaryCategories = categories
    console.log("Primary categories:", primaryCategories.length);

    // Build the tags page URL with the correct base path
    const tagsPath = `${baseUrl}tags/`;
    primaryCategories.forEach(category => {
      // Create category list item
      const categoryItem = document.createElement('li');
      categoryItem.className = 'tag-category-item md-nav__item';
      const appCount = category.count || 0;
      const categoryHeader = document.createElement('div');
      categoryHeader.className = 'tag-category-header md-nav__link';
      categoryHeader.innerHTML = `
        <span class="material-icons tag-category-icon">${category.icon}</span>
        <span class="tag-category-title">${category.title}</span>
        <span class="tag-category-count">(${appCount})</span>
      `;
      categoryHeader.addEventListener('click', function(e) {
        e.preventDefault();
        const newUrl = `${tagsPath}?category=${encodeURIComponent(category.title)}`;
        window.location.href = newUrl;
      });

      categoryItem.appendChild(categoryHeader);
      categoryList.appendChild(categoryItem);
    });

    sidebarContent.appendChild(categoryList);
    tagSidebar.appendChild(sidebarContent);

    if (primarySidebar) {
      primarySidebar.style.display = 'block';
    }
    document.body.classList.add('tag-sidebar-ready');

    // Handle initial URL parameters
    handleCategoryParamChange();
    // Handle browser back/forward navigation
    window.addEventListener('popstate', function(event) {
      handleCategoryParamChange();
    });

    // Handle window resize
    let resizeTimeout;
    window.addEventListener('resize', function() {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(function() {
        const sidebar = document.querySelector('.tag-sidebar.md-sidebar');
        if (sidebar) {
          sidebar.style.height = `calc(100vh - ${document.querySelector('.md-header').offsetHeight}px)`;
        }
      }, 100);
    });

    console.log("Tag sidebar ready");

  } catch (error) {
    console.error('Error loading tag sidebar:', error);
  }
});

// Second event listener for handling category pages
document.addEventListener('DOMContentLoaded', async function() {
  try {
    const baseUrl = getBaseUrl();
    let dataPath = `${baseUrl}_data/`;
    const urlParams = new URLSearchParams(window.location.search);
    const searchQuery = urlParams.get('category');

    if (!window.tagSidebarData) {
      window.tagSidebarData = {
        categories: null,
        appCardsData: null,
        isLoading: false
      };

      // Load the data
      try {
        window.tagSidebarData.isLoading = true;
        const [categoriesResponse, appCardsResponse] = await Promise.all([
          fetch(`${dataPath}tmp_tag-categories.json`),
          fetch(`${dataPath}app_cards.json`)
        ]);

        if (!categoriesResponse.ok || !appCardsResponse.ok) {
          throw new Error(`Failed to fetch data: ${categoriesResponse.status}, ${appCardsResponse.status}`);
        }

        window.tagSidebarData.categories = await categoriesResponse.json();
        window.tagSidebarData.appCardsData = await appCardsResponse.json();
      } catch (error) {
        console.error('Error loading data:', error.message);
      } finally {
        window.tagSidebarData.isLoading = false;
      }
    }

    // Access the cached data
    const categoriesData = window.tagSidebarData.categories;
    const appCardsData = window.tagSidebarData.appCardsData || {};

    if (!categoriesData || !appCardsData) {
      document.querySelector('.category-cards').innerHTML =
        '<p>Error loading data. Please try refreshing the page.</p>';
      return;
    }

    if (searchQuery) {
      // Display the query
      document.querySelector('.category-filter-message').style.display = 'none';
      document.querySelector('.category-results').style.display = 'block';

      // Find matching category in categoriesData first
      const matchingCategory = categoriesData.find(category =>
        category.title.toLowerCase() === searchQuery.toLowerCase()
      );

      if (!matchingCategory) {
        document.querySelector('.category-cards').innerHTML = '<p>No matching category found.</p>';
        return;
      }

      // Filter apps based on the matching category title
      const categoryLower = matchingCategory.title.toLowerCase();
      const filteredApps = filterAppsByCategory(appCardsData, categoryLower);

      // Display the results
      const cardsContainer = document.querySelector('.category-cards');

      if (filteredApps.length === 0) {
        cardsContainer.innerHTML = '<p>No applications found for this category.</p>';
      } else {
        cardsContainer.innerHTML = '';
        if (matchingCategory) {
          const categorySection = document.createElement('div');
          categorySection.className = 'category-section';

          const categoryHeader = document.createElement('div');
          categoryHeader.className = 'category-header';
          categoryHeader.innerHTML = `<h2 class="category-title">Applications - ${matchingCategory.title}</h2>`;
          categorySection.appendChild(categoryHeader);
          cardsContainer.appendChild(categorySection);
        }

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

        cardsContainer.appendChild(appGrid);
      }
    }
  } catch (error) {
    console.error('Error loading category results:', error);
    document.querySelector('.category-cards').innerHTML =
      `<p>Error loading applications: ${error.message}</p>`;
  }
});

// Function to highlight the active category in the sidebar
function highlightActiveCategory(categoryName) {
  if (!categoryName) return;

  // Remove active class from all category headers
  const allHeaders = document.querySelectorAll('.tag-category-header');
  allHeaders.forEach(header => header.classList.remove('active'));

  // Find the matching category header
  const categoryLower = categoryName.toLowerCase();
  const categoryHeaders = document.querySelectorAll('.tag-category-header');

  for (const header of categoryHeaders) {
    const titleElement = header.querySelector('.tag-category-title');
    if (titleElement && titleElement.textContent.toLowerCase() === categoryLower) {
      header.classList.add('active');

      // Scroll the sidebar to show the active category
      const sidebar = header.closest('.tag-sidebar');
      if (sidebar) {
        const headerTop = header.offsetTop;
        const sidebarScrollTop = sidebar.scrollTop;
        const sidebarHeight = sidebar.clientHeight;

        // If the header is not fully visible in the sidebar
        if (headerTop < sidebarScrollTop || headerTop > sidebarScrollTop + sidebarHeight) {
          // Scroll to position the header in the middle of the sidebar
          sidebar.scrollTop = headerTop - (sidebarHeight / 2);
        }
      }

      break;
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

// Function to handle URL parameter changes
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

    renderCategoryContent(cardsContainer, matchingCategory, appCardsData, category);
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

// Function to render category content
function renderCategoryContent(container, matchingCategory, appCardsData, category) {
  // Filter apps based on the matching category title
  const categoryLower = matchingCategory.title.toLowerCase();
  const filteredApps = filterAppsByCategory(appCardsData, categoryLower);

  // Get base URL
  const baseUrl = getBaseUrl();

  // Display the results
  if (filteredApps.length === 0) {
    container.innerHTML = '<p>No applications found for this category.</p>';
  } else {
    container.innerHTML = '';

    // Add category header
    const categorySection = document.createElement('div');
    categorySection.className = 'category-section';

    const categoryHeader = document.createElement('div');
    categoryHeader.className = 'category-header';
    categoryHeader.innerHTML = `<h2 class="category-title">${matchingCategory.title}</h2>`;

    categorySection.appendChild(categoryHeader);
    container.appendChild(categorySection);

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
  return Object.entries(appCardsData)
    .filter(([_, appData]) => {
      const tags = appData.tags;
      if (!tags || !tags.length) return false;
      return tags.some(tag => {
        const tagLower = tag.toLowerCase();
        return tagLower === categoryLower ||
              tagLower.includes(categoryLower) ||
              (categoryLower === 'networking' && tagLower.includes('networking and distributed computing')) ||
              (categoryLower === 'nlp & conversational' && tagLower.includes('natural language and conversational ai')) ||
              (categoryLower === 'computer vision' && tagLower.includes('computer vision and perception'));
      });
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
