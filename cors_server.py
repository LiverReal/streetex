import http.server
import ssl

class CORSRequestHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        # Add CORS headers before ending headers
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', '*')
        super().end_headers()

    def do_OPTIONS(self):
        # Respond to preflight CORS requests
        self.send_response(200)
        self.end_headers()

# Create the HTTP server
server_address = ('localhost', 4443)
httpd = http.server.HTTPServer(server_address, CORSRequestHandler)

# Create an SSL context
context = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)
context.load_cert_chain(certfile='cert.pem', keyfile='key.pem')

# Wrap the server's socket
httpd.socket = context.wrap_socket(httpd.socket, server_side=True)

print("Serving on https://localhost:4443")
httpd.serve_forever()
