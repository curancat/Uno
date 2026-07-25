// ==========================================================================
// UNO LEGENDS: MIRACULOUS NEXUS - GAME ENGINE
// ==========================================================================
import { joinRoomFirebase, syncMyNexusHP, listenToRoomState } from './firebase.js';
/* --- 1. BANCO DE DADOS: ITENS --- */
// Baseado exatamente nas suas descrições
const ALL_ITEMS = {
    // ITENS GLOBAIS
    'pocao': { name: 'Poção de Cura', cost: 50, type: 'all', stats: {}, desc: 'Restaura 250 de HP do Nexus.' },
    
    // ITENS DO GALO
    'lacre3000': { name: 'Lacre 3000g', cost: 3000, type: 'galo', stats: { crit: 10, ad: 100 }, desc: 'Colete as almas com menos de 90% da vida atual.' },
    'skate2900': { name: 'Skate 2900g', cost: 2900, type: 'galo', stats: { crit: 5, ad: 60, armor: 40, mr: 30 }, desc: 'Ao causar nojo, paralise inimigos por 3s.' },
    'mandrakit': { name: 'Mandrakit 2400g', cost: 2400, type: 'galo', stats: { crit: 30, ad: 30, ap: 30, mr: 30, bonusHp: 30 }, desc: 'Ao levar dano letal, ganhe 15% de vida extra.' },
    'alma_sebosa': { name: 'Alma Sebosa 3000g', cost: 3000, type: 'galo', stats: { crit: 15, ap: 20 }, desc: 'Escudo que bloqueia CC por 10s.' },
    'pate': { name: 'E o Patê? 2000g', cost: 2000, type: 'galo', stats: { crit: 5, armor: 40, mr: 30 }, desc: 'Atrasa dano em 5s. Se matar antes, anula o dano.' },
    'bota_sapatona': { name: 'Bota (Sapatona) 1000g', cost: 1000, type: 'galo', stats: { crit: 2, pen: 3, ad: 5 }, desc: '+30 Vel. de Spawn de cartas.' },
    
    // ITENS DA CABRA
    'pyton': { name: 'Pyton 2000g', cost: 2000, type: 'cabra', stats: { ad: 20, ap: 100, crit: 3 }, desc: 'Veneno dá dano contínuo por 5s.' },
    'javascript': { name: 'Java Script 2800g', cost: 2800, type: 'cabra', stats: { ap: 80, mr: 20 }, desc: 'Escudo ao ser atingido (Recarga 6min).' },
    'java': { name: 'Java 1900g', cost: 1900, type: 'cabra', stats: { crit: 50, ap: 50, ad: 50 }, desc: 'Cura 5 de vida a cada 20s.' },
    'bf2300': { name: 'BF 2300g', cost: 2300, type: 'cabra', stats: { bonusHp: 200, ad: 20, ap: 40, armor: 50 }, desc: 'Ganha +1 AP para cada 1 de Armadura atual.' },
    'cadelagem': { name: 'Cadelagem 2000g', cost: 2000, type: 'cabra', stats: { ad: 80, ap: 50 }, desc: 'Estou com pena, tome +4 de gold a cada segundo.' },
    'bota_cadelagem': { name: 'Bota (Cadelagem) 1000g', cost: 1000, type: 'cabra', stats: { ap: 3, ad: 4, crit: 5 }, desc: '+20 Vel. de Spawn de carta.' },
    
    // ITENS DA BORBOLETA
    'incubus': { name: 'Incubus 3000g', cost: 3000, type: 'borboleta', stats: { ap: 80, ad: 50, armor: 30 }, desc: 'Recupere vida conforme ataca.' },
    'dono_inferno': { name: 'Dono do Inferno 4000g', cost: 4000, type: 'borboleta', stats: { ad: 20, ap: 80, bonusHp: 300, armor: 90 }, desc: 'Renasça após morte (Recarga 10min).' },
    'fome_luxuria': { name: 'Fome de Luxúria 3500g', cost: 3500, type: 'borboleta', stats: { ap: 110, crit: 40, mr: 40, bonusHp: 100 }, desc: 'Bloqueie uma ação inimiga (Recarga 5min).' },
    'bibi_fogosa': { name: 'Bibi Fogosa 4000g', cost: 4000, type: 'borboleta', stats: { ap: 90, ad: 80 }, desc: 'Nocauteie e dê dano contínuo por 6s.' },
    'vem_com_tudo': { name: 'Vem com Tudo 3900g', cost: 3900, type: 'borboleta', stats: { armor: 100, mr: 100 }, desc: 'Abaixo de 60% de HP, reduz dano em 40%.' },
    'bota_funk': { name: 'Bota (Funk) 1000g', cost: 1000, type: 'borboleta', stats: { ap: 3, bonusHp: 4 }, desc: '+30 Vel. de Spawn de carta.' }
};

