#!/bin/bash

# Print Xcode path
echo "Xcode Path:"
xcode-select --print-path
echo

# List Homebrew packages
brew -v
echo "Homebrew Packages:"
brew list
echo

# List MacPorts packages
port version
echo "MacPorts Packages:"
port installed
echo

# Git user configuration
echo "Git User Configuration:"
echo "Username:"
git config --global user.name
echo "Email:"
git config --global user.email
echo

# List contents of a directory
echo "Contents of Cloned Repository:"
ls /path/to/cloned/repository
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