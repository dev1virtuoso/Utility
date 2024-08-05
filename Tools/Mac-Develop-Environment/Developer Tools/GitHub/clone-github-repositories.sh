# Copyright © 2024 Carson. All rights reserved.

#!/bin/bash

# Store the URLs of GitHub repositories
repositories=(
    ""
    ""
    ""
    # Add more repository URLs
)

# Specify the clone directory
clone_directory="/path/to/directory"

# Loop through and clone repositories
for repository in "${repositories[@]}"
do
    # Extract the repository name
    repository_name=$(basename "${repository}" ".git")

    # Concatenate the clone directory and repository name
    destination="${clone_directory}/${repository_name}"

    # Execute the git clone command
    git clone "${repository}" "${destination}"
done

echo "Cloning completed"