/* --- 2. BANCO DE DADOS: DECKS DE CARTAS --- */
const CHAMP_DECKS = {
    'galo': [
        { id: 'ataque', name: 'Auto Ataque', desc: 'Ataque básico (AD). Pode critar.', type: 'ad', multiplier: 1.0 },
        { id: 'marola', name: 'Marola', desc: 'Veneno + Dano Verdadeiro (10% Vida) no 3º hit.', type: 'ad_true', multiplier: 0.5 },
        { id: 'copia', name: 'Dessa cor...', desc: 'Copia a última habilidade.', type: 'utility', multiplier: 1.0 },
        { id: 'aiin', name: 'Aiin', desc: 'Escudo que absorve 1 hit.', type: 'defense', multiplier: 0.0 }
    ],
    'borboleta': [
        { id: 'ataque', name: 'Auto Ataque', desc: 'Ataque básico (AD).', type: 'ad', multiplier: 1.0 },
        { id: 'akuma', name: 'Akuma', desc: 'Nerfa a mão do inimigo.', type: 'debuff', multiplier: 0.5 },
        { id: 'beijo', name: 'Beijo Saliente', desc: 'Drena 5% HP máx por 10s.', type: 'ap_drain', multiplier: 1.0 },
        { id: 'desejo', name: 'Desejo do Pecado', desc: 'Armadilha no deck inimigo.', type: 'utility', multiplier: 0.0 }
    ]
};

const CABRA_DECKS = {
    'vermelho': [
        { id: 'fogo', name: 'Bola de Fogo', desc: 'Dano contínuo por 4s (AP).', type: 'ap_dot', multiplier: 1.2 },
        { id: 'laser', name: 'Laser', desc: 'Tiro de alto dano AP.', type: 'ap', multiplier: 1.8 },
        { id: 'lanca', name: 'Lança Chamas', desc: 'Dano AP em área/crescente.', type: 'ap', multiplier: 1.5 }
    ],
    'amarelo': [
        { id: 'lanterna', name: 'Lanterna', desc: 'Escudo pessoal.', type: 'defense', multiplier: 0 },
        { id: 'lampada', name: 'Lâmpada', desc: 'Escudo no Nexus (10% HP).', type: 'defense_nexus', multiplier: 0 },
        { id: 'sol', name: 'Sol', desc: 'Protege cartas contra destruição.', type: 'utility', multiplier: 0 }
    ],
    'azul': [
        { id: 'pedra', name: 'Pedra', desc: 'Dano híbrido (AD + AP).', type: 'hybrid', multiplier: 1.0 },
        { id: 'chicote', name: 'Chicote', desc: 'Rouba uma carta.', type: 'utility', multiplier: 0 },
        { id: 'agua', name: 'Água', desc: 'Restaura vida.', type: 'heal', multiplier: 1.5 }
    ]
};

