// 皮肤配置 - 使用在线图片链接（暂时）
const SKIN_CONFIGS = {
    default: {
        id: 'default',
        name: '默认皮肤',
        egg: 'https://img.icons8.com/color/160/000000/egg.png',
        eggshell: 'https://img.icons8.com/color/160/000000/broken-egg.png',
        chick: 'https://img.icons8.com/color/80/000000/chicken.png',
        price: 0
    },
    blue: {
        id: 'blue',
        name: '寒带鸡蛋',
        egg: 'https://img.icons8.com/color/160/000000/egg--v1.png',
        eggshell: 'https://img.icons8.com/color/160/000000/broken-egg--v1.png',
        chick: 'https://img.icons8.com/color/80/000000/chicken--v1.png',
        price: 100
    },
    brown: {
        id: 'brown',
        name: '热带鸡蛋',
        egg: 'https://img.icons8.com/color/160/000000/egg--v2.png',
        eggshell: 'https://img.icons8.com/color/160/000000/broken-egg--v2.png',
        chick: 'https://img.icons8.com/color/80/000000/chicken--v2.png',
        price: 500
    }
};

// 游戏常量
const DIFFICULTY_REWARDS = { 
    easy: 1, 
    normal: 15, 
    hard: 150 
};

const DIFFICULTY_CLICKS = {
    easy: 100,
    normal: 1000,
    hard: 10000
};

const STAGE_MESSAGES = [
    "点击就能敲开鸡蛋辣 😊", 
    "蛋壳悄悄裂了一丢丢小缝啦~ 🤏", 
    "加油敲！鸡蛋已经开始瑟瑟发抖咯 😨",
    "裂缝变宽咯，再努努力就能看到小蛋黄啦 👀", 
    "半程打卡！蛋壳摇摇欲坠，胜利一半咯~ 🎯",
    "哐哐敲！鸡蛋君的\"保护罩\"快扛不住啦 🛡️", 
    "哇！能看到一点点黄黄的蛋黄边边咯 🤩",
    "蛋壳大裂缝！再敲敲就要完全爆开啦 💥", 
    "最后冲刺前的热身！鸡蛋已经准备\"投降\"咯 🏁", 
    "鸡蛋里又有什么惊喜呢 🎁"
];

const SECRET_KEY = 'EggGame2025SecretKey_v1.5';
const DEVELOPER_PASSWORD = '这里没有密码';

// 游戏状态
let gameState = {
    coins: 0,
    unlockedSkins: ['default'],
    currentSkin: 'default',
    clickCount: 0,
    targetClicks: DIFFICULTY_CLICKS.normal,
    currentStage: 0,
    authorClickCount: 0,
    currentDifficulty: 'normal',
    isDevMode: false,
    isBrowserExpanded: false
};

let audioContext = null;
let noiseBuffer = null;
let skinOptionsRendered = false;

// 加密/解密函数
function encrypt(data) {
    try {
        const jsonStr = JSON.stringify(data);
        let result = '';
        for (let i = 0; i < jsonStr.length; i++) {
            result += String.fromCharCode(
                jsonStr.charCodeAt(i) ^ SECRET_KEY.charCodeAt(i % SECRET_KEY.length)
            );
        }
        return btoa(result);
    } catch(e) { 
        console.error('加密失败:', e);
        return null; 
    }
}

function decrypt(encrypted) {
    try {
        const decoded = atob(encrypted);
        let result = '';
        for (let i = 0; i < decoded.length; i++) {
            result += String.fromCharCode(
                decoded.charCodeAt(i) ^ SECRET_KEY.charCodeAt(i % SECRET_KEY.length)
            );
        }
        return JSON.parse(result);
    } catch(e) { 
        console.error('解密失败:', e);
        return null; 
    }
}

