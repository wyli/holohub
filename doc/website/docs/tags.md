---
hide:
  - navigation
title: Applications by Category
---

# Applications by Category

<div class="category-content">
  <div class="category-filter-message">Select a category from the sidebar to view applications</div>
  <div class="category-results" style="display: none;">
    <div class="category-cards"></div>
  </div>
</div>

<!-- All hardcoded content has been removed. Dynamic content will be generated from JSON data. -->

<style>
/* Category Section Styles */
.category-content {
  position: relative;
  width: 100%;
  min-height: 60vh;
}

.category-section {
  margin-bottom: 3rem;
}

.category-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.category-navigation {
  display: flex;
  gap: 0.25rem;
}

.nav-button {
  background-color: var(--md-default-fg-color--lightest);
  border: none;
  border-radius: 50%;
  width: 2rem;
  height: 2rem;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

.nav-button:hover {
  background-color: var(--md-default-fg-color--lighter);
}

/* App Cards Styles */
.app-cards {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 1.25rem;
  margin: 1.5rem 0;
}

.app-card {
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.12);
  background-color: var(--md-default-bg-color);
  transition: transform 0.25s ease-in-out, box-shadow 0.25s ease-in-out;
  border: 1px solid rgba(0, 0, 0, 0.08);
  height: 100%;
  display: flex;
  flex-direction: column;
}

.app-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 6px 12px rgba(0, 0, 0, 0.15);
}

.app-thumbnail {
  height: 160px;
  background-size: cover;
  background-position: center;
  position: relative;
  overflow: hidden;
}

.image-placeholder {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.5rem;
  color: rgba(0, 0, 0, 0.4);
}

.app-thumbnail img {
  object-fit: cover;
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  opacity: 0;
  transition: opacity 0.4s ease;
}

.app-thumbnail.loaded img {
  opacity: 1;
}

.app-details {
  padding: 0.8rem;
  flex-grow: 1;
  display: flex;
  flex-direction: column;
}

.app-details h5 {
  margin: 0 0 0.5rem 0;
  font-size: 0.8rem;
  color: var(--md-default-fg-color);
  font-weight: 600;
}

.app-details p {
  margin: 0 0 0.7rem 0;
  font-size: 0.7rem;
  color: var(--md-default-fg-color--light);
  line-height: 1.2;
  flex-grow: 1;
}

/* Tags Styles */
.app-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.3rem;
  margin-top: auto;
}

.tag {
  display: inline-block;
  padding: 2px 8px;
  background-color: var(--md-default-fg-color--lightest);
  border-radius: 4px;
  font-size: 0.7rem;
  color: var(--md-default-fg-color);
  transition: background-color 0.2s ease;
}

.tag:hover {
  background-color: var(--md-default-fg-color--lighter);
}

.tag-count {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 0.7rem;
  color: var(--md-default-fg-color--light);
}

/* Category Filter Styles */
.category-filter-message {
  text-align: center;
  margin: 3rem 0;
  color: var(--md-default-fg-color--light);
}

.category-title {
  margin-bottom: 2rem;
}

/* Loading indicator */
.loading-message {
  text-align: center;
  padding: 2rem 0;
  color: var(--md-default-fg-color--light);
}

.category-content.loading {
  position: relative;
}

.category-content.loading::after {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  width: 40px;
  height: 40px;
  margin: -20px 0 0 -20px;
  border: 3px solid var(--md-default-fg-color--lightest);
  border-top-color: var(--md-accent-fg-color);
  border-radius: 50%;
  animation: loading-spinner 0.8s linear infinite;
  z-index: 10;
}

@keyframes loading-spinner {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}
</style>

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
          categoryHeader.innerHTML = `<h2 class="category-title">${matchingCategory.title}</h2>`;

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
    }
  } catch (error) {
    console.error('Error loading category results:', error);
    document.querySelector('.category-cards').innerHTML =
      `<p>Error loading applications: ${error.message}</p>`;
  }
});
</script>
