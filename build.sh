#!/bin/bash

# Exit immediately if a command exits with a non-zero status.
set -e

echo "Build process started..."

# Step 1: Install all Python dependencies
echo "Installing dependencies from requirements.txt..."
pip install -r requirements.txt

# Step 2: Collect all static files
echo "Collecting static files..."
python manage.py collectstatic --noinput --clear

# Step 3: Run database migrations
echo "Applying database migrations..."
python manage.py migrate

echo "Build finished successfully."