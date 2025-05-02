---
hide:
  - navigation
title: Applications by Category
---

# Applications by Category

<div class="category-content">
  <div class="category-filter-message">Select a category from the sidebar to view applications</div>
  <div class="category-results" style="display: none;">
    <h2 class="category-title">Applications: <span class="category-query"></span></h2>
    <div class="category-cards"></div>
  </div>
</div>

<!-- All hardcoded content has been removed. Dynamic content will be generated from JSON data. -->

<style>
/* Category Section Styles */
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
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 1rem;
  margin: 1rem 0;
}

.app-card {
  border-radius: 6px;
  overflow: hidden;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  background-color: var(--md-default-bg-color);
  transition: transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out;
}

.app-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.app-thumbnail {
  height: 140px;
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
  background-color: var(--md-default-fg-color--lightest);
}

.app-thumbnail img {
  object-fit: cover;
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  opacity: 0;
  transition: opacity 0.3s ease;
}

.app-thumbnail.loaded img {
  opacity: 1;
}

.app-thumbnail.loaded .image-placeholder {
  display: none;
}

.app-details {
  padding: 0.8rem;
}

.app-details h4 {
  margin: 0;
  color: var(--md-default-fg-color--light);
  font-size: 0.8rem;
  font-weight: normal;
}

.app-details h5 {
  margin: 0 0 0.5rem 0;
  font-size: 1rem;
  color: var(--md-default-fg-color);
}

.app-details p {
  margin: 0 0 0.8rem 0;
  font-size: 0.8rem;
  color: var(--md-default-fg-color--light);
  line-height: 1.3;
}

/* Tags Styles */
.app-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.tag {
  display: inline-block;
  padding: 2px 8px;
  background-color: var(--md-default-fg-color--lightest);
  border-radius: 4px;
  font-size: 0.75rem;
  color: var(--md-default-fg-color);
}

.tag-count {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 0.75rem;
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

    // Load both tag data and tag categories data
    const [tagsResponse, categoriesResponse, appCardsResponse] = await Promise.all([
      fetch(`${dataPath}tmp_tags.json`),
      fetch(`${dataPath}tmp_tag-categories.json`),
      fetch(`${dataPath}app_cards.json`).catch(() => ({ ok: false })) // Optional, may not exist yet
    ]);

    if (!tagsResponse.ok || !categoriesResponse.ok) {
      throw new Error(`Failed to fetch data: ${tagsResponse.status}, ${categoriesResponse.status}`);
    }

    const tagsData = await tagsResponse.json();
    const categoriesData = await categoriesResponse.json();

    // Try to load pre-generated app cards data if available
    let appCardsData = {};
    if (appCardsResponse && appCardsResponse.ok) {
      appCardsData = await appCardsResponse.json();
    }

    if (searchQuery) {
      // Display the query
      document.querySelector('.category-query').textContent = searchQuery;
      document.querySelector('.category-filter-message').style.display = 'none';
      document.querySelector('.category-results').style.display = 'block';

      // Filter apps based on the query
      const categoryLower = searchQuery.toLowerCase();
      const filteredApps = Object.entries(tagsData)
        .filter(([appName, tags]) => {
          if (!tags || !tags.length) return false;

          const firstTag = tags[0]?.toLowerCase() || '';

          return firstTag === categoryLower ||
                 firstTag === categoryLower.replace(' ai', ' and conversational ai') ||
                 firstTag === categoryLower.replace('computer vision', 'computer vision and perception') ||
                 firstTag === categoryLower.replace('nlp & conversational', 'natural language and conversational ai');
        });

      // Display the results
      const cardsContainer = document.querySelector('.category-cards');

      if (filteredApps.length === 0) {
        cardsContainer.innerHTML = '<p>No applications found for this category.</p>';
      } else {
        cardsContainer.innerHTML = '';

        // Find the matching category from categoriesData for header description
        const matchingCategory = categoriesData.find(category => {
          const categoryTitle = category.title.toLowerCase();
          return categoryTitle === categoryLower ||
                 categoryTitle === searchQuery.toLowerCase().replace('networking', 'networking & distributed computing') ||
                 categoryTitle === searchQuery.toLowerCase().replace('nlp & conversational', 'nlp');
        });

        // Add category header and description if available
        if (matchingCategory) {
          const categorySection = document.createElement('div');
          categorySection.className = 'category-section';

          const categoryHeader = document.createElement('div');
          categoryHeader.className = 'category-header';
          categoryHeader.innerHTML = `<h2>${matchingCategory.title}</h2>`;

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
          // Create app card
          const card = document.createElement('div');
          card.className = 'app-card';

          // Convert app name to URL-friendly format for linking
          const appNameKebab = appName.toLowerCase().replace(/[^a-z0-9]+/g, '-');

          // Use pre-generated card data if available, or create a simple one
          const cardData = appCardsData[appName] || {
            name: appName,
            description: "No description available.",
            image_url: null,
            tags: tags,
            app_title: appName.split('/')[1] || appName
          };

          // Generate a placeholder color based on app name
          const hash = appName.split('').reduce((a, b) => (((a << 5) - a) + b.charCodeAt(0))|0, 0);
          const hue = Math.abs(hash) % 360;
          const bgColor = `hsl(${hue}, 70%, 85%)`;

          // Create card content with image loading logic
          card.innerHTML = `
            <div class="app-thumbnail">
              <div class="image-placeholder" style="background-color: ${bgColor};"></div>
              ${cardData.image_url ? `<img
                src="${cardData.image_url}"
                alt="${cardData.name}"
                loading="lazy"
                onload="this.parentNode.classList.add('loaded')"
              />` : ''}
            </div>
            <div class="app-details">
              <h5>${cardData.app_title}</h5>
              <p>${cardData.description}</p>
              <div class="app-tags">
                ${tags.slice(0, 3).map(tag => `<span class="tag">${tag}</span>`).join('')}
                ${tags.length > 3 ? `<span class="tag-count">+${tags.length - 3}</span>` : ''}
              </div>
            </div>
          `;

          // Make the card clickable
          card.addEventListener('click', function() {
            window.location.href = `${baseUrl}${cardData.app_url}`;
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
