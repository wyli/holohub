---
hide:
  - navigation
title: Applications by Category
---

<div class="category-content">
  <div class="category-filter-message">Select a category from the sidebar to view applications</div>
  <div class="category-results" style="display: none;">
    <div class="category-cards"></div>
  </div>
</div>


<script>
document.addEventListener('DOMContentLoaded', async function() {
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

        // Create app cards using the shared function
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
                description: "Application for " + searchQuery,
                image_url: null,
                tags: tags,
                app_title: defaultAppTitle,
                app_url: `applications/${defaultAppTitle}/`
              };
            }
          }

          // Use the createAppCard function if available, or fall back to inline creation
          if (typeof window.createAppCard === 'function') {
            const card = window.createAppCard(appName, tags, cardData, baseUrl);
            appGrid.appendChild(card);
          } else {
            // Fallback card creation (existing code)
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
          }
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
</script>
