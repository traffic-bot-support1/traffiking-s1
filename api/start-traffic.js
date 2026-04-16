export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ success: false, error: 'Method not allowed' });
    }

    try {
        const { url, proxy, userAgent } = req.body;

        if (!url) {
            return res.status(400).json({ success: false, error: 'URL is required' });
        }

        const headers = {
            'User-Agent': userAgent || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.9',
            'Accept-Encoding': 'gzip, deflate, br',
            'DNT': '1',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1',
            'Sec-Fetch-Dest': 'document',
            'Sec-Fetch-Mode': 'navigate',
            'Sec-Fetch-Site': 'none',
            'Cache-Control': 'max-age=0'
        };

        const fetchOptions = {
            method: 'GET',
            headers: headers,
            redirect: 'follow'
        };

        // Note: Vercel Edge Functions don't support proxy agents in the traditional sense
        // For production with proxies, you'd need a different approach or use a proxy service
        
        const startTime = Date.now();
        
        try {
            const response = await fetch(url, fetchOptions);
            const responseTime = Date.now() - startTime;

            if (response.ok) {
                return res.status(200).json({
                    success: true,
                    status: response.status,
                    responseTime: responseTime,
                    proxy: proxy || 'direct',
                    timestamp: new Date().toISOString()
                });
            } else {
                return res.status(200).json({
                    success: false,
                    error: `HTTP ${response.status}`,
                    responseTime: responseTime,
                    proxy: proxy || 'direct'
                });
            }
        } catch (fetchError) {
            const responseTime = Date.now() - startTime;
            return res.status(200).json({
                success: false,
                error: fetchError.message,
                responseTime: responseTime,
                proxy: proxy || 'direct'
            });
        }
    } catch (error) {
        return res.status(500).json({
            success: false,
            error: error.message
        });
    }
}
