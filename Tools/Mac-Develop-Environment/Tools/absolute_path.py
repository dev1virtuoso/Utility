# Copyright © 2024 Carson. All rights reserved.

import os

def convert_absolute_to_relative(folder_path):
    for root, dirs, files in os.walk(folder_path):
        for file in files:
            file_path = os.path.join(root, file)
            
            # Convert absolute path to relative path
            relative_path = os.path.relpath(file_path, folder_path)
            
            # Update absolute paths to relative paths in the file
            update_file_paths(file_path, relative_path)

def update_file_paths(file_path, relative_path):
    with open(file_path, 'r', encoding='latin-1') as file:
        content = file.read()
        
        # Replace absolute paths with relative paths in the file
        updated_content = content.replace(file_path, relative_path)
        
        # Write the updated content back to the file
        with open(file_path, 'w', encoding='latin-1') as updated_file:
            updated_file.write(updated_content)

# Specify the folder path to convert
folder_path = '/path/to/directory'

# Call the function to perform the conversion
convert_absolute_to_relative(folder_path)
