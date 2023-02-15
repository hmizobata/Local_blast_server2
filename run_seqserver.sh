#!/bin/bash

##kill `ps -a|awk '{if($4=="bundle")print $1;}'`;
cd /sequenceserver
nohup bundle exec sequenceserver &
