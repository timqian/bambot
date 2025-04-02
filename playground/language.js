// Language translations for Bambot UI
const translations = {
  en: {
    // Panel Header
    'play-with-bambot': 'Play with Bambot',
    
    // Control Speed
    'control-speed': 'Control Speed:',
    
    // Sections
    'keyboard-controls': 'Keyboard Controls',
    'joycon-controls': 'Joy-Con Controls',
    'servo-status': 'Servo Status',
    
    // Button Labels
    'connect-real-robot': 'Connect Real Robot',
    'connect-left-joycon': 'Connect Left Joy-Con',
    'connect-right-joycon': 'Connect Right Joy-Con',
    'show-controls': 'Show Controls',
    
    // Table Headers
    'operation': 'Operation',
    'right-arm': 'Right arm',
    'left-arm': 'Left arm',
    'servo': 'Servo',
    'status': 'Status',
    
    // Joint Operations
    'arm-control': 'Arm Control:',
    'rotation': 'Rotation',
    'pitch': 'Pitch',
    'elbow': 'Elbow',
    'wrist-pitch': 'Wrist Pitch',
    'wrist-roll': 'Wrist Roll',
    'jaw': 'Jaw',
    
    // Movement
    'movement': 'Movement:',
    'forward-back': 'Forward/Back',
    'turn-left-right': 'Turn Left/Right',
    
    // Help text
    'connect-help': 'Before connecting:',
    'connect-help-1': 'Select the correct device when prompted',
    'connect-help-2': 'Ensure each joint of your physical robot matches the virtual robot\'s position',
    'joycon-help': 'How to use Joycon:',
    'joycon-help-1': 'Left stick: Move left arm',
    'joycon-help-2': 'Right stick: Move right arm',
    'joycon-help-3': 'L/R buttons: Control grippers',
    'joycon-help-4': 'Directional buttons: Movement control',
    
    // Alerts
    'joint-limit': 'Joint ${name} has reached its limit!',
    'servo-limit': 'Servo ${id} has reached its limit!',
    
    // Servo names
    'left-rotation': 'Left Rotation',
    'left-pitch': 'Left Pitch',
    'left-elbow': 'Left Elbow',
    'left-wrist-pitch': 'Left Wrist Pitch',
    'left-wrist-roll': 'Left Wrist Roll',
    'left-jaw': 'Left Jaw',
    'right-rotation': 'Right Rotation',
    'right-pitch': 'Right Pitch',
    'right-elbow': 'Right Elbow',
    'right-wrist-pitch': 'Right Wrist Pitch',
    'right-wrist-roll': 'Right Wrist Roll',
    'right-jaw': 'Right Jaw',
    
    // Connect modal content
    'connecting-to-real-robot': 'Connecting to Real Robot',
    'before-connecting': 'Before connecting:',
    'power-on-robot': 'Power on your robot',
    'match-position': 'Ensure your physical robot\'s position matches the virtual robot\'s position',
    'select-device': 'Select the correct serial device when prompted',
    'after-connecting': 'After connecting:',
    'servo-status-appear': 'Servo status will appear showing the state of each servo',
    'start-slow': 'Start with slow movements to ensure safety',
    'check-errors': 'If servos show errors, check connections and power',
    'safety-tips': 'Safety tips:',
    'keep-hands-clear': 'Keep hands clear of moving parts',
    'use-slow-speed': 'Use slower speed settings when first connecting',
    'disconnect-if-issues': 'Disconnect immediately if unexpected behavior occurs'
  },
  zh: {
    // 面板标题
    'play-with-bambot': '控制 Bambot',
    
    // 控制速度
    'control-speed': '控制速度：',
    
    // 部分标题
    'keyboard-controls': '键盘控制',
    'joycon-controls': 'Joy-Con 控制',
    'servo-status': '舵机状态',
    
    // 按钮标签
    'connect-real-robot': '连接实体机器人',
    'connect-left-joycon': '连接左 Joy-Con',
    'connect-right-joycon': '连接右 Joy-Con',
    'show-controls': '显示控制面板',
    
    // 表格标题
    'operation': '操作',
    'right-arm': '右臂',
    'left-arm': '左臂',
    'servo': '舵机',
    'status': '状态',
    
    // 关节操作
    'arm-control': '机械臂控制：',
    'rotation': '旋转',
    'pitch': '俯仰',
    'elbow': '肘部',
    'wrist-pitch': '腕部俯仰',
    'wrist-roll': '腕部旋转',
    'jaw': '夹爪',
    
    // 移动
    'movement': '移动：',
    'forward-back': '前进/后退',
    'turn-left-right': '左转/右转',
    
    // 帮助文本
    'connect-help': '连接前请注意：',
    'connect-help-1': '选择正确的设备',
    'connect-help-2': '确保实体机器人各关节位置与虚拟机器人匹配',
    'joycon-help': '如何使用Joy-Con：',
    'joycon-help-1': '左摇杆：控制左臂',
    'joycon-help-2': '右摇杆：控制右臂',
    'joycon-help-3': 'L/R按钮：控制夹爪',
    'joycon-help-4': '方向按钮：控制移动',
    
    // 提醒
    'joint-limit': '关节 ${name} 已达到限位！',
    'servo-limit': '舵机 ${id} 已达到限位！',
    
    // 舵机名称
    'left-rotation': '左臂旋转',
    'left-pitch': '左臂俯仰',
    'left-elbow': '左臂肘部',
    'left-wrist-pitch': '左腕俯仰',
    'left-wrist-roll': '左腕旋转',
    'left-jaw': '左夹爪',
    'right-rotation': '右臂旋转',
    'right-pitch': '右臂俯仰',
    'right-elbow': '右臂肘部',
    'right-wrist-pitch': '右腕俯仰',
    'right-wrist-roll': '右腕旋转',
    'right-jaw': '右夹爪',
    
    // Connect modal content (Chinese)
    'connecting-to-real-robot': '连接实体机器人',
    'before-connecting': '连接前准备:',
    'power-on-robot': '开启机器人电源',
    'match-position': '确保实体机器人的各关节位置与虚拟机器人位置一致',
    'select-device': '连接时选择正确的串口设备',
    'after-connecting': '连接后:',
    'servo-status-appear': '舵机状态面板将显示每个舵机的当前状态',
    'start-slow': '开始时使用较慢的速度以确保安全',
    'check-errors': '如果舵机显示错误，请检查连接和电源',
    'safety-tips': '安全提示:',
    'keep-hands-clear': '保持手部远离运动部件',
    'use-slow-speed': '首次连接时使用较慢的速度设置',
    'disconnect-if-issues': '如遇异常行为，请立即断开连接'
  }
};

