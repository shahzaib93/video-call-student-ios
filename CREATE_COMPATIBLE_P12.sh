#!/bin/bash
# Create a P12 certificate that's more compatible with GitHub Actions

cd ~

echo "🔧 Creating GitHub Actions compatible P12..."
echo ""

# Method 1: Use legacy encryption (more compatible)
echo "Creating P12 with legacy encryption..."
openssl pkcs12 -export \
  -out ios_distribution_legacy.p12 \
  -inkey ios_distribution.key \
  -in ios_distribution.pem \
  -passout pass:asdasd123 \
  -legacy

if [ $? -eq 0 ]; then
    echo "✅ Created ios_distribution_legacy.p12"

    # Test it
    echo "🧪 Testing legacy P12..."
    openssl pkcs12 -in ios_distribution_legacy.p12 -noout -passin pass:asdasd123 -legacy

    if [ $? -eq 0 ]; then
        echo "✅ Legacy P12 password verified!"

        # Create base64
        echo "📝 Creating base64..."
        base64 -w 0 ios_distribution_legacy.p12 > ios_distribution_legacy_base64.txt

        echo ""
        echo "✅ SUCCESS! Use this file:"
        echo "   File: ~/ios_distribution_legacy_base64.txt"
        echo "   Size: $(wc -c < ios_distribution_legacy_base64.txt) characters"
        echo ""
        echo "📋 To copy:"
        echo "   cat ~/ios_distribution_legacy_base64.txt"
        echo ""
        exit 0
    fi
fi

echo ""
echo "⚠️ Legacy method didn't work, trying alternative..."

# Method 2: Use specific encryption algorithms
echo "Creating P12 with specific algorithms..."
openssl pkcs12 -export \
  -out ios_distribution_compat.p12 \
  -inkey ios_distribution.key \
  -in ios_distribution.pem \
  -passout pass:asdasd123 \
  -descert \
  -certpbe PBE-SHA1-3DES \
  -keypbe PBE-SHA1-3DES \
  -macalg sha1

if [ $? -eq 0 ]; then
    echo "✅ Created ios_distribution_compat.p12"

    # Test it
    echo "🧪 Testing compatible P12..."
    openssl pkcs12 -in ios_distribution_compat.p12 -noout -passin pass:asdasd123

    if [ $? -eq 0 ]; then
        echo "✅ Compatible P12 password verified!"

        # Create base64
        echo "📝 Creating base64..."
        base64 -w 0 ios_distribution_compat.p12 > ios_distribution_compat_base64.txt

        echo ""
        echo "✅ SUCCESS! Use this file:"
        echo "   File: ~/ios_distribution_compat_base64.txt"
        echo "   Size: $(wc -c < ios_distribution_compat_base64.txt) characters"
        echo ""
        echo "📋 To copy:"
        echo "   cat ~/ios_distribution_compat_base64.txt"
        echo ""
        exit 0
    fi
fi

echo ""
echo "❌ Both methods failed. Please check your certificate files."
