// ==========================================================================
// UNO LEGENDS: MIRACULOUS NEXUS - CYBER-MOBA GAME ENGINE
// ==========================================================================

import { joinRoomFirebase, syncMyNexusHP, listenToRoomState } from './firebase.js';

/* --- 1. BANCO DE DADOS: MINIONS E CARTAS --- */
const MINION_TYPES = {
    'm_lvl1': { id: 'm_lvl1', name: 'Recruta Melee', lvl: 1, cost: 40, hp: 150, atk: 15, desc: 'Tropa básica de linha de frente.' },
    'm_lvl2': { id: 'm_lvl2', name: 'Mago Arcamo', lvl: 2, cost: 90, hp: 220, atk: 35, desc: 'Dano mágico à distância.' },
    'm_lvl3': { id: 'm_lvl3', name: 'Canhão Tático', lvl: 3, cost: 160, hp: 400, atk: 70, desc: 'Destruidor de armaduras.' },
    'm_lvl4': { id: 'm_lvl4', name: 'Guardião Titânico', lvl: 4, cost: 300, hp: 850, atk: 120, desc: 'Defensor lendário do Nexus.' }
};

// Cartas por Campeão
const CHAMPION_CARDS = {
    'galo': [
        { id: 'g_atk', name: 'Auto Ataque', type: 'galo', cost: 1, desc: 'Causa dano AD. Pode Critar.', action: (s) => dealDamage(calculateDmg(s.stats.ad, true)) },
        { id: 'g_marola', name: 'Marola', type: 'galo', cost: 2, desc: 'Veneno que causa dano verdadeiro massivo.', action: (s) => dealDamage(250) },
        { id: 'g_aiin', name: 'Aiin', type: 'galo', cost: 2, desc: 'Concede 200 de Escudo ao Nexus.', action: (s) => healNexus(200) }
    ],
    'cabra': [
        { id: 'c_vermelha', name: 'Tinta Vermelha', type: 'cabra', cost: 2, desc: 'Bola de Fogo (Dano baseado em AP).', action: (s) => dealDamage(calculateDmg(s.stats.ap * 1.5, false)) },
        { id: 'c_amarela', name: 'Tinta Amarela', type: 'cabra', cost: 1, desc: '+20 de Armadura Permanente.', action: (s) => { s.stats.armor += 20; } },
        { id: 'c_azul', name: 'Tinta Azul', type: 'cabra', cost: 2, desc: 'Cura seu Nexus em 300 HP.', action: (s) => healNexus(300) }
    ],
    'borboleta': [
        { id: 'b_akuma', name: 'Akuma', type: 'borboleta', cost: 2, desc: 'Causa dano e rouba 10 de AD do inimigo.', action: (s) => { dealDamage(100); s.stats.ad += 10; } },
        { id: 'b_beijo', name: 'Beijo Saliente', type: 'borboleta', cost: 3, desc: 'Drena 300 HP do Nexus Inimigo.', action: (s) => { dealDamage(300); healNexus(300); } }
    ],
    'global': [
        { id: 'gl_farm', name: 'Dia de Pagamento', type: 'global', cost: 1, desc: 'Ganha +150 de Ouro.', action: (s) => addGold(150) },
        { id: 'gl_def', name: 'Muralha', type: 'global', cost: 2, desc: '+15 Armadura e +15 Res. Mágica.', action: (s) => { s.stats.armor += 15; s.stats.mr += 15; } }
    ]
};

/* --- 2. ESTADO DO JOGO --- */
let state = {
    player: { name: '', room: '', champ: '' },
    myKey: '',
    enemyKey: '',
    gold: 300,
    baseGps: 10, // Gold por segundo
    energy: 5,
    maxEnergy: 5,
    hand: [],
    maxHandSize: 7,
    deck: [],
    maxDeckCards: 20,
    myMinions: [],
    enemyMinions: [], // Opcional, para evoluir depois com o firebase
    roomChampions: [],
    activeEvent: null,
    myNexus: { hp: 5000, maxHp: 5000 },
    enemyNexus: { hp: 5000, maxHp: 5000 },
    stats: { ad: 20, ap: 20, armor: 15, mr: 15, crit: 0, vamp: 0, pen: 0, bonusHp: 0 }
};