// 存档管理
function saveGame() {
    try {
        const data = {
            coins: gameState.coins,
            unlockedSkins: gameState.unlockedSkins,
            currentSkin: gameState.currentSkin,
            timestamp: Date.now()
        };
        const encrypted = encrypt(data);
        if (encrypted) {
            localStorage.setItem('eggGameSave', encrypted);
            updateCoinDisplay();
        }
    } catch (error) {
        console.error('保存游戏失败:', error);
    }
}

function loadGame() {
    try {
        const encrypted = localStorage.getItem('eggGameSave');
        if (encrypted) {
            const data = decrypt(encrypted);
            if (data) {
                gameState.coins = data.coins || 0;
                gameState.unlockedSkins = data.unlockedSkins || ['default'];
                gameState.currentSkin = data.currentSkin || 'default';
            }
        }
        applySkin();
        updateCoinDisplay();
    } catch (error) {
        console.error('加载游戏失败:', error);
    }
}

function updateCoinDisplay() {
    const coinCountElement = document.getElementById('coinCount');
    if (coinCountElement) {
        coinCountElement.textContent = gameState.coins;
    }
}

// 界面切换函数
function switchScreen(hideId, showId, showCoin = false) {
    try {
        const hideEl = document.getElementById(hideId);
        const showEl = document.getElementById(showId);
        
        if (!hideEl || !showEl) return;
        
        hideEl.classList.remove('show');
        setTimeout(() => {
            hideEl.style.display = 'none';
            showEl.style.display = showId === 'gameContainer' ? 'flex' : 'block';
            
            const coinDisplay = document.getElementById('coinDisplay');
            if (showCoin && coinDisplay) {
                coinDisplay.classList.add('show');
            }
            
            setTimeout(() => showEl.classList.add('show'), 10);
        }, 50);
    } catch (error) {
        console.error('切换界面失败:', error);
    }
}

function showModeSelect() {
    switchScreen('mainMenu', 'modeSelect');
    document.getElementById('coinDisplay').classList.remove('show');
    hideSaveButton();
    document.getElementById('authorInfoBtn').style.display = 'none';
}

function showSkinSelect() {
    switchScreen('mainMenu', 'skinSelect', true);
    hideSaveButton();
    document.getElementById('authorInfoBtn').style.display = 'none';
    
    if (!skinOptionsRendered) {
        renderSkinOptions();
        skinOptionsRendered = true;
    } else {
        updateSkinSelection();
    }
}

function backToMain() {
    try {
        // 隐藏所有游戏界面
        const screens = ['modeSelect', 'skinSelect', 'gameContainer'];
        screens.forEach(screen => {
            const el = document.getElementById(screen);
            if (el) {
                el.classList.remove('show');
                el.style.display = 'none';
            }
        });
        
        // 显示主菜单
        const mainMenu = document.getElementById('mainMenu');
        mainMenu.style.display = 'block';
        setTimeout(() => mainMenu.classList.add('show'), 10);
        
        // 隐藏金币显示
        const coinDisplay = document.getElementById('coinDisplay');
        if (coinDisplay) coinDisplay.classList.remove('show');
        
        showSaveButton();
        const authorBtn = document.getElementById('authorInfoBtn');
        if (authorBtn) authorBtn.style.display = 'flex';
        
        stopGame();
    } catch (error) {
        console.error('返回主菜单失败:', error);
    }
}

// 显示/隐藏存档按钮
function showSaveButton() {
    const saveBtn = document.getElementById('saveBtnSphere');
    if (saveBtn) saveBtn.classList.add('show');
}

function hideSaveButton() {
    const saveBtn = document.getElementById('saveBtnSphere');
    if (saveBtn) saveBtn.classList.remove('show');
}

