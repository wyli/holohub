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

document.addEventListener('DOMContentLoaded', async function() {
  console.log("Tag sidebar script loading...");
  try {
    // Get the base URL
    const baseUrl = getBaseUrl();
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

    // Create a popup for displaying all tags
    const tagsPopup = document.createElement('div');
    tagsPopup.className = 'tags-popup';
    tagsPopup.style.display = 'none';
    document.body.appendChild(tagsPopup);

    // Check if we're on the tags page
    const isTagsPage = window.location.pathname.endsWith('/tags/') ||
                      window.location.pathname.endsWith('/tags') ||
                      window.location.pathname.includes('/tags/index');

    // Add click event handler to close popup when clicking outside
    document.addEventListener('click', function(e) {
      if (!tagsPopup.contains(e.target) && !e.target.classList.contains('tag-count')) {
        tagsPopup.style.display = 'none';
      }
    });

    // Add the popup styles to the document
    const popupStyles = document.createElement('style');
    popupStyles.textContent = `
      .tags-popup {
        position: absolute;
        background-color: var(--md-default-bg-color);
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        padding: 1rem;
        max-width: 300px;
        z-index: 1000;
        border: 1px solid var(--md-default-fg-color--lightest);
      }
      .tags-popup-title {
        font-size: 0.85rem;
        font-weight: 600;
        margin-bottom: 0.7rem;
        color: var(--md-default-fg-color);
      }
      .tags-popup-content {
        display: flex;
        flex-wrap: wrap;
        gap: 0.5rem;
      }
      .tags-popup-tag {
        display: inline-block;
        padding: 0.2rem 0.5rem;
        background-color: var(--md-accent-fg-color--transparent);
        border-radius: 4px;
        font-size: 0.65rem;
        color: var(--md-accent-fg-color);
        font-weight: 600;
        border: 1px solid var(--md-accent-fg-color--transparent);
        cursor: pointer;
        transition: background-color 0.2s ease, color 0.2s ease;
      }
      .tags-popup-tag:hover {
        background-color: var(--md-accent-fg-color);
        color: white;
        border-color: var(--md-accent-fg-color);
      }
    `;
    document.head.appendChild(popupStyles);

    // Function to show tag popup
    window.showAllTags = function(element, allTags) {
      // Parse the tags from the data attribute
      const tags = JSON.parse(allTags);

      // Clear the popup content
      tagsPopup.innerHTML = '';

      // Add title
      const title = document.createElement('div');
      title.className = 'tags-popup-title';
      title.textContent = 'All Tags';
      tagsPopup.appendChild(title);

      // Add tags
      const content = document.createElement('div');
      content.className = 'tags-popup-content';

      tags.forEach(tag => {
        const tagEl = document.createElement('span');
        tagEl.className = 'tags-popup-tag';
        tagEl.textContent = tag;
        tagEl.addEventListener('click', function(e) {
          // Close the popup
          tagsPopup.style.display = 'none';
          // Handle the tag click
          window.handleTagClick(tag);
          return false;
        });
        content.appendChild(tagEl);
      });

      tagsPopup.appendChild(content);

      // Position the popup
      const rect = element.getBoundingClientRect();
      tagsPopup.style.top = (rect.bottom + window.scrollY + 8) + 'px';
      tagsPopup.style.left = (rect.left + window.scrollX) + 'px';

      // Show the popup
      tagsPopup.style.display = 'block';

      // Prevent event propagation
      return false;
    };

    console.log("Base URL detected:", baseUrl);

    // Use a more robust path resolution approach
    const docsPath = `${baseUrl}`;

    // Determine path to _data directory
    let dataPath = `${docsPath}_data/`;
    console.log("Data path:", dataPath);

    // Initialize global data cache
    window.tagSidebarData = window.tagSidebarData || {
      categories: null,
      tagsData: null,
      appCardsData: null,
      isLoading: false
    };

    // Check if we need to load data (only load once)
    if (!window.tagSidebarData.categories || !window.tagSidebarData.tagsData) {
      window.tagSidebarData.isLoading = true;

      try {
        // Load all data in parallel
        const [categoriesResponse, tagsResponse, appCardsResponse] = await Promise.all([
          fetch(`${dataPath}tmp_tag-categories.json`),
          fetch(`${dataPath}tmp_tags.json`),
          fetch(`${dataPath}app_cards.json`).catch(() => ({ ok: false })) // Optional data
        ]);

        if (!categoriesResponse.ok) {
          throw new Error(`Failed to fetch categories: ${categoriesResponse.status}`);
        }
        if (!tagsResponse.ok) {
          throw new Error(`Failed to fetch tags: ${tagsResponse.status}`);
        }

        // Store data in global cache
        window.tagSidebarData.categories = await categoriesResponse.json();
        window.tagSidebarData.tagsData = await tagsResponse.json();

        // Store app cards data if available
        if (appCardsResponse.ok) {
          window.tagSidebarData.appCardsData = await appCardsResponse.json();
          console.log("App cards data loaded:", Object.keys(window.tagSidebarData.appCardsData).length);
        }

        console.log("Categories loaded:", window.tagSidebarData.categories.length);
        console.log("Tags data loaded:", Object.keys(window.tagSidebarData.tagsData).length);
      } catch (error) {
        console.error("Error loading tag data:", error);
      } finally {
        window.tagSidebarData.isLoading = false;
      }
    }

    // Use cached data
    const categories = window.tagSidebarData.categories;
    const tagsData = window.tagSidebarData.tagsData;

    if (!categories || !tagsData) {
      console.error("Required data could not be loaded");
      return;
    }

    // Find or create the sidebar container
    let tagSidebar, primarySidebar;

    // First try to find the primary sidebar
    primarySidebar = document.querySelector('.md-sidebar--primary');
    if (primarySidebar) {
      console.log("Found primary sidebar");

      // Check if tag sidebar already exists
      tagSidebar = primarySidebar.querySelector('.tag-sidebar');
      if (tagSidebar) {
        console.log("Tag sidebar already exists, skipping creation");
        return;
      }

      // Create tag sidebar content inside primary sidebar
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

    // Add a title
    const title = document.createElement('h2');
    title.textContent = 'Application Categories';
    sidebarContent.appendChild(title);

    // Create a list of primary categories
    const categoryList = document.createElement('ul');
    categoryList.className = 'tag-category-list md-nav__list';

    // Sort categories by title
    const primaryCategories = categories
      .filter(cat => cat.isPrimary)
      .sort((a, b) => a.title.localeCompare(b.title));

    console.log("Primary categories:", primaryCategories.length);

    // Build the tags page URL with the correct base path
    const tagsPath = `${baseUrl}tags/`;

    // Process each primary category
    primaryCategories.forEach(category => {
      // Create category list item
      const categoryItem = document.createElement('li');
      categoryItem.className = 'tag-category-item md-nav__item';

      // Get the pre-computed app count for this category
      const appCount = category.count || 0;

      // Create category header with icon and count
      const categoryHeader = document.createElement('div');
      categoryHeader.className = 'tag-category-header md-nav__link';
      categoryHeader.innerHTML = `
        <span class="material-icons tag-category-icon">${category.icon}</span>
        <span class="tag-category-title">${category.title}</span>
        <span class="tag-category-count">(${appCount})</span>
      `;

      // Make the header clickable to load content without page reload
      categoryHeader.addEventListener('click', function(e) {
        e.preventDefault();

        // Navigate to the category page
        const newUrl = `${tagsPath}?category=${encodeURIComponent(category.title)}`;
        window.location.href = newUrl;
      });

      categoryItem.appendChild(categoryHeader);
      categoryList.appendChild(categoryItem);
    });

    sidebarContent.appendChild(categoryList);
    tagSidebar.appendChild(sidebarContent);

    // Force update sidebar visibility
    if (primarySidebar) {
      primarySidebar.style.display = 'block';
    }

    // Add a class to body to indicate sidebar is ready
    document.body.classList.add('tag-sidebar-ready');

    // Check if URL has a category parameter and load that content
    const urlParams = new URLSearchParams(window.location.search);
    const categoryParam = urlParams.get('category');

    // If we're on the tags page or have a category parameter, load the content
    if (categoryParam) {
      // Highlight the active category in the sidebar
      highlightActiveCategory(categoryParam);

      // If on the tags page, load the category content
      if (isTagsPage) {
        loadCategoryContent(categoryParam);
      }
    } else if (isTagsPage) {
      // If on tags page without category, show initial message
      const filterMessage = document.querySelector('.category-filter-message');
      const resultsSection = document.querySelector('.category-results');

      if (filterMessage && resultsSection) {
        filterMessage.style.display = 'block';
        resultsSection.style.display = 'none';
      }
    }

    // Handle browser back/forward navigation
    window.addEventListener('popstate', function(event) {
      const urlParams = new URLSearchParams(window.location.search);
      const categoryParam = urlParams.get('category');
      if (categoryParam) {
        highlightActiveCategory(categoryParam);

        // If on the tags page, also load the content
        if (isTagsPage) {
          loadCategoryContent(categoryParam);
        }
      } else if (isTagsPage) {
        // Reset to initial state if no category
        const filterMessage = document.querySelector('.category-filter-message');
        const resultsSection = document.querySelector('.category-results');

        if (filterMessage && resultsSection) {
          filterMessage.style.display = 'block';
          resultsSection.style.display = 'none';
        }
      }
    });

    // Handle window resize
    let resizeTimeout;
    window.addEventListener('resize', function() {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(function() {
        // Update sidebar height on resize
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
    // Get the base URL
    const baseUrl = getBaseUrl();

    // Determine path to _data directory
    let dataPath = `${baseUrl}_data/`;

    // Get the search query from URL
    const urlParams = new URLSearchParams(window.location.search);
    const searchQuery = urlParams.get('category');

    // Try to use already loaded data from the sidebar
    if (!window.tagSidebarData) {
      // Initialize the data cache if it doesn't exist yet
      window.tagSidebarData = {
        categories: null,
        tagsData: null,
        appCardsData: null,
        isLoading: false
      };

      // Load the data
      try {
        window.tagSidebarData.isLoading = true;

        // Load all data in parallel
        const [tagsResponse, categoriesResponse, appCardsResponse] = await Promise.all([
          fetch(`${dataPath}tmp_tags.json`),
          fetch(`${dataPath}tmp_tag-categories.json`),
          fetch(`${dataPath}app_cards.json`).catch(() => ({ ok: false })) // Optional data
        ]);

        if (!tagsResponse.ok || !categoriesResponse.ok) {
          throw new Error(`Failed to fetch data: ${tagsResponse.status}, ${categoriesResponse.status}`);
        }

        window.tagSidebarData.tagsData = await tagsResponse.json();
        window.tagSidebarData.categories = await categoriesResponse.json();

        // Load app cards data if available
        if (appCardsResponse.ok) {
          window.tagSidebarData.appCardsData = await appCardsResponse.json();
          console.log('App cards data loaded successfully', Object.keys(window.tagSidebarData.appCardsData).length, 'entries');
        } else {
          console.log('App cards data not available, using fallback');
        }
      } catch (error) {
        console.error('Error loading data:', error.message);
      } finally {
        window.tagSidebarData.isLoading = false;
      }
    }

    // Access the cached data
    const tagsData = window.tagSidebarData.tagsData;
    const categoriesData = window.tagSidebarData.categories;
    const appCardsData = window.tagSidebarData.appCardsData || {};

    if (!tagsData || !categoriesData) {
      document.querySelector('.category-cards').innerHTML =
        '<p>Error loading data. Please try refreshing the page.</p>';
      return;
    }

    if (searchQuery) {
      // Display the query
      document.querySelector('.category-filter-message').style.display = 'none';
      document.querySelector('.category-results').style.display = 'block';

      // Find matching category in categoriesData first
      const searchQueryLower = searchQuery.toLowerCase();
      const matchingCategory = categoriesData.find(category =>
        category.title.toLowerCase() === searchQueryLower
      );

      if (!matchingCategory) {
        document.querySelector('.category-cards').innerHTML = '<p>No matching category found.</p>';
        return;
      }

      // Filter apps based on the matching category title
      const categoryLower = matchingCategory.title.toLowerCase();
      const filteredApps = filterAppsByCategory(tagsData, categoryLower);

      // Display the results
      const cardsContainer = document.querySelector('.category-cards');

      if (filteredApps.length === 0) {
        cardsContainer.innerHTML = '<p>No applications found for this category.</p>';
      } else {
        cardsContainer.innerHTML = '';

        // Add category header and description if available
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
        filteredApps.forEach(([appName, tags]) => {
          const cardData = getCardData(appName, tags, searchQuery, appCardsData);
          const card = createAppCard(appName, tags, cardData, baseUrl);
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
    filterMessage.style.display = 'none';
    resultsSection.style.display = 'block';
    cardsContainer.innerHTML = '<div class="loading-message">Loading applications...</div>';

    // Update page title
    document.title = `${category} - Applications - HoloHub`;

    // Highlight the active category in the sidebar
    highlightActiveCategory(category);

    // Use cached data from the global store
    const categoriesData = window.tagSidebarData.categories;
    const tagsData = window.tagSidebarData.tagsData;
    const appCardsData = window.tagSidebarData.appCardsData || {};

    // Find matching category in categoriesData
    const searchQueryLower = category.toLowerCase();
    const matchingCategory = categoriesData.find(cat =>
      cat.title.toLowerCase() === searchQueryLower
    );

    if (!matchingCategory) {
      cardsContainer.innerHTML = '<p>No matching category found.</p>';
      contentContainer.classList.remove('loading');
      return;
    }

    // Filter apps based on the matching category title
    const categoryLower = matchingCategory.title.toLowerCase();
    const filteredApps = filterAppsByCategory(tagsData, categoryLower);

    // Display the results
    if (filteredApps.length === 0) {
      cardsContainer.innerHTML = '<p>No applications found for this category.</p>';
    } else {
      cardsContainer.innerHTML = '';

      // Add category header
      const categorySection = document.createElement('div');
      categorySection.className = 'category-section';

      const categoryHeader = document.createElement('div');
      categoryHeader.className = 'category-header';
      categoryHeader.innerHTML = `<h2 class="category-title">${matchingCategory.title}</h2>`;

      categorySection.appendChild(categoryHeader);
      cardsContainer.appendChild(categorySection);

      // Create grid for cards
      const appGrid = document.createElement('div');
      appGrid.className = 'app-cards';

      // Sort apps alphabetically
      filteredApps.sort((a, b) => a[0].localeCompare(b[0]));

      // Get base URL
      const baseUrl = getBaseUrl();

      // Create app cards
      filteredApps.forEach(([appName, tags]) => {
        const cardData = getCardData(appName, tags, category, appCardsData);
        const card = createAppCard(appName, tags, cardData, baseUrl);
        appGrid.appendChild(card);
      });

      cardsContainer.appendChild(appGrid);
    }
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

  // Add title and description
  details.innerHTML = `
    <h5>${cardData.app_title}</h5>
    <p>${cardData.description}</p>
  `;

  // Add tags
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

  // Ensure the app_url has the proper structure for navigation
  let appUrl = cardData.app_url || '';
  if (!appUrl.startsWith('applications/') && !appUrl.startsWith('/applications/')) {
    appUrl = `applications/${appUrl}`;
  }
  if (!appUrl.endsWith('/')) {
    appUrl += '/';
  }

  // Make the card clickable with the constructed URL
  card.addEventListener('click', () => window.location.href = `${baseUrl}${appUrl}`);
  card.style.cursor = 'pointer';

  return card;
}

// Function to filter apps by category
function filterAppsByCategory(tagsData, categoryLower) {
  return Object.entries(tagsData)
    .filter(([appName, tags]) => {
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
  const simpleName = appName.split('/').pop(); // Extract just the application name, no path
  if (appCardsData[appName]) {
    return appCardsData[appName];
  }
  else if (simpleName && appCardsData[simpleName]) {
    return appCardsData[simpleName];
  }
  else {
    const matchedCard = Object.values(appCardsData).find(
      card => card && (card.app_title === appName || card.app_title === simpleName)
    );

    if (matchedCard) {
      return matchedCard;
    }

    const defaultAppTitle = simpleName || appName;
    return {
      name: appName,
      description: "Application for " + category,
      image_url: null,
      tags: tags,
      app_title: defaultAppTitle,
      app_url: `applications/${defaultAppTitle}/`
    };
  }
}
