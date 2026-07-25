// ==========================================================================
// UNO LEGENDS: MIRACULOUS NEXUS - O CÓDIGO DEFINITIVO (V4.0)
// ==========================================================================
import { joinRoomFirebase, syncMyNexusHP, listenToRoomState } from './firebase.js';

/* ==========================================================================
   1. BANCOS DE DADOS (ITENS, MINIONS E CARTAS)
   ========================================================================== */
const ALL_ITEMS = {
    'pocao': { name: 'Poção de Cura', cost: 50, type: 'global', stats: {}, desc: 'Restaura 250 de HP do Nexus.' },
    // Galo
    'lacre3000': { name: 'Lacre 3000g', cost: 3000, type: 'galo', stats: { crit: 10, ad: 100 }, desc: 'Colete as almas com menos de 90% da vida.' },
    'skate2900': { name: 'Skate 2900g', cost: 2900, type: 'galo', stats: { crit: 5, ad: 60, armor: 40, mr: 30 }, desc: 'Nojo: Paralisa por 3s.' },
    'mandrakit': { name: 'Mandrakit 2400g', cost: 2400, type: 'galo', stats: { crit: 30, ad: 30, ap: 30, mr: 30, bonusHp: 300 }, desc: 'Ganha +15% de vida ao levar hit letal.' },
    'alma_sebosa': { name: 'Alma Sebosa 3000g', cost: 3000, type: 'galo', stats: { crit: 15, ap: 20 }, desc: 'Bloqueia CC por 10s.' },
    'pate': { name: 'E o Patê? 2000g', cost: 2000, type: 'galo', stats: { crit: 5, armor: 40, mr: 30 }, desc: 'Atrasa dano em 5s.' },
    'bota_sapatona': { name: 'Bota (Sapatona) 1000g', cost: 1000, type: 'galo', stats: { crit: 2, pen: 3, ad: 5 }, desc: '+ Velocidade de spawn.' },
    // Cabra
    'pyton': { name: 'Pyton 2000g', cost: 2000, type: 'cabra', stats: { ad: 20, ap: 100, crit: 3 }, desc: 'Veneno dá dano contínuo por 5s.' },
    'javascript': { name: 'Java Script 2800g', cost: 2800, type: 'cabra', stats: { ap: 80, mr: 20 }, desc: 'Escudo ao ser atingido.' },
    'java': { name: 'Java 1900g', cost: 1900, type: 'cabra', stats: { crit: 50, ap: 50, ad: 50 }, desc: 'Cura passiva.' },
    'bf2300': { name: 'BF 2300g', cost: 2300, type: 'cabra', stats: { bonusHp: 200, ad: 20, ap: 40, armor: 50 }, desc: '+1 AP para cada 1 de Armadura atual.' },
    'cadelagem': { name: 'Cadelagem 2000g', cost: 2000, type: 'cabra', stats: { ad: 80, ap: 50 }, desc: 'Tome +4 de gold por segundo.' },
    'bota_cadelagem': { name: 'Bota (Cadelagem) 1000g', cost: 1000, type: 'cabra', stats: { ap: 3, ad: 4, crit: 5 }, desc: '+ Vel de carta.' },
    // Borboleta
    'incubus': { name: 'Incubus 3000g', cost: 3000, type: 'borboleta', stats: { ap: 80, ad: 50, armor: 30 }, desc: 'Recupere vida ao atacar.' },
    'dono_inferno': { name: 'Dono do Inferno 4000g', cost: 4000, type: 'borboleta', stats: { ad: 20, ap: 80, bonusHp: 300, armor: 90 }, desc: 'Renasça após morte.' },
    'fome_luxuria': { name: 'Fome de Luxúria 3500g', cost: 3500, type: 'borboleta', stats: { ap: 110, crit: 40, mr: 40, bonusHp: 100 }, desc: 'Bloqueie uma ação inimiga.' },
    'bibi_fogosa': { name: 'Bibi Fogosa 4000g', cost: 4000, type: 'borboleta', stats: { ap: 90, ad: 80 }, desc: 'Nocauteie e dê dano.' },
    'vem_com_tudo': { name: 'Vem com Tudo 3900g', cost: 3900, type: 'borboleta', stats: { armor: 100, mr: 100 }, desc: 'Abaixo de 60% de HP, reduz dano.' },
    'bota_funk': { name: 'Bota (Funk) 1000g', cost: 1000, type: 'borboleta', stats: { ap: 3, bonusHp: 40 }, desc: '+ Vel de carta.' }
};

