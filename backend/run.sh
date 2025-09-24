#!/bin/bash

# Start the RQ worker in the background
rq worker $RQ_NAME &

# Start the Gunicorn server to manage Uvicorn workers in the foreground
# -w 4: Starts 4 worker processes
# -k uvicorn.workers.UvicornWorker: Tells Gunicorn to use Uvicorn for the workers
# --bind 0.0.0.0:$PORT: Binds to the host and port provided by Render
gunicorn -w 1 -k uvicorn.workers.UvicornWorker backend.api.main:app --bind 0.0.0.0:$PORT --timeout 120 --keep-alive 5
