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

Naming note: this file is intentionally NOT named api.py. Lambda imports the
function file as a module using the filename as the module name. If this file
were named api.py, Python would register it as sys.modules['api'], and the
subsequent `from api.main import app` would resolve back to this same file
instead of the bundled api/ package — causing an ImportError.

The api/ package is included in the Lambda deployment bundle via the
`included_files` setting in netlify.toml, placing it alongside this file
under /var/task/ in the Lambda runtime. /var/task/ is on sys.path by default
in AWS Lambda Python runtimes.

lifespan="off" tells Mangum not to run FastAPI's startup/shutdown lifecycle
hooks. Those hooks are typically used for database connections and similar
long-lived resources that don't exist in this stateless demo.

Local development
-----------------
This file is not used during local development. Running `uvicorn api.main:app`
serves the FastAPI app directly. This entry point only comes into play during
Netlify deployment.
"""

import sys
import os

# Ensure the function's own directory (/var/task/ on Lambda) is on the path
# so the bundled api/ package is importable. Lambda adds this by default,
# but this is belt-and-suspenders for environments that don't.
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from mangum import Mangum
from api.main import app

# `handler` is the name Netlify (and AWS Lambda) looks for as the entry point.
handler = Mangum(app, lifespan="off")