// 皮肤管理
function renderSkinOptions() {
    try {
        const container = document.getElementById('skinOptions');
        if (!container) return;
        
        container.innerHTML = '';
        
        Object.values(SKIN_CONFIGS).forEach((skin) => {
            const isLocked = !gameState.unlockedSkins.includes(skin.id);
            const isSelected = gameState.currentSkin === skin.id;
            const div = document.createElement('div');
            div.className = `skin-option ${isLocked ? 'locked' : ''} ${isSelected ? 'selected' : ''}`;
            div.dataset.skinId = skin.id;
            div.onclick = () => selectSkin(skin.id);
            
            div.innerHTML = `
                <div class="skin-left">
                    <div class="skin-preview">
                        <img src="${skin.egg}" alt="${skin.name}" class="${isLocked ? 'locked-img' : ''}">
                    </div>
                    <div class="skin-info">
                        <div class="skin-name">${skin.name}</div>
                    </div>
                </div>
                <div class="skin-right">
                    ${isLocked ? `
                        <img src="https://img.icons8.com/ios-filled/24/000000/lock.png" class="lock-icon" alt="锁定">
                        <span class="skin-price">
                            <img src="https://img.icons8.com/ios-filled/20/000000/coin.png" class="price-coin" alt="金币">
                            ${skin.price}
                        </span>
                    ` : '<span class="owned-text">已拥有</span>'}
                    ${isSelected ? '<span class="skin-check">✓</span>' : ''}
                </div>
            `;
            container.appendChild(div);
        });
    } catch (error) {
        console.error('渲染皮肤选项失败:', error);
    }
}

function updateSkinSelection() {
    try {
        document.querySelectorAll('.skin-option').forEach(option => {
            const skinId = option.dataset.skinId;
            const skin = SKIN_CONFIGS[skinId];
            if (!skin) return;
            
            const isLocked = !gameState.unlockedSkins.includes(skinId);
            const isSelected = gameState.currentSkin === skinId;
            
            // 更新类名
            option.className = `skin-option ${isLocked ? 'locked' : ''} ${isSelected ? 'selected' : ''}`;
            
            // 更新图片锁定状态
            const leftImg = option.querySelector('.skin-preview img');
            if (leftImg) {
                if (isLocked) {
                    leftImg.classList.add('locked-img');
                } else {
                    leftImg.classList.remove('locked-img');
                }
            }
            
            // 更新右侧内容
            const rightDiv = option.querySelector('.skin-right');
            if (rightDiv) {
                if (isLocked) {
                    rightDiv.innerHTML = `
                        <img src="https://img.icons8.com/ios-filled/24/000000/lock.png" class="lock-icon" alt="锁定">
                        <span class="skin-price">
                            <img src="https://img.icons8.com/ios-filled/20/000000/coin.png" class="price-coin" alt="金币">
                            ${skin.price}
                        </span>
                    `;
                } else {
                    rightDiv.innerHTML = '<span class="owned-text">已拥有</span>';
                    if (isSelected) {
                        const check = document.createElement('span');
                        check.className = 'skin-check';
                        check.textContent = '✓';
                        rightDiv.appendChild(check);
                    }
                }
            }
        });
    } catch (error) {
        console.error('更新皮肤选择失败:', error);
    }
}

function selectSkin(skinId) {
    try {
        const skin = SKIN_CONFIGS[skinId];
        if (!skin) {
            console.error('皮肤不存在:', skinId);
            return;
        }
        
        // 检查是否已解锁
        if (!gameState.unlockedSkins.includes(skinId)) {
            if (gameState.coins >= skin.price) {
                if (confirm(`花费 ${skin.price} 金币购买 ${skin.name}？`)) {
                    gameState.coins -= skin.price;
                    gameState.unlockedSkins.push(skinId);
                    saveGame();
                    updateSkinSelection();
                }
            } else {
                alert(`金币不足！需要 ${skin.price} 金币`);
            }
            return;
        }
        
        // 应用选中的皮肤
        gameState.currentSkin = skinId;
        saveGame();
        applySkin();
        updateSkinSelection();
    } catch (error) {
        console.error('选择皮肤失败:', error);
    }
}

function applySkin() {
    try {
        const skin = SKIN_CONFIGS[gameState.currentSkin];
        if (!skin) {
            console.error('当前皮肤不存在:', gameState.currentSkin);
            return;
        }
        
        const egg = document.getElementById('egg');
        const eggshell = document.getElementById('eggshell');
        const chick = document.getElementById('chick');
        
        if (egg) egg.src = skin.egg;
        if (eggshell) eggshell.src = skin.eggshell;
        if (chick) chick.src = skin.chick;
    } catch (error) {
        console.error('应用皮肤失败:', error);
    }
}

