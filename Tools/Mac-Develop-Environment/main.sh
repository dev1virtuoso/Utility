#!/bin/bash

# Execute macenv.sh
./macenv.sh

# Install packages listed in requirements.txt
if [ -f "requirements.txt" ]; then
    echo "Installing dependencies listed in requirements.txt..."
    while read requirement; do
        pip install $requirement
    done < requirements.txt
    echo "Dependencies installed successfully."
else
    echo "requirements.txt not found. No dependencies to install."
fi

echo "Mac development environment setup complete."