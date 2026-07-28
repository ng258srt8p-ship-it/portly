import urllib.request
import sys

url = 'http://172.66.44.130/'
headers = {'Host': 'portly-1i0.pages.dev'}

req = urllib.request.Request(url, headers=headers, method='HEAD')
try:
    resp = urllib.request.urlopen(req)
    print(f'Status: {resp.status} {resp.reason}')
    print('Headers:')
    for k, v in resp.headers.items():
        print(f'{k}: {v}')
except Exception as e:
    print(f'Error: {e}')
    if hasattr(e, 'headers'):
        print('Response headers:')
        for k, v in e.headers.items():
            print(f'{k}: {v}')
    sys.exit(1)