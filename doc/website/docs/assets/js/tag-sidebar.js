// Tag-based sidebar navigation
document.addEventListener('DOMContentLoaded', async function() {
  console.log("Tag sidebar script loading...");

  try {
    // Get the base URL from the <base> tag if available, or infer from path
    let baseUrl = '';
    const baseTag = document.querySelector('base');
    if (baseTag && baseTag.href) {
      baseUrl = new URL(baseTag.href).pathname;
    } else {
      // Handle /holohub/ or other base paths
      const pathParts = window.location.pathname.split('/');
      if (pathParts.length > 2 && pathParts[1] === 'holohub') {
        baseUrl = '/holohub/';
      }
    }

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

      tagSidebar = document.createElement('div');
      tagSidebar.className = 'tag-sidebar md-sidebar md-sidebar--primary';

      // Insert as first child
      if (mainInner.firstChild) {
        mainInner.insertBefore(tagSidebar, mainInner.firstChild);
      } else {
        mainInner.appendChild(tagSidebar);
      }
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

        // Update URL without reloading the page
        const newUrl = `${tagsPath}?category=${encodeURIComponent(category.title)}`;
        history.pushState({ category: category.title }, '', newUrl);

        // Highlight this category
        const allHeaders = document.querySelectorAll('.tag-category-header');
        allHeaders.forEach(h => h.classList.remove('active'));
        categoryHeader.classList.add('active');

        // Load content directly instead of triggering events
        loadCategoryContent(category.title);
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
    if (categoryParam) {
      loadCategoryContent(categoryParam);

      // Highlight the active category in the sidebar
      highlightActiveCategory(categoryParam);
    }

    // Handle browser back/forward navigation
    window.addEventListener('popstate', function(event) {
      const urlParams = new URLSearchParams(window.location.search);
      const categoryParam = urlParams.get('category');
      if (categoryParam) {
        loadCategoryContent(categoryParam);
        highlightActiveCategory(categoryParam);
      }
    });

    console.log("Tag sidebar ready");

  } catch (error) {
    console.error('Error loading tag sidebar:', error);
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
    // Find the main content container
    const contentContainer = document.querySelector('.category-content');
    if (!contentContainer) {
      console.error("Could not find category content container");
      return;
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
    const filteredApps = Object.entries(tagsData)
      .filter(([appName, tags]) => {
        if (!tags || !tags.length) return false;

        // Check if any tag matches the category
        return tags.some(tag => {
          const tagLower = tag.toLowerCase();
          return tagLower === categoryLower ||
                tagLower.includes(categoryLower) ||
                (categoryLower === 'networking' && tagLower.includes('networking and distributed computing')) ||
                (categoryLower === 'nlp & conversational' && tagLower.includes('natural language and conversational ai')) ||
                (categoryLower === 'computer vision' && tagLower.includes('computer vision and perception'));
        });
      });

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
      let baseUrl = '';
      const baseTag = document.querySelector('base');
      if (baseTag && baseTag.href) {
        baseUrl = new URL(baseTag.href).pathname;
      } else {
        const pathParts = window.location.pathname.split('/');
        if (pathParts.length > 2 && pathParts[1] === 'holohub') {
          baseUrl = '/holohub/';
        }
      }

      // Create app cards
      filteredApps.forEach(([appName, tags]) => {
        // Try to find the app data by various potential keys
        let cardData;
        const simpleName = appName.split('/').pop(); // Extract just the application name, no path

        // Check for direct match with the exact appName
        if (appCardsData[appName]) {
          cardData = appCardsData[appName];
        }
        // If not found, try with just the simple name
        else if (simpleName && appCardsData[simpleName]) {
          cardData = appCardsData[simpleName];
        }
        // If still not found, try to match app_title
        else {
          const matchedCard = Object.values(appCardsData).find(
            card => card && (card.app_title === appName || card.app_title === simpleName)
          );

          if (matchedCard) {
            cardData = matchedCard;
          } else {
            // If still no match, use fallback
            const defaultAppTitle = simpleName || appName;
            cardData = {
              name: appName,
              description: "Application for " + category,
              image_url: null,
              tags: tags,
              app_title: defaultAppTitle,
              app_url: `applications/${defaultAppTitle}/`
            };
          }
        }

        // Generate a placeholder color based on app name
        const hash = appName.split('').reduce((a, b) => (((a << 5) - a) + b.charCodeAt(0))|0, 0);
        const hue = Math.abs(hash) % 360;
        const bgColor = `hsl(${hue}, 70%, 85%)`;

        // Get first letter of app title for placeholder
        const appInitial = (cardData.app_title || simpleName || appName).charAt(0).toUpperCase();

        // Create card content with image loading logic
        const card = document.createElement('div');
        card.className = 'app-card';

        // Create thumbnail element
        const thumbnail = document.createElement('div');
        thumbnail.className = 'app-thumbnail';

        // Create placeholder with app initial
        const placeholder = document.createElement('div');
        placeholder.className = 'image-placeholder';
        placeholder.style.backgroundColor = bgColor;
        placeholder.textContent = appInitial;
        thumbnail.appendChild(placeholder);

        // Add image if available
        if (cardData.image_url) {
          const img = document.createElement('img');
          img.src = cardData.image_url;
          img.alt = cardData.name;
          img.loading = 'lazy';
          img.onload = function() {
            thumbnail.classList.add('loaded');
          };
          thumbnail.appendChild(img);
        }

        // Create details section
        const details = document.createElement('div');
        details.className = 'app-details';

        // Add title
        const title = document.createElement('h5');
        title.textContent = cardData.app_title;
        details.appendChild(title);

        // Add description
        const description = document.createElement('p');
        description.textContent = cardData.description;
        details.appendChild(description);

        // Add tags
        const tagsContainer = document.createElement('div');
        tagsContainer.className = 'app-tags';

        // Add up to 3 tags
        tags.slice(0, 3).forEach(tag => {
          const tagSpan = document.createElement('span');
          tagSpan.className = 'tag';
          tagSpan.textContent = tag;
          tagsContainer.appendChild(tagSpan);
        });

        // Add tag count if more than 3
        if (tags.length > 3) {
          const tagCount = document.createElement('span');
          tagCount.className = 'tag-count';
          tagCount.textContent = `+${tags.length - 3}`;
          tagsContainer.appendChild(tagCount);
        }

        details.appendChild(tagsContainer);

        // Assemble the card
        card.appendChild(thumbnail);
        card.appendChild(details);

        // Ensure the app_url has the proper structure for navigation
        let appUrl = cardData.app_url || '';
        if (!appUrl.startsWith('applications/') && !appUrl.startsWith('/applications/')) {
          appUrl = `applications/${appUrl}`;
        }

        // Make sure it ends with a trailing slash for consistency
        if (!appUrl.endsWith('/')) {
          appUrl += '/';
        }

        // Make the card clickable with the constructed URL
        card.addEventListener('click', function() {
          window.location.href = `${baseUrl}${appUrl}`;
        });

        // Add hover effect
        card.style.cursor = 'pointer';

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
