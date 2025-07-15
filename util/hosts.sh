#!/bin/bash

#These commands are in a bash file so we can run 2 root commands with one Sudo-Prompt script
#That way we only have to ask for root permissions once

npx hostile set $1 $2
npx hostile set ::1 $2
