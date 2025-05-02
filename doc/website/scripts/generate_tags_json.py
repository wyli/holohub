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

def format_category_title(title):
    """Format a category title with proper capitalization."""
    # Convert to lowercase for matching
    lower_title = title.lower()

    # Use the mapping if available
    if lower_title in CATEGORY_TITLE_MAPPING:
        return CATEGORY_TITLE_MAPPING[lower_title]

    # Otherwise use the original with first letter of each word capitalized
    return title.title()

def generate_tags_json() -> None:
    """Generate tags.json file with metadata about all tags and their associated pages."""
    try:
        git_repo_path = get_git_root()
        logger.info(f"Git repository root: {git_repo_path}")
    except Exception as e:
        logger.error(f"Failed to find Git repository root: {e}")
        logger.error("This script requires Git and must be run from within a Git repository.")
        return

    # Dictionary to store tags and their associated pages
    tags_data = {}

    # Dictionaries to collect the tag categories
    main_categories = set()  # First tags (e.g., "healthcare AI")
    category_counts = Counter()  # Count occurrences of main categories
    subcategories = defaultdict(set)  # Second tags by main category (e.g., "video", "audio")
    related_tags = defaultdict(set)  # Additional tags by main category

    # Process each component type
    for component_type in COMPONENT_TYPES:
        component_dir = git_repo_path / component_type
        if not component_dir.exists():
            logger.warning(f"Component directory not found: {component_dir}")
            continue

        # Parse the metadata.json files
        for metadata_path in component_dir.rglob("metadata.json"):
            try:
                # Skip applications with {{ in the name (templates)
                if "{{" in str(metadata_path):
                    continue
                if any(t in str(metadata_path) for t in ("data_writer", "operator", "xr_hello_holoscan")):
                    continue
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

                # Get page path relative to docs directory
                metadata_dir = metadata_path.parent
                rel_dir = metadata_dir.relative_to(git_repo_path)
                page_path = f"{rel_dir}/README.md"

                # Create page metadata
                page_metadata = {
                    "title": metadata.get("name", "Untitled"),
                    "path": str(page_path),
                    "url": f"./{page_path}",  # Use relative URL
                    "type": component_type,
                    "tags": tags,
                }

                # Store tags data for the page
                tags_data[page_metadata['title']] = tags

                # Extract tag categories (assuming first tag is main category, second is subcategory)
                if tags:
                    if len(tags) >= 1:
                        main_category = tags[0]
                        main_categories.add(main_category)
                        # Count the occurrence of this main category
                        category_counts[main_category] += 1

                        if len(tags) >= 2:
                            # Second tag is subcategory
                            subcategories[main_category].add(tags[1])

                            # Remaining tags are related tags
                            for tag in tags[2:]:
                                related_tags[main_category].add(tag)

            except Exception as e:
                logger.error(f"Failed to process {metadata_path}: {e}")

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

    # Write tags.json to the site root
    with open("docs/_data/tmp_tags.json", "w") as tags_file:
        json.dump(tags_data, tags_file, indent=2)
    logger.info(f"Generated tags.json with {len(tags_data)} tags")

    # Write pre-processed tag-categories.json to reduce JS processing
    with open("docs/_data/tmp_tag-categories.json", "w") as categories_file:
        json.dump(filtered_categories, categories_file, indent=2)
    logger.info(f"Generated tag-categories.json with {len(filtered_categories)} categories")


if __name__ in {"__main__", "<run_path>"}:
    generate_tags_json()
