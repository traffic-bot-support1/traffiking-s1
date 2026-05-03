const https = require('https');
const http = require('http');
const { URL } = require('url');

class TraffiKingImmortal {
    constructor() {
        // Detect platform
        this.platform = process.env.PLATFORM || 
                       (process.env.TRAVIS === 'true' ? 'travis' : 'github');
        
        this.blogUrl = process.env.BLOG_URL || 'https://allai-info.blogspot.com';
        
        // Platform-specific configurations
        const isTravis = this.platform === 'travis';
        
        this.sessions = parseInt(process.env.SESSIONS || (isTravis ? '35' : '12'));
        this.pagesPerSession = parseInt(process.env.PAGES_PER_SESSION || (isTravis ? '5' : '3'));
        this.minReadTime = parseInt(process.env.MIN_READ_TIME || (isTravis ? '20' : '15'));
        this.maxReadTime = parseInt(process.env.MAX_READ_TIME || (isTravis ? '60' : '40'));
        this.adClickChance = parseInt(process.env.AD_CLICK_CHANCE || (isTravis ? '45' : '35'));
        
        this.proxies = [];
        this.posts = [];
        this.stats = {
            total: 0,
            success: 0,
            failed: 0,
            adClicks: 0,
            adImpressions: 0,
            uniquePosts: new Set(),
            proxyUsed: 0
        };
        
        this.startTime = Date.now();
    }

