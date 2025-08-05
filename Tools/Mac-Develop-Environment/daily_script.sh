#!/bin/bash

# Save pip freeze output to a.txt
pip3 freeze > python-requirements.txt
pip3 install --upgrade python-requirements.txt
pip3 install --upgrade pip
pip3 install --upgrade setuptools wheel

# Save brew list output to b.txt
brew upgrade
brew upgrade --cask
brew list > brew-requirements.txt

# Upgrade necessaries
flutter upgrade
omz update
rvm get stable
nvm install lts --reinstall-packages-from=current
npm install -g npm@latest
yarn upgrade
pm2 update
gem update
pyenv update

# Save Launchpad setting
lporg save

# Function to recursively search for Git repositories in subdirectories
function update_git_repos {
    local folder="$1"
    
    # Iterate through all items in the folder
    for item in "$folder"/*; do
        if [ -d "$item" ]; then
            # If the item is a directory
            if [ -d "$item/.git" ]; then
                echo "Pulling latest changes for $item"
                # Change to the directory and execute git pull
                (cd "$item" && git pull)
                echo ""
            else
                # Recursively call the function for subdirectories
                update_git_repos "$item"
            fi
        fi
    done
}

# Specify the folder path to start the search
folder_path="/path/to/directory"

# Call the function with the specified folder path
update_git_repos "$folder_path"

smartctl --all /dev/disk0