const MINION_TYPES = {
    'lvl1': { name: 'Recruta Melee', lvl: 1, cost: 40, hp: 150, atk: 15, desc: 'Tropa básica.' },
    'lvl2': { name: 'Mago Arcano', lvl: 2, cost: 90, hp: 220, atk: 35, desc: 'Dano mágico.' },
    'lvl3': { name: 'Canhão Tático', lvl: 3, cost: 160, hp: 400, atk: 70, desc: 'Destruidor.' },
    'lvl4': { name: 'Guardião Titânico', lvl: 4, cost: 300, hp: 850, atk: 120, desc: 'Lendário.' }
};

const CHAMPION_CARDS = {
    'galo': [
        { name: 'Auto Ataque', type: 'galo', cost: 1, desc: 'Usa seu AD e Crítico.', action: (s) => dealDamage(calculateDmg(s.stats.ad, true)) },
        { name: 'Marola', type: 'galo', cost: 2, desc: 'Dano Verdadeiro (10% Vida).', action: (s) => dealDamage(s.enemyNexus.hp * 0.10) },
        { name: 'Aiin', type: 'galo', cost: 2, desc: 'Concede Escudo.', action: (s) => healNexus(300) }
    ],
    'cabra_vermelho': [
        { name: 'Bola de Fogo', type: 'cabra', cost: 1, desc: 'Dano AP.', action: (s) => dealDamage(s.stats.ap * 1.5) },
        { name: 'Lança Chamas', type: 'cabra', cost: 2, desc: 'Dano Pesado AP.', action: (s) => dealDamage(s.stats.ap * 2.5) }
    ],
    'cabra_amarelo': [
        { name: 'Lanterna', type: 'cabra', cost: 1, desc: '+10 Armadura e Cura.', action: (s) => { s.stats.armor += 10; healNexus(100); } },
        { name: 'Lâmpada', type: 'cabra', cost: 2, desc: 'Mega Escudo.', action: (s) => healNexus(400) }
    ],
    'cabra_azul': [
        { name: 'Pedra', type: 'cabra', cost: 1, desc: 'Dano Híbrido.', action: (s) => dealDamage((s.stats.ad + s.stats.ap) * 0.8) },
        { name: 'Água', type: 'cabra', cost: 1, desc: 'Restaura vida e energia.', action: (s) => { healNexus(200); s.energy++; } }
    ],
    'borboleta': [
        { name: 'Akuma', type: 'borboleta', cost: 2, desc: 'Causa dano e rouba AD.', action: (s) => { dealDamage(80); s.stats.ad += 5; } },
        { name: 'Beijo Saliente', type: 'borboleta', cost: 3, desc: 'Drena 5% HP máx.', action: (s) => { dealDamage(250); healNexus(250); } },
        { name: 'Desejo do Pecado', type: 'borboleta', cost: 2, desc: 'Causa caos na mão.', action: (s) => dealDamage(200) }
    ],
    'global': [
        { name: 'Poção Rápida', type: 'global', cost: 1, desc: 'Cura 150 HP.', action: (s) => healNexus(150) },
        { name: 'Muralha', type: 'global', cost: 2, desc: '+15 DEF/MR.', action: (s) => { s.stats.armor += 15; s.stats.mr += 15; } }
    ]
};

/* ==========================================================================
   2. ESTADO GLOBAL DO JOGO
   ========================================================================== */
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
    cabraInk: 'vermelho', // Para o sistema da Cabra
    myNexus: { hp: 5000, maxHp: 5000 },
    enemyNexus: { hp: 5000, maxHp: 5000 },
    stats: { ad: 15, ap: 15, armor: 10, mr: 10, crit: 0, vamp: 0, pen: 0, bonusHp: 0 }
};

/* ==========================================================================
   3. INICIALIZAÇÃO & INJEÇÃO DE INTERFACE
   ========================================================================== */
document.addEventListener('DOMContentLoaded', () => {
    injectDynamicUI();
    setupLobby();
    setupDragAndDrop();
});