/* --- 3. DOM ELEMENTS & SETUP --- */
document.addEventListener('DOMContentLoaded', () => {
    setupLobby();
    setupDragAndDrop();
    
    // Anexa funções ao window para poderem ser chamadas pelo HTML via onclick
    window.drawCard = drawCard;
    window.buyDeckReload = buyDeckReload;
    window.buyMinion = buyMinion;
});

function setupLobby() {
    // Lógica de seleção de campeão no HTML
    document.querySelectorAll('.champ-select-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const target = e.currentTarget;
            document.querySelectorAll('.champ-select-btn').forEach(b => b.classList.remove('active'));
            target.classList.add('active');
            state.player.champ = target.dataset.champ;
        });
    });

    // Botão de entrar na partida
    document.getElementById('btn-join-game').addEventListener('click', async () => {
        state.player.name = document.getElementById('player-name').value || 'Invocador';
        state.player.room = document.getElementById('room-id').value || 'sala_1';
        
        if (!state.player.champ) return alert('Por favor, selecione um Miraculous!');

        applyChampionBaseStats();
        buildDeck();

        // 1. Entra no Firebase
        state.myKey = await joinRoomFirebase(
            state.player.room,
            state.player.name,
            state.player.champ,
            state.myNexus.maxHp
        );

        // 2. Escuta mudanças da Sala
        listenToRoomState(
            state.player.room,
            state.myKey,
            (enemyHp, enemyName, remoteKey) => {
                state.enemyNexus.hp = enemyHp;
                state.enemyKey = remoteKey; // Precisamos da chave do inimigo para dar dano nele
                updateUI();
            },
            (champsInRoom) => {
                state.roomChampions = champsInRoom;
                updatePlayersBar();
            }
        );

        // Oculta lobby, mostra jogo
        document.getElementById('lobby-screen').classList.add('hidden');
        document.getElementById('game-screen').classList.remove('hidden');

        // Compra 4 cartas iniciais
        for(let i=0; i<4; i++) drawCard(true); // true = sem custo de energia no inicio

        startGameLoops();
        updateUI();
    });
}

function applyChampionBaseStats() {
    if (state.player.champ === 'galo') {
        state.stats.ad = 60; state.stats.crit = 15; state.stats.vamp = 15;
    } else if (state.player.champ === 'cabra') {
        state.stats.ap = 50; state.stats.armor = 25;
    } else if (state.player.champ === 'borboleta') {
        state.stats.ap = 35; state.stats.ad = 30; state.stats.mr = 30;
    }
}

/* --- 4. GESTÃO DE DECK E CARTAS --- */
function buildDeck() {
    state.deck = [];
    const myCards = CHAMPION_CARDS[state.player.champ];
    const globalCards = CHAMPION_CARDS['global'];
    const pool = [...myCards, ...myCards, ...globalCards]; // Mais peso para as cartas do champ

    for (let i = 0; i < state.maxDeckCards; i++) {
        const randomCard = pool[Math.floor(Math.random() * pool.length)];
        // Precisamos clonar para adicionar um instanceId único para o Drag and Drop
        state.deck.push({ ...randomCard, instanceId: 'card_' + Math.random().toString(36).substring(2, 9) });
    }
}

function drawCard(free = false) {
    if (state.hand.length >= state.maxHandSize) {
        return showFloatingText('Mão Cheia!', window.innerWidth / 2, window.innerHeight - 150, 'danger');
    }
    if (state.deck.length === 0) {
        return showFloatingText('Monte Vazio!', window.innerWidth / 2, window.innerHeight - 150, 'danger');
    }
    if (!free && state.energy < 1) {
        return showFloatingText('Sem Energia!', window.innerWidth / 2, window.innerHeight - 150, 'danger');
    }

    if (!free) state.energy -= 1; // Puxar custa 1 de energia
    
    const card = state.deck.pop();
    state.hand.push(card);
    updateUI();
}

