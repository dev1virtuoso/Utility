#!/bin/bash

folder_path="/path/to/directory"

merged_file="merged_text.txt"

cd "$folder_path" || exit

cat *.txt > "$merged_file"

echo "The contents of all txt files have been merged into $merged_file."