/* --- 3. ESTADO GLOBAL DO JOGO (STATE) --- */
let state = {
    player: { name: '', room: '', champ: '' },
    gold: 0,
    baseGps: 5,
    maxHandSize: 8,
    cabraInk: 'vermelho',
    myNexus: { hp: 5000, maxHp: 5000 },
    enemyNexus: { hp: 5000, maxHp: 5000 },
    stats: { ad: 10, ap: 10, armor: 10, mr: 10, crit: 0, vamp: 0, pen: 0, bonusHp: 0 },
    inventory: [],
    hand: [],
    roomChampions: []
};

// Loops
let goldLoop, drawLoop, passiveLoop;
let cardDrawSpeed = 4000; // 4 segundos base

/* --- 4. ELEMENTOS DA DOM --- */
const screens = { lobby: document.getElementById('lobby-screen'), game: document.getElementById('game-screen') };
const ui = {
    myHp: document.getElementById('my-nexus-hp-text'),
    myHpBar: document.getElementById('my-nexus-fill'),
    enemyHp: document.getElementById('enemy-nexus-hp-text'),
    enemyHpBar: document.getElementById('enemy-nexus-fill'),
    gold: document.getElementById('gold-display'),
    gps: document.getElementById('gold-per-sec'),
    log: document.getElementById('action-log'),
    hand: document.getElementById('player-hand'),
    cabraPanel: document.getElementById('cabra-ink-panel'),
    currentInk: document.getElementById('current-ink-display'),
    shopModal: document.getElementById('shop-modal'),
    shopGrid: document.getElementById('shop-grid'),
    inventoryList: document.getElementById('inventory-list')
};
const statsUI = ['ad', 'ap', 'armor', 'mr', 'crit', 'vamp'];

/* --- 5. INICIALIZAÇÃO E EVENTOS --- */
document.querySelectorAll('.champ-card').forEach(card => {
    card.addEventListener('click', (e) => {
        document.querySelectorAll('.champ-card').forEach(c => c.style.borderColor = 'var(--border-color)');
        e.currentTarget.style.borderColor = `var(--theme-${e.currentTarget.dataset.champ})`;
        state.player.champ = e.currentTarget.dataset.champ;
    });
});

document.getElementById('btn-join-game').addEventListener('click', () => {
    state.player.name = document.getElementById('player-name').value || 'Jogador';
    state.player.room = document.getElementById('room-id').value || '1';
    
    if (!state.player.champ) return alert('Selecione um Miraculous!');
    myFirebaseKey = await joinRoomFirebase(
    state.player.room, 
    state.player.name, 
    state.player.champ, 
    state.myNexus.maxHp + state.stats.bonusHp
);
    listenToRoomState(
    state.player.room, 
    myFirebaseKey, 
    (enemyHp, enemyName) => {
        // Callback de HP do Inimigo
        state.enemyNexus.hp = enemyHp;
        updateUI();
    },
    (champsInRoom) => {
        // Callback de Campeões na Sala (Modifica a loja para todos)
        state.roomChampions = champsInRoom;
        populateShop(); 
    }
);
    setupChampionStats();
    switchScreen('game');
    startGame();
});

function switchScreen(target) {
    Object.values(screens).forEach(s => s.classList.remove('active'));
    screens[target].classList.add('active');
}

function setupChampionStats() {
    if (state.player.champ === 'galo') {
        state.stats.ad = 70;
        state.stats.crit = 15;
    } else if (state.player.champ === 'cabra') {
        state.stats.ap = 60;
        state.stats.armor = 20;
        ui.cabraPanel.style.display = 'flex';
        // Cartas base da cabra para não iniciar vazio
        CABRA_DECKS['vermelho'].push({ id: 'ataque', name: 'Auto Ataque', desc: 'Dano (AD)', type: 'ad', multiplier: 1.0 });
    } else if (state.player.champ === 'borboleta') {
        state.stats.ap = 45;
        state.stats.ad = 45;
        state.stats.mr = 30;
    }
}

