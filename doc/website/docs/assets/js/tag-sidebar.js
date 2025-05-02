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

    // Fetch the tag categories data
    console.log("Fetching categories from:", `${dataPath}tmp_tag-categories.json`);
    const categoriesResponse = await fetch(`${dataPath}tmp_tag-categories.json`);
    if (!categoriesResponse.ok) {
      throw new Error(`Failed to fetch categories: ${categoriesResponse.status} - ${categoriesResponse.statusText}`);
    }
    const categories = await categoriesResponse.json();
    console.log("Categories loaded:", categories.length);

    // Fetch the tags data for all apps
    console.log("Fetching tags from:", `${dataPath}tmp_tags.json`);
    const tagsResponse = await fetch(`${dataPath}tmp_tags.json`);
    if (!tagsResponse.ok) {
      throw new Error(`Failed to fetch tags: ${tagsResponse.status} - ${tagsResponse.statusText}`);
    }
    const tagsData = await tagsResponse.json();
    console.log("Tags data loaded:", Object.keys(tagsData).length);

    // Find or create the sidebar container
    let tagSidebar, primarySidebar;

    // First try to find the primary sidebar
    primarySidebar = document.querySelector('.md-sidebar--primary');
    if (primarySidebar) {
      console.log("Found primary sidebar");

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

      // Build the tags page URL with the correct base path
      const tagsPath = `${baseUrl}tags/`;

      // Make the header clickable to load content without page reload
      categoryHeader.addEventListener('click', function(e) {
        e.preventDefault();

        // Update URL without reloading the page
        const newUrl = `${tagsPath}?category=${encodeURIComponent(category.title)}`;
        history.pushState({ category: category.title }, '', newUrl);

        // Trigger a custom event that the page can listen for to update content
        const event = new CustomEvent('categorySelected', {
          detail: { category: category.title }
        });
        document.dispatchEvent(event);

        // If using MkDocs with instant loading (if available)
        if (window.app && window.app.document) {
          // Try to use MkDocs' internal navigation
          window.app.document.$get(newUrl);
        } else {
          // Fallback: Update page content via fetch (optional implementation)
          loadCategoryContent(category.title, tagsPath);
        }
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

    console.log("Tag sidebar ready");

  } catch (error) {
    console.error('Error loading tag sidebar:', error);
  }
});

// Function to load category content without page reload
async function loadCategoryContent(category, tagsPath) {
  try {
    // Find the main content container
    const contentContainer = document.querySelector('.md-content__inner');
    if (!contentContainer) return;

    // Add loading indicator if needed
    contentContainer.classList.add('loading');

    // Fetch the content for this category
    const response = await fetch(`${tagsPath}?category=${encodeURIComponent(category)}&partial=true`);

    if (response.ok) {
      const html = await response.text();

      // Extract just the content part if it's a full page
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = html;

      // Look for the main content in the response
      const newContent = tempDiv.querySelector('.md-content__inner') || tempDiv;

      // Update just the content area
      contentContainer.innerHTML = newContent.innerHTML;

      // Update page title
      const titleElement = tempDiv.querySelector('title');
      if (titleElement) {
        document.title = titleElement.textContent;
      }
    }
  } catch (error) {
    console.error('Error loading category content:', error);
  } finally {
    // Remove loading indicator
    const contentContainer = document.querySelector('.md-content__inner');
    if (contentContainer) {
      contentContainer.classList.remove('loading');
    }
  }
}