// Joycon help image paths for each language
const joyconHelpImages = {
  en: '/joycon_en.jpg',
  zh: '/joycon_zh.jpg'
};

// Current language (default: English)
let currentLanguage = 'en';

/**
 * Detect user's preferred language
 * @returns {string} - Language code ('en' or 'zh')
 */
function detectUserLanguage() {
  // Get browser language
  const browserLang = navigator.language || navigator.userLanguage;
  
  // Check if it's Chinese (starts with zh)
  if (browserLang && browserLang.toLowerCase().startsWith('zh')) {
    return 'zh';
  }
  
  // Default to English for all other languages
  return 'en';
}

/**
 * Initialize language system
 */
export function initLanguageSystem() {
  // Set up language toggle button
  const langToggleBtn = document.getElementById('langToggle');
  
  if (langToggleBtn) {
    langToggleBtn.addEventListener('click', toggleLanguage);
  }
  
  // Setup Joycon help modal functionality
  setupJoyconHelpModal();
  
  // Setup Connect help modal functionality
  setupConnectHelpModal();
  
  // Check for saved language preference
  const savedLang = localStorage.getItem('bambotLanguage');
  
  if (savedLang && (savedLang === 'en' || savedLang === 'zh')) {
    // Use saved preference
    switchLanguage(savedLang);
  } else {
    // Auto-detect user's language
    const detectedLang = detectUserLanguage();
    switchLanguage(detectedLang);
  }
}

/**
 * Set up Joycon help modal functionality
 */
function setupJoyconHelpModal() {
  const joyconHelpIcon = document.getElementById('joyconHelpIcon');
  const modal = document.getElementById('joyconHelpModal');
  const closeBtn = document.getElementById('closeModal');
  
  if (joyconHelpIcon && modal && closeBtn) {
    // Show modal when clicking the help icon
    joyconHelpIcon.addEventListener('click', () => {
      // Set the correct image based on current language
      updateJoyconHelpImage();
      
      // Display the modal
      modal.style.display = 'flex';
    });
    
    // Close modal when clicking the close button
    closeBtn.addEventListener('click', () => {
      modal.style.display = 'none';
    });
    
    // Close modal when clicking outside the modal content
    modal.addEventListener('click', (event) => {
      if (event.target === modal) {
        modal.style.display = 'none';
      }
    });
  }
}

