import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import dns from 'node:dns';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';

// Force Node to prefer IPv4 to avoid IPv6-routing timeouts or socket disconnects in the container
dns.setDefaultResultOrder('ipv4first');

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  return {
    plugins: [
      react(), 
      tailwindcss(),
      {
        name: 'custom-weather-proxy-plugin',
        configureServer(server) {
          server.middlewares.use(async (req, res, next) => {
            const url = req.url || '';
            let targetBase = '';
            
            if (url.startsWith('/api/weather-proxy')) {
              targetBase = 'https://api.open-meteo.com';
            } else if (url.startsWith('/api/geocoding-proxy')) {
              targetBase = 'https://geocoding-api.open-meteo.com';
            } else if (url.startsWith('/api/air-quality-proxy')) {
              targetBase = 'https://air-quality-api.open-meteo.com';
            }
            
            if (targetBase) {
              let suffix = '';
              try {
                const urlObj = new URL(url, 'http://localhost');
                const pathParam = urlObj.searchParams.get('path');
                if (pathParam) {
                  suffix = pathParam;
                } else {
                  if (url.startsWith('/api/weather-proxy')) {
                    suffix = url.substring('/api/weather-proxy'.length);
                  } else if (url.startsWith('/api/geocoding-proxy')) {
                    suffix = url.substring('/api/geocoding-proxy'.length);
                  } else if (url.startsWith('/api/air-quality-proxy')) {
                    suffix = url.substring('/api/air-quality-proxy'.length);
                  }
                }
              } catch (e) {
                if (url.startsWith('/api/weather-proxy')) {
                  suffix = url.substring('/api/weather-proxy'.length);
                } else if (url.startsWith('/api/geocoding-proxy')) {
                  suffix = url.substring('/api/geocoding-proxy'.length);
                } else if (url.startsWith('/api/air-quality-proxy')) {
                  suffix = url.substring('/api/air-quality-proxy'.length);
                }
              }
              
              const targetUrl = targetBase + suffix;
              
              let response;
              try {
                console.log(`[Custom Proxy Server] Routing proxy request: ${targetUrl}`);
                response = await fetch(targetUrl, {
                  method: 'GET',
                  headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                    'Accept': 'application/json',
                  }
                });
              } catch (err: any) {
                console.warn(`[Custom Proxy Server] HTTPS proxy request failed for ${targetUrl}. Trying apex alternative...`, err);
                let altUrl = targetUrl;
                if (targetUrl.startsWith('https://api.open-meteo.com')) {
                  altUrl = targetUrl.replace('https://api.open-meteo.com', 'https://open-meteo.com');
                }
                
                try {
                  response = await fetch(altUrl, {
                    method: 'GET',
                    headers: {
                      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                      'Accept': 'application/json',
                    }
                  });
                } catch (altErr: any) {
                  console.warn(`[Custom Proxy Server] Apex alternative failed too. Trying HTTP fallback...`, altErr);
                  if (targetUrl.startsWith('https://')) {
                    const fallbackUrl = targetUrl.replace('https://', 'http://');
                    try {
                      response = await fetch(fallbackUrl, {
                        method: 'GET',
                        headers: {
                          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                          'Accept': 'application/json',
                        }
                      });
                    } catch (fallbackErr: any) {
                      console.error(`[Custom Proxy Server] Both HTTPS, Apex, and HTTP proxy failed for ${targetUrl}.`, fallbackErr);
                      res.statusCode = 500;
                      res.setHeader('Content-Type', 'application/json');
                      res.setHeader('Access-Control-Allow-Origin', '*');
                      res.end(JSON.stringify({ error: true, message: `Proxy fetch failed for all modes: HTTPS target error: ${err.message}. Apex fallback error: ${altErr.message}. HTTP error: ${fallbackErr.message}` }));
                      return;
                    }
                  } else {
                    res.statusCode = 500;
                    res.setHeader('Content-Type', 'application/json');
                    res.setHeader('Access-Control-Allow-Origin', '*');
                    res.end(JSON.stringify({ error: true, message: err.message || 'Custom Proxy Error' }));
                    return;
                  }
                }
              }
              
              if (response) {
                try {
                  const data = await response.json();
                  res.setHeader('Content-Type', 'application/json');
                  res.setHeader('Access-Control-Allow-Origin', '*');
                  res.statusCode = response.status;
                  res.end(JSON.stringify(data));
                } catch (jsonErr: any) {
                  console.error('[Custom Proxy Server] Failed to parse JSON response from target', jsonErr);
                  res.statusCode = 502;
                  res.setHeader('Content-Type', 'application/json');
                  res.setHeader('Access-Control-Allow-Origin', '*');
                  res.end(JSON.stringify({ error: true, message: `Bad Gateway: Target returned invalid JSON: ${jsonErr.message}` }));
                }
              }
            } else {
              next();
            }
          });
        }
      }
    ],
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      hmr: process.env.DISABLE_HMR !== 'true',
    },
  };
});
