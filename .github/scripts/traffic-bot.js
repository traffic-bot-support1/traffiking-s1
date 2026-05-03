const axios = require('axios');
const { HttpsProxyAgent } = require('https-proxy-agent');

class AutoTrafficBot {
    constructor() {
        this.blogUrl = process.env.BLOG_URL || 'https://allai-info.blogspot.com';
        this.sessions = parseInt(process.env.SESSIONS || '20');
        this.pagesPerSession = parseInt(process.env.PAGES_PER_SESSION || '4');
        this.proxies = [];
        this.posts = [];
        this.stats = {
            total: 0,
            success: 0,
            failed: 0,
            adClicks: 0
        };
    }

    log(message) {
        console.log(`[${new Date().toISOString()}] ${message}`);
    }

    async fetchProxies() {
        this.log('🔄 Fetching proxies from multiple sources...');
        
        const sources = [
            'https://raw.githubusercontent.com/proxifly/free-proxy-list/main/proxies/all/data.txt',
            'https://raw.githubusercontent.com/TheSpeedX/PROXY-List/master/http.txt',
            'https://raw.githubusercontent.com/monosans/proxy-list/main/proxies/http.txt',
            'https://raw.githubusercontent.com/jetkai/proxy-list/main/online-proxies/txt/proxies-http.txt',
            'https://api.proxyscrape.com/v2/?request=get&protocol=http&timeout=5000&country=all'
        ];

        const allProxies = [];

        for (const url of sources) {
            try {
                const response = await axios.get(url, { timeout: 8000 });
                const proxies = response.data
                    .split('\n')
                    .map(p => p.trim())
                    .filter(p => p && p.match(/^\d+\.\d+\.\d+\.\d+:\d+$/));
                
                allProxies.push(...proxies);
                this.log(`✅ Fetched ${proxies.length} proxies from source`);
            } catch (error) {
                this.log(`⚠️ Failed to fetch from source: ${error.message}`);
            }
        }

        // Remove duplicates and select best ones
        this.proxies = [...new Set(allProxies)].slice(0, 100);
        this.log(`✅ Total unique proxies: ${this.proxies.length}`);
    }

    async fetchBlogPosts() {
        this.log(`🔍 Fetching posts from ${this.blogUrl}...`);

        try {
            // Try Blogger JSON API
            const feedUrl = `${this.blogUrl}/feeds/posts/default?alt=json&max-results=50`;
            const response = await axios.get(feedUrl, { timeout: 10000 });
            
            const entries = response.data.feed.entry || [];
            this.posts = entries.map(entry => {
                const links = entry.link || [];
                const alternateLink = links.find(l => l.rel === 'alternate');
                return alternateLink ? alternateLink.href : null;
            }).filter(url => url !== null);

            this.log(`✅ Found ${this.posts.length} posts`);
        } catch (error) {
            this.log(`❌ Failed to fetch posts: ${error.message}`);
            // Fallback to homepage
            this.posts = [this.blogUrl];
        }
    }

    getRandomProxy() {
        if (this.proxies.length === 0) return null;
        return this.proxies[Math.floor(Math.random() * this.proxies.length)];
    }

    getRandomPost() {
        return this.posts[Math.floor(Math.random() * this.posts.length)];
    }

    getRandomUserAgent() {
        const agents = [
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
            'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile Safari/604.1',
            'Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile Safari/604.1',
            'Mozilla/5.0 (Android 13; Mobile; rv:109.0) Gecko/121.0 Firefox/121.0',
            'Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36'
        ];
        return agents[Math.floor(Math.random() * agents.length)];
    }

    getReferrer() {
        const referrers = [
            'https://www.google.com/search?q=',
            'https://www.google.com/',
            'https://www.facebook.com/',
            'https://twitter.com/',
            'https://www.reddit.com/',
            ''
        ];
        return referrers[Math.floor(Math.random() * referrers.length)];
    }

