#!/bin/bash

# Add the current directory to Python's search path
export PYTHONPATH=.

# Start the RQ worker in the background
rq worker comics-queue &

# Start the Gunicorn server to manage Uvicorn workers in the foreground
# -w 4: Starts 4 worker processes
# -k uvicorn.workers.UvicornWorker: Tells Gunicorn to use Uvicorn for the workers
# --bind 0.0.0.0:$PORT: Binds to the host and port provided by Render
gunicorn -w 2 -k uvicorn.workers.UvicornWorker api.main:app --bind 0.0.0.0:$PORT