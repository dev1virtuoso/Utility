#!/bin/bash

# Prompt user to agree to the license agreement
read -p "$(echo -e '\033[1;33mDo you agree to the terms of the license agreement? (Y/N): \033[0m')" agreed
if [ "$agreed" != "Y" ]; then
    echo "$(echo -e '\033[1;31mYou did not agree to the license. Exiting.\033[0m')"
    exit 1
fi

# Install Xcode Command Line Tools
xcode-select --install

# Install Homebrew
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Install Rosetta for Apple silicon
softwareupdate --install-rosetta

# Switch Xcode path and accept the license
sudo sh -c 'xcode-select -s /Applications/Xcode.app/Contents/Developer && xcodebuild -runFirstLaunch'
sudo xcodebuild -license
xcodebuild -downloadAllPlatforms

# Install Python dependencies listed in python-requirements.txt
if [ -f "python-requirements.txt" ]; then
    echo "$(echo -e '\033[1;32mInstalling Python dependencies listed in python-requirements.txt...\033[0m')"
    while read requirement; do
        pip3 install $requirement
    done < python-requirements.txt
    echo "$(echo -e '\033[1;32mPython dependencies installed successfully.\033[0m')"
else
    echo "$(echo -e '\033[1;31mpython-requirements.txt not found. No Python dependencies to install.\033[0m')"
fi

pip3 list --outdated
pip --disable-pip-version-check list --outdated --format=json | python -c "import json, sys; print('\n'.join([x['name'] for x in json.load(sys.stdin)]))" | xargs -n1 pip install -U
pip-review --local --auto

# Install Homebrew packages from brew-requirements.txt
xargs brew install < brew-requirements.txt
brew update
brew cask upgrade

# Install MacPorts
curl -O https://distfiles.macports.org/MacPorts/MacPorts-2.10.1.tar.bz2
tar xf MacPorts-2.10.1.tar.bz2
cd MacPorts-2.10.1/
./configure
make
sudo make install
sudo port -v selfupdate

# Configure Git
read -p "Enter your Git username: " username
read -p "Enter your Git email address: " email
git config --global user.name "\e[0;32m$username\e[0m"
git config --global user.email "\e[0;32m$email\e[0m"
echo "Git username set to: \e[0;32m$username\e[0m"
echo "Git email address set to: \e[0;32m$email\e[0m"

# Install additional tools and configurations
curl -s "https://raw.githubusercontent.com/superhj1987/awesome-mac-things/master/get.sh" | bash -s