/* --- 6. MECÂNICAS CENTRAIS --- */
function startGame() {
    log(`Partida iniciada! Você é ${state.player.name}.`);
    updateUI();
    populateShop();

    // Iniciar economia de Gold
    goldLoop = setInterval(() => {
        let extraGold = state.inventory.includes('cadelagem') ? 4 : 0;
        state.gold += state.baseGps + extraGold;
        updateUI();
    }, 1000);

    // Iniciar compra automática de cartas
    startDrawLoop();

    // Passivas de Itens que ativam com o tempo
    passiveLoop = setInterval(() => {
        if (state.inventory.includes('java')) {
            healNexus(5); // Cura 5 a cada 20s (simplificado aqui no loop, verifique timer ideal)
        }
    }, 20000);
}

function startDrawLoop() {
    clearInterval(drawLoop);
    drawLoop = setInterval(() => {
        if (state.hand.length < state.maxHandSize) {
            drawCard();
        }
    }, cardDrawSpeed);
}

function drawCard() {
    let pool = [];
    if (state.player.champ === 'cabra') pool = CABRA_DECKS[state.cabraInk];
    else pool = CHAMP_DECKS[state.player.champ];

    const randomCard = pool[Math.floor(Math.random() * pool.length)];
    state.hand.push(randomCard);
    renderHand();
}

document.getElementById('btn-draw-deck').addEventListener('click', () => {
    if (state.gold >= 100) {
        state.gold -= 100;
        for (let i = 0; i < 3; i++) {
            if (state.hand.length < state.maxHandSize) drawCard();
        }
        updateUI();
    } else {
        alert("Ouro insuficiente (100G necessários).");
    }
});

/* --- 7. TINTAS DA CABRA --- */
document.getElementById('ink-red').addEventListener('click', () => changeCabraInk('vermelho'));
document.getElementById('ink-yellow').addEventListener('click', () => changeCabraInk('amarelo'));
document.getElementById('ink-blue').addEventListener('click', () => changeCabraInk('azul'));

function changeCabraInk(color) {
    state.cabraInk = color;
    ui.currentInk.innerText = color.toUpperCase();
    ui.currentInk.style.color = (color === 'vermelho') ? '#dc2626' : (color === 'amarelo') ? '#eab308' : '#3b82f6';
    
    // Punição: perde o turno (Limpa a mão inteira)
    state.hand = [];
    renderHand();
    log(`Mudou para o deck ${color}! Você perdeu suas cartas (Turno resetado).`);
}

/* --- 8. COMBATE E DANO (Fórmula Estilo LoL) --- */
function useCard(cardIndex) {
    const card = state.hand[cardIndex];
    let damage = 0;
    let isCrit = false;

    // Remove a carta da mão
    state.hand.splice(cardIndex, 1);
    renderHand();

    // 1. Dano Base AD ou AP
    if (card.type.includes('ad')) damage = state.stats.ad * card.multiplier;
    if (card.type.includes('ap')) damage = state.stats.ap * card.multiplier;
    if (card.type === 'hybrid') damage = (state.stats.ad * 0.5) + (state.stats.ap * 0.5);

    // 2. Cálculo de Crítico
    if (card.type.includes('ad') && (Math.random() * 100) <= state.stats.crit) {
        damage *= 1.75; // Dano crítico base
        isCrit = true;
    }

    // 3. Mitigação por Armadura Inimiga (Simulando Inimigo)
    // Multiplicador = 100 / (100 + Armor - Penetration)
    let simEnemyArmor = 40; // Armadura base do inimigo
    let effectiveArmor = Math.max(0, simEnemyArmor - state.stats.pen);
    let mitigation = 100 / (100 + effectiveArmor);
    
    // Aplica o dano
    if (damage > 0) {
        let finalDamage = Math.floor(damage * mitigation);
        dealDamage(finalDamage);
        
        // Vampirismo (Cura baseado no dano causado)
        if (state.stats.vamp > 0) {
            healNexus(finalDamage * (state.stats.vamp / 100));
        }

        log(`Usou ${card.name}! ${isCrit ? '💥 CRÍTICO!' : ''} Causou ${finalDamage} dano.`);
        
        // Animação CSS
        ui.enemyHpBar.parentElement.classList.add('taking-damage');
        setTimeout(() => ui.enemyHpBar.parentElement.classList.remove('taking-damage'), 400);
    } 
    else if (card.type === 'heal') {
        let healAmount = state.stats.ap * card.multiplier;
        healNexus(healAmount);
        log(`Usou ${card.name}! Curou ${Math.floor(healAmount)} HP.`);
    }
    else {
        log(`Usou ${card.name}! Efeito aplicado.`);
    }

    updateUI();
}

