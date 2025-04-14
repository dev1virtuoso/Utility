#!/bin/bash

# Run smartctl command and save output to disk3s3.txt
smartctl -a disk3s3

# Save pip freeze output to a.txt
pip freeze > a.txt

# Save brew list output to b.txt
brew list > b.txt
brew upgrade
brew upgrade --cask
