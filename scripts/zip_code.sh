#!/bin/bash

cd ..

zip -r compx_cfi_aws.zip . -x "node_modules/*" -x "dist/*" -x ".elasticbeanstalk/*"