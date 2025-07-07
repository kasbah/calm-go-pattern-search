#!/usr/bin/env bash

mkdir -p ../frontend/public/sgfs
7z x andries-brouwer.7z; mv games ../frontend/public/sgfs/andries-brouwer
7z x pro-20140711.7z && mv pro ../frontend/public/sgfs/pro-20140711
7z x badukmovies-pro-collection.7z && mv badukmovies-pro-collection ../frontend/public/sgfs/badukmovies-pro-collection
