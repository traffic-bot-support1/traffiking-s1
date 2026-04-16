class TraffiKing {
    constructor() {
        this.isRunning = false;
        this.stats = {
            total: 0,
            success: 0,
            failed: 0,
            responseTimes: [],
            postsVisited: new Set(),
            engagementTime: 0
        };
        this.proxies = [];
        this.targetUrls = [];
        
        this.initializeElements();
        this.attachEventListeners();
        this.showWelcomeMessage();
    }

    initializeElements() {
        // Form elements
        this.trafficMode = document.getElementById('trafficMode');
        this.targetUrl = document.getElementById('targetUrl');
        this.additionalUrls = document.getElementById('additionalUrls');
        this.sessions = document.getElementById('sessions');
        this.pagesPerSession = document.getElementById('pagesPerSession');
        this.timeOnPage = document.getElementById('timeOnPage');
        this.scrollDepth = document.getElementById('scrollDepth');
        this.delayMin = document.getElementById('delayMin');
        this.delayMax = document.getElementById('delayMax');
        this.referrerType = document.getElementById('referrerType');
        this.proxyList = document.getElementById('proxyList');
        this.testProxies = document.getElementById('testProxies');
        this.randomTiming = document.getElementById('randomTiming');
        this.followLinks = document.getElementById('followLinks');
        this.rotateUserAgents = document.getElementById('rotateUserAgents');
        this.simulateClicks = document.getElementById('simulateClicks');
        this.simulateScroll = document.getElementById('simulateScroll');
        this.varyReadingTime = document.getElementById('varyReadingTime');
        this.visitRelatedPosts = document.getElementById('visitRelatedPosts');

        // Buttons
        this.fetchProxiesBtn = document.getElementById('fetchProxiesBtn');
        this.startBtn = document.getElementById('startBtn');
        this.stopBtn = document.getElementById('stopBtn');
        this.clearLogsBtn = document.getElementById('clearLogsBtn');

        // Status elements
        this.statusPanel = document.getElementById('statusPanel');
        this.statusText = document.getElementById('statusText');
        this.progressText = document.getElementById('progressText');
        this.successRate = document.getElementById('successRate');
        this.activeProxies = document.getElementById('activeProxies');
        this.progressFill = document.getElementById('progressFill');

        // Logs
        this.logsPanel = document.getElementById('logsPanel');
        this.logs = document.getElementById('logs');

        // Stats
        this.statsPanel = document.getElementById('statsPanel');
        this.totalRequests = document.getElementById('totalRequests');
        this.successfulRequests = document.getElementById('successfulRequests');
        this.failedRequests = document.getElementById('failedRequests');
        this.avgResponseTime = document.getElementById('avgResponseTime');

        // Proxy stats
        this.proxyStatsPanel = document.getElementById('proxyStatsPanel');
        this.proxyStats = document.getElementById('proxyStats');
    }

    attachEventListeners() {
        // Traffic mode change
        this.trafficMode.addEventListener('change', () => this.handleTrafficModeChange());

        // Proxy source radio buttons
        document.querySelectorAll('input[name="proxySource"]').forEach(radio => {
            radio.addEventListener('change', (e) => this.handleProxySourceChange(e));
        });

        // Buttons
        this.fetchProxiesBtn.addEventListener('click', () => this.fetchFreeProxies());
        this.startBtn.addEventListener('click', () => this.startTrafficGeneration());
        this.stopBtn.addEventListener('click', () => this.stopTrafficGeneration());
        this.clearLogsBtn.addEventListener('click', () => this.clearLogs());
    }

    handleTrafficModeChange() {
        const mode = this.trafficMode.value;
        const multipleSection = document.getElementById('multipleUrlsSection');
        
        if (mode === 'multiple') {
            multipleSection.classList.remove('hidden');
            this.targetUrl.placeholder = 'https://yourblog.blogspot.com/2024/01/main-post.html';
        } else if (mode === 'homepage') {
            multipleSection.classList.remove('hidden');
            this.targetUrl.placeholder = 'https://yourblog.blogspot.com (homepage)';
            this.additionalUrls.placeholder = 'https://yourblog.blogspot.com/2024/01/post-1.html\nhttps://yourblog.blogspot.com/2024/01/post-2.html';
        } else {
            multipleSection.classList.add('hidden');
            this.targetUrl.placeholder = 'https://yourblog.blogspot.com/2024/01/your-post.html';
        }
    }

    showWelcomeMessage() {
        console.log('%c👑 TraffiKing v2.0 - Post-Specific Edition', 'color: #6366f1; font-size: 24px; font-weight: bold;');
        console.log('%cProfessional Post-Level Traffic Generator', 'color: #8b5cf6; font-size: 14px;');
        console.log('%c⚠️ Educational Use Only - Test on Your Own Posts', 'color: #f59e0b; font-size: 12px;');
    }

    handleProxySourceChange(e) {
        const manualSection = document.getElementById('manualProxySection');
        if (e.target.value === 'manual') {
            manualSection.classList.remove('hidden');
        } else {
            manualSection.classList.add('hidden');
        }
    }

    async fetchFreeProxies() {
        this.addLog('info', '🔄 Fetching free proxies from public sources...');
        this.fetchProxiesBtn.disabled = true;
        this.fetchProxiesBtn.textContent = '⏳ Fetching...';

        try {
            const response = await fetch('/api/fetch-proxies');
            const data = await response.json();

            if (data.success && data.proxies.length > 0) {
                this.proxies = data.proxies;
                this.proxyList.value = data.proxies.join('\n');
                this.addLog('success', `✅ Successfully fetched ${data.proxies.length} proxies!`);
                this.activeProxies.textContent = data.proxies.length;
                
                // Auto-select manual mode
                document.querySelector('input[name="proxySource"][value="manual"]').checked = true;
                document.getElementById('manualProxySection').classList.remove('hidden');
            } else {
                this.addLog('error', '❌ No proxies found. Try again or use manual mode.');
            }
        } catch (error) {
            this.addLog('error', '❌ Error fetching proxies: ' + error.message);
        } finally {
            this.fetchProxiesBtn.disabled = false;
            this.fetchProxiesBtn.textContent = '🔄 Fetch Free Proxies';
        }
    }

    async startTrafficGeneration() {
        if (!this.validateInputs()) {
            return;
        }

        this.isRunning = true;
        this.startBtn.classList.add('hidden');
        this.stopBtn.classList.remove('hidden');
        this.statusPanel.classList.remove('hidden');
        this.logsPanel.classList.remove('hidden');
        this.statsPanel.classList.remove('hidden');

        // Reset stats
        this.stats = {
            total: 0,
            success: 0,
            failed: 0,
            responseTimes: [],
            postsVisited: new Set(),
            engagementTime: 0
        };

        const config = this.getConfiguration();
        
        this.addLog('info', '👑 TraffiKing is starting...');
        this.addLog('info', `🎯 Traffic Mode: ${config.mode}`);
        this.addLog('info', `📝 Primary Target: ${this.truncateUrl(config.targetUrl)}`);
        
        if (config.additionalUrls.length > 0) {
            this.addLog('info', `📋 Additional Posts: ${config.additionalUrls.length} URLs`);
        }
        
        this.addLog('info', `📊 Configuration: ${config.sessions} sessions × ${config.pagesPerSession} pages`);
        
        if (config.useProxies) {
            this.addLog('info', `🔒 Using ${config.proxies.length} proxies`);
            this.proxyStatsPanel.classList.remove('hidden');
        }

        this.statusText.textContent = 'Running';
        this.statusText.style.background = 'var(--success-color)';

        try {
            await this.runTrafficGeneration(config);
        } catch (error) {
            this.addLog('error', '❌ Error: ' + error.message);
            this.stopTrafficGeneration();
        }
    }

    async runTrafficGeneration(config) {
        this.targetUrls = [config.targetUrl, ...config.additionalUrls];
        
        for (let session = 1; session <= config.sessions && this.isRunning; session++) {
            this.addLog('info', `\n📱 Session ${session}/${config.sessions} - Simulating visitor behavior`);
            
            // Choose starting URL based on mode
            let currentUrl = this.chooseStartUrl(config);
            this.addLog('info', `🌐 Starting at: ${this.truncateUrl(currentUrl)}`);
            
            for (let page = 1; page <= config.pagesPerSession && this.isRunning; page++) {
                const startTime = Date.now();
                
                try {
                    const result = await this.makeRequest(currentUrl, config);
                    const responseTime = Date.now() - startTime;
                    
                    this.stats.total++;
                    this.stats.responseTimes.push(responseTime);
                    this.stats.postsVisited.add(currentUrl);
                    
                    const proxyInfo = result.proxy ? ` [Proxy: ${result.proxy.substring(0, 15)}...]` : ' [Direct]';
                    
                    if (result.success) {
                        this.stats.success++;
                        
                        // Simulate reading time
                        const readTime = this.getReadingTime(config);
                        this.stats.engagementTime += readTime;
                        
                        this.addLog('success', `✅ Page ${page}/${config.pagesPerSession}: ${this.truncateUrl(currentUrl)} (${responseTime}ms)${proxyInfo}`);
                        this.addLog('info', `📖 Reading for ${readTime.toFixed(1)}s...`);
                        
                        await this.sleep(readTime * 1000);
                        
                        // Choose next URL
                        if (page < config.pagesPerSession) {
                            currentUrl = this.chooseNextUrl(config, currentUrl);
                        }
                    } else {
                        this.stats.failed++;
                        this.addLog('error', `❌ Page ${page}: Failed - ${result.error}${proxyInfo}`);
                    }
                    
                    this.updateStats();
                    this.updateProgress(session, config.sessions, page, config.pagesPerSession);
                    
                    // Small delay between pages
                    if (page < config.pagesPerSession && this.isRunning) {
                        const delay = this.getRandomDelay(2, 5);
                        await this.sleep(delay * 1000);
                    }
                } catch (error) {
                    this.stats.failed++;
                    this.addLog('error', `❌ Page ${page}: Error - ${error.message}`);
                    this.updateStats();
                }
            }
            
            // Delay between sessions
            if (session < config.sessions && this.isRunning) {
                const delay = this.getRandomDelay(config.delayMin, config.delayMax);
                this.addLog('info', `⏳ Waiting ${delay.toFixed(1)}s before next session...`);
                await this.sleep(delay * 1000);
            }
        }
        
        if (this.isRunning) {
            this.addLog('success', '\n🎉 Traffic generation completed successfully!');
            this.addLog('info', `📊 Final Stats: ${this.stats.success}/${this.stats.total} successful (${((this.stats.success/this.stats.total)*100).toFixed(1)}%)`);
            this.addLog('info', `📝 Unique posts visited: ${this.stats.postsVisited.size}`);
            this.addLog('info', `⏱️ Total engagement time: ${(this.stats.engagementTime/60).toFixed(1)} minutes`);
            this.stopTrafficGeneration();
        }
    }

    chooseStartUrl(config) {
        if (config.mode === 'single') {
            return config.targetUrl;
        } else if (config.mode === 'homepage') {
            // 50% chance start at homepage, 50% at a random post
            return Math.random() > 0.5 ? config.targetUrl : this.getRandomUrl(this.targetUrls);
        } else {
            // Multiple mode - random start
            return this.getRandomUrl(this.targetUrls);
        }
    }

    chooseNextUrl(config, currentUrl) {
        if (config.mode === 'single') {
            // Stay on same post or reload
            return config.targetUrl;
        } else {
            // Visit different posts
            const available = this.targetUrls.filter(url => url !== currentUrl);
            return available.length > 0 ? this.getRandomUrl(available) : currentUrl;
        }
    }

    getRandomUrl(urls) {
        return urls[Math.floor(Math.random() * urls.length)];
    }

    getReadingTime(config) {
        const baseTime = parseInt(config.timeOnPage);
        if (config.varyReadingTime) {
            // Vary by ±40%
            const variation = baseTime * 0.4;
            return baseTime + (Math.random() * variation * 2 - variation);
        }
        return baseTime;
    }

    async makeRequest(url, config) {
        try {
            const referrer = this.getReferrer(config.referrerType);
            
            const response = await fetch('/api/start-traffic', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    url: url,
                    proxy: config.useProxies ? this.getRandomProxy(config.proxies) : null,
                    userAgent: config.rotateUserAgents ? this.getRandomUserAgent() : null,
                    referrer: referrer,
                    scrollDepth: config.scrollDepth,
                    timeOnPage: config.timeOnPage
                })
            });

            const data = await response.json();
            return data;
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    getReferrer(type) {
        const referrers = {
            google: [
                'https://www.google.com/search?q=',
                'https://www.google.com/',
                'https://www.google.co.uk/search?q='
            ],
            social: [
                'https://www.facebook.com/',
                'https://twitter.com/',
                'https://www.reddit.com/',
                'https://www.pinterest.com/'
            ],
            direct: [''],
            mixed: [
                'https://www.google.com/search?q=',
                'https://www.facebook.com/',
                'https://twitter.com/',
                ''
            ]
        };

        const list = referrers[type] || referrers.mixed;
        return list[Math.floor(Math.random() * list.length)];
    }

    getConfiguration() {
        const proxySource = document.querySelector('input[name="proxySource"]:checked').value;
        let proxies = [];

        if (proxySource === 'manual') {
            proxies = this.proxyList.value.split('\n')
                .map(p => p.trim())
                .filter(p => p && !p.startsWith('#'));
        } else if (proxySource === 'auto') {
            proxies = this.proxies;
        }

        const additionalUrlsText = this.additionalUrls.value;
        const additionalUrls = additionalUrlsText
            .split('\n')
            .map(url => url.trim())
            .filter(url => url && url.startsWith('http'));

        return {
            mode: this.trafficMode.value,
            targetUrl: this.targetUrl.value,
            additionalUrls: additionalUrls,
            sessions: parseInt(this.sessions.value),
            pagesPerSession: parseInt(this.pagesPerSession.value),
            timeOnPage: parseInt(this.timeOnPage.value),
            scrollDepth: parseInt(this.scrollDepth.value),
            delayMin: parseInt(this.delayMin.value),
            delayMax: parseInt(this.delayMax.value),
            referrerType: this.referrerType.value,
            useProxies: proxySource !== 'none',
            proxies: proxies,
            testProxies: this.testProxies.checked,
            randomTiming: this.randomTiming.checked,
            followLinks: this.followLinks.checked,
            rotateUserAgents: this.rotateUserAgents.checked,
            simulateClicks: this.simulateClicks.checked,
            simulateScroll: this.simulateScroll.checked,
            varyReadingTime: this.varyReadingTime.checked,
            visitRelatedPosts: this.visitRelatedPosts.checked
        };
    }

    getRandomProxy(proxies) {
        if (!proxies || proxies.length === 0) return null;
        return proxies[Math.floor(Math.random() * proxies.length)];
    }

    getRandomUserAgent() {
        const userAgents = [
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Safari/605.1.15',
            'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
            'Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'
        ];
        return userAgents[Math.floor(Math.random() * userAgents.length)];
    }

    truncateUrl(url) {
        if (url.length > 60) {
            return url.substring(0, 57) + '...';
        }
        return url;
    }

    validateInputs() {
        if (!this.targetUrl.value) {
            alert('❌ Please enter a target URL');
            this.targetUrl.focus();
            return false;
        }

        try {
            new URL(this.targetUrl.value);
        } catch {
            alert('❌ Please enter a valid URL (e.g., https://yourblog.blogspot.com/2024/01/post.html)');
            this.targetUrl.focus();
            return false;
        }

        const sessions = parseInt(this.sessions.value);
        if (sessions < 1 || sessions > 100) {
            alert('❌ Sessions must be between 1 and 100');
            return false;
        }

        return true;
    }

    updateStats() {
        this.totalRequests.textContent = this.stats.total;
        this.successfulRequests.textContent = this.stats.success;
        this.failedRequests.textContent = this.stats.failed;
        
        if (this.stats.total > 0) {
            const successRate = (this.stats.success / this.stats.total * 100).toFixed(1);
            this.successRate.textContent = successRate + '%';
        }

        if (this.stats.responseTimes.length > 0) {
            const avg = this.stats.responseTimes.reduce((a, b) => a + b, 0) / this.stats.responseTimes.length;
            this.avgResponseTime.textContent = Math.round(avg) + 'ms';
        }
    }

    updateProgress(currentSession, totalSessions, currentPage, totalPages) {
        const sessionProgress = ((currentSession - 1) / totalSessions) * 100;
        const pageProgress = (currentPage / totalPages) * (100 / totalSessions);
        const totalProgress = sessionProgress + pageProgress;
        
        this.progressText.textContent = `Session ${currentSession}/${totalSessions} - Page ${currentPage}/${totalPages}`;
        this.progressFill.style.width = totalProgress + '%';
    }

    stopTrafficGeneration() {
        this.isRunning = false;
        this.startBtn.classList.remove('hidden');
        this.stopBtn.classList.add('hidden');
        this.statusText.textContent = 'Stopped';
        this.statusText.style.background = 'var(--error-color)';
        
        if (this.stats.total === 0) {
            this.statusText.textContent = 'Idle';
            this.statusText.style.background = 'var(--primary-color)';
        }
    }

    addLog(type, message) {
        const logEntry = document.createElement('div');
        logEntry.className = `log-entry ${type}`;
        
        const time = new Date().toLocaleTimeString();
        const icon = type === 'success' ? '✅' : type === 'error' ? '❌' : 'ℹ️';
        
        logEntry.innerHTML = `
            <span class="log-time">[${time}]</span>
            <span class="log-message">${icon} ${message}</span>
        `;
        
        this.logs.appendChild(logEntry);
        this.logs.scrollTop = this.logs.scrollHeight;
    }

    clearLogs() {
        this.logs.innerHTML = '';
        this.addLog('info', '🗑️ Logs cleared');
    }

    getRandomDelay(min, max) {
        return Math.random() * (max - min) + min;
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// Initialize TraffiKing when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.traffiking = new TraffiKing();
    console.log('%c👑 TraffiKing v2.0 initialized successfully!', 'color: #10b981; font-weight: bold;');
});
