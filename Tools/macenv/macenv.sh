#!/bin/bash

/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
brew install git
brew install readline
brew install node
brew install --cask visual-studio-code
brew install python
brew install ruby
brew install --cask adoptopenjdk
brew install --cask android-studio
xcode-select --install
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
git config --global user.name “USER_NAME”
git config --global user.email “EMAIL”
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
echo '[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"' >> ~/.zshrc
echo 'export NVM_DIR="$HOME/.nvm"' >> ~/.zshrc
source ~/.zshrc
echo "Development environment setup complete."
