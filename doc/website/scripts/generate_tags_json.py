#!/usr/bin/env python3
# SPDX-FileCopyrightText: Copyright (c) 2024 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
# SPDX-License-Identifier: LicenseRef-Apache2
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#     http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.
"""Generate tags.json file and tag-categories.json for use by the tag-categories.js script."""

import json
import logging
import os
import sys
from pathlib import Path
from collections import defaultdict, Counter

import mkdocs_gen_files

sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from generate_pages import get_git_root, logger
from common_utils import find_app_pairs

COMPONENT_TYPES = ["applications"]

# Category icon mapping based on main category
CATEGORY_ICONS = {
    "healthcare AI": "medical_services",
    "computer vision and perception": "visibility",
    "signal processing": "radar",
    "networking and distributed computing": "hub",
    "natural language and conversational AI": "chat",
    "tools and other specialized applications": "tune",
    "extended reality": "view_in_ar",
    "visualization": "auto_awesome_motion"
}

# Category title mapping for proper capitalization
CATEGORY_TITLE_MAPPING = {
    "healthcare ai": "Healthcare AI",
    "computer vision and perception": "Computer Vision",
    "natural language and conversational ai": "NLP & Conversational",
    "networking and distributed computing": "Networking",
    "signal processing": "Signal Processing",
    "tools and other specialized applications": "Specialized Tools",
    "extended reality": "Extended Reality",
    "visualization": "Visualization"
}

# Category mapping for tag matching - same as in the JavaScript
CATEGORY_TAG_MAPPING = {
    "networking": "networking and distributed computing",
    "nlp & conversational": "natural language and conversational ai",
    "computer vision": "computer vision and perception"
}

def format_category_title(title):
    """Format a category title with proper capitalization."""
    # Convert to lowercase for matching
    lower_title = title.lower()

    # Use the mapping if available
    if lower_title in CATEGORY_TITLE_MAPPING:
        return CATEGORY_TITLE_MAPPING[lower_title]

    # Otherwise use the original with first letter of each word capitalized
    return title.title()

def matches_category(tag, category):
    """Check if a tag matches a category using the same logic as the JavaScript."""
    tag_lower = tag.lower()
    category_lower = category.lower()

    # Direct match
    if tag_lower == category_lower:
        return True

    # Contains match
    if category_lower in tag_lower:
        return True

    # Special case mappings
    for js_category, full_category in CATEGORY_TAG_MAPPING.items():
        if category_lower == js_category.lower() and full_category.lower() in tag_lower:
            return True

    return False

def generate_tags_json() -> None:
    """Generate tags.json file with metadata about all tags and their associated pages."""
    try:
        git_repo_path = get_git_root()
        logger.info(f"Git repository root: {git_repo_path}")
    except Exception as e:
        logger.error(f"Failed to find Git repository root: {e}")
        logger.error("This script requires Git and must be run from within a Git repository.")
        return

    # Dictionaries to collect the tag categories
    main_categories = set()  # First tags (e.g., "healthcare AI")
    subcategories = defaultdict(set)  # Second tags by main category (e.g., "video", "audio")
    related_tags = defaultdict(set)  # Additional tags by main category

    # Apps by their tags for accurate category counting
    app_tags = {}

    # Find all valid app pairs (metadata.json and README.md)
    app_pairs = find_app_pairs(git_repo_path, COMPONENT_TYPES)
    logger.info(f"Found {len(app_pairs)} valid application pairs")

    # Process each application pair
    for app_id, (metadata_path, readme_path) in app_pairs.items():
        try:
            # Load metadata
            with metadata_path.open("r") as metadata_file:
                metadata = json.load(metadata_file)

            # Get project type and metadata
            project_type = list(metadata.keys())[0]
            metadata = metadata[project_type]

            # Get tags
            tags = metadata.get("tags", [])
            if not tags:
                continue

            # Get component type (applications)
            component_type = metadata_path.relative_to(git_repo_path).parts[0]

            # Get page path relative to docs directory
            page_path = str(readme_path.relative_to(git_repo_path))

            # Create page metadata
            page_metadata = {
                "title": metadata.get("name", "Untitled"),
                "path": page_path,
                "url": f"./{page_path}",  # Use relative URL
                "type": component_type,
                "tags": tags,
            }

            # Store tags data for the page
            app_title = page_metadata['title']
            app_tags[app_title] = tags

            # Extract tag categories (assuming first tag is main category, second is subcategory)
            if tags:
                if len(tags) >= 1:
                    main_category = tags[0]
                    main_categories.add(main_category)

                    if len(tags) >= 2:
                        # Second tag is subcategory
                        subcategories[main_category].add(tags[1])

                        # Remaining tags are related tags
                        for tag in tags[2:]:
                            related_tags[main_category].add(tag)

        except Exception as e:
            logger.error(f"Failed to process {metadata_path}: {e}")

    # Now compute the category counts based on how apps will be displayed
    category_counts = Counter()

    # For each main category
    for category in main_categories:
        formatted_title = format_category_title(category)

        # Count apps matching this category using the same logic as in JavaScript
        for app_title, tags in app_tags.items():
            if any(matches_category(tag, formatted_title) for tag in tags):
                category_counts[category] += 1

    # Generate tag categories structure for the JavaScript file
    tag_categories = []

    for category in sorted(main_categories):
        # Get the formatted title using our mapping
        formatted_title = format_category_title(category)
        # Check if this is a primary category (one with a defined mapping)
        is_primary = category.lower() in CATEGORY_TITLE_MAPPING

        category_data = {
            "title": formatted_title,
            "icon": CATEGORY_ICONS.get(category, "label"),
            "isPrimary": is_primary,
            "count": category_counts[category],  # Add the pre-computed count
            "subcategories": [],
            "relatedTags": []
        }

        # Add subcategories
        for subcategory in sorted(subcategories[category]):
            category_data["subcategories"].append({
                "name": subcategory.title(),
                "query": f"{subcategory} {category}"
            })

        # Add related tags - limit to top 6 most common if there are many
        related = sorted(related_tags[category])
        for tag in related[:6]:  # Limit to 6 related tags
            category_data["relatedTags"].append({
                "name": tag.title(),
                "query": f"{tag} {category}"
            })

        tag_categories.append(category_data)

    # Sort categories - primary first, then alphabetically
    sorted_categories = sorted(
        tag_categories,
        key=lambda x: (not x["isPrimary"], x["title"])
    )

    # Filter categories - keep those with subcategories or marked as primary
    filtered_categories = [
        category for category in sorted_categories
        if category["subcategories"] or category["isPrimary"]
    ]

    # Create output directories if they don't exist
    output_data_dir = git_repo_path / "docs" / "_data"
    if not output_data_dir.exists():
        output_data_dir = git_repo_path / "doc" / "website" / "docs" / "_data"
        if not output_data_dir.exists():
            output_data_dir.mkdir(parents=True, exist_ok=True)

    # Write pre-processed tag-categories.json to reduce JS processing
    categories_file_path = output_data_dir / "tmp_tag-categories.json"
    with open(categories_file_path, "w") as categories_file:
        json.dump(filtered_categories, categories_file, indent=2)
    logger.info(f"Generated tag-categories.json with {len(filtered_categories)} categories at {categories_file_path}")


if __name__ in {"__main__", "<run_path>"}:
    generate_tags_json()
