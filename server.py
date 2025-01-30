from http.server import HTTPServer, SimpleHTTPRequestHandler
import ssl

print("starting server")

host = 'localhost'
port = 8101

httpd = HTTPServer((host, port), SimpleHTTPRequestHandler)
httpd.socket = ssl.wrap_socket(httpd.socket, 
                               keyfile="key.pem", 
                               certfile='cert.pem', 
                               server_side=True)
print(f"serving at https://{host}:{port}")
httpd.serve_forever()
