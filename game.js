// ==========================================================================
// UNO LEGENDS: MIRACULOUS NEXUS - GAME ENGINE DEFINITIVA
// ==========================================================================
import { joinRoomFirebase, syncMyNexusHP, listenToRoomState } from './firebase.js';

/* ==========================================================================
   1. BANCO DE DADOS: ITENS, MINIONS E CARTAS DE CAMPEÕES
   ========================================================================== */
const ALL_ITEMS = {
    // Globais
    'pocao': { name: 'Poção de Cura', cost: 50, type: 'all', stats: {}, desc: 'Restaura 250 de HP do Nexus.' },

    // Galo
    'lacre3000': { name: 'Lacre 3000g', cost: 3000, type: 'galo', stats: { crit: 10, ad: 100 }, desc: 'Colete almas com menos de 90% da vida.' },
    'skate2900': { name: 'Skate 2900g', cost: 2900, type: 'galo', stats: { crit: 5, ad: 60, armor: 40, mr: 30 }, desc: 'Paralisa inimigos por 3s ao causar nojo.' },
    'mandrakit': { name: 'Mandrakit 2400g', cost: 2400, type: 'galo', stats: { crit: 30, ad: 30, ap: 30, mr: 30, bonusHp: 30 }, desc: 'Ganhe +15% de vida ao levar dano letal.' },
    'alma_sebosa': { name: 'Alma Sebosa 3000g', cost: 3000, type: 'galo', stats: { crit: 15, ap: 20 }, desc: 'Bloqueie CC por 10s.' },
    'pate': { name: 'E o Patê? 2000g', cost: 2000, type: 'galo', stats: { crit: 5, armor: 40, mr: 30 }, desc: 'Atrasa dano inimigo por 5s.' },
    'bota_sapatona': { name: 'Bota (Sapatona) 1000g', cost: 1000, type: 'galo', stats: { crit: 2, pen: 3, ad: 5 }, desc: '+30 Vel. de Spawn e +5 AD.' },

    // Cabra
    'pyton': { name: 'Pyton 2000g', cost: 2000, type: 'cabra', stats: { ad: 20, ap: 100, crit: 3 }, desc: 'Veneno causa dano contínuo por 5s.' },
    'javascript': { name: 'Java Script 2800g', cost: 2800, type: 'cabra', stats: { ap: 80, mr: 20 }, desc: 'Ganha escudo ao ser atingido (4s).' },
    'java': { name: 'Java 1900g', cost: 1900, type: 'cabra', stats: { crit: 50, ap: 50, ad: 50 }, desc: 'Cura 5 de vida a cada 20s.' },
    'bf2300': { name: 'BF 2300g', cost: 2300, type: 'cabra', stats: { bonusHp: 200, ad: 20, ap: 40, armor: 50 }, desc: '+1 AP para cada 1 de Armadura.' },
    'cadelagem': { name: 'Cadelagem 2000g', cost: 2000, type: 'cabra', stats: { ad: 80, ap: 50 }, desc: '+4 de gold por segundo.' },
    'bota_cadelagem': { name: 'Bota (Cadelagem) 1000g', cost: 1000, type: 'cabra', stats: { ap: 3, ad: 4, crit: 5 }, desc: '+20 Vel. de carta.' },

    // Borboleta
    'incubus': { name: 'Incubus 3000g', cost: 3000, type: 'borboleta', stats: { ap: 80, ad: 50, armor: 30 }, desc: 'Recupere vida ao atacar com borboletas.' },
    'dono_inferno': { name: 'Dono do Inferno 4000g', cost: 4000, type: 'borboleta', stats: { ad: 20, ap: 80, bonusHp: 300, armor: 90 }, desc: 'Renasça após a morte (10 min CD).' },
    'fome_luxuria': { name: 'Fome de Luxúria 3500g', cost: 3500, type: 'borboleta', stats: { ap: 110, crit: 40, mr: 40, bonusHp: 100 }, desc: 'Bloqueie uma ação inimiga a cada 5 min.' },
    'bibi_fogosa': { name: 'Bibi Fogosa 4000g', cost: 4000, type: 'borboleta', stats: { ap: 90, ad: 80 }, desc: 'Nocauteie e dê dano contínuo por 6s.' },
    'vem_com_tudo': { name: 'Vem com Tudo 3900g', cost: 3900, type: 'borboleta', stats: { armor: 100, mr: 100 }, desc: 'Abaixo de 60% HP, reduz dano em 40%.' },
    'bota_funk': { name: 'Bota (Funk) 1000g', cost: 1000, type: 'borboleta', stats: { ap: 3, bonusHp: 40 }, desc: '+30 Vel. de carta.' }
};