// Cria botoes da loja e tintas dinamicamente no HTML sem vc precisar editar ele
function injectDynamicUI() {
    const resourcePanel = document.querySelector('.resource-panel');
    if (resourcePanel) {
        resourcePanel.innerHTML += `<button class="btn btn-gold" style="margin-top:5px;" onclick="toggleShop()">🛒 ABRIR LOJA (B)</button>`;
        resourcePanel.innerHTML += `<div id="cabra-panel" class="hidden" style="margin-top:10px; display:flex; gap:5px;">
            <button class="btn" style="background:#ef4444; padding:5px; flex:1" onclick="changeInk('vermelho')">Verm</button>
            <button class="btn" style="background:#fbbf24; padding:5px; flex:1; color:#000;" onclick="changeInk('amarelo')">Amar</button>
            <button class="btn" style="background:#3b82f6; padding:5px; flex:1" onclick="changeInk('azul')">Azul</button>
        </div>`;
    }

    // Injeta Modal da Loja
    const modalHTML = `
        <div id="shop-modal" style="display:none; position:fixed; top:0; left:0; width:100vw; height:100vh; background:rgba(0,0,0,0.9); z-index:99999; justify-content:center; align-items:center; padding:20px;">
            <div style="background:var(--bg-panel); border:2px solid var(--gold); width:100%; max-width:900px; height:80vh; border-radius:20px; display:flex; flex-direction:column; padding:20px;">
                <div style="display:flex; justify-content:space-between; margin-bottom:15px;">
                    <h2 style="color:var(--gold);">🛒 LOJA SECRETA</h2>
                    <button class="btn btn-danger" onclick="toggleShop()">FECHAR [X]</button>
                </div>
                <div style="display:flex; gap:20px; height:100%; overflow:hidden;">
                    <div id="shop-grid" style="flex:2; display:grid; grid-template-columns:repeat(auto-fit, minmax(180px, 1fr)); gap:10px; overflow-y:auto; padding-right:10px;"></div>
                    <div style="flex:1; background:rgba(0,0,0,0.5); padding:15px; border-radius:10px; overflow-y:auto;">
                        <h3 style="color:var(--cyan-glow); margin-bottom:10px;">Inventário</h3>
                        <div id="inventory-list" style="display:flex; flex-direction:column; gap:10px;"></div>
                    </div>
                </div>
            </div>
        </div>`;
    document.body.insertAdjacentHTML('beforeend', modalHTML);

    // Atalho B para loja
    document.addEventListener('keydown', (e) => {
        if(e.key.toLowerCase() === 'b' && !document.getElementById('lobby-screen').classList.contains('active')) toggleShop();
    });
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

        applyChampStats();
        buildDeck();

        state.myKey = await joinRoomFirebase(state.player.room, state.player.name, state.player.champ, state.myNexus.maxHp);
        
        listenToRoomState(state.player.room, state.myKey, 
            (enemyHp, enemyName, remoteKey) => { state.enemyNexus.hp = enemyHp; state.enemyKey = remoteKey; updateUI(); },
            (champsInRoom) => { state.roomChampions = champsInRoom; updatePlayersBar(); populateShop(); }
        );

        document.getElementById('lobby-screen').classList.add('hidden');
        document.getElementById('game-screen').classList.remove('hidden');

        if(state.player.champ === 'cabra') document.getElementById('cabra-panel').classList.remove('hidden');

        for(let i=0; i<4; i++) drawCard(true);
        startGameLoops();
        updateUI();
    });
}

function applyChampStats() {
    if (state.player.champ === 'galo') { state.stats.ad = 60; state.stats.crit = 10; state.stats.vamp = 10; }
    if (state.player.champ === 'cabra') { state.stats.ap = 50; state.stats.armor = 20; }
    if (state.player.champ === 'borboleta') { state.stats.ap = 35; state.stats.ad = 30; state.stats.mr = 25; }
}

/* ==========================================================================
   4. SISTEMA DE CARTAS, DECK E CABRA
   ========================================================================== */
function buildDeck() {
    state.deck = [];
    let pool = [];
    if(state.player.champ === 'cabra') pool = [...CHAMPION_CARDS[`cabra_${state.cabraInk}`], ...CHAMPION_CARDS['global']];
    else pool = [...CHAMPION_CARDS[state.player.champ], ...CHAMPION_CARDS[state.player.champ], ...CHAMPION_CARDS['global']];

    for (let i = 0; i < state.maxDeckCards; i++) {
        const rand = pool[Math.floor(Math.random() * pool.length)];
        state.deck.push({ ...rand, instanceId: 'c_' + Math.random().toString(36).substring(2) });
    }
}

