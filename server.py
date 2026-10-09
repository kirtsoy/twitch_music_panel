import os
import sys
import mimetypes
from http.server import HTTPServer, BaseHTTPRequestHandler
import urllib.parse

PORT = 8505
BASE_DIR = os.path.dirname(os.path.abspath(__file__))

class RangeHTTPRequestHandler(BaseHTTPRequestHandler):
    """HTTP Request Handler with full HTTP 206 Partial Content (Range) support for audio seeking."""

    def do_HEAD(self):
        self.handle_request(send_body=False)

    def do_GET(self):
        self.handle_request(send_body=True)

    def handle_request(self, send_body=True):
        parsed = urllib.parse.urlparse(self.path)
        rel_path = urllib.parse.unquote(parsed.path).lstrip('/')
        if not rel_path:
            rel_path = 'index.html'

        file_path = os.path.normpath(os.path.join(BASE_DIR, rel_path))

        # Security check
        if not file_path.startswith(BASE_DIR) or not os.path.exists(file_path) or os.path.isdir(file_path):
            self.send_error(404, "File not found")
            return

        file_size = os.path.getsize(file_path)
        content_type, _ = mimetypes.guess_type(file_path)
        if not content_type:
            content_type = 'application/octet-stream'

        range_header = self.headers.get('Range')

        if range_header:
            # Handle Range request (e.g. bytes=0-1024 or bytes=2048-)
            try:
                range_match = range_header.strip().lower()
                if range_match.startswith('bytes='):
                    ranges = range_match[6:].split('-')
                    start = int(ranges[0]) if ranges[0] else 0
                    end = int(ranges[1]) if len(ranges) > 1 and ranges[1] else file_size - 1

                    if start >= file_size:
                        self.send_error(416, "Requested Range Not Satisfiable")
                        return

                    end = min(end, file_size - 1)
                    content_length = (end - start) + 1

                    self.send_response(206)
                    self.send_header('Content-Type', content_type)
                    self.send_header('Content-Range', f'bytes {start}-{end}/{file_size}')
                    self.send_header('Content-Length', str(content_length))
                    self.send_header('Accept-Ranges', 'bytes')
                    self.send_header('Access-Control-Allow-Origin', '*')
                    self.end_headers()

                    if send_body:
                        with open(file_path, 'rb') as f:
                            f.seek(start)
                            chunk_size = 64 * 1024
                            remaining = content_length
                            while remaining > 0:
                                read_bytes = min(remaining, chunk_size)
                                data = f.read(read_bytes)
                                if not data:
                                    break
                                self.wfile.write(data)
                                remaining -= len(data)
                    return
            except Exception as e:
                pass

        # Standard 200 OK
        self.send_response(200)
        self.send_header('Content-Type', content_type)
        self.send_header('Content-Length', str(file_size))
        self.send_header('Accept-Ranges', 'bytes')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()

        if send_body:
            with open(file_path, 'rb') as f:
                chunk_size = 64 * 1024
                while True:
                    data = f.read(chunk_size)
                    if not data:
                        break
                    self.wfile.write(data)

    def log_message(self, format, *args):
        # Clean logging
        sys.stdout.write(f"[{self.log_date_time_string()}] {args[0]} - {args[1]}\n")
        sys.stdout.flush()

def run_server():
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass
    server_address = ('', PORT)
    httpd = HTTPServer(server_address, RangeHTTPRequestHandler)
    print("=" * 60)
    print(f"[Kirtsoy Player] 420 MIXTAPE - TWITCH MUSIC PANEL SERVER")
    print(f"[Kirtsoy Player] Running locally at: http://localhost:{PORT}")
    print(f"[Kirtsoy Player] Serving folder: {BASE_DIR}")
    print("=" * 60)
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nStopping server...")
        httpd.server_close()

if __name__ == '__main__':
    run_server()
