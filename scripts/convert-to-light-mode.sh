#!/bin/bash

# Convert dark mode colors to light mode across all TSX files

echo "Converting to light mode..."

# Find all TSX files in app and components directories
find /Users/idirouhabmeskine/Projects/idir.ai/courses-project/app -name "*.tsx" -type f -o \
     -path /Users/idirouhabmeskine/Projects/idir.ai/courses-project/components -name "*.tsx" -type f | while read file; do

  # Background colors
  sed -i '' 's/bg-\[#000000\]/bg-white/g' "$file"
  sed -i '' 's/bg-\[#0a0a0a\]/bg-gray-50/g' "$file"
  sed -i '' 's/bg-\[#111827\]/bg-gray-100/g' "$file"

  # Text colors
  sed -i '' 's/text-white/text-gray-900/g' "$file"
  sed -i '' 's/text-\[#d1d5db\]/text-gray-700/g' "$file"
  sed -i '' 's/text-\[#9ca3af\]/text-gray-600/g' "$file"
  sed -i '' 's/text-\[#6b7280\]/text-gray-500/g' "$file"

  # Border colors
  sed -i '' 's/border-\[#1f2937\]/border-gray-200/g' "$file"
  sed -i '' 's/border-\[#374151\]/border-gray-300/g' "$file"

  # Placeholder colors
  sed -i '' 's/placeholder-\[#6b7280\]/placeholder-gray-400/g' "$file"

  echo "Processed: $file"
done

echo "Light mode conversion complete!"