// 游戏逻辑
function selectMode(mode) {
    try {
        gameState.currentDifficulty = mode;
        gameState.targetClicks = DIFFICULTY_CLICKS[mode] || DIFFICULTY_CLICKS.normal;
        gameState.clickCount = 0;
        gameState.currentStage = 0;
        
        switchScreen('modeSelect', 'gameContainer');
        
        // 重置游戏界面
        document.getElementById('message').textContent = '点击就能敲开鸡蛋辣 😊';
        document.getElementById('message').classList.remove('success-message');
        document.getElementById('remaining').style.display = 'block';
        document.getElementById('endMenuBtn').classList.remove('show');
        document.getElementById('devMode').classList.remove('show');
        document.getElementById('musicHintText').style.display = 'none';
        document.getElementById('egg').style.display = 'block';
        document.getElementById('chick').style.display = 'none';
        document.getElementById('eggshell').style.display = 'none';
        document.getElementById('chick').classList.remove('chick-jumping');
        
        applySkin();
        initAudio();
        updateDisplay();
        generateJumpButtons();
        
        // 绑定点击事件
        const egg = document.getElementById('egg');
        if (egg) {
            egg.onclick = handleEggClick;
            egg.ontouchstart = (e) => { 
                e.preventDefault(); 
                handleEggClick(e); 
            };
        }
    } catch (error) {
        console.error('选择模式失败:', error);
    }
}

function handleEggClick(e) {
    e.preventDefault();
    
    // 检查游戏是否已结束
    if (gameState.clickCount >= gameState.targetClicks) return;
    
    gameState.clickCount++;
    
    // 播放音效
    const soundStage = Math.min(
        Math.floor(((gameState.clickCount - 1) / gameState.targetClicks) * 10), 
        9
    );
    createEggTapSound(soundStage);
    
    // 鸡蛋点击动画
    const egg = document.getElementById('egg');
    if (egg) {
        egg.style.transform = 'scale(1.3)';
        setTimeout(() => egg.style.transform = 'scale(1)', 100);
    }
    
    updateDisplay();
    
    // 检查是否获胜
    if (gameState.clickCount >= gameState.targetClicks) {
        gameWin();
    }
}

function updateDisplay() {
    try {
        // 计算当前阶段
        const stage = Math.min(
            Math.floor((gameState.clickCount / gameState.targetClicks) * 10), 
            9
        );
        
        // 更新消息（如果阶段变化）
        if (stage !== gameState.currentStage) {
            gameState.currentStage = stage;
            const messageElement = document.getElementById('message');
            if (messageElement && STAGE_MESSAGES[stage]) {
                messageElement.textContent = STAGE_MESSAGES[stage];
            }
        }
        
        // 更新剩余点击次数
        const remaining = gameState.targetClicks - gameState.clickCount;
        const remainingElement = document.getElementById('remaining');
        if (remainingElement) {
            remainingElement.textContent = remaining > 0 ? `再敲${remaining}下才能敲碎辣` : '';
        }
    } catch (error) {
        console.error('更新显示失败:', error);
    }
}

