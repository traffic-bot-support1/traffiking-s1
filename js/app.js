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
        this.blogspotPosts = [];
        
        this.initializeElements();
        this.attachEventListeners();
        this.showWelcomeMessage();
    }

    initializeElements() {
        // Blogspot specific
        this.blogspotUrl = document.getElementById('blogspotUrl');
        this.fetchPostsBtn = document.getElementById('fetchPostsBtn');
        this.autoModeBtn = document.getElementById('autoModeBtn');
        this.postsPreview = document.getElementById('postsPreview');
        this.postsList = document.getElementById('postsList');
        
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
        this.simulateScroll = document.getElementById('simulateScroll');
        this.varyReadingTime = document.getElementById('varyReadingTime');
        this.visitRelatedPosts = document.getElementById('visitRelatedPosts');
        this.rotateUserAgents = document.getElementById('rotateUserAgents');

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
        this.postsVisitedEl = document.getElementById('postsVisited');
        this.progressFill = document.getElementById('progressFill');
        this.proxyStatus = document.getElementById('proxyStatus');

        // Logs & Stats
        this.logsPanel = document.getElementById('logsPanel');
        this.logs = document.getElementById('logs');
        this.statsPanel = document.getElementById('statsPanel');
        this.totalRequests = document.getElementById('totalRequests');
        this.successfulRequests = document.getElementById('successfulRequests');
        this.failedRequests = document.getElementById('failedRequests');
        this.avgResponseTime = document.getElementById('avgResponseTime');
    }

    attachEventListeners() {
        // Blogspot actions
        this.fetchPostsBtn.addEventListener('click', () => this.fetchBlogspotPosts());
        this.autoModeBtn.addEventListener('click', () => this.startAutoMode());

        // Traffic mode change
        this.trafficMode.addEventListener('change', () => this.handleTrafficModeChange());

        // Proxy source radio buttons
        document.querySelectorAll('input[name="proxySource"]').forEach(radio => {
            radio.addEventListener('change', (e) => this.handleProxySourceChange(e));
        });

        // Buttons
        this.fetchProxiesBtn.addEventListener('click', () => this.fetchProxiflyProxies());
        this.startBtn.addEventListener('click', () => this.startTrafficGeneration());
        this.stopBtn.addEventListener('click', () => this.stopTrafficGeneration());
        this.clearLogsBtn.addEventListener('click', () => this.clearLogs());
    }

    showWelcomeMessage() {
        console.log('%c👑 TraffiKing v3.0 - Blogspot Auto Mode', 'color: #6366f1; font-size: 24px; font-weight: bold;');
        console.log('%cAutomated Blogspot Traffic with Proxifly', 'color: #8b5cf6; font-size: 14px;');
        console.log('%c⚠️ Educational Use Only', 'color: #f59e0b; font-size: 12px;');
    }

    async fetchBlogspotPosts() {
        const blogUrl = this.blogspotUrl.value.trim();
        
        if (!blogUrl) {
            alert('❌ Please enter your Blogspot URL');
            return;
        }

        this.fetchPostsBtn.disabled = true;
        this.fetchPostsBtn.textContent = '⏳ Fetching posts...';
        this.addLog('info', `🔍 Scanning ${blogUrl} for posts...`);

        try {
            const response = await fetch('/api/fetch-blogspot-posts', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ blogUrl })
            });

            const data = await response.json();

            if (data.success && data.posts.length > 0) {
                this.blogspotPosts = data.posts;
                this.displayPosts(data.posts);
                this.addLog('success', `✅ Found ${data.posts.length} posts!`);
                this.postsPreview.classList.remove('hidden');
                
                // Auto-select auto-random mode
                this.trafficMode.value = 'auto-random';
            } else {
                this.addLog('error', '❌ No posts found. Make sure the URL is correct.');
                alert('No posts found on this blog. Please check the URL.');
            }
        } catch (error) {
            this.addLog('error', '❌ Error: ' + error.message);
            alert('Failed to fetch posts. Please try again.');
        } finally {
            this.fetchPostsBtn.disabled = false;
            this.fetchPostsBtn.textContent = '📋 Fetch All Posts';
        }
    }

    displayPosts(posts) {
        this.postsList.innerHTML = '';
        
        posts.slice(0, 20).forEach((url, index) => {
            const item = document.createElement('div');
            item.className = 'post-item';
            
            const title = url.split('/').pop().replace('.html', '').replace(/-/g, ' ');
            
            item.innerHTML = `
                <span class="post-icon">📄</span>
                <span class="post-title">${title}</span>
            `;
            
            this.postsList.appendChild(item);
        });

        if (posts.length > 20) {
            const moreItem = document.createElement('div');
            moreItem.className = 'post-item';
            moreItem.innerHTML = `
                <span class="post-icon">➕</span>
                <span class="post-title">...and ${posts.length - 20} more posts</span>
            `;
            this.postsList.appendChild(moreItem);
        }
    }

    async fetchProxiflyProxies() {
        this.addLog('info', '🔄 Fetching fresh proxies from Proxifly...');
        this.fetchProxiesBtn.disabled = true;
        this.fetchProxiesBtn.textContent = '⏳ Fetching...';
        this.updateProxyStatus('🟡', 'Fetching proxies...');

        try {
            const response = await fetch('/api/fetch-proxies');
            const data = await response.json();

            if (data.success && data.proxies.length > 0) {
                this.proxies = data.proxies;
                this.proxyList.value = data.proxies.join('\n');
                this.addLog('success', `✅ Loaded ${data.proxies.length} fresh Proxifly proxies!`);
                this.activeProxies.textContent = data.proxies.length;
                this.updateProxyStatus('🟢', `${data.proxies.length} proxies ready`);
                
                // Auto-select manual mode to use fetched proxies
                document.querySelector('input[name="proxySource"][value="manual"]').checked = true;
                document.getElementById('manualProxySection').classList.remove('hidden');
            } else {
                this.addLog('error', '❌ ' + (data.error || 'No proxies available'));
                this.updateProxyStatus('🔴', 'No proxies available');
            }
        } catch (error) {
            this.addLog('error', '❌ Error fetching proxies: ' + error.message);
            this.updateProxyStatus('🔴', 'Failed to fetch');
        } finally {
            this.fetchProxiesBtn.disabled = false;
            this.fetchProxiesBtn.textContent = '🔄 Fetch Proxifly Proxies';
        }
    }

    updateProxyStatus(indicator, text) {
        this.proxyStatus.innerHTML = `
            <span class="proxy-indicator">${indicator}</span>
            <span>${text}</span>
        `;
    }

    async startAutoMode() {
        // Fetch posts if not already loaded
        if (this.blogspotPosts.length === 0) {
            await this.fetchBlogspotPosts();
            if (this.blogspotPosts.length === 0) {
                return;
            }
        }

        // Fetch proxies automatically
        if (this.proxies.length === 0) {
            await this.fetchProxiflyProxies();
        }

        // Set auto-random mode
        this.trafficMode.value = 'auto-random';
        
        // Start traffic generation
        this.startTrafficGeneration();
    }

    handleTrafficModeChange() {
        const mode = this.trafficMode.value;
        const multipleSection = document.getElementById('multipleUrlsSection');
        const singleGroup = document.getElementById('singleUrlGroup');
        
        if (mode === 'auto-random') {
            multipleSection.classList.add('hidden');
            singleGroup.classList.add('hidden');
        } else if (mode === 'multiple') {
            multipleSection.classList.remove('hidden');
            singleGroup.classList.remove('hidden');
        } else if (mode === 'homepage') {
            multipleSection.classList.remove('hidden');
            singleGroup.classList.remove('hidden');
        } else {
            multipleSection.classList.add('hidden');
            singleGroup.classList.remove('hidden');
        }
    }

    handleProxySourceChange(e) {
        const manualSection = document.getElementById('manualProxySection');
        if (e.target.value === 'manual') {
            manualSection.classList.remove('hidden');
        } else {
            manualSection.classList.add('hidden');
        }
    }

    async startTrafficGeneration() {
        if (!this.validateInputs()) {
            return;
        }

        this.isRunning = true;
        this.startBtn.classList.add('hidden');
        this.autoModeBtn.classList.add('hidden');
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
        
        this.addLog('info', '👑 TraffiKing starting...');
        this.addLog('info', `🎯 Mode: ${config.mode}`);
        
        if (config.mode === 'auto-random') {
            this.addLog('info', `📚 Auto-targeting ${this.blogspotPosts.length} posts`);
        }
        
        this.addLog('info', `📊 Config: ${config.sessions} sessions × ${config.pagesPerSession} pages`);
        
        if (config.useProxies) {
            this.addLog('info', `🔒 Using ${config.proxies.length} proxies`);
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
        // Setup target URLs based on mode
        if (config.mode === 'auto-random') {
            this.targetUrls = [...this.blogspotPosts];
        } else {
            this.targetUrls = [config.targetUrl, ...config.additionalUrls].filter(u => u);
        }

        if (this.targetUrls.length === 0) {
            this.addLog('error', '❌ No target URLs available');
            this.stopTrafficGeneration();
            return;
        }
        
        for (let session = 1; session <= config.sessions && this.isRunning; session++) {
            this.addLog('info', `\n📱 Session ${session}/${config.sessions}`);
            
            let currentUrl = this.chooseRandomUrl(this.targetUrls);
            this.addLog('info', `🌐 Starting: ${this.truncateUrl(currentUrl)}`);
            
            for (let page = 1; page <= config.pagesPerSession && this.isRunning; page++) {
                const startTime = Date.now();
                
                try {
                    const result = await this.makeRequest(currentUrl, config);
                    const responseTime = Date.now() - startTime;
                    
                    this.stats.total++;
                    this.stats.responseTimes.push(responseTime);
                    this.stats.postsVisited.add(currentUrl);
                    
                    const proxyInfo = result.proxy ? ` [${result.proxy.substring(0, 15)}...]` : ' [Direct]';
                    
                    if (result.success) {
                        this.stats.success++;
                        
                        const readTime = this.getReadingTime(config);
                        this.stats.engagementTime += readTime;
                        
                        this.addLog('success', `✅ Page ${page}: Success (${responseTime}ms)${proxyInfo}`);
                        this.addLog('info', `📖 Reading ${readTime.toFixed(1)}s...`);
                        
                        await this.sleep(readTime * 1000);
                        
                        // Choose next URL
                        if (page < config.pagesPerSession) {
                            currentUrl = this.chooseRandomUrl(this.targetUrls);
                        }
                    } else {
                        this.stats.failed++;
                        this.addLog('error', `❌ Page ${page}: ${result.error}${proxyInfo}`);
                    }
                    
                    this.updateStats();
                    this.updateProgress(session, config.sessions, page, config.pagesPerSession);
                    
                    if (page < config.pagesPerSession && this.isRunning) {
                        await this.sleep(this.getRandomDelay(2, 5) * 1000);
                    }
                } catch (error) {
                    this.stats.failed++;
                    this.addLog('error', `❌ Error: ${error.message}`);
                    this.updateStats();
                }
            }
            
            if (session < config.sessions && this.isRunning) {
                const delay = this.getRandomDelay(config.delayMin, config.delayMax);
                this.addLog('info', `⏳ Waiting ${delay.toFixed(1)}s...`);
                await this.sleep(delay * 1000);
            }
        }
        
        if (this.isRunning) {
            this.addLog('success', '\n🎉 Completed!');
            this.addLog('info', `📊 Success: ${this.stats.success}/${this.stats.total} (${((this.stats.success/this.stats.total)*100).toFixed(1)}%)`);
            this.addLog('info', `📝 Unique posts: ${this.stats.postsVisited.size}`);
            this.addLog('info', `⏱️ Total time: ${(this.stats.engagementTime/60).toFixed(1)} min`);
            this.stopTrafficGeneration();
        }
    }

    chooseRandomUrl(urls) {
        return urls[Math.floor(Math.random() * urls.length)];
    }

    getReadingTime(config) {
        const baseTime = parseInt(config.timeOnPage);
        if (config.varyReadingTime) {
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
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    url: url,
                    proxy: config.useProxies ? this.getRandomProxy(config.proxies) : null,
                    userAgent: config.rotateUserAgents ? this.getRandomUserAgent() : null,
                    referrer: referrer,
                    scrollDepth: config.scrollDepth,
                    timeOnPage: config.timeOnPage
                })
            });

            return await response.json();
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    getReferrer(type) {
        const referrers = {
            google: ['https://www.google.com/search?q=', 'https://www.google.com/'],
            social: ['https://www.facebook.com/', 'https://twitter.com/', 'https://www.reddit.com/'],
            direct: [''],
            mixed: ['https://www.google.com/search?q=', 'https://www.facebook.com/', 'https://twitter.com/', '']
        };
        const list = referrers[type] || referrers.mixed;
        return list[Math.floor(Math.random() * list.length)];
    }

    getConfiguration() {
        const proxySource = document.querySelector('input[name="proxySource"]:checked').value;
        let proxies = [];

        if (proxySource === 'manual') {
            proxies = this.proxyList.value.split('\n').map(p => p.trim()).filter(p => p && !p.startsWith('#'));
        } else if (proxySource === 'auto') {
            proxies = this.proxies;
        }

        const additionalUrls = this.additionalUrls.value.split('\n')
            .map(url => url.trim()).filter(url => url && url.startsWith('http'));

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
            rotateUserAgents: this.rotateUserAgents.checked,
            varyReadingTime: this.varyReadingTime.checked
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
            'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile Safari/604.1'
        ];
        return userAgents[Math.floor(Math.random() * userAgents.length)];
    }

    truncateUrl(url) {
        return url.length > 60 ? url.substring(0, 57) + '...' : url;
    }

    validateInputs() {
        const mode = this.trafficMode.value;
        
        if (mode === 'auto-random' && this.blogspotPosts.length === 0) {
            alert('❌ Please fetch Blogspot posts first');
            return false;
        }

        if (mode !== 'auto-random' && !this.targetUrl.value) {
            alert('❌ Please enter a target URL');
            return false;
        }

        return true;
    }

    updateStats() {
        this.totalRequests.textContent = this.stats.total;
        this.successfulRequests.textContent = this.stats.success;
        this.failedRequests.textContent = this.stats.failed;
        this.postsVisitedEl.textContent = this.stats.postsVisited.size;
        
        if (this.stats.total > 0) {
            this.successRate.textContent = (this.stats.success / this.stats.total * 100).toFixed(1) + '%';
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
        this.autoModeBtn.classList.remove('hidden');
        this.stopBtn.classList.add('hidden');
        this.statusText.textContent = 'Stopped';
        this.statusText.style.background = 'var(--error-color)';
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

document.addEventListener('DOMContentLoaded', () => {
    window.traffiking = new TraffiKing();
    console.log('%c👑 TraffiKing v3.0 ready!', 'color: #10b981; font-weight: bold;');
});
