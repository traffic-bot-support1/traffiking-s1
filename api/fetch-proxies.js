export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    try {
        const proxies = [];

        // Fetch from Proxifly (GitHub raw files - updated every 5-15 min)
        const proxiflyUrls = [
            'https://raw.githubusercontent.com/proxifly/free-proxy-list/main/proxies/protocols/http/data.txt',
            'https://raw.githubusercontent.com/proxifly/free-proxy-list/main/proxies/protocols/https/data.txt',
            'https://raw.githubusercontent.com/proxifly/free-proxy-list/main/proxies/all/data.txt'
        ];

        for (const url of proxiflyUrls) {
            try {
                const response = await fetch(url, { 
                    timeout: 10000,
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                    }
                });
                
                if (response.ok) {
                    const text = await response.text();
                    const proxyList = text
                        .trim()
                        .split('\n')
                        .filter(p => p.trim() && !p.startsWith('#'))
                        .map(p => p.trim());
                    proxies.push(...proxyList);
                    console.log(`Fetched ${proxyList.length} proxies from Proxifly`);
                }
            } catch (error) {
                console.error('Proxifly fetch error:', error.message);
            }
        }

        // Fallback: ProxyScrape if Proxifly fails
        if (proxies.length < 10) {
            try {
                const response = await fetch(
                    'https://api.proxyscrape.com/v2/?request=get&protocol=http&timeout=10000&country=all&ssl=all&anonymity=all&format=textplain',
                    { timeout: 10000 }
                );
                if (response.ok) {
                    const text = await response.text();
                    const proxyList = text.trim().split('\n').filter(p => p.trim());
                    proxies.push(...proxyList);
                    console.log(`Fetched ${proxyList.length} proxies from ProxyScrape`);
                }
            } catch (error) {
                console.error('ProxyScrape error:', error.message);
            }
        }

        // Remove duplicates and validate format
        const uniqueProxies = [...new Set(proxies)]
            .filter(p => {
                const parts = p.split(':');
                return parts.length === 2 && !isNaN(parts[1]) && parseInt(parts[1]) > 0;
            })
            .slice(0, 200); // Limit to 200 best proxies

        if (uniqueProxies.length === 0) {
            return res.status(200).json({
                success: false,
                error: 'No working proxies found at the moment. Try again in a few minutes.',
                proxies: [],
                count: 0
            });
        }

        res.status(200).json({
            success: true,
            proxies: uniqueProxies,
            count: uniqueProxies.length,
            source: 'Proxifly + ProxyScrape',
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message,
            proxies: [],
            count: 0
        });
    }
}
