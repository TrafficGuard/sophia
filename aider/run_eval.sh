#!/bin/bash

# exit when any command fails
set -e

./report.py $* | tee tmp.evalreport.txt

rsync -az tmp.evalreport.txt chunder.net:www/chunder.net/tmp.evalreport.txt

