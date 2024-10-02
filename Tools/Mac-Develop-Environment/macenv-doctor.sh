#!/bin/bash

# Print Xcode path
echo "Xcode Path:"
xcode-select --print-path
echo

# List Python packages
echo "Python Packages:"
which python
which pip3
pip3 list
pip3 freeze > requirements.txt
echo

# List Homebrew packages
echo "Homebrew Packages:"
brew -v
brew doctor
brew list
brew list > brew-requirements.txt
echo

# List MacPorts packages
echo "MacPorts Packages:"
port version
port installed
echo

# Git user configuration
echo "Git User Configuration:"
echo "Username:"
git config --global user.name
echo "Email:"
git config --global user.email
echo

# List RVM managed Ruby versions
echo "RVM Ruby Versions:"
rvm list
echo

# Node.js and related tools versions
echo "Node.js and Related Tools:"
echo "nvm:"
nvm --version
echo "Node.js:"
node --version
echo "Yarn:"
yarn --version
echo "PM2:"
pm2 --version
echo

# Ruby environment
echo "Ruby Environment:"
echo "Ruby version:"
ruby -v
echo "Installed Gems:"
gem list
echo

# PHP and Composer versions
echo "PHP and Composer Versions:"
echo "PHP:"
php --version
echo "Composer:"
composer --version
echo

# Pyenv help
echo "Pyenv Help:"
pyenv --help
echo

# Rust compiler version
echo "Rust Compiler Version:"
rustc --version

# Necessary dependencies
echo "Necessary Dependencies:"
