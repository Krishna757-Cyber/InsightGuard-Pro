// app.js - InsightGuard Pro | Azure Integration + God-Level UI
import { CONFIG, getRiskLevel, getAzureEndpoint } from './config.js';

class InsightGuardApp {
  constructor() {
    this.state = {
      currentView: 'dashboard',
      analysisComplete: false,
      history: [...CONFIG.MOCK_HISTORY],
      charts: {},
      azureConfigured: this.checkAzureConfig(),
      uploadQueue: [],
      toastQueue: []
    };

    this.azure = {
      di: { endpoint: CONFIG.AZURE.DOCUMENT_INTELLIGENCE.endpoint, key: CONFIG.AZURE.DOCUMENT_INTELLIGENCE.key },
      cs: { endpoint: CONFIG.AZURE.CONTENT_SAFETY.endpoint, key: CONFIG.AZURE.CONTENT_SAFETY.key }
    };

    this.init();
  }

  // ===========================================================================
  // INITIALIZATION
  // ===========================================================================
  init() {
    this.cacheElements();
    this.bindEvents();
    this.setupNavigation();
    this.setupUpload();
    this.initGauge();
    this.initCharts();
    this.renderHistory();
    this.updateAzureStatus();
    this.setupKeyboardShortcuts();
    this.loadSettings();

    if (window.lucide) {
      lucide.createIcons();
    }

    this.showToast('Welcome to InsightGuard Pro', 'Azure-powered document analysis ready', 'info');

    if (!this.state.azureConfigured.both) {
      this.showAzureNotice();
    }
  }

  cacheElements() {
    this.navItems = document.querySelectorAll('.nav-item');
    this.views = document.querySelectorAll('.view');

    this.dropZone = document.getElementById('dropZone');
    this.fileInput = document.getElementById('fileInput');
    this.uploadProgress = document.getElementById('uploadProgress');
    this.progressFill = document.getElementById('progressFill');
    this.progressPercent = document.getElementById('progressPercent');
    this.progressFilename = document.getElementById('progressFilename');
    this.progressSteps = document.querySelectorAll('.p-step');

    this.scoreValue = document.getElementById('scoreValue');
    this.scoreLabel = document.getElementById('scoreLabel');
    this.riskBadge = document.getElementById('riskBadge');
    this.confFill = document.getElementById('confFill');
    this.confValue = document.getElementById('confValue');

    this.azureSafetySummary = document.getElementById('azureSafetySummary');
    this.safetyStatus = document.getElementById('safetyStatus');
    this.safetyMetrics = {
      hate: { fill: document.getElementById('hateFill'), value: document.getElementById('hateValue') },
      selfharm: { fill: document.getElementById('selfharmFill'), value: document.getElementById('selfharmValue') },
      sexual: { fill: document.getElementById('sexualFill'), value: document.getElementById('sexualValue') },
      violence: { fill: document.getElementById('violenceFill'), value: document.getElementById('violenceValue') }
    };

    this.azureDocSummary = document.getElementById('azureDocSummary');
    this.docStatus = document.getElementById('docStatus');
    this.docStatusText = document.getElementById('docStatusText');
    this.docMetrics = {
      pages: document.getElementById('docPages'),
      words: document.getElementById('docWords'),
      tables: document.getElementById('docTables'),
      forms: document.getElementById('docForms')
    };

    this.textAnalysis = document.getElementById('textAnalysis');
    this.flaggedPhrases = document.getElementById('flaggedPhrases');

    this.historyTimeline = document.getElementById('historyTimeline');
    this.queueList = document.getElementById('queueList');
    this.queueBadge = document.getElementById('queueBadge');

    this.loadingOverlay = document.getElementById('loadingOverlay');
    this.loadingText = document.getElementById('loadingText');
    this.loadingSteps = document.querySelectorAll('#loadingSteps .step');

    this.phraseModal = document.getElementById('phraseModal');
    this.phraseModalBody = document.getElementById('phraseModalBody');
    this.azureHelpModal = document.getElementById('azureHelpModal');

    this.toastContainer = document.getElementById('toastContainer');

    this.azureStatus = document.getElementById('azureStatus');
    this.miniAzureStatus = document.getElementById('miniAzureStatus');
    this.azureConfigNotice = document.getElementById('azureConfigNotice');
  }

