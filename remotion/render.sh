#!/bin/bash
set -euo pipefail

npx remotion render CodexBoardDemo "$1" --props="$2"