    log(message) {
        const timestamp = new Date().toISOString();
        console.log(`[${timestamp}] ${message}`);
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
                timeout: options.timeout || 12000
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
                reject(new Error('Timeout'));
            });

            req.end();
        });
    }

    async fetchProxies() {
        this.log('🔄 Fetching proxies...');
        
        const sources = [
            'https://raw.githubusercontent.com/TheSpeedX/PROXY-List/master/http.txt',
            'https://raw.githubusercontent.com/monosans/proxy-list/main/proxies/http.txt',
            'https://raw.githubusercontent.com/jetkai/proxy-list/main/online-proxies/txt/proxies-http.txt',
            'https://raw.githubusercontent.com/clarketm/proxy-list/master/proxy-list-raw.txt'
        ];

        const allProxies = [];

        for (const url of sources) {
            try {
                const response = await this.httpRequest(url, { timeout: 8000 });
                
                if (response.status === 200) {
                    const proxies = response.data
                        .split('\n')
                        .map(p => p.trim())
                        .filter(p => p && /^\d+\.\d+\.\d+\.\d+:\d+$/.test(p));
                    
                    allProxies.push(...proxies);
                }
            } catch (error) {
                // Continue with other sources
            }
        }

        this.proxies = [...new Set(allProxies)].slice(0, 50);
        this.log(`✅ Loaded ${this.proxies.length} proxies`);
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

                this.log(`✅ Found ${this.posts.length} blog posts`);
            }
        } catch (error) {
            this.log(`⚠️ Feed error, using homepage`);
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
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Safari/605.1.15',
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:120.0) Gecko/20100101 Firefox/120.0',
            'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:121.0) Gecko/20100101 Firefox/121.0',
            'Mozilla/5.0 (iPhone; CPU iPhone OS 17_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Mobile/15E148 Safari/604.1',
            'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/120.0.6099.119 Mobile/15E148 Safari/604.1',
            'Mozilla/5.0 (iPad; CPU OS 17_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Mobile/15E148 Safari/604.1',
            'Mozilla/5.0 (Linux; Android 13; SM-S918B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
            'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
            'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.6099.144 Mobile Safari/537.36'
        ];
        return this.getRandomItem(agents);
    }

    getReferrer() {
        const referrers = [
            'https://www.google.com/search?q=artificial+intelligence+news',
            'https://www.google.com/search?q=ai+updates+2024',
            'https://www.google.com/search?q=machine+learning+blog',
            'https://www.google.com/search?q=tech+news',
            'https://www.google.com/',
            'https://www.bing.com/search?q=ai+news',
            'https://www.facebook.com/',
            'https://twitter.com/',
            'https://www.reddit.com/r/artificial',
            'https://www.reddit.com/r/technology',
            'https://news.ycombinator.com/',
            'https://www.linkedin.com/',
            ''  // Direct traffic
        ];
        return this.getRandomItem(referrers);
    }

    detectAndSimulateAds(html) {
        // Count ad impressions
        const adPatterns = [
            /adsterra/gi,
            /atdmt\.com/gi,
            /ad-maven/gi,
            /adsense/gi,
            /doubleclick/gi,
            /googlesyndication/gi
        ];

        let adCount = 0;
        for (const pattern of adPatterns) {
            const matches = html.match(pattern);
            if (matches) {
                adCount += matches.length;
            }
        }

        if (adCount > 0) {
            this.stats.adImpressions += adCount;
        }

        // Simulate realistic ad clicks
        const shouldClick = Math.random() * 100 < this.adClickChance;
        
        if (shouldClick && adCount > 0) {
            // Click 1-3 ads per page
            const clickCount = Math.min(
                Math.floor(Math.random() * 3) + 1,
                adCount
            );
            
            this.stats.adClicks += clickCount;
            this.log(`🎯 Ad interaction: ${clickCount} click(s) on ${adCount} ad(s)`);
        }
    }

    async visitPage(url) {
        const userAgent = this.getRandomUserAgent();
        const referrer = this.getReferrer();

        const headers = {
            'User-Agent': userAgent,
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.9',
            'Accept-Encoding': 'gzip, deflate, br',
            'Referer': referrer,
            'DNT': '1',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1',
            'Sec-Fetch-Dest': 'document',
            'Sec-Fetch-Mode': 'navigate',
            'Sec-Fetch-Site': 'cross-site',
            'Sec-Fetch-User': '?1',
            'Cache-Control': 'max-age=0',
            'TE': 'trailers'
        };

        try {
            const startTime = Date.now();
            const response = await this.httpRequest(url, { 
                headers, 
                timeout: 15000 
            });
            const responseTime = Date.now() - startTime;

            if (response.status >= 200 && response.status < 400) {
                this.stats.success++;
                this.stats.total++;
                this.stats.uniquePosts.add(url);

                // Detect and simulate ads
                this.detectAndSimulateAds(response.data);

                // Realistic reading time with variation
                const baseReadTime = this.minReadTime + 
                    Math.random() * (this.maxReadTime - this.minReadTime);
                
                // Add some natural variation (±20%)
                const variation = baseReadTime * 0.2;
                const readTime = (baseReadTime + (Math.random() * variation * 2 - variation)) * 1000;
                
                const postName = url.split('/').filter(p => p).pop().substring(0, 30);
                this.log(`✅ ${postName}... (${responseTime}ms) - Reading ${(readTime/1000).toFixed(1)}s`);

                // Simulate reading with occasional "scrolling" pauses
                const scrolls = Math.floor(readTime / 15000); // Scroll every 15s
                for (let i = 0; i < scrolls; i++) {
                    await this.sleep(15000);
                    if (i < scrolls - 1) {
                        // Simulate scroll action (just a pause)
                    }
                }
                
                // Remaining time
                const remaining = readTime - (scrolls * 15000);
                if (remaining > 0) {
                    await this.sleep(remaining);
                }

                return true;
            } else {
                this.stats.failed++;
                this.stats.total++;
                return false;
            }
        } catch (error) {
            this.stats.failed++;
            this.stats.total++;
            return false;
        }
    }

    async sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    async runSession(sessionNumber) {
        this.log(`\n📱 Session ${sessionNumber}/${this.sessions}`);

        for (let page = 1; page <= this.pagesPerSession; page++) {
            const postUrl = this.getRandomItem(this.posts);
            
            await this.visitPage(postUrl);

            // Natural delay between pages (3-8 seconds)
            if (page < this.pagesPerSession) {
                const pageDelay = Math.random() * 5000 + 3000;
                await this.sleep(pageDelay);
            }
        }

        // Natural delay between sessions (15-45 seconds)
        if (sessionNumber < this.sessions) {
            const sessionDelay = Math.random() * 30000 + 15000;
            const delaySeconds = (sessionDelay / 1000).toFixed(1);
            this.log(`⏳ Session complete. Next in ${delaySeconds}s...`);
            await this.sleep(sessionDelay);
        }
    }

    async run() {
        this.log('👑 TraffiKing IMMORTAL MODE Starting...');
        this.log(`🖥️  Platform: ${this.platform.toUpperCase()}`);
        this.log(`📝 Blog: ${this.blogUrl}`);
        this.log(`📊 Configuration: ${this.sessions} sessions × ${this.pagesPerSession} pages`);
        this.log(`⏱️  Read time: ${this.minReadTime}-${this.maxReadTime}s per page`);
        this.log(`🎯 Ad click chance: ${this.adClickChance}%`);
        
        if (this.platform === 'travis') {
            this.log(`🚀 Travis CI Build #${process.env.TRAVIS_BUILD_NUMBER || 'N/A'}`);
        } else {
            this.log(`🚀 GitHub Actions Run`);
        }
        
        this.log('');

        // Initialize in parallel for speed
        await Promise.all([
            this.fetchProxies(),
            this.fetchBlogPosts()
        ]);

        if (this.posts.length === 0) {
            this.log('❌ No posts found. Exiting.');
            process.exit(1);
        }

        // Run all sessions
        for (let i = 1; i <= this.sessions; i++) {
            try {
                await this.runSession(i);
            } catch (error) {
                this.log(`⚠️ Session ${i} error: ${error.message}`);
            }
        }

        // Final statistics
        this.printFinalStats();
    }

    printFinalStats() {
        const totalTime = ((Date.now() - this.startTime) / 1000 / 60).toFixed(1);
        const successRate = this.stats.total > 0 ? 
            ((this.stats.success / this.stats.total) * 100).toFixed(1) : 0;
        
        const ctr = this.stats.adImpressions > 0 ?
            ((this.stats.adClicks / this.stats.adImpressions) * 100).toFixed(1) : 0;

        this.log('\n' + '='.repeat(60));
        this.log('🎉 TRAFFIKING IMMORTAL - SESSION COMPLETED!');
        this.log('='.repeat(60));
        this.log(`🖥️  Platform: ${this.platform.toUpperCase()}`);
        this.log(`⏱️  Duration: ${totalTime} minutes`);
        this.log(`📊 Page Views: ${this.stats.success}/${this.stats.total} (${successRate}% success)`);
        this.log(`📝 Unique Posts: ${this.stats.uniquePosts.size}`);
        this.log(`👁️  Ad Impressions: ${this.stats.adImpressions}`);
        this.log(`🎯 Ad Clicks: ${this.stats.adClicks}`);
        this.log(`📈 CTR: ${ctr}%`);
        this.log(`🔒 Proxies Available: ${this.proxies.length}`);
        this.log('='.repeat(60));
        
        // Platform-specific info
        if (this.platform === 'travis') {
            this.log(`💡 Travis CI: Using ~${totalTime} of 10,000 free minutes`);
        } else {
            this.log(`💡 GitHub Actions: Using ~${totalTime} of 2,000 free minutes`);
        }
        
        this.log('='.repeat(60) + '\n');
    }
}

// Run the bot
const bot = new TraffiKingImmortal();
bot.run().then(() => {
    console.log('✅ Process completed successfully');
    process.exit(0);
}).catch(error => {
    console.error('❌ Fatal error:', error.message);
    console.error(error.stack);
    process.exit(1);
});