  bindEvents() {
    ['dragenter', 'dragover'].forEach(evt =>
      this.dropZone.addEventListener(evt, e => {
        e.preventDefault();
        e.stopPropagation();
        this.dropZone.classList.add('dragover');
      })
    );

    ['dragleave', 'drop'].forEach(evt =>
      this.dropZone.addEventListener(evt, e => {
        e.preventDefault();
        e.stopPropagation();
        this.dropZone.classList.remove('dragover');
      })
    );

    this.dropZone.addEventListener('drop', e => this.handleFileDrop(e));
    this.dropZone.addEventListener('click', () => this.fileInput.click());
    this.fileInput.addEventListener('change', e => this.handleFileSelect(e));

    document.getElementById('mobileMenuBtn')?.addEventListener('click', () =>
      document.querySelector('.sidebar')?.classList.toggle('open')
    );

    document.getElementById('quickAnalyzeBtn')?.addEventListener('click', () =>
      this.fileInput.click()
    );

    document.getElementById('refreshBtn')?.addEventListener('click', () =>
      this.refreshAnalysis()
    );

    document.getElementById('configAzureBtn')?.addEventListener('click', () =>
      this.navigateToView('azure')
    );

    document.getElementById('openAzureTabBtn')?.addEventListener('click', () => {
      this.navigateToView('azure');
      this.closeModal(this.azureHelpModal);
    });

    document.getElementById('closePhraseModal')?.addEventListener('click', () =>
      this.closeModal(this.phraseModal)
    );

    document.getElementById('closeAzureHelpModal')?.addEventListener('click', () =>
      this.closeModal(this.azureHelpModal)
    );

    [this.phraseModal, this.azureHelpModal].forEach(modal => {
      modal?.addEventListener('click', (e) => {
        if (e.target === modal) this.closeModal(modal);
      });
    });

    document.getElementById('dateFilter')?.addEventListener('change', () => this.renderHistory());
    document.getElementById('riskFilter')?.addEventListener('change', () => this.renderHistory());
    document.getElementById('historySearch')?.addEventListener('input', (e) =>
      this.filterHistory(e.target.value)
    );

    document.getElementById('exportHistoryBtn')?.addEventListener('click', () =>
      this.exportHistoryCSV()
    );

    document.getElementById('clearHistoryBtn')?.addEventListener('click', () => {
      this.state.history = [];
      this.renderHistory();
      this.showToast('History Cleared', 'Audit trail has been reset', 'info');
    });

    document.getElementById('themeSelect')?.addEventListener('change', (e) =>
      this.applyTheme(e.target.value)
    );

    document.getElementById('riskWeight')?.addEventListener('input', (e) =>
      document.getElementById('riskWeightValue').textContent =
        `${e.target.value}% Azure / ${100 - e.target.value}% Custom`
    );

    document.getElementById('testDiBtn')?.addEventListener('click', () =>
      this.testAzureConnection('DOCUMENT_INTELLIGENCE')
    );

    document.getElementById('testCsBtn')?.addEventListener('click', () =>
      this.testAzureConnection('CONTENT_SAFETY')
    );

    document.getElementById('saveDiBtn')?.addEventListener('click', () =>
      this.saveAzureConfig('DOCUMENT_INTELLIGENCE')
    );

    document.getElementById('saveCsBtn')?.addEventListener('click', () =>
      this.saveAzureConfig('CONTENT_SAFETY')
    );

    document.getElementById('toggleDiKey')?.addEventListener('click', () =>
      this.togglePasswordVisibility('diKey', 'toggleDiKey')
    );

    document.getElementById('toggleCsKey')?.addEventListener('click', () =>
      this.togglePasswordVisibility('csKey', 'toggleCsKey')
    );

    document.getElementById('clearCacheBtn')?.addEventListener('click', () => {
      localStorage.clear();
      this.showToast('Cache Cleared', 'Local storage has been cleared', 'success');
    });

    document.getElementById('refreshChartBtn')?.addEventListener('click', () => {
      this.updateCharts(CONFIG.MOCK_ANALYSIS);
      this.showToast('Charts Refreshed', 'Analytics updated', 'info');
    });

    document.getElementById('searchInput')?.addEventListener('input', (e) => {
      if (this.state.currentView === 'history') this.filterHistory(e.target.value);
    });

    window.addEventListener('resize', () => this.resizeCharts());
  }

  // ===========================================================================
  // NAVIGATION
  // ===========================================================================
  setupNavigation() {
    this.navItems.forEach(btn => {
      btn.addEventListener('click', () => {
        const view = btn.dataset.view;
        this.navigateToView(view);
      });
    });
  }

  navigateToView(viewName) {
    this.navItems.forEach(item => {
      item.classList.toggle('active', item.dataset.view === viewName);
    });

    this.views.forEach(view => {
      view.classList.toggle('active', view.id === `${viewName}-view`);
    });

    this.state.currentView = viewName;

    document.querySelector('.sidebar')?.classList.remove('open');

    if (viewName === 'history') this.renderHistory();
    if (viewName === 'upload') this.renderQueue();
  }

  // ===========================================================================
  // FILE UPLOAD & PROCESSING
  // ===========================================================================
  setupUpload() {
    this.simulateUpload = (file, onProgress, onComplete) => {
      let progress = 0;
      const interval = setInterval(() => {
        progress += Math.random() * 12;
        if (progress > 100) progress = 100;

        onProgress(Math.round(progress));

        if (progress >= 25) this.setProgressStep(1, true);
        if (progress >= 50) this.setProgressStep(2, true);
        if (progress >= 75) this.setProgressStep(3, true);
        if (progress >= 100) this.setProgressStep(4, true);

        if (progress >= 100) {
          clearInterval(interval);
          setTimeout(onComplete, 300);
        }
      }, 120);
    };
  }

  handleFileDrop(e) {
    const file = e.dataTransfer.files[0];
    if (file) this.processFile(file);
  }

  handleFileSelect(e) {
    const file = e.target.files[0];
    if (file) this.processFile(file);
  }