function buyDeckReload() {
    if (state.gold < 100) return showFloatingText('Ouro Insuficiente!', window.innerWidth / 2, window.innerHeight - 100, 'danger');
    state.gold -= 100;
    buildDeck();
    updateUI();
}

/* --- 5. DRAG & DROP ENGINE --- */
function setupDragAndDrop() {
    const dropZone = document.getElementById('drop-zone');

    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.classList.add('drag-over');
    });

    dropZone.addEventListener('dragleave', () => {
        dropZone.classList.remove('drag-over');
    });

    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('drag-over');
        
        const instanceId = e.dataTransfer.getData('text/plain');
        playCard(instanceId);
    });
}

function playCard(instanceId) {
    const cardIndex = state.hand.findIndex(c => c.instanceId === instanceId);
    if (cardIndex === -1) return;

    const card = state.hand[cardIndex];

    if (state.energy < card.cost) {
        return showFloatingText('Sem Energia!', window.innerWidth / 2, window.innerHeight / 2, 'danger');
    }

    // Paga o custo, aplica o efeito e remove da mão
    state.energy -= card.cost;
    card.action(state); // Executa a função da carta
    state.hand.splice(cardIndex, 1);
    
    updateUI();
}

/* --- 6. COMBATE E STATUS --- */
function calculateDmg(baseDmg, canCrit) {
    let finalDmg = baseDmg;
    let isCrit = false;
    
    if (canCrit && (Math.random() * 100) <= state.stats.crit) {
        finalDmg *= 1.75;
        isCrit = true;
    }
    
    // Redução de dano por armadura base do inimigo simulada (Fórmula do LoL)
    let enemySimArmor = 40; 
    let effectiveArmor = Math.max(0, enemySimArmor - state.stats.pen);
    let mitigation = 100 / (100 + effectiveArmor);
    
    finalDmg = Math.floor(finalDmg * mitigation);

    if (isCrit) showFloatingText('CRÍTICO!', window.innerWidth/2, window.innerHeight/2, 'gold');
    
    return finalDmg;
}

function dealDamage(amount) {
    if(amount <= 0) return;
    
    state.enemyNexus.hp = Math.max(0, state.enemyNexus.hp - amount);
    
    // Animação CSS no Nexus inimigo
    const enemyNexusEl = document.querySelector('.nexus-card.enemy');
    enemyNexusEl.classList.add('taking-damage');
    setTimeout(() => enemyNexusEl.classList.remove('taking-damage'), 300);

    // Mostra Dano Flutuante
    showFloatingText(`-${amount}`, window.innerWidth / 1.5, 200, 'danger');

    // Manda pro Firebase para o inimigo receber
    if (state.enemyKey) {
        syncMyNexusHP(state.player.room, state.enemyKey, state.enemyNexus.hp);
    }

    // Vampirismo do Galo
    if (state.stats.vamp > 0) {
        healNexus(Math.floor(amount * (state.stats.vamp / 100)));
    }

    if (state.enemyNexus.hp === 0) {
        alert('VITÓRIA! Você destruiu o Nexus inimigo!');
        window.location.reload();
    }
}

function healNexus(amount) {
    state.myNexus.hp = Math.min(state.myNexus.maxHp + state.stats.bonusHp, state.myNexus.hp + amount);
    showFloatingText(`+${amount}`, window.innerWidth / 3, 200, 'success');
    
    // Sincroniza meu próprio HP no firebase para os outros verem minha cura
    syncMyNexusHP(state.player.room, state.myKey, state.myNexus.hp);
}

function addGold(amount) {
    state.gold += amount;
    showFloatingText(`+${amount}G`, window.innerWidth / 2, window.innerHeight - 100, 'gold');
    updateUI();
}