const MINION_TYPES = {
    'lvl1': { name: 'Recruta Melee', cost: 40, hp: 150, atk: 15, goldReward: 50 },
    'lvl2': { name: 'Mago Arcano', cost: 90, hp: 220, atk: 35, goldReward: 95 },
    'lvl3': { name: 'Canhão Tático', cost: 160, hp: 400, atk: 70, goldReward: 160 },
    'lvl4': { name: 'Guardião Titânico', cost: 300, hp: 850, atk: 120, goldReward: 300 }
};

const CHAMPION_CARDS = {
    'galo': [
        { name: 'Auto Ataque', type: 'galo', cost: 1, desc: 'Ataque básico que consome AD e Crítico determinístico.', action: (s) => executeCardAttack('Auto Ataque', () => dealDamage(calculateDeterministicCrit(s.stats.ad))) },
        { name: 'Marola', type: 'galo', cost: 2, desc: 'Pena envenenada. 3 pilhas dão 10% da vida atual em dano verdadeiro.', action: (s) => executeCardAttack('Marola', () => { s.marolaStacks = (s.marolaStacks || 0) + 1; if(s.marolaStacks >= 3) { dealDamage(s.enemyNexus.hp * 0.10, true); s.marolaStacks = 0; showFloatingText('ESTOURO DE MAROLA!', innerWidth/2, 250, 'gold'); } else { dealDamage(s.stats.ad * 1.2); } }) },
        { name: 'Aiin', type: 'galo', cost: 2, desc: 'Escudo protetor que absorve dano e decai.', action: (s) => executeCardAttack('Aiin', () => healNexus(300)) }
    ],
    'cabra_vermelho': [
        { name: 'Bola de Fogo', type: 'cabra', cost: 1, desc: 'Atira bola de fogo com dano contínuo AP.', action: (s) => executeCardAttack('Bola de Fogo', () => dealDamage(s.stats.ap * 1.5)) },
        { name: 'Laser', type: 'cabra', cost: 2, desc: 'Tiro potente queimando cartas inimigas.', action: (s) => executeCardAttack('Laser', () => dealDamage(s.stats.ap * 2.2)) },
        { name: 'Lança Chamas', type: 'cabra', cost: 3, desc: 'Dano contínuo crescente com AP.', action: (s) => executeCardAttack('Lança Chamas', () => dealDamage(s.stats.ap * 3.0)) }
    ],
    'cabra_amarelo': [
        { name: 'Lanterna', type: 'cabra', cost: 1, desc: 'Cria um escudo tático.', action: (s) => executeCardAttack('Lanterna', () => { s.stats.armor += 10; healNexus(100); }) },
        { name: 'Lâmpada', type: 'cabra', cost: 2, desc: 'Mega escudo para o Nexus.', action: (s) => executeCardAttack('Lâmpada', () => healNexus(350)) },
        { name: 'Sol', type: 'cabra', cost: 2, desc: 'Escudo protetor nas cartas.', action: (s) => executeCardAttack('Sol', () => s.energy = Math.min(s.maxEnergy, s.energy + 2)) }
    ],
    'cabra_azul': [
        { name: 'Pedra', type: 'cabra', cost: 1, desc: 'Joga uma pedra causando dano físico/AP.', action: (s) => executeCardAttack('Pedra', () => dealDamage((s.stats.ad + s.stats.ap) * 0.9)) },
        { name: 'Chicote', type: 'cabra', cost: 2, desc: 'Chicoteia e rouba recursos.', action: (s) => executeCardAttack('Chicote', () => { dealDamage(100); s.gold += 50; }) },
        { name: 'Água', type: 'cabra', cost: 1, desc: 'Hidrata-se e recupera vida/energia.', action: (s) => executeCardAttack('Água', () => { healNexus(200); s.energy = Math.min(s.maxEnergy, s.energy + 1); }) }
    ],
    'borboleta': [
        { name: 'Akuma', type: 'borboleta', cost: 2, desc: 'Borboleta com energia negativa que nerfa o deck inimigo.', action: (s) => executeCardAttack('Akuma', () => { dealDamage(90); s.stats.ad += 8; }) },
        { name: 'Beijo Saliente', type: 'borboleta', cost: 3, desc: 'Infecta e drena 5% da vida máxima por segundo.', action: (s) => executeCardAttack('Beijo Saliente', () => { dealDamage(s.enemyNexus.hp * 0.05 + 150); healNexus(150); }) },
        { name: 'Desejo do Pecado', type: 'borboleta', cost: 2, desc: 'Confere poderes temporários da borboleta.', action: (s) => executeCardAttack('Desejo do Pecado', () => { dealDamage(180); s.stats.ap += 10; }) }
    ],
    'global': [
        { name: 'Poção Rápida', type: 'global', cost: 1, desc: 'Cura 150 HP do Nexus.', action: (s) => executeCardAttack('Poção Rápida', () => healNexus(150)) },
        { name: 'Muralha', type: 'global', cost: 2, desc: 'Aumenta Armadura e Resistência Mágica.', action: (s) => executeCardAttack('Muralha', () => { s.stats.armor += 15; s.stats.mr += 15; }) }
    ]
};

