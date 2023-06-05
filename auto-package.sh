#!/bin/sh
cargo build --release
/bin/mv -f package.tar.gz package.tar.gz.bak 2>/dev/null
/bin/tar -caf package.tar.gz public/ config.json backup -C target/release/ chat-server
