#!/bin/bash
# Script to verify base64 encoding is correct

cd ~

echo "🔍 Verifying P12 and Base64 files..."
echo ""

# Check if files exist
if [ ! -f "ios_distribution.p12" ]; then
    echo "❌ ios_distribution.p12 not found!"
    exit 1
fi

echo "✅ Found ios_distribution.p12"
ls -lh ios_distribution.p12

echo ""
echo "📊 File checksums:"
md5sum ios_distribution.p12

echo ""
echo "🔐 Testing password locally..."
openssl pkcs12 -in ios_distribution.p12 -noout -passin pass:asdasd123
if [ $? -eq 0 ]; then
    echo "✅ Password works locally!"
else
    echo "❌ Password failed locally!"
    exit 1
fi

echo ""
echo "📝 Creating new base64 file (no line wrapping)..."
base64 -w 0 ios_distribution.p12 > ios_distribution_base64_VERIFIED.txt

echo ""
echo "📏 Base64 file stats:"
echo "  Lines: $(wc -l < ios_distribution_base64_VERIFIED.txt)"
echo "  Chars: $(wc -c < ios_distribution_base64_VERIFIED.txt)"
echo "  First 60 chars: $(head -c 60 ios_distribution_base64_VERIFIED.txt)"
echo "  Last 60 chars: $(tail -c 60 ios_distribution_base64_VERIFIED.txt)"

echo ""
echo "🧪 Testing if base64 decodes correctly..."
cat ios_distribution_base64_VERIFIED.txt | base64 --decode > test_decoded.p12

if diff -q ios_distribution.p12 test_decoded.p12 > /dev/null; then
    echo "✅ Base64 encoding/decoding works perfectly!"
else
    echo "❌ Base64 decode doesn't match original!"
    exit 1
fi

echo ""
echo "🔐 Testing decoded file with password..."
openssl pkcs12 -in test_decoded.p12 -noout -passin pass:asdasd123
if [ $? -eq 0 ]; then
    echo "✅ Decoded file works with password!"
else
    echo "❌ Decoded file password failed!"
    exit 1
fi

rm test_decoded.p12

echo ""
echo "✅ ALL CHECKS PASSED!"
echo ""
echo "📋 Next steps:"
echo "1. Copy the base64 content:"
echo "   cat ~/ios_distribution_base64_VERIFIED.txt"
echo ""
echo "2. Update GitHub secret APPLE_P12_NEW with that content"
echo ""
echo "3. Verify password secret is: asdasd123"
echo ""