function dealDamage(amount) {
    state.enemyNexus.hp = Math.max(0, state.enemyNexus.hp - amount);
    state.gold += 20; // Recompensa por acerto
    if (state.enemyNexus.hp === 0) alert("VITÓRIA! Nexus Inimigo Destruído!");
}

function healNexus(amount) {
    let max = state.myNexus.maxHp + state.stats.bonusHp;
    state.myNexus.hp = Math.min(max, state.myNexus.hp + amount);
}

/* --- 9. RENDERIZAÇÃO DA MÃO --- */
function renderHand() {
    ui.hand.innerHTML = '';
    state.hand.forEach((card, index) => {
        const el = document.createElement('div');
        el.className = `card ${state.player.champ}`;
        el.innerHTML = `
            <div class="card-header">${card.name}</div>
            <div class="card-body">
                <strong>[${card.type.toUpperCase().replace('_', ' ')}]</strong><br>
                ${card.desc}
            </div>
        `;
        el.onclick = () => useCard(index);
        ui.hand.appendChild(el);
    });
}

/* --- 10. SISTEMA DE LOJA E STATUS --- */
document.getElementById('btn-open-shop').addEventListener('click', () => ui.shopModal.classList.add('active'));
document.getElementById('btn-close-shop').addEventListener('click', () => ui.shopModal.classList.remove('active'));

function populateShop() {
    ui.shopGrid.innerHTML = '';
    Object.keys(ALL_ITEMS).forEach(key => {
        const item = ALL_ITEMS[key];

        // O item aparece se for global ('all') OU se o campeão dono do item estiver na sala
        const isGlobal = item.type === 'all';
        const isChampInRoom = state.roomChampions.includes(item.type);

        if (!isGlobal && !isChampInRoom) return;

        const el = document.createElement('div');
        el.className = 'shop-item-card';
        el.innerHTML = `
            <div>
                <h4>${item.name}</h4>
                <p>${item.desc}</p>
                <div style="font-size: 0.7rem; color: #94a3b8;">
                    ${Object.entries(item.stats).map(([k, v]) => `+${v} ${k}`).join(', ')}
                </div>
            </div>
            <button class="btn btn-gold" style="margin-top: 10px;" onclick="buyItem('${key}')">${item.cost} G</button>
        `;
        ui.shopGrid.appendChild(el);
    });
}

window.buyItem = function(key) {
    const item = ALL_ITEMS[key];
    if (state.gold >= item.cost) {
        state.gold -= item.cost;
        
        if (key === 'pocao') {
            healNexus(250);
            log("Comprou Poção! +250 HP.");
        } else {
            state.inventory.push(key);
            applyStats(item.stats, 1);
            checkItemPassives(); // Verifica buffs dinâmicos (ex: speed de cartas)
            renderInventory();
            log(`Adquiriu: ${item.name}`);
        }
        updateUI();
    } else {
        alert("Ouro insuficiente!");
    }
};

window.sellItem = function(index) {
    const key = state.inventory[index];
    const item = ALL_ITEMS[key];
    
    state.gold += Math.floor(item.cost * 0.6); // Vende por 60%
    applyStats(item.stats, -1);
    state.inventory.splice(index, 1);
    
    checkItemPassives();
    renderInventory();
    updateUI();
};

