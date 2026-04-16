class TraffiKing {
    constructor() {
        this.isRunning = false;
        this.stats = {
            total: 0,
            success: 0,
            failed: 0,
            responseTimes: []
        };
        this.proxies = [];
        
        this.initializeElements();
        this.attachEventListeners();
        this.showWelcomeMessage();
    }

    initializeElements() {
        // Form elements
        this.targetUrl = document.getElementById('targetUrl');
        this.sessions = document.getElementById('sessions');
        this.pagesPerSession = document.getElementById('pagesPerSession');
        this.delayMin = document.getElementById('delayMin');
        this.delayMax = document.getElementById('delayMax');
        this.proxyList = document.getElementById('proxyList');
        this.testProxies = document.getElementById('testProxies');
        this.randomTiming = document.getElementById('randomTiming');
        this.followLinks = document.getElementById('followLinks');
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

    showWelcomeMessage() {
        console.log('%c👑 TraffiKing v1.0', 'color: #6366f1; font-size: 24px; font-weight: bold;');
        console.log('%cProfessional Traffic Generator', 'color: #8b5cf6; font-size: 14px;');
        console.log('%c⚠️ Educational Use Only', 'color: #f59e0b; font-size: 12px;');
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

            if (data.success) {
                this.proxies = data.proxies;
                this.proxyList.value = data.proxies.join('\n');
                this.addLog('success', `✅ Successfully fetched ${data.proxies.length} proxies!`);
                this.activeProxies.textContent = data.proxies.length;
                
                // Auto-select manual mode
                document.querySelector('input[name="proxySource"][value="manual"]').checked = true;
                document.getElementById('manualProxySection').classList.remove('hidden');
            } else {
                this.addLog('error', '❌ Failed to fetch proxies: ' + data.error);
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
            responseTimes: []
        };

        const config = this.getConfiguration();
        
        this.addLog('info', '👑 TraffiKing is starting...');
        this.addLog('info', `🎯 Target: ${config.targetUrl}`);
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
        for (let session = 1; session <= config.sessions && this.isRunning; session++) {
            this.addLog('info', `\n📱 Session ${session}/${config.sessions} started`);
            
            for (let page = 1; page <= config.pagesPerSession && this.isRunning; page++) {
                const startTime = Date.now();
                
                try {
                    const result = await this.makeRequest(config);
                    const responseTime = Date.now() - startTime;
                    
                    this.stats.total++;
                    this.stats.responseTimes.push(responseTime);
                    
                    const proxyInfo = result.proxy ? ` [${result.proxy.substring(0, 20)}...]` : ' [Direct]';
                    
                    if (result.success) {
                        this.stats.success++;
                        this.addLog('success', `✅ Page ${page}/${config.pagesPerSession}: Success (${responseTime}ms)${proxyInfo}`);
                    } else {
                        this.stats.failed++;
                        this.addLog('error', `❌ Page ${page}/${config.pagesPerSession}: Failed - ${result.error}${proxyInfo}`);
                    }
                    
                    this.updateStats();
                    this.updateProgress(session, config.sessions, page, config.pagesPerSession);
                    
                    // Delay between pages
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
            this.stopTrafficGeneration();
        }
    }

    async makeRequest(config) {
        try {
            const response = await fetch('/api/start-traffic', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    url: config.targetUrl,
                    proxy: config.useProxies ? this.getRandomProxy(config.proxies) : null,
                    userAgent: config.rotateUserAgents ? this.getRandomUserAgent() : null
                })
            });

            const data = await response.json();
            return data;
        } catch (error) {
            return { success: false, error: error.message };
        }
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

        return {
            targetUrl: this.targetUrl.value,
            sessions: parseInt(this.sessions.value),
            pagesPerSession: parseInt(this.pagesPerSession.value),
            delayMin: parseInt(this.delayMin.value),
            delayMax: parseInt(this.delayMax.value),
            useProxies: proxySource !== 'none',
            proxies: proxies,
            testProxies: this.testProxies.checked,
            randomTiming: this.randomTiming.checked,
            followLinks: this.followLinks.checked,
            rotateUserAgents: this.rotateUserAgents.checked
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
            'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        ];
        return userAgents[Math.floor(Math.random() * userAgents.length)];
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
            alert('❌ Please enter a valid URL (e.g., https://example.com)');
            this.targetUrl.focus();
            return false;
        }

        const sessions = parseInt(this.sessions.value);
        if (sessions < 1 || sessions > 50) {
            alert('❌ Sessions must be between 1 and 50');
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
    console.log('%c👑 TraffiKing initialized successfully!', 'color: #10b981; font-weight: bold;');
});
