#!/bin/bash
# Crosstrain Plugin Installer for OpenCode
# Installs the crosstrain plugin to bridge Claude Code extensions to OpenCode

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Default installation location
INSTALL_TYPE="${1:-project}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

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

# Check for Bun
if ! command -v bun &> /dev/null; then
    echo -e "${RED}Error: Bun is not installed.${NC}"
    echo "Please install Bun first: https://bun.sh"
    exit 1
fi

# Create installation directory
echo "Creating directory..."
mkdir -p "$INSTALL_DIR"

# Copy plugin files
echo "Copying plugin files..."
cp -r "$SCRIPT_DIR/src" "$INSTALL_DIR/"
cp "$SCRIPT_DIR/package.json" "$INSTALL_DIR/"
cp "$SCRIPT_DIR/tsconfig.json" "$INSTALL_DIR/"
cp "$SCRIPT_DIR/README.md" "$INSTALL_DIR/" 2>/dev/null || true
cp "$SCRIPT_DIR/LICENSE" "$INSTALL_DIR/" 2>/dev/null || true

# Install dependencies
echo "Installing dependencies..."
cd "$INSTALL_DIR"
bun install --production

echo ""
echo -e "${GREEN}✅ Crosstrain plugin installed successfully!${NC}"
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
echo -e "For more information, see: ${YELLOW}https://github.com/fwdslsh/crosstrain${NC}"