/* ==========================================================================
   2. ESTADO GLOBAL DO JOGO & SISTEMA DE CRÍTICO DETERMINÍSTICO (LoL Style)
   ========================================================================= */
let state = {
    player: { name: '', room: '', champ: '' },
    myKey: '', enemyKey: '',
    gold: 500, baseGps: 5,
    energy: 5, maxEnergy: 5,
    hand: [], maxHandSize: 7,
    deck: [], maxDeckCards: 20,
    inventory: [],
    myMinions: [], enemyMinions: [],
    roomChampions: [], activeEvent: null,
    cabraInk: 'vermelho',
    marolaStacks: 0,
    isDead: false,
    myNexus: { hp: 5000, maxHp: 5000 },
    enemyNexus: { hp: 5000, maxHp: 5000 },
    stats: { ad: 15, ap: 15, armor: 10, mr: 10, crit: 0, vamp: 0, pen: 0, bonusHp: 0 },
    critCredit: 0 // Sistema LoL de Crítico Determinístico
};

/* ==========================================================================
   3. INICIALIZAÇÃO & INTERFACE DINÂMICA
   ========================================================================= */
document.addEventListener('DOMContentLoaded', () => {
    setupLobby();
    setupDragAndDrop();
    injectShopAndCabraUI();
});

function injectShopAndCabraUI() {
    const resourcePanel = document.querySelector('.resource-panel');
    if (resourcePanel && !document.getElementById('cabra-panel').innerHTML) {
        document.getElementById('cabra-panel').innerHTML = `
            <div style="font-size:0.75rem; color:var(--gold); margin-bottom:2px;">TINTAS DA CABRA:</div>
            <div style="display:flex; gap:4px;">
                <button class="btn" style="background:#ef4444; padding:4px; flex:1; font-size:0.65rem;" onclick="changeInk('vermelho')">Verm</button>
                <button class="btn" style="background:#fbbf24; padding:4px; flex:1; color:#000; font-size:0.65rem;" onclick="changeInk('amarelo')">Amar</button>
                <button class="btn" style="background:#3b82f6; padding:4px; flex:1; font-size:0.65rem;" onclick="changeInk('azul')">Azul</button>
            </div>
        `;
    }
}

