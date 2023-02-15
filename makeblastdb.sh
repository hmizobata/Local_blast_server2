#!/bin/bash

cd $1
/blast/bin/makeblastdb -dbtype $2 -in $3