/**
 * Set up Connect help modal functionality
 */
function setupConnectHelpModal() {
  const connectHelpIcon = document.getElementById('connectHelpIcon');
  const modal = document.getElementById('connectHelpModal');
  const closeBtn = document.getElementById('closeConnectModal');
  
  if (connectHelpIcon && modal && closeBtn) {
    // Show modal when clicking the help icon
    connectHelpIcon.addEventListener('click', () => {
      // Update modal elements with current language
      const modalElements = modal.querySelectorAll('[data-i18n]');
      modalElements.forEach(element => {
        const key = element.getAttribute('data-i18n');
        element.textContent = t(key);
      });
      
      // Display the modal
      modal.style.display = 'flex';
    });
    
    // Close modal when clicking the close button
    closeBtn.addEventListener('click', () => {
      modal.style.display = 'none';
    });
    
    // Close modal when clicking outside the modal content
    modal.addEventListener('click', (event) => {
      if (event.target === modal) {
        modal.style.display = 'none';
      }
    });
  }
}

/**
 * Update the Joycon help image based on current language
 */
function updateJoyconHelpImage() {
  const joyconHelpImage = document.getElementById('joyconHelpImage');
  if (joyconHelpImage) {
    joyconHelpImage.src = joyconHelpImages[currentLanguage] || joyconHelpImages.en;
  }
}

/**
 * Toggle between English and Chinese
 */
function toggleLanguage() {
  const newLang = currentLanguage === 'en' ? 'zh' : 'en';
  switchLanguage(newLang);
}

/**
 * Switch to a different language
 * @param {string} lang - Language code ('en' or 'zh')
 */
export function switchLanguage(lang) {
  if (!translations[lang]) {
    console.error(`Language '${lang}' not supported`);
    return;
  }
  
  // Update current language
  currentLanguage = lang;
  
  // Save preference
  localStorage.setItem('bambotLanguage', lang);
  
  // Update toggle button style if needed
  const langToggleBtn = document.getElementById('langToggle');
  if (langToggleBtn) {
    langToggleBtn.classList.toggle('active', lang === 'zh');
  }
  
  // Update all UI elements
  updateUILanguage();
  
  // Update Joycon help image if modal is open
  updateJoyconHelpImage();
  
  // Update connect help modal if it's visible
  const connectHelpModal = document.getElementById('connectHelpModal');
  if (connectHelpModal && connectHelpModal.style.display === 'flex') {
    const modalElements = connectHelpModal.querySelectorAll('[data-i18n]');
    modalElements.forEach(element => {
      const key = element.getAttribute('data-i18n');
      element.textContent = t(key);
    });
  }
}

/**
 * Get translation for a specific key
 * @param {string} key - Translation key
 * @param {Object} params - Parameters for string interpolation
 * @returns {string} Translated text
 */
export function t(key, params = {}) {
  const translation = translations[currentLanguage]?.[key] || translations.en[key] || key;
  
  // Handle string interpolation
  if (params && Object.keys(params).length) {
    return translation.replace(/\${(\w+)}/g, (match, param) => {
      return params[param] !== undefined ? params[param] : match;
    });
  }
  
  return translation;
}

/**
 * Update all UI elements with current language
 */
function updateUILanguage() {
  // Update static elements by their data-i18n attribute
  document.querySelectorAll('[data-i18n]').forEach(element => {
    const key = element.getAttribute('data-i18n');
    element.textContent = t(key);
  });
  
  // Update specific elements without data-i18n
  updateSpecificElements();
}

/**
 * Update specific UI elements that don't use data-i18n
 */
