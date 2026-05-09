#!/bin/bash
# Required parameters:
# @raycast.schemaVersion 1
# @raycast.title View ACE Vault
# @raycast.mode silent
# @raycast.icon 🌱

cd "$(dirname "$0")"
node build.js && open vault-view.html