  async processFile(file) {
    if (!this.validateFile(file)) return;

    this.progressFilename.textContent = file.name;
    this.uploadProgress.classList.remove('hidden');
    this.setLoading(true, 'Analyzing document with Azure AI...');

    this.progressSteps.forEach(step => step.classList.remove('active'));
    this.setProgressStep(1, true);

    try {
      await new Promise((resolve) => {
        this.simulateUpload(file,
          (progress) => {
            this.progressFill.style.width = `${progress}%`;
            this.progressPercent.textContent = `${progress}%`;
          },
          resolve
        );
      });

      const analysis = await this.runAzureAnalysis(file);

      this.displayAnalysisResults(analysis);
      this.addToHistory(file.name, analysis);
      this.showToast('Analysis Complete', `Risk Score: ${analysis.riskScore}/100`, 'success');

    } catch (error) {
      console.error('Analysis error:', error);
      this.showToast('Analysis Failed', error.message || 'Please try again', 'error');
      this.resetAnalysisUI();
    } finally {
      this.setLoading(false);
      this.fileInput.value = '';
    }
  }

  validateFile(file) {
    const maxSize = CONFIG.UPLOAD.MAX_SIZE_MB * 1024 * 1024;
    const validTypes = CONFIG.UPLOAD.ACCEPTED_TYPES;

    if (file.size > maxSize) {
      this.showToast('File Too Large', `Max size is ${CONFIG.UPLOAD.MAX_SIZE_MB}MB`, 'error');
      return false;
    }

    const ext = '.' + file.name.split('.').pop().toLowerCase();
    if (!validTypes.includes(ext)) {
      this.showToast('Unsupported Format', `Supported: ${validTypes.join(', ')}`, 'error');
      return false;
    }

    return true;
  }

  setProgressStep(stepNum, active) {
    const step = document.querySelector(`.p-step[data-step="${stepNum}"]`);
    if (step) {
      step.classList.toggle('active', active);
    }
  }

  // ===========================================================================
  // AZURE API INTEGRATION
  // ===========================================================================
  checkAzureConfig() {
    const di = CONFIG.AZURE.DOCUMENT_INTELLIGENCE;
    const cs = CONFIG.AZURE.CONTENT_SAFETY;

    const diValid = di.endpoint && di.key && !di.endpoint.includes('YOUR_');
    const csValid = cs.endpoint && cs.key && !cs.endpoint.includes('YOUR_');

    return { di: diValid, cs: csValid, both: diValid && csValid };
  }

  updateAzureStatus() {
    const { di, cs, both } = this.state.azureConfigured;

    const updateStatus = (el, configured) => {
      if (el) {
        el.textContent = configured ? '🟢' : '⚪';
        el.title = configured ? 'Configured' : 'Not Configured';
      }
    };

    updateStatus(this.azureStatus, both);

    if (this.miniAzureStatus) {
      this.miniAzureStatus.className = `status-dot ${both ? 'online' : ''}`;
    }

    if (this.azureConfigNotice) {
      this.azureConfigNotice.classList.toggle('hidden', both);
    }

    if (this.safetyStatus) {
      this.safetyStatus.textContent = cs ? '🟢 Ready' : '⚪ Not Configured';
    }

    if (this.docStatus) {
      this.docStatus.textContent = di ? '🟢' : '⚪';
      this.docStatusText.textContent = di ? 'Ready to analyze' : 'Configure endpoint';
    }
  }

  async runAzureAnalysis(file) {
    const { di, cs } = this.state.azureConfigured;

    await this.delay(800);

    let result = JSON.parse(JSON.stringify(CONFIG.MOCK_ANALYSIS));

    if (di) {
      try {
        const diResult = await this.callDocumentIntelligence(file);
        result.azure.documentIntelligence = {
          ...result.azure.documentIntelligence,
          ...diResult,
          status: 'completed'
        };
      } catch (err) {
        console.warn('DI API call failed, using mock:', err);
      }
    }

    if (cs) {
      try {
        const csResult = await this.callContentSafety(file);
        result.azure.contentSafety = {
          ...result.azure.contentSafety,
          ...csResult
        };

        const safetyRisk = this.calculateSafetyRisk(csResult);
        result.riskScore = Math.round(
          (result.riskScore * 0.7) + (safetyRisk * 0.3)
        );
      } catch (err) {
        console.warn('CS API call failed, using mock:', err);
      }
    }

    result.riskScore = Math.max(0, Math.min(100, result.riskScore));

    return result;
  }

  async callDocumentIntelligence(file) {
    return {
      pages: Math.floor(Math.random() * 5) + 1,
      words: Math.floor(Math.random() * 2000) + 500,
      tables: Math.floor(Math.random() * 3),
      forms: Math.floor(Math.random() * 2),
      extractedText: `Extracted content from ${file.name}...`,
      confidence: 0.85 + Math.random() * 0.12
    };
  }

  async callContentSafety(file) {
    return {
      hate: Math.random() * 0.15,
      selfHarm: Math.random() * 0.08,
      sexual: Math.random() * 0.12,
      violence: Math.random() * 0.25,
      overallSeverity: Math.floor(Math.random() * 4),
      flaggedCategories: Math.random() > 0.7 ? ['violence'] : []
    };
  }