function gameWin() {
    try {
        const reward = DIFFICULTY_REWARDS[gameState.currentDifficulty] || 0;
        
        // 显示小鸡和蛋壳
        document.getElementById('egg').style.display = 'none';
        document.getElementById('chick').style.display = 'block';
        document.getElementById('eggshell').style.display = 'block';
        document.getElementById('chick').classList.add('chick-jumping');
        document.getElementById('remaining').style.display = 'none';
        
        // 更新消息
        const messageElement = document.getElementById('message');
        if (messageElement) {
            messageElement.textContent = '哇，终于敲开了！ 🎉';
            messageElement.classList.add('success-message');
        }
        
        // 显示金币获得动画
        const coinDisplay = document.getElementById('coinDisplay');
        if (coinDisplay) {
            coinDisplay.classList.remove('hide-up');
            coinDisplay.style.display = 'flex';
            coinDisplay.style.animation = 'slideInRight 0.5s cubic-bezier(0.68, -0.55, 0.265, 1.55)';
        }
        
        // 延迟显示金币获得效果
        setTimeout(() => {
            const eggWrapper = document.querySelector('.egg-wrapper');
            if (eggWrapper) {
                const eggRect = eggWrapper.getBoundingClientRect();
                showCoinEarned(eggRect.left + 80, eggRect.top + 40, reward);
            }
            
            // 增加金币
            setTimeout(() => {
                gameState.coins += reward;
                saveGame();
                
                // 隐藏金币显示动画
                setTimeout(() => {
                    if (coinDisplay) {
                        coinDisplay.classList.add('hide-up');
                        setTimeout(() => {
                            coinDisplay.style.display = 'none';
                            coinDisplay.classList.remove('hide-up');
                            coinDisplay.style.animation = '';
                        }, 500);
                    }
                }, 2000);
            }, 800);
        }, 500);
        
        // 显示唱片和返回按钮
        setTimeout(() => {
            const record = document.getElementById('recordPlayer');
            if (record) {
                record.style.display = 'block';
                setTimeout(() => record.classList.add('show'), 100);
            }
            
            document.getElementById('musicHintText').style.display = 'block';
            document.getElementById('endMenuBtn').classList.add('show');
        }, 1000);
    } catch (error) {
        console.error('游戏胜利处理失败:', error);
    }
}

function showCoinEarned(x, y, amount) {
    try {
        const coinDiv = document.createElement('div');
        coinDiv.className = 'coin-earned';
        coinDiv.style.left = x + 'px';
        coinDiv.style.top = y + 'px';
        coinDiv.innerHTML = `<img src="https://img.icons8.com/ios-filled/32/000000/coin.png"> +${amount}`;
        document.body.appendChild(coinDiv);
        
        // 动画效果
        setTimeout(() => {
            coinDiv.style.transition = 'all 1s ease-in-out';
            coinDiv.style.left = 'auto';
            coinDiv.style.right = '20px';
            coinDiv.style.top = '20px';
            coinDiv.style.opacity = '0';
            coinDiv.style.transform = 'scale(0.5)';
        }, 50);
        
        // 移除元素
        setTimeout(() => coinDiv.remove(), 1000);
    } catch (error) {
        console.error('显示金币获得失败:', error);
    }
}

function stopGame() {
    try {
        // 重置游戏元素
        const elements = {
            egg: document.getElementById('egg'),
            chick: document.getElementById('chick'),
            eggshell: document.getElementById('eggshell'),
            message: document.getElementById('message'),
            recordPlayer: document.getElementById('recordPlayer'),
            endMenuBtn: document.getElementById('endMenuBtn'),
            musicHintText: document.getElementById('musicHintText'),
            coinDisplay: document.getElementById('coinDisplay'),
            devMode: document.getElementById('devMode')
        };
        
        // 重置每个元素的状态
        if (elements.egg) elements.egg.style.display = 'block';
        if (elements.chick) {
            elements.chick.style.display = 'none';
            elements.chick.classList.remove('chick-jumping');
        }
        if (elements.eggshell) elements.eggshell.style.display = 'none';
        if (elements.message) elements.message.classList.remove('success-message');
        if (elements.recordPlayer) {
            elements.recordPlayer.style.display = 'none';
            elements.recordPlayer.classList.remove('show');
        }
        if (elements.endMenuBtn) {
            elements.endMenuBtn.classList.remove('show');
            elements.endMenuBtn.classList.remove('morphed');
        }
        if (elements.musicHintText) elements.musicHintText.style.display = 'none';
        if (elements.coinDisplay) {
            elements.coinDisplay.style.display = 'none';
            elements.coinDisplay.classList.remove('hide-up');
            elements.coinDisplay.style.animation = '';
        }
        if (elements.devMode) elements.devMode.classList.remove('show');
        
        // 关闭音乐浏览器
        closeMusicBrowser();
    } catch (error) {
        console.error('停止游戏失败:', error);
    }
}