window.drawCard = function(free = false) {
    if (state.hand.length >= state.maxHandSize) return showFloatingText('Mão Cheia!', innerWidth/2, 200, 'danger');
    if (state.deck.length === 0) return showFloatingText('Monte Vazio!', innerWidth/2, 200, 'danger');
    if (!free && state.energy < 1) return showFloatingText('Sem Energia!', innerWidth/2, 200, 'danger');

    if (!free) state.energy--;
    state.hand.push(state.deck.pop());
    updateUI();
}

window.buyDeckReload = function() {
    if (state.gold < 100) return showFloatingText('Ouro Insuficiente', innerWidth/2, 200, 'danger');
    state.gold -= 100;
    buildDeck();
    updateUI();
}

window.changeInk = function(color) {
    if (state.cabraInk === color) return;
    state.cabraInk = color;
    state.hand = []; // Punição: Limpa a mão ao trocar de tinta
    state.energy = 0; // Punição: Zera energia (Perde o turno)
    buildDeck();
    showFloatingText(`Tinta: ${color.toUpperCase()}! (Turno perdido)`, innerWidth/2, 300, 'cyan');
    updateUI();
}

/* ==========================================================================
   5. DRAG & DROP E COMBATE
   ========================================================================== */
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
    const idx = state.hand.findIndex(c => c.instanceId === instanceId);
    if (idx === -1) return;
    const card = state.hand[idx];
    
    if (state.energy < card.cost) return showFloatingText('Sem Energia!', innerWidth/2, innerHeight/2, 'danger');
    
    state.energy -= card.cost;
    card.action(state);
    state.hand.splice(idx, 1);
    updateUI();
}

function calculateDmg(baseDmg, canCrit) {
    let finalDmg = baseDmg;
    if (canCrit && Math.random() * 100 <= state.stats.crit) { finalDmg *= 1.75; showFloatingText('CRÍTICO!', innerWidth/2, innerHeight/2, 'gold'); }
    // Mitigação
    let mitigation = 100 / (100 + Math.max(0, 40 - state.stats.pen));
    return Math.floor(finalDmg * mitigation);
}

function dealDamage(amount) {
    state.enemyNexus.hp = Math.max(0, state.enemyNexus.hp - amount);
    state.gold += 15; 
    showFloatingText(`-${Math.floor(amount)}`, innerWidth/1.5, 200, 'danger');
    document.querySelector('.nexus-card.enemy').classList.add('taking-damage');
    setTimeout(() => document.querySelector('.nexus-card.enemy').classList.remove('taking-damage'), 300);

    if(state.stats.vamp > 0) healNexus(amount * (state.stats.vamp/100));

    if (state.enemyKey) syncMyNexusHP(state.player.room, state.enemyKey, state.enemyNexus.hp);
    if (state.enemyNexus.hp <= 0) { alert('VITÓRIA!'); window.location.reload(); }
}

function healNexus(amount) {
    state.myNexus.hp = Math.min(state.myNexus.maxHp + state.stats.bonusHp, state.myNexus.hp + amount);
    showFloatingText(`+${Math.floor(amount)}`, innerWidth/3, 200, 'success');
    syncMyNexusHP(state.player.room, state.myKey, state.myNexus.hp);
}

/* ==========================================================================
   6. SISTEMA DE LOJA COMPLETA
   ========================================================================== */
window.toggleShop = function() {
    const modal = document.getElementById('shop-modal');
    modal.style.display = modal.style.display === 'flex' ? 'none' : 'flex';
}

function populateShop() {
    const grid = document.getElementById('shop-grid');
    grid.innerHTML = '';
    Object.keys(ALL_ITEMS).forEach(key => {
        const item = ALL_ITEMS[key];
        if (item.type !== 'global' && !state.roomChampions.includes(item.type)) return;

        grid.innerHTML += `
            <div style="background:rgba(0,0,0,0.5); border:1px solid var(--border-glow); padding:10px; border-radius:10px; display:flex; flex-direction:column; justify-content:space-between;">
                <div>
                    <h4 style="color:var(--gold); font-size:0.9rem;">${item.name}</h4>
                    <p style="font-size:0.7rem; color:#cbd5e1; margin-top:5px;">${item.desc}</p>
                </div>
                <button class="btn btn-gold" style="padding:5px; font-size:0.75rem; margin-top:10px;" onclick="buyItem('${key}')">${item.cost} G</button>
            </div>
        `;
    });
}