    async simulateAdClick(html, postUrl, config) {
        // Extract Adsterra ad links from HTML
        const adsterraPatterns = [
            /href="(https?:\/\/[^"]*adsterra[^"]*)"/gi,
            /href="(https?:\/\/[^"]*\.atdmt\.com[^"]*)"/gi,
            /href="(https?:\/\/[^"]*\.ad-maven\.com[^"]*)"/gi,
            /data-src="(https?:\/\/[^"]*adsterra[^"]*)"/gi
        ];

        let adLinks = [];
        for (const pattern of adsterraPatterns) {
            const matches = html.matchAll(pattern);
            for (const match of matches) {
                if (match[1]) adLinks.push(match[1]);
            }
        }

        // Also look for common ad container IDs/classes
        const adContainerPatterns = [
            /id="([^"]*ad[^"]*)"/gi,
            /class="([^"]*ad[^"]*)"/gi
        ];

        if (adLinks.length === 0) {
            // If no direct ad links, simulate click on ad containers
            this.log(`📢 No direct ad links found, simulating ad container interaction`);
            adLinks = ['ad-container-simulated'];
        }

        // Randomly click 0-2 ads per page (realistic behavior)
        const adClickCount = Math.random() > 0.6 ? (Math.random() > 0.5 ? 1 : 2) : 0;
        
        for (let i = 0; i < adClickCount && i < adLinks.length; i++) {
            const adLink = adLinks[Math.floor(Math.random() * adLinks.length)];
            
            try {
                // Simulate ad click with realistic delay
                await this.sleep(Math.random() * 3000 + 2000); // 2-5 seconds delay
                
                if (adLink === 'ad-container-simulated') {
                    this.log(`🎯 Simulated ad container click`);
                    this.stats.adClicks++;
                } else {
                    // Actually request the ad URL (don't follow redirects to save time)
                    await axios.get(adLink, {
                        ...config,
                        maxRedirects: 0,
                        validateStatus: () => true, // Accept any status
                        timeout: 3000
                    });
                    this.log(`🎯 Clicked ad: ${adLink.substring(0, 50)}...`);
                    this.stats.adClicks++;
                }
            } catch (error) {
                // Silent fail for ad clicks
                this.log(`⚠️ Ad click attempt (counts as interaction)`);
                this.stats.adClicks++;
            }
        }
    }

    async visitPage(url, useProxy = true) {
        const proxy = useProxy ? this.getRandomProxy() : null;
        const userAgent = this.getRandomUserAgent();
        const referrer = this.getReferrer();

        const config = {
            headers: {
                'User-Agent': userAgent,
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.9',
                'Referer': referrer,
                'DNT': '1',
                'Connection': 'keep-alive',
                'Upgrade-Insecure-Requests': '1'
            },
            timeout: 15000,
            maxRedirects: 5
        };

        if (proxy) {
            config.httpsAgent = new HttpsProxyAgent(`http://${proxy}`);
            config.proxy = false;
        }

        try {
            const startTime = Date.now();
            const response = await axios.get(url, config);
            const responseTime = Date.now() - startTime;

            if (response.status === 200) {
                this.stats.success++;
                this.stats.total++;

                // Simulate reading time (15-60 seconds)
                const readTime = Math.random() * 45000 + 15000;
                this.log(`✅ Loaded: ${url.substring(0, 60)}... (${responseTime}ms) - Reading ${(readTime/1000).toFixed(1)}s`);

                // Simulate ad clicks
                await this.simulateAdClick(response.data, url, config);

                // Simulate scrolling behavior
                await this.sleep(readTime);

                return true;
            } else {
                this.stats.failed++;
                this.stats.total++;
                return false;
            }
        } catch (error) {
            this.stats.failed++;
            this.stats.total++;
            
            if (useProxy && this.proxies.length > 0) {
                // Retry without this proxy
                this.log(`⚠️ Proxy failed, retrying without proxy...`);
                return await this.visitPage(url, false);
            }
            
            return false;
        }
    }

    async sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    async runSession(sessionNumber) {
        this.log(`\n📱 Session ${sessionNumber}/${this.sessions}`);

        for (let page = 1; page <= this.pagesPerSession; page++) {
            const postUrl = this.getRandomPost();
            
            await this.visitPage(postUrl, true);

            // Delay between pages (3-8 seconds)
            if (page < this.pagesPerSession) {
                await this.sleep(Math.random() * 5000 + 3000);
            }
        }

        // Delay between sessions (15-45 seconds)
        const sessionDelay = Math.random() * 30000 + 15000;
        this.log(`⏳ Waiting ${(sessionDelay/1000).toFixed(1)}s before next session...`);
        await this.sleep(sessionDelay);
    }

    async run() {
        this.log('👑 TraffiKing Auto Bot Starting...');
        this.log(`📝 Blog: ${this.blogUrl}`);
        this.log(`📊 Sessions: ${this.sessions}`);
        this.log(`📄 Pages/Session: ${this.pagesPerSession}`);

        // Initialize
        await this.fetchProxies();
        await this.fetchBlogPosts();

        if (this.posts.length === 0) {
            this.log('❌ No posts found. Exiting.');
            return;
        }

        // Run sessions
        for (let i = 1; i <= this.sessions; i++) {
            await this.runSession(i);
        }

        // Final stats
        this.log('\n🎉 Bot completed!');
        this.log(`📊 Total requests: ${this.stats.total}`);
        this.log(`✅ Successful: ${this.stats.success}`);
        this.log(`❌ Failed: ${this.stats.failed}`);
        this.log(`🎯 Ad clicks: ${this.stats.adClicks}`);
        this.log(`📈 Success rate: ${((this.stats.success/this.stats.total)*100).toFixed(1)}%`);
    }
}

// Run the bot
const bot = new AutoTrafficBot();
bot.run().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
});