# Clone specific repositories
mkdir -p ~/Developer/environment
cd ~/Developer/environment
git clone \e[0;33mhttps://github.com/oobabooga/text-generation-webui.git\e[0m
git clone \e[0;33mhttps://github.com/chidiwilliams/GPT-Automator.git\e[0m
git clone \e[0;33mhttps://github.com/AUTOMATIC1111/stable-diffusion-webui.git\e[0m
git clone --depth 1 \e[0;33mhttps://github.com/sqlmapproject/sqlmap.git\e[0m sqlmap-dev
git clone \e[0;33mhttps://github.com/rolczynski/Automatic-Speech-Recognition.git\e[0m
conda env create -f=environment.yml     # or use: environment-gpu.yml
conda activate Automatic-Speech-Recognition

# Install Oh My Zsh
sh -c "\e[0;32m$(curl -fsSL https://raw.githubusercontent.com/robbyrussell/oh-my-zsh/master/tools/install.sh)\e[0m"

# Install youtube-dl
sudo curl -L https://yt-dl.org/downloads/latest/youtube-dl -o /usr/local/bin/youtube-dl
sudo chmod a+rx /usr/local/bin/youtube-dl

# Download color schemes for iTerm
curl -o "\e[0;32mAtom One Dark.itermcolors\e[0m" \e[0;33mhttps://raw.githubusercontent.com/nathanbuchar/atom-one-dark-terminal/master/scheme/iterm/One%20Dark.itermcolors\e[0m
curl -o "\e[0;32mAtom One Light.itermcolors\e[0m" \e[0;33mhttps://raw.githubusercontent.com/nathanbuchar/atom-one-dark-terminal/master/scheme/iterm/One%20Light.itermcolors\e[0m

# Set up Vim with sensible defaults
mkdir -p ~/.vim/pack/tpope/start
cd ~/.vim/pack/tpope/start
git clone https://tpope.io/vim/sensible.git

# Install RVM and NVM
curl -L https://get.rvm.io | bash -s stable --ruby
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
nvm install node
nvm use node

# Install global Node.js tools
npm install -g coffee-script grunt-cli gulp bower jshint less

# Download specific Gitignore and Gitconfig files
curl \e[0;33m"https://raw.githubusercontent.com/flatiron-school/dotfiles/master/ubuntu-gitignore"\e[0m -o "$HOME/.gitignore"
curl \e[0;33m"https://raw.githubusercontent.com/flatiron-school/dotfiles/master/gitconfig"\e[0m -o "$HOME/.gitconfig"

# Run setup validation script
curl -so- https://raw.githubusercontent.com/learn-co-curriculum/flatiron-manual-setup-validator/master/manual-setup-check.sh | bash 2> /dev/null

# Install additional tools and utilities
curl https://pyenv.run | bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# Setup Node.js and related tools
nvm install v16.13.2
nvm install node

# Install Node.js dependencies
if [ -f "npm-requirements.txt" ]; then
    echo "Installing Node.js dependencies listed in npm-requirements.txt..."
    while read requirement; do
        npm install $requirement
    done < npm-requirements.txt
    echo "Node.js dependencies installed successfully."
else
    echo "npm-requirements.txt not found. No Node.js dependencies to install."
fi

# Install global Node.js dependencies
if [ -f "npm-g-requirements.txt" ]; then
    echo "Installing global Node.js dependencies listed in npm-g-requirements.txt..."
    while read requirement; do
        npm install -g $requirement
    done < npm-g-requirements.txt
    echo "Global Node.js dependencies installed successfully."
else
    echo "npm-g-requirements.txt not found. No global Node.js dependencies to install."
fi

# Install necessary Ruby gems
gem install pg cocoapods
gem update --system

# Install Ruby gems listed in gem-requirements.txt
if [ -f "gem-requirements.txt" ]; then
    echo "Installing Ruby gems listed in gem-requirements.txt..."
    while read requirement; do
        gem install $requirement
    done < gem-requirements.txt
    echo "Ruby gems installed successfully."
else
    echo "gem-requirements.txt not found. No Ruby gems to install."
fi

# Setup Composer for PHP
php -r "copy('https://getcomposer.org/installer', 'composer-setup.php');"
php -r "if (hash_file('sha384', 'composer-setup.php') === 'dac665fdc30fdd8ec78b38b9800061b4150413ff2e3b6f88543c636f7cd84f6db9189d43a81e5503cda447da73c7e5b6') { echo 'Installer verified'; } else { echo 'Installer corrupt'; unlink('composer-setup.php'); } echo PHP_EOL;"
php composer-setup.php
php -r "unlink('composer-setup.php');"

# Update shell configuration for NVM and PHP
echo '[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"' >> ~/.zshrc
echo 'export NVM_DIR="$HOME/.nvm"' >> ~/.zshrc
echo 'export PATH="/opt/homebrew/opt/php@8.0/bin:$PATH"' >> ~/.zshrc
echo 'export PATH="/opt/homebrew/opt/php@8.0/sbin:$PATH"' >> ~/.zshrc
export LDFLAGS="-L/opt/homebrew/opt/php@8.0/lib"
export CPPFLAGS="-I/opt/homebrew/opt/php@8.0/include"

# Source the updated shell configuration
source ~/.zshrc

# Set up Python virtual environment
cd ~
python3 -m venv pip_venv
source pip_venv/bin/activate

# Prompt user to run the doctor script
read -p "Do you want to run the doctor? (Y/N): " agreed
if [ "$agreed" = "Y" ]; then
    bash macenv-doctor.sh
else
    echo "You did not agree to run the doctor. Exiting."
    exit 1
fi
