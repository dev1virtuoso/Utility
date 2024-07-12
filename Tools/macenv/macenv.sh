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
git clone git://github.com/zsh-users/zsh-autosuggestions $ZSH_CUSTOM/plugins/zsh-autosuggestions
curl -L https://get.rvm.io | bash -s stable --ruby
git config --global user.name “USER_NAME”
git config --global user.email “EMAIL”
echo "Development environment setup complete."
