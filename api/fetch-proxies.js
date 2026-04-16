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

        // Fetch from ProxyScrape
        try {
            const response = await fetch(
                'https://api.proxyscrape.com/v2/?request=get&protocol=http&timeout=10000&country=all&ssl=all&anonymity=all&format=textplain',
                { timeout: 10000 }
            );
            const text = await response.text();
            const proxyList = text.trim().split('\n').filter(p => p.trim());
            proxies.push(...proxyList);
        } catch (error) {
            console.error('ProxyScrape error:', error);
        }

        // Fetch from proxy-list.download
        try {
            const response = await fetch(
                'https://www.proxy-list.download/api/v1/get?type=http',
                { timeout: 10000 }
            );
            const text = await response.text();
            const proxyList = text.trim().split('\n').filter(p => p.trim());
            proxies.push(...proxyList);
        } catch (error) {
            console.error('proxy-list.download error:', error);
        }

        // Remove duplicates and invalid entries
        const uniqueProxies = [...new Set(proxies)]
            .filter(p => {
                const parts = p.split(':');
                return parts.length === 2 && !isNaN(parts[1]);
            })
            .slice(0, 100); // Limit to 100 proxies

        res.status(200).json({
            success: true,
            proxies: uniqueProxies,
            count: uniqueProxies.length,
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