function updateSpecificElements() {
  // Panel header
  const panelHeader = document.querySelector('.panel-header h3');
  if (panelHeader) panelHeader.textContent = t('play-with-bambot');
  
  // Speed control label
  const speedLabel = document.querySelector('.speed-control label');
  if (speedLabel) speedLabel.textContent = t('control-speed');
  
  // Connect button
  const connectBtn = document.getElementById('connectRealRobotBtn');
  if (connectBtn) connectBtn.textContent = t('connect-real-robot');
  
  // Joycon buttons
  const leftJoyconBtn = document.getElementById('connectLeftJoycon');
  const rightJoyconBtn = document.getElementById('connectRightJoycon');
  if (leftJoyconBtn) leftJoyconBtn.textContent = t('connect-left-joycon');
  if (rightJoyconBtn) rightJoyconBtn.textContent = t('connect-right-joycon');
  
  // Section headers
  const keyboardHeader = document.querySelector('#keyboardControlSection .collapsible-header span:first-child');
  const joyconHeader = document.querySelector('#joyconControlSection .collapsible-header span:first-child');
  const servoHeader = document.querySelector('#servoStatusContainer .collapsible-header span:first-child');
  
  if (keyboardHeader) keyboardHeader.textContent = t('keyboard-controls');
  if (joyconHeader) joyconHeader.textContent = t('joycon-controls');
  if (servoHeader) servoHeader.textContent = t('servo-status');
  
  // Table headers
  document.querySelectorAll('th').forEach(th => {
    if (th.textContent === 'Operation') th.textContent = t('operation');
    if (th.textContent === 'Right arm') th.textContent = t('right-arm');
    if (th.textContent === 'Left arm') th.textContent = t('left-arm');
    if (th.textContent === 'Servo') th.textContent = t('servo');
    if (th.textContent === 'Status') th.textContent = t('status');
  });
  
  // Arm control section headers
  document.querySelectorAll('h4').forEach(h4 => {
    if (h4.textContent.trim() === 'Arm Control:') h4.textContent = t('arm-control');
    if (h4.textContent.trim() === 'Movement:') h4.textContent = t('movement');
  });
  
  // Operation names in table
  document.querySelectorAll('td').forEach(td => {
    if (td.textContent === 'Rotation') td.textContent = t('rotation');
    if (td.textContent === 'Pitch') td.textContent = t('pitch');
    if (td.textContent === 'Elbow') td.textContent = t('elbow');
    if (td.textContent === 'Wrist Pitch') td.textContent = t('wrist-pitch');
    if (td.textContent === 'Wrist Roll') td.textContent = t('wrist-roll');
    if (td.textContent === 'Jaw') td.textContent = t('jaw');
    if (td.textContent === 'Forward/Back') td.textContent = t('forward-back');
    if (td.textContent === 'Turn Left/Right') td.textContent = t('turn-left-right');
  });
  
  // Servo names
  document.querySelectorAll('.servo-name').forEach(element => {
    if (element.textContent === 'Left Rotation') element.textContent = t('left-rotation');
    if (element.textContent === 'Left Pitch') element.textContent = t('left-pitch');
    if (element.textContent === 'Left Elbow') element.textContent = t('left-elbow');
    if (element.textContent === 'Left Wrist Pitch') element.textContent = t('left-wrist-pitch');
    if (element.textContent === 'Left Wrist Roll') element.textContent = t('left-wrist-roll');
    if (element.textContent === 'Left Jaw') element.textContent = t('left-jaw');
    if (element.textContent === 'Right Rotation') element.textContent = t('right-rotation');
    if (element.textContent === 'Right Pitch') element.textContent = t('right-pitch');
    if (element.textContent === 'Right Elbow') element.textContent = t('right-elbow');
    if (element.textContent === 'Right Wrist Pitch') element.textContent = t('right-wrist-pitch');
    if (element.textContent === 'Right Wrist Roll') element.textContent = t('right-wrist-roll');
    if (element.textContent === 'Right Jaw') element.textContent = t('right-jaw');
  });
  
  // Help tooltip for connect
  const connectHelp = document.querySelector('#connectHelpIcon .tooltip strong');
  if (connectHelp) connectHelp.textContent = t('connect-help');
  
  // Help tooltip lists for connect
  document.querySelectorAll('#connectHelpIcon .tooltip li').forEach((li, index) => {
    li.textContent = t(`connect-help-${index + 1}`);
  });
  
  // Toggle panel button
  const togglePanel = document.getElementById('togglePanel');
  if (togglePanel) togglePanel.textContent = t('show-controls');
}

// Export current language getter
export function getCurrentLanguage() {
  return currentLanguage;
} 