window.buyItem = function(key) {
    const item = ALL_ITEMS[key];
    if (state.gold >= item.cost) {
        state.gold -= item.cost;
        if(key === 'pocao') { healNexus(250); }
        else {
            state.inventory.push(key);
            applyStats(item.stats, 1);
            renderInventory();
        }
        updateUI();
    } else alert('Ouro Insuficiente!');
}

window.sellItem = function(index) {
    const key = state.inventory[index];
    const item = ALL_ITEMS[key];
    state.gold += Math.floor(item.cost * 0.6);
    applyStats(item.stats, -1);
    state.inventory.splice(index, 1);
    renderInventory();
    updateUI();
}

function renderInventory() {
    const list = document.getElementById('inventory-list');
    list.innerHTML = '';
    state.inventory.forEach((key, index) => {
        const item = ALL_ITEMS[key];
        list.innerHTML += `
            <div style="background:rgba(255,255,255,0.1); padding:8px; border-radius:5px; display:flex; justify-content:space-between; align-items:center;">
                <span style="font-size:0.8rem; font-weight:bold;">${item.name}</span>
                <button class="btn btn-danger" style="padding:4px; font-size:0.6rem;" onclick="sellItem(${index})">Vender</button>
            </div>
        `;
    });
}

function applyStats(stats, mult) {
    if(!stats) return;
    if(stats.ad) state.stats.ad += stats.ad * mult;
    if(stats.ap) state.stats.ap += stats.ap * mult;
    if(stats.armor) state.stats.armor += stats.armor * mult;
    if(stats.mr) state.stats.mr += stats.mr * mult;
    if(stats.crit) state.stats.crit += stats.crit * mult;
    if(stats.pen) state.stats.pen += stats.pen * mult;
    if(stats.bonusHp) {
        state.stats.bonusHp += stats.bonusHp * mult;
        if (mult > 0) healNexus(stats.bonusHp);
        else state.myNexus.hp = Math.min(state.myNexus.hp, state.myNexus.maxHp + state.stats.bonusHp);
    }
}

/* ==========================================================================
   7. MINIONS & FARM NA TELA
   ========================================================================== */
window.buyMinion = function(lvl) {
    const mType = MINION_TYPES[lvl];
    if (state.gold < mType.cost) return showFloatingText('Sem Ouro!', innerWidth/2, 200, 'danger');
    state.gold -= mType.cost;
    state.myMinions.push({ ...mType, currentHp: mType.hp, id: Math.random() });
    updateUI();
}

function spawnEnemyMinion() {
    // Spawna minions na lane inimiga para voce farmar
    if(state.enemyMinions.length >= 4) return;
    state.enemyMinions.push({ id: Math.random(), hp: 50 });
    renderEnemyMinions();
}

window.farmEnemy = function(id) {
    state.enemyMinions = state.enemyMinions.filter(m => m.id !== id);
    let g = Math.floor(Math.random() * 30) + 40; // 40 a 70 gold
    state.gold += g;
    showFloatingText(`+${g} G`, event.clientX, event.clientY, 'gold');
    renderEnemyMinions();
    updateUI();
}

/* ==========================================================================
   8. EVENTOS ALEATÓRIOS
   ========================================================================== */
const EVENTS = [
    { t: 'SURTO DE OURO', d: 'Ouro passivo dobrado.', a: s => s.baseGps*=2, r: s => s.baseGps/=2 },
    { t: 'FRENESI', d: 'Minions atacam 2x mais forte.', a: s => s.myMinions.forEach(m=>m.atk*=2), r: s => s.myMinions.forEach(m=>m.atk/=2) }
];
function triggerEvent() {
    if(state.activeEvent) return;
    const ev = EVENTS[Math.floor(Math.random() * EVENTS.length)];
    state.activeEvent = ev;
    ev.a(state);
    const banner = document.getElementById('event-banner');
    banner.innerText = `${ev.t} - ${ev.d}`;
    banner.classList.add('active');
    setTimeout(() => { ev.r(state); state.activeEvent = null; banner.classList.remove('active'); updateUI(); }, 15000);
}

/* ==========================================================================
   9. RENDER & LOOPS (UI)
   ========================================================================== */