function returnToMenu() {
    stopGame();
    backToMain();
}

// 音乐浏览器功能
function toggleMusicBrowser() {
    gameState.isBrowserExpanded ? collapseMusicBrowser() : expandMusicBrowser();
}

function expandMusicBrowser() {
    try {
        const browser = document.getElementById('musicBrowser');
        const iframe = document.getElementById('musicIframe');
        const record = document.getElementById('recordPlayer');
        const endBtn = document.getElementById('endMenuBtn');
        
        if (!browser || !record) return;
        
        if (browser.style.display !== 'flex') {
            browser.style.display = 'flex';
            if (iframe && iframe.src === 'about:blank') {
                iframe.src = 'https://music.163.com/song?id=2717690420';
            }
        }
        
        setTimeout(() => browser.classList.add('open'), 10);
        record.classList.add('playing', 'opened');
        
        if (endBtn && endBtn.classList.contains('show')) {
            endBtn.classList.add('morphed');
        }
        
        document.getElementById('gameContainer').classList.add('shifted');
        gameState.isBrowserExpanded = true;
    } catch (error) {
        console.error('展开音乐浏览器失败:', error);
    }
}

function collapseMusicBrowser() {
    try {
        const browser = document.getElementById('musicBrowser');
        const record = document.getElementById('recordPlayer');
        const endBtn = document.getElementById('endMenuBtn');
        
        if (!browser || !record) return;
        
        record.classList.remove('opened');
        browser.classList.remove('open');
        document.getElementById('gameContainer').classList.remove('shifted');
        
        if (endBtn) endBtn.classList.remove('morphed');
        gameState.isBrowserExpanded = false;
    } catch (error) {
        console.error('收起音乐浏览器失败:', error);
    }
}

function closeMusicBrowser() {
    try {
        const browser = document.getElementById('musicBrowser');
        const iframe = document.getElementById('musicIframe');
        const record = document.getElementById('recordPlayer');
        const endBtn = document.getElementById('endMenuBtn');
        
        if (!browser || !record) return;
        
        record.classList.remove('opened', 'playing');
        browser.classList.remove('open');
        document.getElementById('gameContainer').classList.remove('shifted');
        
        if (endBtn) endBtn.classList.remove('morphed');
        
        setTimeout(() => {
            browser.style.display = 'none';
            if (iframe) iframe.src = 'about:blank';
            gameState.isBrowserExpanded = false;
        }, 400);
    } catch (error) {
        console.error('关闭音乐浏览器失败:', error);
    }
}

// 开发者模式
function generateJumpButtons() {
    try {
        const container = document.getElementById('jumpButtonsContainer');
        if (!container) return;
        
        container.innerHTML = '';
        
        for (let i = 0; i < 10; i++) {
            const remaining = Math.floor(gameState.targetClicks * 0.1 * (9 - i)) + 1;
            const btn = document.createElement('button');
            btn.textContent = `-${remaining}`;
            btn.onclick = () => {
                gameState.clickCount = Math.max(0, gameState.targetClicks - remaining);
                updateDisplay();
            };
            container.appendChild(btn);
        }
    } catch (error) {
        console.error('生成跳转按钮失败:', error);
    }
}

function closeDevModeFromGame() {
    gameState.isDevMode = false;
    gameState.authorClickCount = 0;
    document.getElementById('devMode').classList.remove('show');
}

