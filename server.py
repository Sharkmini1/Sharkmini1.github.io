# Simple HTTP server to run the project locally and avoid iOS CORS issues.
from http.server import SimpleHTTPRequestHandler, HTTPServer

PORT = 8000

class Handler(SimpleHTTPRequestHandler):
    # Serve index.html by default
    def do_GET(self):
        if self.path == '/':
            self.path = '/index.html'
        return super().do_GET()

def run():
    print(f"Serving at http://localhost:{PORT}")
    server = HTTPServer(('0.0.0.0', PORT), Handler)
    server.serve_forever()

if __name__ == '__main__':
    run()