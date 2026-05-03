const https = require('https');
const http = require('http');
const { URL } = require('url');

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

    async httpRequest(url, options = {}) {
        return new Promise((resolve, reject) => {
            const urlObj = new URL(url);
            const protocol = urlObj.protocol === 'https:' ? https : http;
            
            const requestOptions = {
                hostname: urlObj.hostname,
                port: urlObj.port || (urlObj.protocol === 'https:' ? 443 : 80),
                path: urlObj.pathname + urlObj.search,
                method: options.method || 'GET',
                headers: options.headers || {},
                timeout: options.timeout || 15000
            };

            const req = protocol.request(requestOptions, (res) => {
                let data = '';
                
                res.on('data', (chunk) => {
                    data += chunk;
                });
                
                res.on('end', () => {
                    resolve({
                        status: res.statusCode,
                        data: data,
                        headers: res.headers
                    });
                });
            });

            req.on('error', reject);
            req.on('timeout', () => {
                req.destroy();
                reject(new Error('Request timeout'));
            });

            req.end();
        });
    }

    async fetchProxies() {
        this.log('🔄 Fetching proxies from multiple sources...');
        
        const sources = [
            'https://raw.githubusercontent.com/TheSpeedX/PROXY-List/master/http.txt',
            'https://raw.githubusercontent.com/monosans/proxy-list/main/proxies/http.txt',
            'https://raw.githubusercontent.com/jetkai/proxy-list/main/online-proxies/txt/proxies-http.txt',
            'https://raw.githubusercontent.com/clarketm/proxy-list/master/proxy-list-raw.txt'
        ];

        const allProxies = [];

        for (const url of sources) {
            try {
                const response = await this.httpRequest(url, { timeout: 10000 });
                
                if (response.status === 200) {
                    const proxies = response.data
                        .split('\n')
                        .map(p => p.trim())
                        .filter(p => p && /^\d+\.\d+\.\d+\.\d+:\d+$/.test(p));
                    
                    allProxies.push(...proxies);
                    this.log(`✅ Fetched ${proxies.length} proxies from source`);
                }
            } catch (error) {
                this.log(`⚠️ Failed to fetch from source: ${error.message}`);
            }
        }

        // Remove duplicates and limit
        this.proxies = [...new Set(allProxies)].slice(0, 50);
        this.log(`✅ Total unique proxies loaded: ${this.proxies.length}`);
    }

    async fetchBlogPosts() {
        this.log(`🔍 Fetching posts from ${this.blogUrl}...`);

        try {
            const feedUrl = `${this.blogUrl}/feeds/posts/default?alt=json&max-results=50`;
            const response = await this.httpRequest(feedUrl, { timeout: 10000 });
            
            if (response.status === 200) {
                const data = JSON.parse(response.data);
                const entries = data.feed.entry || [];
                
                this.posts = entries.map(entry => {
                    const links = entry.link || [];
                    const alternateLink = links.find(l => l.rel === 'alternate');
                    return alternateLink ? alternateLink.href : null;
                }).filter(url => url !== null);

                this.log(`✅ Found ${this.posts.length} posts`);
            }
        } catch (error) {
            this.log(`⚠️ Failed to fetch posts, using homepage: ${error.message}`);
            this.posts = [this.blogUrl];
        }

        if (this.posts.length === 0) {
            this.posts = [this.blogUrl];
        }
    }

    getRandomItem(array) {
        return array[Math.floor(Math.random() * array.length)];
    }

    getRandomUserAgent() {
        const agents = [
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
            'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile Safari/604.1',
            'Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36'
        ];
        return this.getRandomItem(agents);
    }

    getReferrer() {
        const referrers = [
            'https://www.google.com/search?q=blog',
            'https://www.google.com/',
            'https://www.facebook.com/',
            'https://twitter.com/',
            ''
        ];
        return this.getRandomItem(referrers);
    }

    simulateAdInteraction(html) {
        // Look for ad patterns in HTML
        const adPatterns = [
            /adsterra/gi,
            /atdmt\.com/gi,
            /ad-maven/gi,
            /banner/gi,
            /advertisement/gi
        ];

        let hasAds = false;
        for (const pattern of adPatterns) {
            if (pattern.test(html)) {
                hasAds = true;
                break;
            }
        }

        // Simulate 0-2 ad clicks per page (30% chance per ad)
        if (hasAds && Math.random() > 0.3) {
            const clicks = Math.random() > 0.7 ? 2 : 1;
            this.stats.adClicks += clicks;
            this.log(`🎯 Simulated ${clicks} ad interaction(s)`);
        }
    }

    async visitPage(url) {
        const userAgent = this.getRandomUserAgent();
        const referrer = this.getReferrer();

        const headers = {
            'User-Agent': userAgent,
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.9',
            'Accept-Encoding': 'gzip, deflate',
            'Referer': referrer,
            'DNT': '1',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1',
            'Cache-Control': 'max-age=0'
        };

        try {
            const startTime = Date.now();
            const response = await this.httpRequest(url, { 
                headers, 
                timeout: 15000 
            });
            const responseTime = Date.now() - startTime;

            if (response.status === 200 || response.status === 301 || response.status === 302) {
                this.stats.success++;
                this.stats.total++;

                // Simulate ad interaction
                this.simulateAdInteraction(response.data);

                // Simulate reading time (20-60 seconds)
                const readTime = Math.random() * 40000 + 20000;
                this.log(`✅ Loaded: ${url.substring(0, 60)}... (${responseTime}ms) - Reading ${(readTime/1000).toFixed(1)}s`);

                await this.sleep(readTime);
                return true;
            } else {
                this.stats.failed++;
                this.stats.total++;
                this.log(`⚠️ Failed: ${url} (Status: ${response.status})`);
                return false;
            }
        } catch (error) {
            this.stats.failed++;
            this.stats.total++;
            this.log(`❌ Error: ${error.message}`);
            return false;
        }
    }

    async sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    async runSession(sessionNumber) {
        this.log(`\n📱 Session ${sessionNumber}/${this.sessions} started`);

        for (let page = 1; page <= this.pagesPerSession; page++) {
            const postUrl = this.getRandomItem(this.posts);
            
            this.log(`📄 Page ${page}/${this.pagesPerSession}: ${postUrl.substring(0, 50)}...`);
            await this.visitPage(postUrl);

            // Delay between pages (3-8 seconds)
            if (page < this.pagesPerSession) {
                const pageDelay = Math.random() * 5000 + 3000;
                await this.sleep(pageDelay);
            }
        }

        // Delay between sessions (20-60 seconds)
        if (sessionNumber < this.sessions) {
            const sessionDelay = Math.random() * 40000 + 20000;
            this.log(`⏳ Session complete. Waiting ${(sessionDelay/1000).toFixed(1)}s...`);
            await this.sleep(sessionDelay);
        }
    }

    async run() {
        this.log('👑 TraffiKing Auto Bot Starting...');
        this.log(`📝 Blog: ${this.blogUrl}`);
        this.log(`📊 Sessions: ${this.sessions}`);
        this.log(`📄 Pages/Session: ${this.pagesPerSession}\n`);

        const startTime = Date.now();

        // Initialize
        await this.fetchProxies();
        await this.fetchBlogPosts();

        if (this.posts.length === 0) {
            this.log('❌ No posts found. Exiting.');
            process.exit(1);
        }

        // Run sessions
        for (let i = 1; i <= this.sessions; i++) {
            try {
                await this.runSession(i);
            } catch (error) {
                this.log(`❌ Session ${i} error: ${error.message}`);
            }
        }

        const totalTime = ((Date.now() - startTime) / 1000 / 60).toFixed(1);

        // Final stats
        this.log('\n' + '='.repeat(60));
        this.log('🎉 Bot Completed Successfully!');
        this.log('='.repeat(60));
        this.log(`⏱️  Total time: ${totalTime} minutes`);
        this.log(`📊 Total requests: ${this.stats.total}`);
        this.log(`✅ Successful: ${this.stats.success}`);
        this.log(`❌ Failed: ${this.stats.failed}`);
        this.log(`🎯 Ad interactions: ${this.stats.adClicks}`);
        this.log(`📈 Success rate: ${this.stats.total > 0 ? ((this.stats.success/this.stats.total)*100).toFixed(1) : 0}%`);
        this.log(`📝 Unique posts visited: ${this.posts.length}`);
        this.log('='.repeat(60));
    }
}

// Run the bot
const bot = new AutoTrafficBot();
bot.run().then(() => {
    console.log('✅ Process completed');
    process.exit(0);
}).catch(error => {
    console.error('❌ Fatal error:', error.message);
    process.exit(1);
});
