export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    try {
        const { blogUrl } = req.method === 'POST' ? req.body : req.query;

        if (!blogUrl) {
            return res.status(400).json({ 
                success: false, 
                error: 'Blog URL is required' 
            });
        }

        // Extract blog ID from URL
        const blogDomain = blogUrl.replace('https://', '').replace('http://', '').split('/')[0];
        
        // Try to fetch the main page first
        const response = await fetch(blogUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        });

        if (!response.ok) {
            throw new Error('Failed to fetch blog');
        }

        const html = await response.text();
        
        // Extract post URLs using regex
        const postUrlRegex = new RegExp(`https?://${blogDomain.replace('.', '\\.')}/\\d{4}/\\d{2}/[^"'\\s]+\\.html`, 'g');
        const matches = html.match(postUrlRegex);
        
        if (!matches || matches.length === 0) {
            // Try alternative Blogspot feeds API
            const feedUrl = `${blogUrl}/feeds/posts/default?alt=json&max-results=50`;
            
            try {
                const feedResponse = await fetch(feedUrl);
                const feedData = await feedResponse.json();
                
                const posts = feedData.feed.entry || [];
                const postUrls = posts.map(entry => {
                    const links = entry.link || [];
                    const alternateLink = links.find(l => l.rel === 'alternate');
                    return alternateLink ? alternateLink.href : null;
                }).filter(url => url !== null);

                if (postUrls.length > 0) {
                    return res.status(200).json({
                        success: true,
                        posts: [...new Set(postUrls)],
                        count: postUrls.length,
                        source: 'Blogspot JSON Feed',
                        blogUrl: blogUrl
                    });
                }
            } catch (feedError) {
                console.error('Feed fetch error:', feedError);
            }

            return res.status(200).json({
                success: false,
                error: 'No posts found on this blog',
                posts: [],
                count: 0
            });
        }

        // Remove duplicates
        const uniquePosts = [...new Set(matches)];

        res.status(200).json({
            success: true,
            posts: uniquePosts,
            count: uniquePosts.length,
            source: 'HTML Scraping',
            blogUrl: blogUrl,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message,
            posts: [],
            count: 0
        });
    }
}