function setupLobby() {
    document.querySelectorAll('.champ-select-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.champ-select-btn').forEach(b => b.classList.remove('active'));
            e.currentTarget.classList.add('active');
            state.player.champ = e.currentTarget.dataset.champ;
        });
    });

    document.getElementById('btn-join-game').addEventListener('click', async () => {
        state.player.name = document.getElementById('player-name').value || 'Invocador';
        state.player.room = document.getElementById('room-id').value || 'sala_1';
        if (!state.player.champ) return alert('Escolha um Miraculous!');

        applyChampBaseStats();
        buildDeck();

        state.myKey = await joinRoomFirebase(state.player.room, state.player.name, state.player.champ, state.myNexus.maxHp);
        
        listenToRoomState(state.player.room, state.myKey, 
            (enemyHp, enemyName, remoteKey) => { 
                state.enemyNexus.hp = enemyHp; 
                state.enemyKey = remoteKey; 
                updateUI(); 
            },
            (champsInRoom) => { 
                state.roomChampions = champsInRoom; 
                updatePlayersBar(); 
                populateShop(); 
            }
        );

        document.getElementById('lobby-screen').classList.add('hidden');
        document.getElementById('game-screen').classList.remove('hidden');

        if (state.player.champ === 'cabra') {
            document.getElementById('cabra-panel').classList.remove('hidden');
        }

        for (let i = 0; i < 4; i++) drawCard(true);
        startGameLoops();
        updateUI();
    });
}

function applyChampBaseStats() {
    if (state.player.champ === 'galo') { state.stats.ad = 55; state.stats.crit = 15; state.stats.vamp = 15; }
    if (state.player.champ === 'cabra') { state.stats.ap = 50; state.stats.armor = 20; }
    if (state.player.champ === 'borboleta') { state.stats.ap = 40; state.stats.ad = 30; state.stats.mr = 25; }
}

/* ==========================================================================
   4. SISTEMA DE CARTAS, DECK E TINTAS DA CABRA
   ========================================================================= */
function buildDeck() {
    state.deck = [];
    let pool = [];
    if (state.player.champ === 'cabra') {
        pool = [...CHAMPION_CARDS[`cabra_${state.cabraInk}`], ...CHAMPION_CARDS['global']];
    } else {
        pool = [...CHAMPION_CARDS[state.player.champ], ...CHAMPION_CARDS[state.player.champ], ...CHAMPION_CARDS['global']];
    }

    for (let i = 0; i < state.maxDeckCards; i++) {
        const randCard = pool[Math.floor(Math.random() * pool.length)];
        state.deck.push({ ...randCard, instanceId: 'c_' + Math.random().toString(36).substring(2) });
    }
}

window.drawCard = function(free = false) {
    if (state.isDead) return;
    if (state.hand.length >= state.maxHandSize) return showFloatingText('Mão Cheia!', innerWidth/2, 220, 'danger');
    if (state.deck.length === 0) return showFloatingText('Monte Vazio! Compre um deck na loja.', innerWidth/2, 220, 'danger');
    if (!free && state.energy < 1) return showFloatingText('Sem Energia!', innerWidth/2, 220, 'danger');

    if (!free) state.energy--;
    state.hand.push(state.deck.pop());
    updateUI();
}

window.buyDeckReload = function() {
    if (state.gold < 100) return showFloatingText('Ouro Insuficiente (100G)', innerWidth/2, 220, 'danger');
    state.gold -= 100;
    buildDeck();
    showFloatingText('Deck Reposto!', innerWidth/2, 220, 'gold');
    updateUI();
}

window.changeInk = function(color) {
    if (state.cabraInk === color) return;
    state.cabraInk = color;
    state.hand = []; // Punição: Limpa a mão ao trocar de tinta
    state.energy = 0; // Punição: Perde a energia do turno
    buildDeck();
    showFloatingText(`Tinta alterada para ${color.toUpperCase()}! Turno reiniciado.`, innerWidth/2, 300, 'cyan');
    updateUI();
}