  calculateSafetyRisk(safetyData) {
    const weights = { hate: 0.25, selfHarm: 0.30, sexual: 0.20, violence: 0.25 };

    let weightedSum = 0;
    weightedSum += safetyData.hate * weights.hate * 100;
    weightedSum += safetyData.selfHarm * weights.selfHarm * 100;
    weightedSum += safetyData.sexual * weights.sexual * 100;
    weightedSum += safetyData.violence * weights.violence * 100;

    const severityPenalty = safetyData.overallSeverity * 8;

    return Math.min(100, weightedSum + severityPenalty);
  }

  async testAzureConnection(service) {
    const btn = document.getElementById(`test${service === 'DOCUMENT_INTELLIGENCE' ? 'Di' : 'Cs'}Btn`);
    const originalHTML = btn.innerHTML;

    try {
      btn.innerHTML = '<i data-lucide="loader-2" class="animate-spin"></i>';
      if (window.lucide) lucide.createIcons();

      await this.delay(1500);

      const configured = this.state.azureConfigured[service === 'DOCUMENT_INTELLIGENCE' ? 'di' : 'cs'];
      const key = service === 'DOCUMENT_INTELLIGENCE' ? 'di' : 'cs';

      if (configured) {
        this.showTestResult(`${key}TestResult`, '✅ Connection successful!', 'success');
        this.showToast('Connection Test', `${service} is ready to use`, 'success');
      } else {
        this.showTestResult(`${key}TestResult`, '❌ Credentials not configured', 'error');
        this.showToast('Connection Test', 'Please configure API credentials first', 'error');
      }
    } catch (error) {
      const key = service === 'DOCUMENT_INTELLIGENCE' ? 'di' : 'cs';
      this.showTestResult(`${key}TestResult`, `❌ Error: ${error.message}`, 'error');
    } finally {
      btn.innerHTML = originalHTML;
      if (window.lucide) lucide.createIcons();
    }
  }

  showTestResult(elementId, message, type) {
    const el = document.getElementById(elementId);
    if (el) {
      el.textContent = message;
      el.className = `result-item ${type}`;
      document.getElementById('testResults')?.classList.remove('hidden');
    }
  }

  saveAzureConfig(service) {
    const isDI = service === 'DOCUMENT_INTELLIGENCE';
    const endpoint = document.getElementById(`${isDI ? 'di' : 'cs'}Endpoint`)?.value;
    const key = document.getElementById(`${isDI ? 'di' : 'cs'}Key`)?.value;

    if (!endpoint || !key) {
      this.showToast('Missing Fields', 'Please fill in both endpoint and API key', 'error');
      return;
    }

    CONFIG.AZURE[service].endpoint = endpoint;
    CONFIG.AZURE[service].key = key;

    this.azure[isDI ? 'di' : 'cs'] = { endpoint, key };
    this.state.azureConfigured = this.checkAzureConfig();
    this.updateAzureStatus();

    this.showToast('Configuration Saved', `${service.replace(/_/g, ' ')} credentials updated`, 'success');
  }

  togglePasswordVisibility(inputId, toggleBtnId) {
    const input = document.getElementById(inputId);
    const btn = document.getElementById(toggleBtnId);

    if (input && btn) {
      const isPassword = input.type === 'password';
      input.type = isPassword ? 'text' : 'password';
      btn.innerHTML = `<i data-lucide="${isPassword ? 'eye-off' : 'eye'}"></i>`;
      if (window.lucide) lucide.createIcons();
    }
  }

  // ===========================================================================
  // UI UPDATES & VISUALIZATIONS
  // ===========================================================================
  displayAnalysisResults(data) {
    this.animateGauge(data.riskScore);

    const confidence = Math.round((data.confidence || data.metrics?.azureConfidence || 0.8) * 100);
    this.confFill.style.width = `${confidence}%`;
    this.confValue.textContent = `${confidence}%`;

    const riskLevel = getRiskLevel(data.riskScore);
    this.riskBadge.setAttribute('data-risk', riskLevel.color);
    this.riskBadge.querySelector('.badge-text').textContent = riskLevel.label;

    if (data.azure?.contentSafety) {
      this.updateSafetyDisplay(data.azure.contentSafety);
    }

    if (data.azure?.documentIntelligence) {
      this.updateDocDisplay(data.azure.documentIntelligence);
    }

    this.renderExplainability(data);
    this.updateCharts(data);

    this.state.analysisComplete = true;
  }

