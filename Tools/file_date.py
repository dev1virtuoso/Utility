# Copyright © 2024 Carson. All rights reserved.

import os
import shutil
import datetime

# Set the source directory path
source_directory = '/path/to/directory'

# Set the target directory path
target_directory = '/path/to/directory3'

# Traverse files in the source directory
for file_name in os.listdir(source_directory):
    file_path = os.path.join(source_directory, file_name)
    
    # Check if the file is a file (exclude directories)
    if os.path.isfile(file_path):
        # Get the modified date of the file
        modified_date = datetime.datetime.fromtimestamp(os.path.getmtime(file_path))
        
        # Create the target folder path based on the date
        target_folder = os.path.join(target_directory, modified_date.strftime('%Y-%m-%d'))
        
        # Check if the target folder exists, if not, create it
        if not os.path.exists(target_folder):
            os.makedirs(target_folder)
        
        # Move the file to the target folder
        shutil.move(file_path, os.path.join(target_folder, file_name))
