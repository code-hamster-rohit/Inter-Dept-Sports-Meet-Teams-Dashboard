import os
import sys

# Ensure project root directory is at the top of sys.path for Vercel Serverless Functions
root_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if root_dir not in sys.path:
    sys.path.insert(0, root_dir)

from main import app

# Vercel's Python runtime discovers the ASGI application instance via 'app'
__all__ = ["app"]