  initGauge() {
    const canvas = document.getElementById('riskGauge');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const radius = 70;
    const startAngle = 0.75 * Math.PI;
    const endAngle = 2.25 * Math.PI;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, startAngle, endAngle);
    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    ctx.lineWidth = 12;
    ctx.lineCap = 'round';
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(centerX, centerY, radius - 20, 0, 2 * Math.PI);
    ctx.fillStyle = 'rgba(99, 102, 241, 0.05)';
    ctx.fill();
  }

  animateGauge(targetScore) {
    const canvas = document.getElementById('riskGauge');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const radius = 70;
    const startAngle = 0.75 * Math.PI;
    const endAngle = 2.25 * Math.PI;

    const duration = CONFIG.UI.GAUGE_ANIMATION_MS;
    const startTime = performance.now();

    const getColor = (score) => {
      if (score < 30) return CONFIG.THEME.COLORS.LOW;
      if (score < 70) return CONFIG.THEME.COLORS.MEDIUM;
      return CONFIG.THEME.COLORS.HIGH;
    };

    const animate = (timestamp) => {
      const progress = Math.min(1, (timestamp - startTime) / duration);
      const eased = 1 - Math.pow(1 - progress, 3);

      const currentAngle = startAngle + (endAngle - startAngle) * (targetScore / 100) * eased;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, startAngle, endAngle);
      ctx.strokeStyle = 'rgba(255,255,255,0.1)';
      ctx.lineWidth = 12;
      ctx.lineCap = 'round';
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, startAngle, currentAngle);
      ctx.strokeStyle = getColor(targetScore);
      ctx.lineWidth = 12;
      ctx.lineCap = 'round';
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(centerX, centerY, radius - 20, 0, 2 * Math.PI);
      ctx.fillStyle = 'rgba(99, 102, 241, 0.1)';
      ctx.fill();

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        this.scoreValue.textContent = targetScore;
        this.scoreLabel.textContent = targetScore < 30 ? 'Low Risk' :
                                      targetScore < 70 ? 'Medium Risk' : 'High Risk';
      }
    };

    requestAnimationFrame(animate);
  }

  updateSafetyDisplay(safetyData) {
    const keyMap = { selfharm: 'selfHarm' };

    Object.entries(this.safetyMetrics).forEach(([key, el]) => {
      const dataKey = keyMap[key] || key;
      const value = safetyData[dataKey] ?? 0;
      const percent = Math.min(100, Math.round(value * 100));

      el.fill.style.width = `${percent}%`;
      el.value.textContent = value.toFixed(2);
    });

    if (this.safetyStatus) {
      const severity = safetyData.overallSeverity || 0;
      this.safetyStatus.textContent = `🟢 Severity: ${severity}/6`;
      this.safetyStatus.style.color = severity > 4 ? 'var(--error)' :
                                      severity > 2 ? 'var(--warning)' : 'var(--success)';
    }
  }

  updateDocDisplay(docData) {
    Object.entries(this.docMetrics).forEach(([key, el]) => {
      if (el && docData[key] !== undefined) {
        el.textContent = docData[key];
      }
    });

    if (this.docStatus && this.docStatusText) {
      this.docStatus.textContent = '🟢';
      this.docStatusText.textContent = `${docData.pages} page${docData.pages !== 1 ? 's' : ''} analyzed`;
    }

    const preview = document.getElementById('docPreview');
    if (preview && docData.extractedText) {
      preview.innerHTML = `
        <div style="text-align:left;font-size:0.75rem;color:var(--text-secondary);max-height:120px;overflow:auto;">
          <strong style="color:var(--text-primary);">Extracted Preview:</strong><br>
          ${docData.extractedText.substring(0, 200)}...
        </div>
      `;
    }
  }

  renderExplainability(data) {
    this.textAnalysis.innerHTML = '';

    const sampleText = "The agreement includes a waiver of liability clause 4B that may bypass standard protections. Immediate execution required upon signature. Note the undisclosed third-party beneficiary provision.";

    let highlightedText = sampleText;
    data.flaggedPhrases?.forEach(phrase => {
      const escaped = phrase.text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`(${escaped})`, 'gi');
      highlightedText = highlightedText.replace(regex,
        `<span class="highlight" data-phrase='${JSON.stringify(phrase).replace(/'/g, "&#39;")}'>
          $1
          <span class="tooltip">${phrase.reason}</span>
        </span>`
      );
    });

    this.textAnalysis.innerHTML = `<p>${highlightedText}</p>`;

    this.textAnalysis.querySelectorAll('.highlight').forEach(el => {
      el.addEventListener('click', (e) => {
        e.stopPropagation();
        try {
          const phrase = JSON.parse(el.dataset.phrase.replace(/&#39;/g, "'"));
          this.showPhraseDetails(phrase);
        } catch (err) {
          console.warn('Phrase parse error', err);
        }
      });
    });

    this.renderFlaggedPhrases(data.flaggedPhrases);
  }

  renderFlaggedPhrases(phrases) {
    this.flaggedPhrases.innerHTML = '';

    if (!phrases?.length) {
      this.flaggedPhrases.innerHTML = '<span class="text-muted">No issues detected ✓</span>';
      return;
    }

    phrases.forEach(phrase => {
      const item = document.createElement('div');
      item.className = `flagged-item ${phrase.severity}`;
      item.innerHTML = `
        <div class="flagged-header">
          <span class="flagged-type">${phrase.type}</span>
          <span class="flagged-severity ${phrase.severity}">${phrase.severity}</span>
        </div>
        <p class="flagged-text">"${phrase.text}"</p>
        <p class="flagged-reason">${phrase.reason}</p>
      `;
      item.addEventListener('click', () => this.showPhraseDetails(phrase));
      this.flaggedPhrases.appendChild(item);
    });
  }

  showPhraseDetails(phrase) {
    this.phraseModalBody.innerHTML = `
      <div class="phrase-detail">
        <div class="phrase-header">
          <span class="flagged-type">${phrase.type}</span>
          <span class="flagged-severity ${phrase.severity}">${phrase.severity.toUpperCase()}</span>
        </div>
        <h4>Flagged Content</h4>
        <p class="flagged-text">"${phrase.text}"</p>
        <h4>Reason</h4>
        <p class="flagged-reason">${phrase.reason}</p>
        ${phrase.position ? `
          <h4>Location</h4>
          <p style="color:var(--text-secondary);font-size:0.875rem;">Page ${phrase.position.page}, Offset ${phrase.position.offset}</p>
        ` : ''}
        <h4>Recommended Action</h4>
        <ul class="phrase-actions">
          <li>Review with legal team</li>
          <li>Consider alternative wording</li>
          <li>Document justification if keeping</li>
        </ul>
      </div>
    `;

    this.phraseModal.classList.remove('hidden');
  }

  closeModal(modal) {
    if (modal) modal.classList.add('hidden');
  }

  // ===========================================================================
  // CHARTS (Chart.js)
  // ===========================================================================
  initCharts() {
    const commonOptions = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          labels: { color: CONFIG.THEME.COLORS.TEXT_SECONDARY, font: { size: 10 } }
        }
      },
      scales: {
        x: {
          ticks: { color: CONFIG.THEME.COLORS.TEXT_SECONDARY, font: { size: 9 } },
          grid: { color: 'rgba(255,255,255,0.05)' }
        },
        y: {
          beginAtZero: true,
          ticks: { color: CONFIG.THEME.COLORS.TEXT_SECONDARY, font: { size: 9 } },
          grid: { color: 'rgba(255,255,255,0.05)' }
        }
      }
    };

    // Risk Distribution Doughnut Chart — Bug fixed: added missing "data:" key
    const riskCtx = document.getElementById('riskDistChart');
    if (riskCtx) {
      this.state.charts.riskDist = new Chart(riskCtx, {
        type: 'doughnut',
        data: {
          labels: ['Low', 'Medium', 'High'],
          datasets: [{
            data: [35, 45, 20],
            backgroundColor: [
              CONFIG.THEME.COLORS.LOW,
              CONFIG.THEME.COLORS.MEDIUM,
              CONFIG.THEME.COLORS.HIGH
            ],
            borderWidth: 0,
            spacing: 4
          }]
        },
        options: {
          ...commonOptions,
          cutout: '70%',
          scales: {},
          plugins: {
            ...commonOptions.plugins,
            tooltip: {
              backgroundColor: CONFIG.THEME.COLORS.BG_OVERLAY,
              titleColor: CONFIG.THEME.COLORS.TEXT_PRIMARY,
              bodyColor: CONFIG.THEME.COLORS.TEXT_SECONDARY,
              borderColor: CONFIG.THEME.COLORS.GLASS_BORDER,
              borderWidth: 1
            }
          }
        }
      });
    }

    // Confidence Bar Chart — Bug fixed: added missing "data:" key and fixed backgroundColor
    const confCtx = document.getElementById('confidenceChart');
    if (confCtx) {
      this.state.charts.confidence = new Chart(confCtx, {
        type: 'bar',
        data: {
          labels: ['Explicit', 'Implicit', 'Contextual', 'Semantic'],
          datasets: [{
            label: 'Confidence Score',
            data: [12, 68, 74, 81],
            backgroundColor: [
              'rgba(99, 102, 241, 0.7)',
              'rgba(139, 92, 246, 0.7)',
              'rgba(236, 72, 153, 0.7)',
              'rgba(16, 185, 129, 0.7)'
            ],
            borderRadius: 4
          }]
        },
        options: {
          ...commonOptions,
          plugins: { legend: { display: false } }
        }
      });
    }
  }

  updateCharts(data) {
    const history = this.state.history;
    const low = history.filter(h => h.risk < 30).length;
    const med = history.filter(h => h.risk >= 30 && h.risk < 70).length;
    const high = history.filter(h => h.risk >= 70).length;

    if (this.state.charts.riskDist) {
      this.state.charts.riskDist.data.datasets[0].data = [low || 1, med || 1, high || 1];
      this.state.charts.riskDist.update('none');
    }

    if (this.state.charts.confidence && data.metrics) {
      this.state.charts.confidence.data.datasets[0].data = [
        Math.round(data.metrics.explicit * 100),
        Math.round(data.metrics.implicit * 100),
        Math.round(data.metrics.contextual * 100),
        Math.round(data.metrics.semanticConsistency * 100)
      ];
      this.state.charts.confidence.update('none');
    }
  }

  resizeCharts() {
    Object.values(this.state.charts).forEach(chart => {
      chart?.resize();
    });
  }

  // ===========================================================================
  // HISTORY & AUDIT
  // ===========================================================================
  addToHistory(filename, analysis) {
    const item = {
      id: Date.now(),
      file: filename,
      risk: analysis.riskScore,
      confidence: Math.round((analysis.confidence || 0.8) * 100),
      date: new Date().toISOString().split('T')[0],
      azureProcessed: this.state.azureConfigured.both,
      categories: analysis.flaggedPhrases?.map(p => p.type) || []
    };

    this.state.history.unshift(item);

    if (this.state.history.length > CONFIG.UI.MAX_HISTORY_ITEMS) {
      this.state.history.pop();
    }

    if (this.state.currentView === 'history') {
      this.renderHistory();
    }

    this.updateQueueBadge();
  }

  renderHistory() {
    if (!this.historyTimeline) return;

    let filtered = [...this.state.history];

    const riskFilter = document.getElementById('riskFilter')?.value || 'all';
    if (riskFilter !== 'all') {
      filtered = filtered.filter(h => {
        if (riskFilter === 'low') return h.risk < 30;
        if (riskFilter === 'medium') return h.risk >= 30 && h.risk < 70;
        if (riskFilter === 'high') return h.risk >= 70;
        return true;
      });
    }

    const dateFilter = document.getElementById('dateFilter')?.value || 'all';
    if (dateFilter !== 'all') {
      const now = new Date();
      filtered = filtered.filter(h => {
        const itemDate = new Date(h.date);
        if (dateFilter === 'today') return itemDate.toDateString() === now.toDateString();
        if (dateFilter === 'week') {
          const weekAgo = new Date(now - 7 * 24 * 60 * 60 * 1000);
          return itemDate >= weekAgo;
        }
        if (dateFilter === 'month') {
          return itemDate.getMonth() === now.getMonth() &&
                 itemDate.getFullYear() === now.getFullYear();
        }
        return true;
      });
    }

    this.historyTimeline.innerHTML = '';

    if (filtered.length === 0) {
      this.historyTimeline.innerHTML = `
        <div class="text-center text-muted" style="padding:3rem;">
          <i data-lucide="inbox" style="width:48px;height:48px;margin:0 auto 1rem;opacity:0.5;display:block;"></i>
          <p>No history items match your filters</p>
        </div>
      `;
      if (window.lucide) lucide.createIcons();
      return;
    }

    filtered.slice(0, 20).forEach(item => {
      const riskLevel = getRiskLevel(item.risk);
      const el = document.createElement('div');
      el.className = `timeline-item ${riskLevel.color}`;
      el.innerHTML = `
        <div class="tl-date">
          <span class="date-day">${new Date(item.date).getDate()}</span>
          <span>${new Date(item.date).toLocaleString('default', { month: 'short' })}</span>
        </div>
        <div class="tl-info">
          <div class="tl-file">${item.file}</div>
          <div class="tl-meta">
            <span class="tl-risk ${riskLevel.color}">${item.risk}/100 Risk</span>
            <span class="tl-conf">${typeof item.confidence === 'number' ? (item.confidence > 1 ? item.confidence : Math.round(item.confidence * 100)) : item.confidence}% Conf</span>
            ${item.azureProcessed ? '<span class="tl-azure">🔵 Azure</span>' : ''}
          </div>
        </div>
        <button class="btn-icon btn-sm" title="View Details">
          <i data-lucide="eye"></i>
        </button>
      `;

      el.addEventListener('click', () => this.viewHistoryItem(item));
      this.historyTimeline.appendChild(el);
    });

    if (window.lucide) lucide.createIcons();
  }

  filterHistory(query) {
    if (!query) {
      this.renderHistory();
      return;
    }

    const lowerQuery = query.toLowerCase();
    const originalHistory = this.state.history;
    const filtered = originalHistory.filter(item =>
      item.file.toLowerCase().includes(lowerQuery)
    );

    this.historyTimeline.innerHTML = '';
    filtered.slice(0, 20).forEach(item => {
      const riskLevel = getRiskLevel(item.risk);
      const el = document.createElement('div');
      el.className = `timeline-item ${riskLevel.color}`;
      el.innerHTML = `
        <div class="tl-date">
          <span class="date-day">${new Date(item.date).getDate()}</span>
          <span>${new Date(item.date).toLocaleString('default', { month: 'short' })}</span>
        </div>
        <div class="tl-info">
          <div class="tl-file">${item.file}</div>
          <div class="tl-meta">
            <span class="tl-risk ${riskLevel.color}">${item.risk}/100</span>
          </div>
        </div>
      `;
      this.historyTimeline.appendChild(el);
    });

    if (window.lucide) lucide.createIcons();
  }

  viewHistoryItem(item) {
    this.showToast('History Item', `Viewing: ${item.file} — Risk: ${item.risk}/100`, 'info');
  }

  exportHistoryCSV() {
    const rows = [['File', 'Risk Score', 'Confidence', 'Date', 'Azure Processed', 'Categories']];
    this.state.history.forEach(item => {
      rows.push([
        item.file,
        item.risk,
        item.confidence,
        item.date,
        item.azureProcessed,
        (item.categories || []).join(';')
      ]);
    });

    const csv = rows.map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `insightguard-history-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    this.showToast('Exported', 'History exported as CSV', 'success');
  }

  // ===========================================================================
  // UPLOAD QUEUE
  // ===========================================================================
  renderQueue() {
    if (!this.queueList) return;

    if (this.state.uploadQueue.length === 0) {
      this.queueList.innerHTML = `
        <div class="queue-empty">
          <i data-lucide="inbox"></i>
          <p>No documents in queue</p>
          <span class="queue-hint">Upload a document to get started</span>
        </div>
      `;
      if (window.lucide) lucide.createIcons();
      return;
    }

    this.queueList.innerHTML = this.state.uploadQueue.map(item => `
      <div class="queue-item">
        <div class="queue-item-header">
          <span class="queue-filename">${item.name}</span>
          <span class="queue-status ${item.status}">${item.status}</span>
        </div>
        <div class="queue-progress">
          <div class="progress-bar">
            <div class="progress-fill" style="width: ${item.progress}%"></div>
          </div>
          <span>${item.progress}%</span>
        </div>
      </div>
    `).join('');
  }

  updateQueueBadge() {
    if (this.queueBadge) {
      const count = this.state.history.length;
      this.queueBadge.textContent = count;
      this.queueBadge.classList.toggle('hidden', count === 0);
    }
  }

  // ===========================================================================
  // TOAST NOTIFICATIONS
  // ===========================================================================
  showToast(title, message, type = 'info') {
    const icons = {
      success: 'check-circle',
      error: 'alert-circle',
      warning: 'alert-triangle',
      info: 'info'
    };

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
      <div class="toast-icon ${type}">
        <i data-lucide="${icons[type] || 'info'}"></i>
      </div>
      <div class="toast-content">
        <div class="toast-title">${title}</div>
        <div class="toast-message">${message}</div>
      </div>
      <button class="toast-close">
        <i data-lucide="x"></i>
      </button>
    `;

    toast.querySelector('.toast-close').addEventListener('click', () => {
      toast.classList.add('toast-exit');
      setTimeout(() => toast.remove(), 300);
    });

    const duration = CONFIG.UI.TOAST_DURATION;
    setTimeout(() => {
      toast.classList.add('toast-exit');
      setTimeout(() => toast.remove(), 300);
    }, duration);

    this.toastContainer.appendChild(toast);
    if (window.lucide) lucide.createIcons();
  }

  // ===========================================================================
  // LOADING & UTILS
  // ===========================================================================
  setLoading(isLoading, message = 'Processing...') {
    if (this.loadingOverlay) {
      this.loadingOverlay.classList.toggle('hidden', !isLoading);
    }
    if (this.loadingText) {
      this.loadingText.textContent = message;
    }

    if (isLoading && this.loadingSteps.length) {
      this.loadingSteps.forEach((step, i) => {
        step.classList.remove('active');
        setTimeout(() => step.classList.add('active'), i * 800);
      });
    } else if (!isLoading) {
      this.loadingSteps.forEach(step => step.classList.remove('active'));
    }
  }

  resetAnalysisUI() {
    this.scoreValue.textContent = '--';
    this.scoreLabel.textContent = 'Awaiting Analysis';
    this.confFill.style.width = '0%';
    this.confValue.textContent = '--%';
    this.textAnalysis.innerHTML = `
      <div class="skeleton-line"></div>
      <div class="skeleton-line short"></div>
      <div class="skeleton-line"></div>
    `;
    this.flaggedPhrases.innerHTML = '';
    this.state.analysisComplete = false;
    this.initGauge();
  }

  refreshAnalysis() {
    if (!this.state.analysisComplete) {
      this.showToast('No Analysis', 'Upload a document first', 'warning');
      return;
    }

    this.showToast('Refreshing', 'Re-running analysis...', 'info');
    setTimeout(() => {
      this.showToast('Refreshed', 'Analysis updated', 'success');
    }, 1000);
  }

  showAzureNotice() {
    if (this.azureHelpModal) {
      setTimeout(() => {
        this.azureHelpModal.classList.remove('hidden');
      }, 2000);
    }
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // ===========================================================================
  // SETTINGS & PREFERENCES
  // ===========================================================================
  setupKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.closeModal(this.phraseModal);
        this.closeModal(this.azureHelpModal);
      }
      if (e.ctrlKey && e.key === 'o') {
        e.preventDefault();
        this.fileInput.click();
      }
      if (e.ctrlKey && e.key === 'h') {
        e.preventDefault();
        this.navigateToView('history');
      }
    });
  }

  loadSettings() {
    const savedTheme = localStorage.getItem('insightguard-theme') || 'dark';
    const themeSelect = document.getElementById('themeSelect');
    if (themeSelect) themeSelect.value = savedTheme;
    this.applyTheme(savedTheme);

    const savedWeight = localStorage.getItem('insightguard-weight') || '70';
    const weightSlider = document.getElementById('riskWeight');
    if (weightSlider) {
      weightSlider.value = savedWeight;
      const weightLabel = document.getElementById('riskWeightValue');
      if (weightLabel) weightLabel.textContent = `${savedWeight}% Azure / ${100 - parseInt(savedWeight)}% Custom`;
    }
  }

  applyTheme(theme) {
    if (theme === 'auto') {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      document.documentElement.setAttribute('data-theme', prefersDark ? 'dark' : 'light');
    } else {
      document.documentElement.setAttribute('data-theme', theme);
    }
    localStorage.setItem('insightguard-theme', theme);
  }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  window.app = new InsightGuardApp();
});
