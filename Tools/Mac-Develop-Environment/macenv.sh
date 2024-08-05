#!/bin/bash

xcode-select --install
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
sudo sh -c 'xcode-select -s /Applications/Xcode.app/Contents/Developer && xcodebuild -runFirstLaunch'
sudo xcodebuild -license
xcodebuild -downloadAllPlatforms
brew install git
brew install readline
brew install node
brew install --cask visual-studio-code
brew install ruby
brew install --cask adoptopenjdk
brew install --cask android-studio
brew install --cask docker
brew install postgresql
brew install redis
brew install mongodb-community
brew install mongodb
brew install elasticsearch
brew install awscli
brew install zsh zsh-completions
brew install git
brew install gitkraken-cli
brew install gmp
brew install gnupg
brew install sqlite
brew install postgresql
brew services start postgresql
brew install zsh
brew tap heroku/brew
brew install heroku
brew install wget
read -p "Enter your Git username: " username
read -p "Enter your Git email address: " email
git config --global user.name "$username"
git config --global user.email "$email"
echo "Git username set to: $username"
echo "Git email address set to: $email"
git clone git://github.com/zsh-users/zsh-autosuggestions $ZSH_CUSTOM/plugins/zsh-autosuggestions
curl -L https://get.rvm.io | bash -s stable --ruby
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
curl "https://raw.githubusercontent.com/flatiron-school/dotfiles/master/ubuntu-gitignore" -o "$HOME/.gitignore"
curl "https://raw.githubusercontent.com/flatiron-school/dotfiles/master/gitconfig" -o "$HOME/.gitconfig"
curl -so- https://raw.githubusercontent.com/learn-co-curriculum/flatiron-manual-setup-validator/master/manual-setup-check.sh | bash 2> /dev/null
nvm install v16.13.2
nvm install node
npm install --global yarn
npm install --global pm2
gem install pg
gem install cocoapods
echo '[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"' >> ~/.zshrc
echo 'export NVM_DIR="$HOME/.nvm"' >> ~/.zshrc
source ~/.zshrc
