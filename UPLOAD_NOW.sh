#!/bin/bash
# Quick script to safely upload code to GitHub

echo "🔍 Checking for sensitive files..."

# List any potentially sensitive files that might not be ignored
find . -type f \( -name "*.p12" -o -name "*.p8" -o -name "*.key" -o -name "*.mobileprovision" \) 2>/dev/null | head -10

echo ""
echo "✅ Files protected by .gitignore:"
echo "   - *.p12, *.p8, *.key (certificates/keys)"
echo "   - *.mobileprovision (provisioning profiles)"
echo "   - ios/ios-app-student/ (build outputs)"
echo "   - node_modules/, dist/ (dependencies/builds)"
echo ""

read -p "Ready to upload? (y/n): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]
then
    echo "❌ Upload cancelled"
    exit 1
fi

echo ""
echo "📦 Adding files..."
git add .

echo ""
echo "📝 Files to be committed:"
git status --short

echo ""
read -p "Looks good? (y/n): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]
then
    echo "❌ Commit cancelled"
    git reset
    exit 1
fi

echo ""
echo "💾 Committing..."
git commit -m "Update Bundle ID to com.videocall.student and sync iOS project"

echo ""
echo "🚀 Pushing to GitHub..."
git push

echo ""
echo "✅ Upload complete!"
echo ""
echo "📊 Next steps:"
echo "   1. Go to GitHub repository → Actions tab"
echo "   2. Wait for build to fail (still needs secrets)"
echo "   3. Follow FIX_BUILD_ERROR.md to add secrets"
echo "   4. Trigger new build"
echo ""
