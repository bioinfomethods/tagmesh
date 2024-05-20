#!/bin/bash

# Convenient wrapper script for deployment using docker-compose.
#
# Should only be run on deployment servers

CURRENT_DIR="$(dirname $0 | xargs realpath)"
PROJECT_DIR="$(dirname $CURRENT_DIR | xargs realpath)"

echo "PROJECT_DIR=$PROJECT_DIR"

pushd "$PROJECT_DIR" || exit

set -eo pipefail

FORCE=false
SKIP_GIT=false

while test $# -gt 0
do
    case "$1" in
        -s)
            SKIP_GIT=true
            ;;
        --skip-git)
            SKIP_GIT=true
            ;;
        --*) echo "bad option $1"
            exit 1
            ;;
        *) echo "bad argument $1"
            exit 1
            ;;
    esac
    shift
done

echo "SKIP_GIT=$SKIP_GIT, FORCE=$FORCE"

if [ "$SKIP_GIT" = false ]; then
    git pull
    git submodule update --recursive
    
fi

popd || exit
docker compose pull
docker compose down
docker compose -f docker-compose.mcri.yml up -d