/* --- 7. MINIONS & FARM --- */
function buyMinion(lvlKey) {
    const mType = MINION_TYPES[lvlKey];
    if (!mType) return;

    if (state.gold < mType.cost) {
        return showFloatingText('Ouro Insuficiente!', window.innerWidth / 2, window.innerHeight - 100, 'danger');
    }

    state.gold -= mType.cost;
    state.myMinions.push({
        ...mType,
        currentHp: mType.hp,
        instanceId: Math.random().toString()
    });
    
    updateUI();
}

// Farma minions inimigos para ganhar ouro extra
window.farmEnemyMinion = function(event) {
    const goldEarned = Math.floor(Math.random() * 20) + 30; // Farm entre 30 e 50 G
    addGold(goldEarned);
    showFloatingText(`+${goldEarned}G`, event.clientX, event.clientY, 'gold');
    // Para efeito de demonstração, removemos o minion local simulado após o clique
    event.currentTarget.remove(); 
}

/* --- 8. EVENTOS ALEATÓRIOS DO JOGO --- */
const GAME_EVENTS = [
    { title: 'SURTO DE OURO', desc: 'Sua produção de ouro dobrou!', apply: (s) => s.baseGps *= 2, remove: (s) => s.baseGps /= 2 },
    { title: 'ECLIPSE MIRACULOSO', desc: 'Dano físico (AD) e Mágico (AP) aumentados em +40!', apply: (s) => { s.stats.ad += 40; s.stats.ap += 40; }, remove: (s) => { s.stats.ad -= 40; s.stats.ap -= 40; } },
    { title: 'SOBRECARGA DE ENERGIA', desc: 'Você agora ganha 2 de Energia por rodada.', apply: (s) => {}, remove: (s) => {} }
];

function triggerEvent() {
    if (state.activeEvent) return;
    
    const event = GAME_EVENTS[Math.floor(Math.random() * GAME_EVENTS.length)];
    state.activeEvent = event;
    event.apply(state);

    const banner = document.getElementById('event-banner');
    banner.innerText = `${event.title} - ${event.desc}`;
    banner.classList.add('active');

    setTimeout(() => {
        event.remove(state);
        state.activeEvent = null;
        banner.classList.remove('active');
        updateUI();
    }, 15000); // Evento dura 15 segundos
}

/* --- 9. RENDERIZAÇÃO DA INTERFACE (UI) --- */
function updateUI() {
    // 1. Barras de Vida
    document.getElementById('my-hp-text').innerText = `${Math.floor(state.myNexus.hp)} HP`;
    document.getElementById('my-hp-bar').style.width = `${(state.myNexus.hp / (state.myNexus.maxHp + state.stats.bonusHp)) * 100}%`;

    document.getElementById('enemy-hp-text').innerText = `${Math.floor(state.enemyNexus.hp)} HP`;
    document.getElementById('enemy-hp-bar').style.width = `${(state.enemyNexus.hp / state.enemyNexus.maxHp) * 100}%`;

    // 2. Status Base
    document.getElementById('stat-ad').innerText = Math.floor(state.stats.ad);
    document.getElementById('stat-ap').innerText = Math.floor(state.stats.ap);
    document.getElementById('stat-armor').innerText = Math.floor(state.stats.armor);
    document.getElementById('stat-mr').innerText = Math.floor(state.stats.mr);
    document.getElementById('stat-crit').innerText = `${Math.floor(state.stats.crit)}%`;
    document.getElementById('stat-vamp').innerText = `${Math.floor(state.stats.vamp)}%`;

    // 3. Recursos (Ouro, Energia, Limites)
    document.getElementById('gold-text').innerText = `${Math.floor(state.gold)} G`;
    document.getElementById('gps-text').innerText = `${state.baseGps} G/s`;
    document.getElementById('energy-text').innerText = `${state.energy}/${state.maxEnergy}`;
    document.getElementById('deck-count').innerText = state.deck.length;
    document.getElementById('hand-limit-text').innerText = `${state.hand.length}/${state.maxHandSize}`;

    renderHand();
    renderMinions();
}

