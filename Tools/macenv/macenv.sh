#!/bin/bash

/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
brew install git
brew install readline

git config --global user.name "USER_NAME"
git config --global user.email "EMAIL"

brew install zsh zsh-completions
sh -c "$(curl -fsSL https://raw.github.com/robbyrussell/oh-my-zsh/master/tools/install.sh)"

brew install mongodb

curl -L https://get.rvm.io | bash -s stable --ruby
source ~/.rvm/scripts/rvm

gem install compass