function applyDevSettings() {
    try {
        // 更新金币
        const coinsInput = document.getElementById('devCoins');
        if (coinsInput) {
            gameState.coins = parseInt(coinsInput.value) || 0;
        }
        
        // 更新皮肤解锁状态
        const unlockBlue = document.getElementById('devUnlockBlue').value === 'true';
        const unlockBrown = document.getElementById('devUnlockBrown').value === 'true';
        
        // 处理蓝色皮肤
        if (unlockBlue) {
            if (!gameState.unlockedSkins.includes('blue')) {
                gameState.unlockedSkins.push('blue');
            }
        } else {
            gameState.unlockedSkins = gameState.unlockedSkins.filter(s => s !== 'blue');
        }
        
        // 处理棕色皮肤
        if (unlockBrown) {
            if (!gameState.unlockedSkins.includes('brown')) {
                gameState.unlockedSkins.push('brown');
            }
        } else {
            gameState.unlockedSkins = gameState.unlockedSkins.filter(s => s !== 'brown');
        }
        
        saveGame();
        alert('设置已应用！');
    } catch (error) {
        console.error('应用开发者设置失败:', error);
        alert('应用设置失败，请检查控制台！');
    }
}

function forceExitGame() {
    if (confirm('确定要强制退出游戏吗？未保存的进度将丢失。')) {
        stopGame();
        backToMain();
    }
}

// 存档管理界面
function openSaveManager() {
    try {
        document.getElementById('saveManager').classList.add('show');
        document.getElementById('mainMenu').classList.remove('show');
        document.getElementById('authorInfoBtn').style.display = 'none';
        
        setTimeout(() => {
            document.getElementById('mainMenu').style.display = 'none';
        }, 100);
        
        document.getElementById('saveTextarea').value = localStorage.getItem('eggGameSave') || '';
    } catch (error) {
        console.error('打开存档管理器失败:', error);
    }
}

function closeSaveManager() {
    try {
        document.getElementById('saveManager').classList.remove('show');
        setTimeout(() => {
            document.getElementById('mainMenu').style.display = 'block';
            document.getElementById('authorInfoBtn').style.display = 'flex';
            setTimeout(() => document.getElementById('mainMenu').classList.add('show'), 10);
        }, 100);
    } catch (error) {
        console.error('关闭存档管理器失败:', error);
    }
}

function exportSaveData() {
    try {
        const encrypted = localStorage.getItem('eggGameSave');
        const textarea = document.getElementById('saveTextarea');
        
        if (encrypted && textarea) {
            textarea.value = encrypted;
            alert('存档已导出到文本框，请复制保存！');
        } else {
            alert('没有存档数据！');
        }
    } catch (error) {
        console.error('导出存档失败:', error);
        alert('导出存档失败！');
    }
}

function importSaveData() {
    try {
        const textarea = document.getElementById('saveTextarea');
        if (!textarea) return;
        
        const data = textarea.value.trim();
        if (!data) {
            alert('请先在文本框粘贴存档数据！');
            return;
        }
        
        const decrypted = decrypt(data);
        if (decrypted && typeof decrypted.coins === 'number') {
            if (confirm('确定要导入此存档吗？将覆盖当前进度！')) {
                localStorage.setItem('eggGameSave', data);
                loadGame();
                alert('存档导入成功！');
                closeSaveManager();
            }
        } else {
            alert('存档数据无效或已损坏！');
        }
    } catch (error) {
        console.error('导入存档失败:', error);
        alert('导入存档失败，数据格式错误！');
    }
}

function resetSaveData() {
    if (confirm('确定要重置所有存档吗？此操作不可恢复！')) {
        try {
            localStorage.removeItem('eggGameSave');
            gameState.coins = 0;
            gameState.unlockedSkins = ['default'];
            gameState.currentSkin = 'default';
            saveGame();
            applySkin();
            skinOptionsRendered = false;
            alert('存档已重置！');
            
            const textarea = document.getElementById('saveTextarea');
            if (textarea) textarea.value = '';
        } catch (error) {
            console.error('重置存档失败:', error);
            alert('重置存档失败！');
        }
    }
}

// 作者信息模态框
function openAuthorModal() {
    try {
        document.getElementById('authorModal').classList.add('show');
    } catch (error) {
        console.error('打开作者信息失败:', error);
    }
}

