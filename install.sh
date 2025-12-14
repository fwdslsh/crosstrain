#!/bin/bash
# Crosstrain Plugin Installer for OpenCode
# Installs the crosstrain plugin to bridge Claude Code extensions to OpenCode

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

REPO_URL="https://github.com/fwdslsh/crosstrain.git"
INSTALL_TYPE="${1:-project}"

# ASCII Banner
show_banner() {
    printf "${CYAN}"
    cat << 'EOF'
    __________  ____  _______________  ___    ____   ______  __
   / ____/ __ \/ __ \/ ___/ ___/_  __/ __ \  /   |  /  _/ | / /
  / /   / /_/ / / / /\__ \\__ \ / / / /_/ / / /| |  / //  |/ / 
 / /___/ _, _/ /_/ /___/ /__/ // / / _, _/ / ___ |_/ // /|  /  
 \____/_/ |_|\____//____/____//_/ /_/ |_| /_/  |_/___/_/ |_/   

                                                      
 Bridge Claude Code to OpenCode
EOF
    printf "${NC}\n"
}

show_banner

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
if ! command -v git &> /dev/null; then
    echo -e "${RED}Error: git is not installed.${NC}"
    exit 1
fi

if ! command -v bun &> /dev/null; then
    echo -e "${RED}Error: Bun is not installed.${NC}"
    echo "Please install Bun first: https://bun.sh"
    exit 1
fi

# Create parent directory
mkdir -p "$(dirname "$INSTALL_DIR")"

# Clone or update repository
if [ -d "$INSTALL_DIR/.git" ]; then
    echo "Updating existing installation..."
    cd "$INSTALL_DIR"
    git pull --ff-only
else
    # Remove any existing non-git directory
    if [ -d "$INSTALL_DIR" ]; then
        echo "Removing existing installation..."
        rm -rf "$INSTALL_DIR"
    fi

    echo "Cloning repository..."
    git clone --depth 1 "$REPO_URL" "$INSTALL_DIR"
    cd "$INSTALL_DIR"
fi

# Install dependencies
echo "Installing dependencies..."
bun install --production

# Verify required files exist
if [ ! -f "$INSTALL_DIR/index.ts" ]; then
    echo -e "${RED}Error: index.ts not found. Installation may be incomplete.${NC}"
    exit 1
fi

if [ ! -f "$INSTALL_DIR/settings.json" ]; then
    echo -e "${YELLOW}Warning: settings.json not found. Creating default...${NC}"
    cat > "$INSTALL_DIR/settings.json" << 'EOF'
{
  "$schema": "./settings.schema.json",
  "enabled": true,
  "claudeDir": ".claude",
  "openCodeDir": ".opencode",
  "loadUserAssets": true,
  "loadUserSettings": true,
  "watch": true,
  "filePrefix": "claude_",
  "verbose": false
}
EOF
fi

# Create loader file in plugin directory (OpenCode loads .ts files directly)
LOADER_FILE="$(dirname "$INSTALL_DIR")/crosstrain.ts"
echo "Creating loader file at $LOADER_FILE..."
cat > "$LOADER_FILE" << 'EOF'
/**
 * Crosstrain Plugin Loader
 * OpenCode loads plugins from files directly in .opencode/plugin/
 */
export { CrosstrainPlugin, default } from "./crosstrain/index"
EOF

echo ""
echo -e "${GREEN}Crosstrain installed successfully!${NC}"
echo ""
echo "The plugin will be loaded when OpenCode starts."
echo ""
echo "Quick start:"
echo "  1. Create .claude/ directory with skills, agents, or commands"
echo "  2. Restart OpenCode"
echo ""
echo "Configuration: $INSTALL_DIR/settings.json"
echo ""
echo -e "Documentation: ${YELLOW}https://github.com/fwdslsh/crosstrain${NC}"