/* ==========================================================================
   5. DRAG & DROP, ANIMAÇÕES DE ATAQUE E COMBATE
   ========================================================================= */
function setupDragAndDrop() {
    const dropZone = document.getElementById('drop-zone');
    dropZone.addEventListener('dragover', e => { e.preventDefault(); dropZone.classList.add('drag-over'); });
    dropZone.addEventListener('dragleave', () => dropZone.classList.remove('drag-over'));
    dropZone.addEventListener('drop', e => {
        e.preventDefault();
        dropZone.classList.remove('drag-over');
        playCard(e.dataTransfer.getData('text/plain'));
    });
}

function playCard(instanceId) {
    if (state.isDead) return;
    const idx = state.hand.findIndex(c => c.instanceId === instanceId);
    if (idx === -1) return;
    const card = state.hand[idx];
    
    if (state.energy < card.cost) return showFloatingText('Sem Energia Suficiente!', innerWidth/2, innerHeight/2, 'danger');
    
    state.energy -= card.cost;
    card.action(state);
    state.hand.splice(idx, 1);
    updateUI();
}

// Animação de Voo da Carta até o Alvo (Inimigo/Nexus)
function executeCardAttack(cardName, damageCallback) {
    const enemyCardEl = document.querySelector('.nexus-card.enemy');
    if (!enemyCardEl) {
        damageCallback();
        return;
    }

    const rectTarget = enemyCardEl.getBoundingClientRect();
    const startX = innerWidth / 2;
    const startY = innerHeight - 150;
    const targetX = rectTarget.left + rectTarget.width / 2;
    const targetY = rectTarget.top + rectTarget.height / 2;

    const animEl = document.createElement('div');
    animEl.className = 'card flying-card-anim';
    animEl.style.left = `${startX}px`;
    animEl.style.top = `${startY}px`;
    animEl.style.setProperty('--tx', `${targetX - startX}px`);
    animEl.style.setProperty('--ty', `${targetY - startY}px`);
    animEl.innerHTML = `<div class="card-title" style="font-size:0.7rem;">${cardName}</div>`;
    document.body.appendChild(animEl);

    setTimeout(() => {
        animEl.remove();
        damageCallback();
    }, 550);
}

// Sistema de Crítico Determinístico estilo League of Legends (Evita azar/sorte pura)
function calculateDeterministicCrit(baseDmg) {
    let critChance = state.stats.crit / 100;
    let isCrit = false;

    if (state.critCredit >= 1.0) {
        isCrit = true;
        state.critCredit -= 1.0;
    } else if (Math.random() < critChance + state.critCredit) {
        isCrit = true;
        state.critCredit = 0;
    } else {
        state.critCredit += critChance * 0.5; // Acumula crédito para o próximo ataque
    }

    let finalDmg = baseDmg;
    if (isCrit) {
        finalDmg *= 1.75;
        showFloatingText('CRÍTICO!', innerWidth/2, innerHeight/2 - 50, 'gold');
    }

    let mitigation = 100 / (100 + Math.max(0, 40 - state.stats.pen));
    return Math.floor(finalDmg * mitigation);
}

function dealDamage(amount, isTrue = false) {
    state.enemyNexus.hp = Math.max(0, state.enemyNexus.hp - amount);
    state.gold += 20; // Recompensa por dano/ataque

    showFloatingText(`-${Math.floor(amount)}`, innerWidth/1.5, 200, 'danger');
    
    const enemyNexusEl = document.querySelector('.nexus-card.enemy');
    if (enemyNexusEl) {
        enemyNexusEl.classList.add('taking-damage');
        setTimeout(() => enemyNexusEl.classList.remove('taking-damage'), 300);
    }

    // Passiva de Vampirismo do Galo proporcional ao crítico
    if (state.player.champ === 'galo') {
        state.stats.vamp = state.stats.crit;
    }
    if (state.stats.vamp > 0) {
        healNexus(amount * (state.stats.vamp / 100));
    }

    if (state.enemyKey) {
        syncMyNexusHP(state.player.room, state.enemyKey, state.enemyNexus.hp);
    }

    if (state.enemyNexus.hp <= 0) {
        alert('VITÓRIA! O Nexus inimigo foi destruído!');
        window.location.reload();
    }
}