function renderHand() {
    const container = document.getElementById('hand-container');
    container.innerHTML = '';

    state.hand.forEach(card => {
        const el = document.createElement('div');
        el.className = `card`;
        el.style.borderColor = `var(--theme-${card.type === 'global' ? 'galo' : card.type})`;
        el.draggable = true;
        
        el.innerHTML = `
            <div>
                <strong class="card-title">${card.name}</strong>
                <p class="card-desc">${card.desc}</p>
            </div>
            <div class="card-footer">
                <span class="energy-cost">⚡${card.cost}</span>
                <span class="badge-champ badge-${card.type}">${card.type}</span>
            </div>
        `;

        el.addEventListener('dragstart', (e) => {
            el.classList.add('dragging');
            e.dataTransfer.setData('text/plain', card.instanceId);
        });

        el.addEventListener('dragend', () => {
            el.classList.remove('dragging');
        });

        container.appendChild(el);
    });
}

function renderMinions() {
    const myLane = document.getElementById('my-minions-lane');
    myLane.innerHTML = '';

    state.myMinions.forEach(m => {
        const el = document.createElement('div');
        el.className = `minion-card lvl-${m.lvl}`;
        el.innerHTML = `
            <div class="minion-header">
                <span>Lvl ${m.lvl}</span>
                <span>${m.name}</span>
            </div>
            <div class="minion-stats" style="margin-top:auto;">
                <span style="color:var(--danger)">⚔️ ${m.atk}</span>
                <span style="color:var(--success)">❤️ ${m.currentHp}</span>
            </div>
        `;
        myLane.appendChild(el);
    });
}

function updatePlayersBar() {
    const bar = document.getElementById('players-bar');
    bar.innerHTML = `<span class="room-info">SALA: ${state.player.room.toUpperCase()}</span> <div class="players-list" id="p-list"></div>`;
    
    const list = document.getElementById('p-list');
    state.roomChampions.forEach(champ => {
        const isMe = champ === state.player.champ ? 'is-me' : '';
        list.innerHTML += `
            <div class="player-chip ${isMe}">
                <span class="badge-champ badge-${champ}">${champ}</span>
                ${isMe ? ' (Você)' : ''}
            </div>
        `;
    });
}

function showFloatingText(text, x, y, type = 'gold') {
    const el = document.createElement('div');
    el.className = `floating-text ${type}`;
    el.innerText = text;
    el.style.left = `${x}px`;
    el.style.top = `${y}px`;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 1200);
}

/* --- 10. LOOPS DO JOGO (Tempo Real) --- */
function startGameLoops() {
    // 1. Ouro e Energia a cada 2 Segundos (Turno/Rodada)
    setInterval(() => {
        state.gold += state.baseGps;
        
        // Regenera Energia baseado no evento ativo
        let energyRegen = (state.activeEvent && state.activeEvent.title === 'SOBRECARGA DE ENERGIA') ? 2 : 1;
        state.energy = Math.min(state.maxEnergy, state.energy + energyRegen);
        
        updateUI();
    }, 2000);

    // 2. Auto-Ataque dos Minions
    setInterval(() => {
        let totalMinionDmg = 0;
        state.myMinions.forEach(m => totalMinionDmg += m.atk);
        
        if (totalMinionDmg > 0) {
            dealDamage(totalMinionDmg);
            // Efeito visual leve
            const dropZone = document.getElementById('drop-zone');
            dropZone.style.boxShadow = "0 0 10px var(--danger)";
            setTimeout(() => dropZone.style.boxShadow = "none", 300);
        }
    }, 4000); // Atacam a cada 4 segundos

    // 3. Sistema de Eventos Aleatórios
    setInterval(() => {
        if (Math.random() > 0.5) triggerEvent();
    }, 45000); // Tenta ativar um evento a cada 45 segundos
}