function renderInventory() {
    ui.inventoryList.innerHTML = '';
    state.inventory.forEach((key, index) => {
        const item = ALL_ITEMS[key];
        const el = document.createElement('div');
        el.style.display = 'flex';
        el.style.justifyContent = 'space-between';
        el.style.alignItems = 'center';
        el.style.background = 'var(--bg-dark)';
        el.style.padding = '10px';
        el.style.borderRadius = '5px';
        el.style.border = '1px solid var(--border-color)';
        
        el.innerHTML = `
            <span style="font-weight:bold; font-size: 0.85rem;">${item.name}</span>
            <button class="btn btn-danger" style="padding: 5px 10px; font-size: 0.7rem;" onclick="sellItem(${index})">
                Vender (+${Math.floor(item.cost * 0.6)}G)
            </button>
        `;
        ui.inventoryList.appendChild(el);
    });
}

function applyStats(stats, multiplier) {
    if (!stats) return;
    if (stats.ad) state.stats.ad += stats.ad * multiplier;
    if (stats.ap) state.stats.ap += stats.ap * multiplier;
    if (stats.armor) state.stats.armor += stats.armor * multiplier;
    if (stats.mr) state.stats.mr += stats.mr * multiplier;
    if (stats.crit) state.stats.crit += stats.crit * multiplier;
    if (stats.pen) state.stats.pen += stats.pen * multiplier;
    if (stats.bonusHp) {
        state.stats.bonusHp += stats.bonusHp * multiplier;
        if (multiplier > 0) healNexus(stats.bonusHp);
        else state.myNexus.hp = Math.min(state.myNexus.hp, state.myNexus.maxHp + state.stats.bonusHp);
    }
}

function checkItemPassives() {
    // Passiva da Bota (Speed de cartas)
    const hasBoots = state.inventory.some(i => i.startsWith('bota'));
    cardDrawSpeed = hasBoots ? 2500 : 4000;
    startDrawLoop(); // Reinicia o loop com a nova velocidade
}

/* --- 11. ATUALIZAÇÃO DA INTERFACE (UI) --- */
function updateUI() {
    // Passivas Dinâmicas de Personagem
    if (state.player.champ === 'galo') state.stats.vamp = state.stats.crit;
    
    // Passiva Dinâmica de Item: BF2300 da Cabra (+1 AP por Armadura)
    let dynamicAp = state.stats.ap;
    if (state.inventory.includes('bf2300')) dynamicAp += state.stats.armor;

    // UI Gold
    let extraGps = state.inventory.includes('cadelagem') ? 4 : 0;
    ui.gold.innerText = `${Math.floor(state.gold)} G`;
    ui.gps.innerText = state.baseGps + extraGps;

    // UI Status
    document.getElementById('stat-ad').innerText = Math.floor(state.stats.ad);
    document.getElementById('stat-ap').innerText = Math.floor(dynamicAp);
    document.getElementById('stat-armor').innerText = Math.floor(state.stats.armor);
    document.getElementById('stat-mr').innerText = Math.floor(state.stats.mr);
    document.getElementById('stat-crit').innerText = `${Math.floor(state.stats.crit)}%`;
    document.getElementById('stat-vamp').innerText = `${Math.floor(state.stats.vamp)}%`;

    // UI HP Barras
    let maxMyHp = state.myNexus.maxHp + state.stats.bonusHp;
    ui.myHp.innerText = `${Math.floor(state.myNexus.hp)} / ${maxMyHp}`;
    ui.myHpBar.style.width = `${(state.myNexus.hp / maxMyHp) * 100}%`;

    ui.enemyHp.innerText = `${Math.floor(state.enemyNexus.hp)} / ${state.enemyNexus.maxHp}`;
    ui.enemyHpBar.style.width = `${(state.enemyNexus.hp / state.enemyNexus.maxHp) * 100}%`;
}

function log(msg) {
    ui.log.innerText = msg;
}