function healNexus(amount) {
    let maxLimit = state.myNexus.maxHp + state.stats.bonusHp;
    state.myNexus.hp = Math.min(maxLimit, state.myNexus.hp + amount);
    showFloatingText(`+${Math.floor(amount)}`, innerWidth/3, 200, 'success');
    syncMyNexusHP(state.player.room, state.myKey, state.myNexus.hp);
}

/* ==========================================================================
   6. LOJA COMPLETA E INVENTÁRIO COM OPÇÃO DE VENDA
   ========================================================================= */
window.toggleShop = function() {
    const modal = document.getElementById('shop-modal');
    modal.style.display = modal.style.display === 'flex' ? 'none' : 'flex';
}

function populateShop() {
    const grid = document.getElementById('shop-grid');
    grid.innerHTML = '';
    Object.keys(ALL_ITEMS).forEach(key => {
        const item = ALL_ITEMS[key];
        if (item.type !== 'all' && !state.roomChampions.includes(item.type)) return;

        grid.innerHTML += `
            <div style="background:rgba(0,0,0,0.6); border:1px solid #334155; padding:10px; border-radius:10px; display:flex; flex-direction:column; justify-content:space-between;">
                <div>
                    <h4 style="color:var(--gold); font-size:0.9rem;">${item.name}</h4>
                    <p style="font-size:0.68rem; color:#cbd5e1; margin-top:4px;">${item.desc}</p>
                </div>
                <button class="btn btn-gold" style="padding:6px; font-size:0.75rem; margin-top:8px;" onclick="buyItem('${key}')">${item.cost} G</button>
            </div>
        `;
    });
}

window.buyItem = function(key) {
    const item = ALL_ITEMS[key];
    if (state.gold >= item.cost) {
        state.gold -= item.cost;
        if (key === 'pocao') {
            healNexus(250);
        } else {
            state.inventory.push(key);
            applyItemStats(item.stats, 1);
            renderInventory();
        }
        updateUI();
        showFloatingText(`Comprou ${item.name}!`, innerWidth/2, 200, 'gold');
    } else {
        showFloatingText('Ouro Insuficiente!', innerWidth/2, 200, 'danger');
    }
}

window.sellItem = function(index) {
    const key = state.inventory[index];
    const item = ALL_ITEMS[key];
    let refund = Math.floor(item.cost * 0.7);
    state.gold += refund;
    applyItemStats(item.stats, -1);
    state.inventory.splice(index, 1);
    renderInventory();
    updateUI();
    showFloatingText(`Vendido por +${refund}G`, innerWidth/2, 200, 'gold');
}

function renderInventory() {
    const list = document.getElementById('inventory-list');
    list.innerHTML = '';
    state.inventory.forEach((key, index) => {
        const item = ALL_ITEMS[key];
        list.innerHTML += `
            <div style="background:rgba(255,255,255,0.08); padding:8px; border-radius:6px; display:flex; justify-content:space-between; align-items:center;">
                <span style="font-size:0.8rem; font-weight:bold; color:#fff;">${item.name}</span>
                <button class="btn btn-danger" style="padding:4px 8px; font-size:0.65rem;" onclick="sellItem(${index})">Vender</button>
            </div>
        `;
    });
}

function applyItemStats(stats, mult) {
    if (!stats) return;
    if (stats.ad) state.stats.ad += stats.ad * mult;
    if (stats.ap) state.stats.ap += stats.ap * mult;
    if (stats.armor) state.stats.armor += stats.armor * mult;
    if (stats.mr) state.stats.mr += stats.mr * mult;
    if (stats.crit) state.stats.crit += stats.crit * mult;
    if (stats.pen) state.stats.pen += stats.pen * mult;
    if (stats.bonusHp) {
        state.stats.bonusHp += stats.bonusHp * mult;
        if (mult > 0) healNexus(stats.bonusHp);
    }
}

