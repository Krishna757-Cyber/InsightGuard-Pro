// config.js - Azure Integration & App Configuration
export const CONFIG = {
  AZURE: {
    DOCUMENT_INTELLIGENCE: {
      endpoint: 'https://YOUR_RESOURCE.cognitiveservices.azure.com/',
      key: 'YOUR_DOCUMENT_INTELLIGENCE_KEY',
      apiVersion: '2023-07-31'
    },
    CONTENT_SAFETY: {
      endpoint: 'https://YOUR_RESOURCE.cognitiveservices.azure.com/',
      key: 'YOUR_CONTENT_SAFETY_KEY',
      apiVersion: '2024-02-15-preview',
      severityThreshold: 3
    }
  },

  THEME: {
    COLORS: {
      LOW: '#10b981',
      MEDIUM: '#f59e0b',
      HIGH: '#ef4444',
      CRITICAL: '#dc2626',
      ACCENT_1: '#6366f1',
      ACCENT_2: '#8b5cf6',
      ACCENT_3: '#ec4899',
      GRADIENT_PRIMARY: 'linear-gradient(135deg, #6366f1 0%, #ec4899 100%)',
      GRADIENT_SECONDARY: 'linear-gradient(135deg, #10b981 0%, #3b82f6 100%)',
      GLASS_BG: 'rgba(255, 255, 255, 0.03)',
      GLASS_BG_HOVER: 'rgba(255, 255, 255, 0.08)',
      GLASS_BORDER: 'rgba(255, 255, 255, 0.12)',
      GLASS_BORDER_HOVER: 'rgba(99, 102, 241, 0.4)',
      TEXT_PRIMARY: '#f8fafc',
      TEXT_SECONDARY: '#94a3b8',
      TEXT_MUTED: '#64748b',
      BG_DARK: '#0a0e17',
      BG_CARD: 'rgba(15, 23, 42, 0.6)',
      BG_OVERLAY: 'rgba(10, 14, 23, 0.85)',
      SUCCESS: '#22c55e',
      WARNING: '#eab308',
      ERROR: '#f43f5e',
      INFO: '#38bdf8'
    },
    SHADOWS: {
      SOFT: '0 4px 20px rgba(0, 0, 0, 0.3)',
      MEDIUM: '0 8px 32px rgba(0, 0, 0, 0.4)',
      STRONG: '0 16px 64px rgba(0, 0, 0, 0.5)',
      GLOW: '0 0 40px rgba(99, 102, 241, 0.3)',
      GLOW_PINK: '0 0 40px rgba(236, 72, 153, 0.25)'
    },
    ANIMATION: {
      DURATION_FAST: '150ms',
      DURATION_NORMAL: '300ms',
      DURATION_SLOW: '500ms',
      EASING_STANDARD: 'cubic-bezier(0.4, 0, 0.2, 1)',
      EASING_BOUNCE: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)'
    }
  },

  THRESHOLDS: {
    LOW: { max: 30, label: 'Low Risk', color: 'low' },
    MEDIUM: { min: 30, max: 70, label: 'Medium Risk', color: 'medium' },
    HIGH: { min: 70, label: 'High Risk', color: 'high' }
  },

  UPLOAD: {
    MAX_SIZE_MB: 25,
    ACCEPTED_TYPES: ['.pdf', '.png', '.jpg', '.jpeg', '.docx', '.txt'],
    MIME_TYPES: {
      'application/pdf': 'PDF Document',
      'image/png': 'PNG Image',
      'image/jpeg': 'JPEG Image',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'Word Document',
      'text/plain': 'Text File'
    }
  },

  API: {
    TIMEOUT_MS: 30000,
    RETRY_ATTEMPTS: 3,
    RETRY_DELAY_MS: 1000
  },

  MOCK_ANALYSIS: {
    riskScore: 74,
    confidence: 0.82,
    azure: {
      documentIntelligence: {
        status: 'completed',
        pages: 3,
        extractedText: 'Sample extracted content from document...',
        tables: 2,
        forms: 1
      },
      contentSafety: {
        hate: 0.02,
        selfHarm: 0.01,
        sexual: 0.03,
        violence: 0.08,
        overallSeverity: 2,
        flaggedCategories: ['violence']
      }
    },
    flaggedPhrases: [
      {
        text: 'waiver of liability clause 4B',
        reason: 'High-risk legal bypass detected',
        type: 'legal',
        severity: 'high',
        position: { page: 2, offset: 1247 }
      },
      {
        text: 'immediate execution required',
        reason: 'Urgency manipulation pattern',
        type: 'behavioral',
        severity: 'medium',
        position: { page: 1, offset: 532 }
      },
      {
        text: 'undisclosed third-party beneficiary',
        reason: 'Policy violation potential',
        type: 'compliance',
        severity: 'high',
        position: { page: 3, offset: 2891 }
      }
    ],
    metrics: {
      explicit: 0.12,
      implicit: 0.68,
      contextual: 0.74,
      semanticConsistency: 0.81,
      azureConfidence: 0.89
    }
  },

  MOCK_HISTORY: [
    {
      id: 1,
      file: 'contract_v2.pdf',
      risk: 18,
      confidence: 0.92,
      date: '2026-04-01',
      azureProcessed: true,
      categories: ['legal', 'compliance']
    },
    {
      id: 2,
      file: 'invoice_scan.png',
      risk: 45,
      confidence: 0.81,
      date: '2026-04-02',
      azureProcessed: true,
      categories: ['financial']
    },
    {
      id: 3,
      file: 'policy_draft.pdf',
      risk: 78,
      confidence: 0.67,
      date: '2026-04-02',
      azureProcessed: true,
      categories: ['legal', 'behavioral', 'compliance']
    }
  ],

  UI: {
    TOAST_DURATION: 4000,
    GAUGE_ANIMATION_MS: 1200,
    CHART_REFRESH_MS: 300,
    MAX_HISTORY_ITEMS: 50
  }
};

export const getRiskLevel = (score) => {
  if (score < CONFIG.THRESHOLDS.LOW.max) return CONFIG.THRESHOLDS.LOW;
  if (score < CONFIG.THRESHOLDS.HIGH.min) return CONFIG.THRESHOLDS.MEDIUM;
  return CONFIG.THRESHOLDS.HIGH;
};

export const getAzureEndpoint = (service, path) => {
  const cfg = CONFIG.AZURE[service];
  return `${cfg.endpoint}${path}?api-version=${cfg.apiVersion}`;
};
