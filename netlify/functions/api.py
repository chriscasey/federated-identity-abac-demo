"""
Netlify Function entry point — bridges FastAPI to the AWS Lambda runtime.

How this works
--------------
Netlify Functions run on AWS Lambda under the hood. Lambda expects a handler
function with the signature handler(event, context) → response dict. FastAPI
is an ASGI application, which speaks a completely different interface.

Mangum is an ASGI adapter that translates between the two: it receives a
Lambda event, converts it to an ASGI-compatible request, runs it through the
FastAPI app, then converts the ASGI response back to a Lambda response dict.

The sys.path manipulation is necessary because Netlify's function runtime sets
the working directory to the function file's directory, not the project root.
Without it, `from api.main import app` would fail with a ModuleNotFoundError.

lifespan="off" tells Mangum not to run FastAPI's startup/shutdown lifecycle
hooks. Those hooks are typically used for database connections and similar
long-lived resources that don't exist in this stateless demo.

Local development
-----------------
This file is not used during local development. Running `uvicorn api.main:app`
serves the FastAPI app directly. This entry point only comes into play during
Netlify deployment, where requests to /.netlify/functions/api/* are routed
here via the redirect rules in netlify.toml.
"""

import sys
import os

# Add the project root to the import path so `api.*` is importable.
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", ".."))

from mangum import Mangum
from api.main import app

# `handler` is the name Netlify (and AWS Lambda) looks for as the entry point.
handler = Mangum(app, lifespan="off")
