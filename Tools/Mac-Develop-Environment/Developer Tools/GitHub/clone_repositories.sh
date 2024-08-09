#!/bin/bash

repositories=(
  "REPO_LINK_1"
  "REPO_LINK_2"
  "REPO_LINK_3"
  "REPO_LINK_4"
  "REPO_LINK_5"
  "REPO_LINK_6"
  "REPO_LINK_7"
  "REPO_LINK_8"
  "REPO_LINK_9"
  "REPO_LINK_10"
)

target_folder="my_repositories"

mkdir -p "$target_folder"

cd "$target_folder"

for repo in "${repositories[@]}"
do
  git clone "$repo"
done
