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
"""Generate the app cards JSON data for use in the applications by category page."""

import json
import os
import sys
from pathlib import Path

script_dir = Path(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, str(script_dir)) if str(script_dir) not in sys.path else None

from common_utils import (  # noqa: E402
    extract_first_sentences,
    extract_image_from_readme,
    get_full_image_url,
    get_git_root,
    logger,
    parse_metadata_file,
)

OUTPUT_FILE = "doc/website/docs/_data/app_cards.json"


def find_readme_path(app_dir, git_repo_path):
    """Find the README.md file for an application."""
    readme_paths = [
        app_dir / "README.md",
        app_dir / "python" / "README.md",
        app_dir / "cpp" / "README.md",
    ]
    # Also check parent directories up to a limit
    parent_dir = app_dir
    for _ in range(3):  # Maximum depth to search up
        if parent_dir.name == "applications" or parent_dir == git_repo_path:
            break
        parent_dir = parent_dir.parent
        readme_paths.append(parent_dir / "README.md")

    for path in readme_paths:
        if path.exists():
            return path
    return None


def generate_app_cards():
    """Generate app cards data for all applications."""
    git_repo_path = get_git_root()
    app_dir = git_repo_path / "applications"

    # Load tags data
    tags_path = git_repo_path / "doc/website/docs/_data/tmp_tags.json"
    try:
        with open(tags_path, 'r') as f:
            tags_data = json.load(f)
    except Exception as e:
        logger.error(f"Error loading tags data: {e}")
        tags_data = {}

    app_cards = {}

    # Process applications directory
    for app_path in app_dir.iterdir():
        if not app_path.is_dir() or app_path.name.startswith('.'):
            continue

        app_name = app_path.name
        logger.info(f"Processing app: {app_name}")

        # Find metadata
        metadata_path = app_path / "metadata.json"
        metadata = None
        if metadata_path.exists():
            metadata, _ = parse_metadata_file(metadata_path)

        # Find README
        readme_path = find_readme_path(app_path, git_repo_path)
        readme_content = None
        if readme_path:
            try:
                with open(readme_path, 'r') as f:
                    readme_content = f.read()
            except Exception as e:
                logger.error(f"Error reading README for {app_name}: {e}")

        # Extract description
        description = None
        if metadata and "description" in metadata:
            description = metadata["description"]
        elif readme_content:
            description = extract_first_sentences(readme_content)

        if not description:
            description = "No description available."

        # Extract image
        image_url = None
        if readme_content:
            image_path = extract_image_from_readme(readme_content)
            if image_path:
                image_url = get_full_image_url(image_path, readme_path)
                logger.info(f"Found image for {app_name}: {image_url}")

        # Get proper name from metadata
        proper_name = metadata.get("name", app_name) if metadata else app_name

        # Split into vendor and app title
        vendor_parts = proper_name.split('/')
        vendor = vendor_parts[0] if len(vendor_parts) > 1 else ""
        app_title = vendor_parts[1] if len(vendor_parts) > 1 else proper_name

        # Create app card data
        app_cards[proper_name] = {
            "name": proper_name,
            "description": description,
            "image_url": image_url,
            "vendor": vendor,
            "app_title": app_title
        }

    # Process other apps from tags data that might not be in the applications directory
    for app_name in tags_data:
        if app_name not in app_cards:
            # Split into vendor and app title
            vendor_parts = app_name.split('/')
            vendor = vendor_parts[0] if len(vendor_parts) > 1 else ""
            app_title = vendor_parts[1] if len(vendor_parts) > 1 else app_name

            app_cards[app_name] = {
                "name": app_name,
                "description": "No description available.",
                "image_url": None,
                "vendor": vendor,
                "app_title": app_title
            }

    # Write the JSON file
    output_path = git_repo_path / OUTPUT_FILE
    with open(output_path, 'w') as f:
        json.dump(app_cards, f, indent=2)

    logger.info(f"Generated app cards data for {len(app_cards)} applications")
    return app_cards


if __name__ in {"__main__", "<run_path>"}:
    generate_app_cards()