/* ==========================================================================
   7. MINIONS & FARM NA TELA (Bedwars Style)
   ========================================================================= */
window.buyMinion = function(lvlKey) {
    const mType = MINION_TYPES[lvlKey];
    if (state.gold < mType.cost) return showFloatingText('Sem Ouro para Tropa!', innerWidth/2, 200, 'danger');
    state.gold -= mType.cost;
    state.myMinions.push({ ...mType, currentHp: mType.hp, id: Math.random() });
    updateUI();
}

function spawnEnemyMinion() {
    if (state.enemyMinions.length >= 4) return;
    state.enemyMinions.push({ id: Math.random(), hp: 80, goldReward: 45 });
    renderEnemyMinions();
}

window.farmEnemyMinion = function(id, clientX, clientY, reward) {
    state.enemyMinions = state.enemyMinions.filter(m => m.id !== id);
    state.gold += reward;
    showFloatingText(`+${reward} G (Farm)`, clientX, clientY, 'gold');
    renderEnemyMinions();
    updateUI();
}

/* ==========================================================================
   8. EVENTOS ALEATÓRIOS GLOBAIS
   ========================================================================= */
const EVENTS = [
    { title: 'SURTO DE OURO', desc: 'Ouro passivo e GPS duplicados por 15s.', apply: s => s.baseGps *= 2, remove: s => s.baseGps /= 2 },
    { title: 'FRENESI NA Tropa', desc: 'Minions aliados com ataque dobrado.', apply: s => s.myMinions.forEach(m => m.atk *= 2), remove: s => s.myMinions.forEach(m => m.atk /= 2) }
];

function triggerRandomEvent() {
    if (state.activeEvent) return;
    const ev = EVENTS[Math.floor(Math.random() * EVENTS.length)];
    state.activeEvent = ev;
    ev.apply(state);
    
    const banner = document.getElementById('event-banner');
    if (banner) {
        banner.innerText = `EVENTO: ${ev.title} - ${ev.desc}`;
        banner.classList.add('active');
        setTimeout(() => {
            ev.remove(state);
            state.activeEvent = null;
            banner.classList.remove('active');
            updateUI();
        }, 15000);
    }
}

/* ==========================================================================
   9. RENDERIZAÇÃO & LOOPS DE TEMPO DO JOGO
   ========================================================================= */
function updateUI() {
    if (state.player.champ === 'galo') state.stats.vamp = state.stats.crit;
    let dynamicAp = state.stats.ap;
    if (state.inventory.includes('bf2300')) dynamicAp += state.stats.armor;

    document.getElementById('my-hp-text').innerText = `${Math.floor(state.myNexus.hp)} HP`;
    let maxMyHp = state.myNexus.maxHp + state.stats.bonusHp;
    document.getElementById('my-hp-bar').style.width = `${Math.max(0, Math.min(100, (state.myNexus.hp / maxMyHp) * 100))}%`;

    document.getElementById('enemy-hp-text').innerText = `${Math.floor(state.enemyNexus.hp)} HP`;
    document.getElementById('enemy-hp-bar').style.width = `${Math.max(0, Math.min(100, (state.enemyNexus.hp / state.enemyNexus.maxHp) * 100))}%`;
    
    document.getElementById('stat-ad').innerText = Math.floor(state.stats.ad);
    document.getElementById('stat-ap').innerText = Math.floor(dynamicAp);
    document.getElementById('stat-armor').innerText = Math.floor(state.stats.armor);
    document.getElementById('stat-mr').innerText = Math.floor(state.stats.mr);
    document.getElementById('stat-crit').innerText = `${Math.floor(state.stats.crit)}%`;
    document.getElementById('stat-vamp').innerText = `${Math.floor(state.stats.vamp)}%`;

    document.getElementById('gold-text').innerText = `${Math.floor(state.gold)} G`;
    let extraGps = state.inventory.includes('cadelagem') ? 4 : 0;
    document.getElementById('gps-text').innerText = `${state.baseGps + extraGps} G/s`;
    document.getElementById('energy-text').innerText = `${state.energy}/${state.maxEnergy}`;
    document.getElementById('deck-count').innerText = state.deck.length;
    document.getElementById('hand-limit-text').innerText = `${state.hand.length}/${state.maxHandSize}`;

    renderHand();
    renderMinions();
}

