#!/bin/bash
# Crosstrain Plugin Installer for OpenCode
# Installs the crosstrain plugin to bridge Claude Code extensions to OpenCode

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# GitHub repository
REPO="fwdslsh/crosstrain"

# Default installation location
INSTALL_TYPE="${1:-project}"

echo -e "${GREEN}Crosstrain Plugin Installer${NC}"
echo "================================"

# Determine installation directory
case "$INSTALL_TYPE" in
    "global"|"user")
        INSTALL_DIR="$HOME/.config/opencode/plugin/crosstrain"
        echo "Installing globally to: $INSTALL_DIR"
        ;;
    "project"|"local")
        INSTALL_DIR=".opencode/plugin/crosstrain"
        echo "Installing to project: $INSTALL_DIR"
        ;;
    *)
        INSTALL_DIR="$INSTALL_TYPE"
        echo "Installing to custom path: $INSTALL_DIR"
        ;;
esac

# Check for required tools
if ! command -v curl &> /dev/null; then
    echo -e "${RED}Error: curl is not installed.${NC}"
    exit 1
fi

if ! command -v tar &> /dev/null; then
    echo -e "${RED}Error: tar is not installed.${NC}"
    exit 1
fi

if ! command -v bun &> /dev/null; then
    echo -e "${RED}Error: Bun is not installed.${NC}"
    echo "Please install Bun first: https://bun.sh"
    exit 1
fi

# Get latest release URL
echo "Fetching latest release..."
RELEASE_URL=$(curl -fsSL "https://api.github.com/repos/$REPO/releases/latest" | grep -o '"browser_download_url": *"[^"]*\.tar\.gz"' | head -1 | cut -d'"' -f4)

if [ -z "$RELEASE_URL" ]; then
    echo -e "${RED}Error: Could not find latest release.${NC}"
    echo "Please check https://github.com/$REPO/releases"
    exit 1
fi

echo "Downloading from: $RELEASE_URL"

# Create temp directory for download
TEMP_DIR=$(mktemp -d)
trap "rm -rf $TEMP_DIR" EXIT

# Download and extract
curl -fsSL "$RELEASE_URL" -o "$TEMP_DIR/crosstrain.tar.gz"
tar -xzf "$TEMP_DIR/crosstrain.tar.gz" -C "$TEMP_DIR"

# Create installation directory
echo "Installing to $INSTALL_DIR..."
mkdir -p "$INSTALL_DIR"

# Copy plugin files
cp -r "$TEMP_DIR/crosstrain/"* "$INSTALL_DIR/"

# Install dependencies
echo "Installing dependencies..."
cd "$INSTALL_DIR"
bun install --production

echo ""
echo -e "${GREEN}Crosstrain plugin installed successfully!${NC}"
echo ""
echo "The plugin will be automatically loaded when OpenCode starts."
echo ""
echo "To use Claude Code extensions:"
echo "  1. Create .claude/ directory in your project with skills, agents, commands, or hooks"
echo "  2. Restart OpenCode to load the extensions"
echo ""
echo "Available tools after loading:"
echo "  - crosstrain_info: Show loaded Claude Code assets"
echo "  - crosstrain_list_marketplaces: List configured marketplaces"
echo "  - crosstrain_install_plugin: Install a plugin from marketplace"
echo ""
echo -e "For more information, see: ${YELLOW}https://github.com/$REPO${NC}"
