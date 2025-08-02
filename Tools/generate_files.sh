#!/bin/bash

folder_path="/path/to/directory"

cd "$folder_path" || exit

for i in {1..200}; do
    filename=$(printf "%03d.txt" $i)
    touch "$filename"
done

echo "Files 001.txt to 200.txt have been generated in the target folder."
