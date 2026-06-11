#!/usr/bin/env bash
#
# Publish specship to npm — with pre-flight safety checks.
#
# Usage:
#   ./publish.sh                 # publish current version
#   ./publish.sh patch           # bump patch, then publish (no git commit/tag)
#   ./publish.sh minor|major     # bump minor/major, then publish
#   ./publish.sh 1.4.0           # set explicit version, then publish
#
# Options (any position):
#   --dry-run        Run every check + `npm publish --dry-run` (publishes nothing)
#   --tag <name>     Publish under a dist-tag (e.g. next) instead of latest
#   --otp <code>     One-time password for 2FA-protected accounts
#   --yes            Skip the final confirmation prompt
#
# Note: version bumps use --no-git-tag-version, so NO git commit or tag is made.
#       After a successful publish the script prints the git commands for you to
#       run yourself.

set -euo pipefail
cd "$(dirname "$0")"

bump=""
dry_run=false
dist_tag="latest"
otp=""
assume_yes=false

while [ $# -gt 0 ]; do
  case "$1" in
    --dry-run) dry_run=true ;;
    --tag) dist_tag="${2:?--tag needs a value}"; shift ;;
    --otp) otp="${2:?--otp needs a value}"; shift ;;
    --yes|-y) assume_yes=true ;;
    patch|minor|major) bump="$1" ;;
    [0-9]*.[0-9]*.[0-9]*) bump="$1" ;;
    *) echo "Unknown argument: $1" >&2; exit 1 ;;
  esac
  shift
done

step() { printf '\n\033[1m▸ %s\033[0m\n' "$1"; }
die()  { printf '\033[31m✗ %s\033[0m\n' "$1" >&2; exit 1; }

# --- pre-flight ------------------------------------------------------------
step "Checking toolchain"
command -v node >/dev/null || die "node not found"
command -v npm  >/dev/null || die "npm not found"
echo "node $(node -v) · npm $(npm -v)"

step "Checking npm auth"
who=$(npm whoami 2>/dev/null) || die "Not logged in. Run: npm login"
echo "Logged in as: $who"

step "Running tests"
npm test

# --- version ---------------------------------------------------------------
if [ -n "$bump" ]; then
  step "Bumping version ($bump)"
  npm version "$bump" --no-git-tag-version >/dev/null
fi
name=$(node -p "require('./package.json').name")
version=$(node -p "require('./package.json').version")
echo "Package: $name@$version  (tag: $dist_tag)"

step "Checking the version is not already published"
if npm view "$name@$version" version >/dev/null 2>&1; then
  die "$name@$version is already on npm. Bump the version: ./publish.sh patch"
fi

step "Files that will be published"
npm pack --dry-run

# --- confirm & publish -----------------------------------------------------
if [ "$dry_run" = true ]; then
  step "Dry run"
  npm publish --dry-run --tag "$dist_tag" ${otp:+--otp "$otp"} --access public
  echo "Dry run complete — nothing was published."
  exit 0
fi

if [ "$assume_yes" != true ]; then
  printf '\nPublish %s@%s to npm (tag: %s)? [y/N] ' "$name" "$version" "$dist_tag"
  read -r reply
  case "$reply" in y|Y|yes|YES) ;; *) die "Aborted." ;; esac
fi

step "Publishing"
npm publish --tag "$dist_tag" ${otp:+--otp "$otp"} --access public

printf '\n\033[32m✓ Published %s@%s\033[0m\n' "$name" "$version"
echo "Next, tag the release yourself if you want:"
echo "  git add -A && git commit -m \"release: $name@$version\" && git tag v$version && git push --follow-tags"
git add -A && git commit -m \"release: $name@$version\" && git tag v$version && git push --follow-tags