function renderHand() {
    const cont = document.getElementById('hand-container');
    cont.innerHTML = '';
    state.hand.forEach(c => {
        let el = document.createElement('div');
        el.className = 'card';
        el.draggable = true;
        el.innerHTML = `
            <div>
                <strong class="card-title">${c.name}</strong>
                <p class="card-desc">${c.desc}</p>
            </div>
            <div class="card-footer">
                <span class="energy-cost">${c.cost} EN</span>
            </div>
        `;
        el.addEventListener('dragstart', e => {
            el.classList.add('dragging');
            e.dataTransfer.setData('text/plain', c.instanceId);
        });
        el.addEventListener('dragend', () => el.classList.remove('dragging'));
        cont.appendChild(el);
    });
}

function renderMinions() {
    const lane = document.getElementById('my-minions-lane');
    lane.innerHTML = '';
    state.myMinions.forEach(m => {
        lane.innerHTML += `<div class="minion-card" style="border-color:var(--cyan-glow)"><strong>${m.name}</strong><p>⚔️ ${m.atk} | ❤️ ${m.currentHp}</p></div>`;
    });
}

function renderEnemyMinions() {
    const lane = document.getElementById('enemy-minions-lane');
    lane.innerHTML = '';
    state.enemyMinions.forEach(m => {
        lane.innerHTML += `
            <div class="minion-card" style="border-color:var(--danger); cursor:pointer;" onclick="farmEnemyMinion(${m.id}, event.clientX, event.clientY, ${m.goldReward})">
                <strong style="color:var(--danger)">Tropa Inimiga</strong>
                <p style="font-size:0.65rem">CLIQUE PARA FARM (+${m.goldReward}G)</p>
            </div>`;
    });
}

function updatePlayersBar() {
    const b = document.getElementById('players-bar');
    b.innerHTML = `<span style="color:#94a3b8; font-weight:bold;">SALA: ${state.player.room.toUpperCase()}</span><div class="players-list" id="plist"></div>`;
    state.roomChampions.forEach(c => {
        document.getElementById('plist').innerHTML += `<div class="player-chip"><span class="badge-champ badge-${c}">${c}</span></div>`;
    });
}

function showFloatingText(txt, x, y, type) {
    const el = document.createElement('div');
    el.className = `floating-text ${type}`;
    el.innerText = txt;
    el.style.left = `${x}px`;
    el.style.top = `${y}px`;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 1100);
}

function startGameLoops() {
    // Loop de ouro passivo e regeneração de energia
    setInterval(() => {
        if (state.isDead) return;
        let gps = state.baseGps + (state.inventory.includes('cadelagem') ? 4 : 0);
        state.gold += gps;
        state.energy = Math.min(state.maxEnergy, state.energy + 1);
        updateUI();
    }, 2000);

    // Loop de ataque dos minions aliados no Nexus inimigo
    setInterval(() => {
        if (state.isDead) return;
        let totalDmg = 0;
        state.myMinions.forEach(m => totalDmg += m.atk);
        if (totalDmg > 0) dealDamage(totalDmg);
    }, 4000);

    // Loop de spawn de tropas inimigas para farm
    setInterval(() => {
        if (!state.isDead) spawnEnemyMinion();
    }, 9000);

    // Loop de eventos globais aleatórios
    setInterval(() => {
        if (!state.isDead && Math.random() > 0.45) triggerRandomEvent();
    }, 35000);

    // Passiva do Item Java da Cabra (Cura 5 HP a cada 20s)
    setInterval(() => {
        if (!state.isDead && state.inventory.includes('java')) {
            healNexus(5);
        }
    }, 20000);
}
