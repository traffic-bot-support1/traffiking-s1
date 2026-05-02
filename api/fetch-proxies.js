export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    try {
        console.log('Starting proxy fetch from multiple sources...');
        const allProxies = [];

        // Array of all proxy sources
        const proxySources = [
            // Proxifly GitHub (Updated every 5-15 min)
            {
                name: 'Proxifly HTTP',
                url: 'https://raw.githubusercontent.com/proxifly/free-proxy-list/main/proxies/protocols/http/data.txt',
                type: 'text'
            },
            {
                name: 'Proxifly HTTPS',
                url: 'https://raw.githubusercontent.com/proxifly/free-proxy-list/main/proxies/protocols/https/data.txt',
                type: 'text'
            },
            {
                name: 'Proxifly All',
                url: 'https://raw.githubusercontent.com/proxifly/free-proxy-list/main/proxies/all/data.txt',
                type: 'text'
            },
            {
                name: 'Proxifly Country US',
                url: 'https://raw.githubusercontent.com/proxifly/free-proxy-list/main/proxies/countries/us/data.txt',
                type: 'text'
            },
            // TheSpeedX Proxy List (Popular GitHub repo)
            {
                name: 'TheSpeedX HTTP',
                url: 'https://raw.githubusercontent.com/TheSpeedX/PROXY-List/master/http.txt',
                type: 'text'
            },
            {
                name: 'TheSpeedX SOCKS4',
                url: 'https://raw.githubusercontent.com/TheSpeedX/PROXY-List/master/socks4.txt',
                type: 'text'
            },
            {
                name: 'TheSpeedX SOCKS5',
                url: 'https://raw.githubusercontent.com/TheSpeedX/PROXY-List/master/socks5.txt',
                type: 'text'
            },
            // ShiftyTR Proxy List
            {
                name: 'ShiftyTR HTTP',
                url: 'https://raw.githubusercontent.com/ShiftyTR/Proxy-List/master/http.txt',
                type: 'text'
            },
            {
                name: 'ShiftyTR HTTPS',
                url: 'https://raw.githubusercontent.com/ShiftyTR/Proxy-List/master/https.txt',
                type: 'text'
            },
            // Proxy List GitHub
            {
                name: 'Proxy-List HTTP',
                url: 'https://raw.githubusercontent.com/clarketm/proxy-list/master/proxy-list-raw.txt',
                type: 'text'
            },
            // Fate0 Proxy List
            {
                name: 'Fate0 Proxies',
                url: 'https://raw.githubusercontent.com/fate0/proxylist/master/proxy.list',
                type: 'json'
            },
            // Jetkai Proxy List
            {
                name: 'Jetkai HTTP',
                url: 'https://raw.githubusercontent.com/jetkai/proxy-list/main/online-proxies/txt/proxies-http.txt',
                type: 'text'
            },
            {
                name: 'Jetkai HTTPS',
                url: 'https://raw.githubusercontent.com/jetkai/proxy-list/main/online-proxies/txt/proxies-https.txt',
                type: 'text'
            },
            // Monosans Proxy List
            {
                name: 'Monosans HTTP',
                url: 'https://raw.githubusercontent.com/monosans/proxy-list/main/proxies/http.txt',
                type: 'text'
            },
            {
                name: 'Monosans HTTPS',
                url: 'https://raw.githubusercontent.com/monosans/proxy-list/main/proxies/https.txt',
                type: 'text'
            },
            // ProxyScrape API
            {
                name: 'ProxyScrape HTTP',
                url: 'https://api.proxyscrape.com/v2/?request=get&protocol=http&timeout=10000&country=all&ssl=all&anonymity=all',
                type: 'text'
            },
            {
                name: 'ProxyScrape HTTPS',
                url: 'https://api.proxyscrape.com/v2/?request=get&protocol=https&timeout=10000&country=all&ssl=all&anonymity=all',
                type: 'text'
            },
            {
                name: 'ProxyScrape SOCKS4',
                url: 'https://api.proxyscrape.com/v2/?request=get&protocol=socks4&timeout=10000&country=all',
                type: 'text'
            },
            {
                name: 'ProxyScrape SOCKS5',
                url: 'https://api.proxyscrape.com/v2/?request=get&protocol=socks5&timeout=10000&country=all',
                type: 'text'
            },
            // Proxy-List.download
            {
                name: 'Proxy-List HTTP',
                url: 'https://www.proxy-list.download/api/v1/get?type=http',
                type: 'text'
            },
            {
                name: 'Proxy-List HTTPS',
                url: 'https://www.proxy-list.download/api/v1/get?type=https',
                type: 'text'
            },
            // OpenProxyList
            {
                name: 'OpenProxyList HTTP',
                url: 'https://raw.githubusercontent.com/roosterkid/openproxylist/main/HTTPS_RAW.txt',
                type: 'text'
            },
            // Advanced GitHub Proxy Lists
            {
                name: 'Zaeem20 HTTP',
                url: 'https://raw.githubusercontent.com/Zaeem20/FREE_PROXIES_LIST/master/http.txt',
                type: 'text'
            },
            {
                name: 'Zaeem20 HTTPS',
                url: 'https://raw.githubusercontent.com/Zaeem20/FREE_PROXIES_LIST/master/https.txt',
                type: 'text'
            },
            // GeoNode API
            {
                name: 'GeoNode',
                url: 'https://proxylist.geonode.com/api/proxy-list?limit=500&page=1&sort_by=lastChecked&sort_type=desc',
                type: 'geonode'
            }
        ];

        // Fetch from all sources concurrently
        const fetchPromises = proxySources.map(async (source) => {
            try {
                console.log(`Fetching from ${source.name}...`);
                
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 8000); // 8 second timeout

                const response = await fetch(source.url, {
                    signal: controller.signal,
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
                    }
                });

                clearTimeout(timeoutId);

                if (!response.ok) {
                    console.log(`${source.name} failed: ${response.status}`);
                    return [];
                }

                let proxies = [];

                if (source.type === 'text') {
                    const text = await response.text();
                    proxies = text
                        .trim()
                        .split('\n')
                        .map(line => line.trim())
                        .filter(line => {
                            // Validate format: IP:PORT
                            const parts = line.split(':');
                            if (parts.length !== 2) return false;
                            const port = parseInt(parts[1]);
                            return !isNaN(port) && port > 0 && port < 65536;
                        });
                } else if (source.type === 'json') {
                    const text = await response.text();
                    const lines = text.trim().split('\n');
                    proxies = lines.map(line => {
                        try {
                            const obj = JSON.parse(line);
                            return `${obj.host}:${obj.port}`;
                        } catch {
                            return null;
                        }
                    }).filter(p => p !== null);
                } else if (source.type === 'geonode') {
                    const data = await response.json();
                    proxies = data.data.map(p => `${p.ip}:${p.port}`);
                }

                console.log(`${source.name}: Found ${proxies.length} proxies`);
                return proxies;

            } catch (error) {
                if (error.name === 'AbortError') {
                    console.log(`${source.name}: Timeout`);
                } else {
                    console.log(`${source.name}: Error - ${error.message}`);
                }
                return [];
            }
        });

        // Wait for all sources to complete
        const results = await Promise.all(fetchPromises);
        
        // Combine all proxies
        results.forEach(proxies => {
            allProxies.push(...proxies);
        });

        console.log(`Total proxies collected: ${allProxies.length}`);

        // Remove duplicates
        const uniqueProxies = [...new Set(allProxies)];
        console.log(`Unique proxies: ${uniqueProxies.length}`);

        // Additional validation and filtering
        const validProxies = uniqueProxies.filter(proxy => {
            const parts = proxy.split(':');
            if (parts.length !== 2) return false;
            
            const ip = parts[0];
            const port = parseInt(parts[1]);
            
            // Basic IP validation
            const ipParts = ip.split('.');
            if (ipParts.length !== 4) return false;
            
            // Check each octet
            for (let octet of ipParts) {
                const num = parseInt(octet);
                if (isNaN(num) || num < 0 || num > 255) return false;
            }
            
            // Port validation
            if (isNaN(port) || port < 1 || port > 65535) return false;
            
            // Filter out common bad ports
            const badPorts = [25, 465, 587]; // Email ports
            if (badPorts.includes(port)) return false;
            
            return true;
        });

        console.log(`Valid proxies after filtering: ${validProxies.length}`);

        if (validProxies.length === 0) {
            return res.status(200).json({
                success: false,
                error: 'No working proxies found at the moment. Try again in a few minutes.',
                proxies: [],
                count: 0,
                sources: proxySources.length,
                timestamp: new Date().toISOString()
            });
        }

        // Shuffle proxies for better distribution
        const shuffledProxies = validProxies.sort(() => Math.random() - 0.5);

        // Limit to best 300 proxies
        const finalProxies = shuffledProxies.slice(0, 300);

        res.status(200).json({
            success: true,
            proxies: finalProxies,
            count: finalProxies.length,
            total_collected: allProxies.length,
            unique_count: uniqueProxies.length,
            sources: proxySources.length,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('Main error:', error);
        res.status(500).json({
            success: false,
            error: error.message,
            proxies: [],
            count: 0
        });
    }
}