function updateUI() {
    // Passivas
    if(state.player.champ === 'galo') state.stats.vamp = state.stats.crit;
    let dynAp = state.stats.ap; if(state.inventory.includes('bf2300')) dynAp += state.stats.armor;

    document.getElementById('my-hp-text').innerText = `${Math.floor(state.myNexus.hp)} HP`;
    document.getElementById('my-hp-bar').style.width = `${(state.myNexus.hp / (state.myNexus.maxHp+state.stats.bonusHp))*100}%`;
    document.getElementById('enemy-hp-text').innerText = `${Math.floor(state.enemyNexus.hp)} HP`;
    document.getElementById('enemy-hp-bar').style.width = `${(state.enemyNexus.hp / state.enemyNexus.maxHp)*100}%`;
    
    document.getElementById('stat-ad').innerText = Math.floor(state.stats.ad);
    document.getElementById('stat-ap').innerText = Math.floor(dynAp);
    document.getElementById('stat-armor').innerText = Math.floor(state.stats.armor);
    document.getElementById('stat-mr').innerText = Math.floor(state.stats.mr);
    document.getElementById('stat-crit').innerText = Math.floor(state.stats.crit)+'%';
    document.getElementById('stat-vamp').innerText = Math.floor(state.stats.vamp)+'%';

    document.getElementById('gold-text').innerText = Math.floor(state.gold);
    let gps = state.baseGps + (state.inventory.includes('cadelagem') ? 4 : 0);
    document.getElementById('gps-text').innerText = `${gps} G/s`;
    document.getElementById('energy-text').innerText = `${state.energy}/${state.maxEnergy}`;
    document.getElementById('deck-count').innerText = state.deck.length;
    document.getElementById('hand-limit-text').innerText = `${state.hand.length}/${state.maxHandSize}`;

    renderHand(); renderMinions();
}

function renderHand() {
    const cont = document.getElementById('hand-container');
    cont.innerHTML = '';
    state.hand.forEach(c => {
        let el = document.createElement('div');
        el.className = 'card'; el.draggable = true;
        el.innerHTML = `<div><strong style="color:var(--cyan-glow)">${c.name}</strong><p style="font-size:0.7rem;margin-top:5px;">${c.desc}</p></div>
                        <div style="display:flex; justify-content:space-between;"><span style="background:var(--energy); border-radius:50%; width:20px; text-align:center;">${c.cost}</span></div>`;
        el.addEventListener('dragstart', e => { el.classList.add('dragging'); e.dataTransfer.setData('text/plain', c.instanceId); });
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
        lane.innerHTML += `<div class="minion-card farm-btn-target" style="border-color:var(--danger); cursor:crosshair;" onclick="farmEnemy(${m.id})">
            <strong style="color:var(--danger)">Tropa Inimiga</strong><p style="font-size:0.7rem">CLIQUE PARA FARMAR</p></div>`;
    });
}

function updatePlayersBar() {
    const b = document.getElementById('players-bar');
    b.innerHTML = `<span style="color:#94a3b8; font-weight:bold;">SALA: ${state.player.room.toUpperCase()}</span><div style="display:flex;gap:10px;" id="plist"></div>`;
    state.roomChampions.forEach(c => document.getElementById('plist').innerHTML += `<div class="player-chip"><span class="badge-champ badge-${c}">${c}</span></div>`);
}

function showFloatingText(txt, x, y, type) {
    const el = document.createElement('div');
    el.className = `floating-text ${type}`; el.innerText = txt; el.style.left = x+'px'; el.style.top = y+'px';
    document.body.appendChild(el); setTimeout(()=>el.remove(), 1200);
}

function startGameLoops() {
    setInterval(() => {
        state.gold += state.baseGps + (state.inventory.includes('cadelagem') ? 4 : 0);
        state.energy = Math.min(state.maxEnergy, state.energy + (state.activeEvent?.title === 'SOBRECARGA' ? 2 : 1));
        updateUI();
    }, 2000);
    setInterval(() => {
        let dmg = 0; state.myMinions.forEach(m => dmg += m.atk);
        if(dmg > 0) dealDamage(dmg);
    }, 4000);
    setInterval(() => spawnEnemyMinion(), 8000);
    setInterval(() => { if(Math.random() > 0.5) triggerEvent(); }, 35000);
    setInterval(() => { if(state.inventory.includes('java')) healNexus(5); }, 20000);
}