function closeAuthorModal() {
    try {
        document.getElementById('authorModal').classList.remove('show');
    } catch (error) {
        console.error('关闭作者信息失败:', error);
    }
}

// 音频处理
function initAudio() {
    if (audioContext) return;
    
    try {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const bufferSize = audioContext.sampleRate * 2;
        noiseBuffer = audioContext.createBuffer(1, bufferSize, audioContext.sampleRate);
        const output = noiseBuffer.getChannelData(0);
        
        for (let i = 0; i < bufferSize; i++) {
            output[i] = Math.random() * 2 - 1;
        }
    } catch (e) {
        console.error('音频初始化失败:', e);
    }
}

function createEggTapSound(stageIndex) {
    if (!audioContext) return;
    
    try {
        // 不同阶段的音效参数
        const paramsArray = [
            { freq: 800, duration: 0.06, noise: 0, q: 8 },
            { freq: 770, duration: 0.065, noise: 0.02, q: 7.5 },
            { freq: 740, duration: 0.07, noise: 0.05, q: 7 },
            { freq: 710, duration: 0.075, noise: 0.08, q: 6.5 },
            { freq: 680, duration: 0.08, noise: 0.1, q: 6 },
            { freq: 650, duration: 0.085, noise: 0.12, q: 5.5 },
            { freq: 620, duration: 0.09, noise: 0.15, q: 5 },
            { freq: 590, duration: 0.095, noise: 0.18, q: 4.5 },
            { freq: 560, duration: 0.1, noise: 0.2, q: 4 },
            { freq: 530, duration: 0.11, noise: 0.22, q: 3.8 }
        ];
        
        const params = paramsArray[stageIndex] || paramsArray[0];
        const now = audioContext.currentTime;
        
        // 创建振荡器
        const osc = audioContext.createOscillator();
        const gain = audioContext.createGain();
        const filter = audioContext.createBiquadFilter();
        
        // 配置振荡器
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(params.freq, now);
        
        // 配置滤波器
        filter.frequency.value = params.freq * 3;
        filter.Q.value = params.q;
        
        // 配置增益（音量）
        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(0.4, now + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.001, now + params.duration);
        
        // 连接音频节点
        osc.connect(filter);
        filter.connect(gain);
        gain.connect(audioContext.destination);
        
        // 播放音效
        osc.start(now);
        osc.stop(now + params.duration);
    } catch (e) {
        console.error('音效播放失败:', e);
    }
}

// 初始化
document.addEventListener('DOMContentLoaded', () => {
    try {
        // 加载游戏数据
        loadGame();
        applySkin();
        showSaveButton();
        
        // 设置作者信息点击事件（开发者模式）
        const authorInfo = document.getElementById('authorInfo');
        if (authorInfo) {
            authorInfo.addEventListener('click', () => {
                if (gameState.isDevMode) {
                    closeDevModeFromGame();
                    return;
                }
                
                gameState.authorClickCount++;
                
                if (gameState.authorClickCount === 5) {
                    const pwd = prompt('请输入密码：');
                    if (pwd === DEVELOPER_PASSWORD) {
                        gameState.isDevMode = true;
                        document.getElementById('devMode').classList.add('show');
                        
                        // 设置开发者模式表单值
                        document.getElementById('devCoins').value = gameState.coins;
                        document.getElementById('devUnlockBlue').value = 
                            gameState.unlockedSkins.includes('blue');
                        document.getElementById('devUnlockBrown').value = 
                            gameState.unlockedSkins.includes('brown');
                        
                        generateJumpButtons();
                        alert('已进入开发者模式！');
                    } else {
                        gameState.authorClickCount = 0;
                        alert('密码错误！');
                    }
                }
            });
        }
        
        // 初始化音频（用户第一次点击时）
        document.addEventListener('click', function initAudioOnce() {
            initAudio();
            document.removeEventListener('click', initAudioOnce);
        }, { once: true });
        
    } catch (error) {
        console.error('初始化失败:', error);
        alert('游戏初始化失败，请刷新页面重试！');
    }
});
