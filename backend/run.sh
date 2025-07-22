#!/bin/bash

# Start the RQ worker in the background
rq worker comics-queue &

# Start the Uvicorn web server in the foreground
uvicorn api.main:app --host 0.0.0.0 --port $PORT