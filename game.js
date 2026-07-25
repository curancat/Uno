// ==========================================================================
// UNO LEGENDS: MIRACULOUS BRAWL - MOTOR DE JOGO DEFINITIVO (SEM NEXUS, KILLS & TEMPORIZADOR)
// ==========================================================================
import { joinRoomFirebase } from './firebase.js';

/* ==========================================================================
   1. BANCO DE DADOS: ITENS, MINIONS E CARTAS DE CAMPEÕES (GALO, CABRA, BORBOLETA)
   ========================================================================== */
const ALL_ITEMS = {
    // Globais
    'pocao': { name: 'Poção de Combate', cost: 50, type: 'all', stats: {}, desc: 'Restaura 300 de HP imediato.' },

    // Galo
    'lacre3000': { name: 'Lacre 3000g', cost: 3000, type: 'galo', stats: { crit: 10, ad: 100 }, desc: 'Executa almas com menos de 90% da vida.' },
    'skate2900': { name: 'Skate 2900g', cost: 2900, type: 'galo', stats: { crit: 5, ad: 60, armor: 40, mr: 30 }, desc: 'Paralisa inimigos por 3s ao causar dano.' },
    'mandrakit': { name: 'Mandrakit 2400g', cost: 2400, type: 'galo', stats: { crit: 30, ad: 30, ap: 30, mr: 30, bonusHp: 30 }, desc: '+15% de vida ao levar dano fatal.' },
    'alma_sebosa': { name: 'Alma Sebosa 3000g', cost: 3000, type: 'galo', stats: { crit: 15, ap: 20 }, desc: 'Bloqueie CC por 10s.' },
    'pate': { name: 'E o Patê? 2000g', cost: 2000, type: 'galo', stats: { crit: 5, armor: 40, mr: 30 }, desc: 'Atrasa dano inimigo por 5s.' },
    'bota_sapatona': { name: 'Bota (Sapatona) 1000g', cost: 1000, type: 'galo', stats: { crit: 2, pen: 3, ad: 5 }, desc: '+30 Vel. de Spawn e +5 AD.' },

    // Cabra (Littlegot)
    'pyton': { name: 'Pyton 2000g', cost: 2000, type: 'cabra', stats: { ad: 20, ap: 100, crit: 3 }, desc: 'Veneno causa dano contínuo por 5s.' },
    'javascript': { name: 'Java Script 2800g', cost: 2800, type: 'cabra', stats: { ap: 80, mr: 20 }, desc: 'Ganha escudo ao ser atingido (4s).' },
    'java': { name: 'Java 1900g', cost: 1900, type: 'cabra', stats: { crit: 50, ap: 50, ad: 50 }, desc: 'Cura 5 de vida a cada 20s.' },
    'bf2300': { name: 'BF 2300g', cost: 2300, type: 'cabra', stats: { bonusHp: 200, ad: 20, ap: 40, armor: 50 }, desc: '+1 AP para cada 1 de Armadura.' },
    'cadelagem': { name: 'Cadelagem 2000g', cost: 2000, type: 'cabra', stats: { ad: 80, ap: 50 }, desc: '+4 de gold por segundo.' },
    'bota_cadelagem': { name: 'Bota (Cadelagem) 1000g', cost: 1000, type: 'cabra', stats: { ap: 3, ad: 4, crit: 5 }, desc: '+20 Vel. de carta.' },

    // Borboleta
    'incubus': { name: 'Incubus 3000g', cost: 3000, type: 'borboleta', stats: { ap: 80, ad: 50, armor: 30 }, desc: 'Recupere vida ao invocar bots.' },
    'dono_inferno': { name: 'Dono do Inferno 4000g', cost: 4000, type: 'borboleta', stats: { ad: 20, ap: 80, bonusHp: 300, armor: 90 }, desc: 'Renasça após a morte.' },
    'fome_luxuria': { name: 'Fome de Luxúria 3500g', cost: 3500, type: 'borboleta', stats: { ap: 110, crit: 40, mr: 40, bonusHp: 100 }, desc: 'Bloqueie uma ação inimiga.' },
    'bibi_fogosa': { name: 'Bibi Fogosa 4000g', cost: 4000, type: 'borboleta', stats: { ap: 90, ad: 80 }, desc: 'Bots nocauteiam e dão dano contínuo.' },
    'vem_com_tudo': { name: 'Vem com Tudo 3900g', cost: 3900, type: 'borboleta', stats: { armor: 100, mr: 100 }, desc: 'Reduz dano em 40% abaixo de 60% HP.' },
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
        { name: 'Auto Ataque', type: 'galo', cost: 1, desc: 'Ataque básico direto no oponente (Usa AD e Crítico).', action: (s) => executeCardAttack('Auto Ataque', () => dealDamage(calculateDeterministicCrit(s.stats.ad))) },
        { name: 'Marola', type: 'galo', cost: 2, desc: 'Pena envenenada: dano contínuo. 3 pilhas = 10% da vida atual do alvo em dano verdadeiro.', action: (s) => executeCardAttack('Marola', () => { s.marolaStacks = (s.marolaStacks || 0) + 1; if(s.marolaStacks >= 3) { dealDamage(s.enemyPlayerHp * 0.10, true); s.marolaStacks = 0; showFloatingText('ESTOURO DE MAROLA!', innerWidth/2, 250, 'gold'); } else { dealDamage(s.stats.ad * 1.4); showFloatingText(`Pena Envenenada (${s.marolaStacks}/3)`, innerWidth/2, 220, 'purple'); } }) },
        { name: 'Dessa cor eu não tenho', type: 'galo', cost: 2, desc: 'Copia a última habilidade gasta, menos borboleta, joaninha e gato preto.', action: (s) => executeCardAttack('Cópia', () => { let copiedDmg = s.lastEnemySkillDmg || (s.stats.ad * 1.6); dealDamage(copiedDmg); showFloatingText('Habilidade Copiada!', innerWidth/2, 200, 'cyan'); }) },
        { name: 'Aiin', type: 'galo', cost: 2, desc: 'Concede escudo protetor decrescente.', action: (s) => executeCardAttack('Aiin', () => { s.stats.shield = (s.stats.shield || 0) + 350; showFloatingText('Escudo Aiin Ativado!', innerWidth/2, 200, 'success'); }) },
        { name: 'UTI do Galo', type: 'galo', cost: 3, desc: 'Frenesi: ganha mais crítico e dano proporcional.', action: (s) => executeCardAttack('UTI do Galo', () => { let bonusCrit = Math.floor(s.stats.crit * 0.5); s.stats.crit += bonusCrit; s.stats.ad += bonusCrit * 3; showFloatingText(`FRENESI UTI: +${bonusCrit}% Crit & AD!`, innerWidth/2, 230, 'gold'); }) }
    ],
    'cabra': [
        { name: 'Carta em Branco', type: 'cabra', cost: 0, desc: 'Sem efeito. Use a Oficina de Tintas (Vermelho, Amarelo, Azul) para mesclar!', action: (s) => showFloatingText('Carta em branco! Desenhe usando tintas.', innerWidth/2, 200, 'danger') }
    ],
    'borboleta': [
        { name: 'Auto Ataque', type: 'borboleta', cost: 1, desc: 'Disparo mágico básico no oponente.', action: (s) => executeCardAttack('Auto Ataque', () => dealDamage(s.stats.ap)) },
        { name: 'Akuma', type: 'borboleta', cost: 2, desc: 'Carrega borboleta com energia negativa.', action: (s) => executeCardAttack('Akuma', () => spawnButterflyBot(s)) },
        { name: 'Beijo Saliente', type: 'borboleta', cost: 3, desc: 'Infecta e drena 5% da vida máxima por segundo do alvo.', action: (s) => executeCardAttack('Beijo Saliente', () => { let drainAmount = s.enemyPlayerMaxHp * 0.05; dealDamage(drainAmount * 5); healPlayer(drainAmount * 5); showFloatingText('Vida Drenada!', innerWidth/2, 200, 'purple'); }) },
        { name: 'Desejo do Pecado', type: 'borboleta', cost: 2, desc: 'Rouba poderes do campeão alvo.', action: (s) => executeCardAttack('Desejo do Pecado', () => { s.stats.ap += 25; s.stats.ad += 20; showFloatingText('Poderes Drenados!', innerWidth/2, 200, 'purple'); }) },
        { name: 'UTI da Borboleta', type: 'borboleta', cost: 4, desc: 'Explode energia na mesa.', action: (s) => executeCardAttack('UTI Borboleta', () => { s.deck.push({ name: 'Carta Caos', type: 'borboleta', cost: 0, desc: 'Caos', action: () => dealDamage(250) }); showFloatingText('🌪️ CAOS NA MESA!', innerWidth/2, 230, 'purple'); }) }
    ],
    'global': [
        { name: 'Poção Rápida', type: 'global', cost: 1, desc: 'Cura 150 de HP.', action: (s) => executeCardAttack('Poção Rápida', () => healPlayer(150)) },
        { name: 'Muralha', type: 'global', cost: 2, desc: 'Aumenta Armadura e Resistência Mágica.', action: (s) => executeCardAttack('Muralha', () => { s.stats.armor += 15; s.stats.mr += 15; }) }
    ]
};

/* ==========================================================================
   2. ESTADO GLOBAL DO JOGO & TEMPORIZADOR (10 A 50 MINUTOS / KILLS)
   ========================================================================== */
let state = {
    player: { name: '', room: '', champ: '', level: 1, xp: 0, maxXp: 100, kills: 0, deaths: 0 },
    myKey: '', 
    enemyKey: '',
    selectedEnemyKey: null, 
    roomPlayers: {},        
    
    gold: 500, baseGps: 5,
    energy: 5, maxEnergy: 5,
    hand: [], maxHandSize: 7,
    deck: [], maxDeckCards: 20,
    inventory: [],
    myMinions: [], enemyMinions: [],
    
    isMyTurn: true,
    turnNumber: 1,

    // Temporizador de Partida (20 minutos de puro combate, configurável entre 600 a 3000 segundos)
    matchTimeRemaining: 1200, 
    matchActive: true,

    // Sistema Littlegot (Cabra) com Decks de Tintas
    inkPots: { red: 3, blue: 3, yellow: 3, max: 6 },
    currentInkMix: [],
    inkDecks: {
        red: [
            { name: 'Bola de Fogo', cost: 2, desc: 'Atira bola de fogo.', action: (s) => executeCardAttack('Bola de Fogo', () => dealDamage(s.stats.ap * 1.5)) },
            { name: 'Laser', cost: 2, desc: 'Tiro potente.', action: (s) => executeCardAttack('Laser', () => dealDamage(s.stats.ap * 1.8)) },
            { name: 'Lança Chamas', cost: 3, desc: 'Dano contínuo crescente.', action: (s) => executeCardAttack('Lança Chamas', () => dealDamage(s.stats.ap * 2.2)) }
        ],
        yellow: [
            { name: 'Lanterna', cost: 1, desc: 'Escudo protetor.', action: (s) => { s.stats.shield = (s.stats.shield || 0) + 150; showFloatingText('Escudo Criado!', innerWidth/2, 200, 'gold'); } },
            { name: 'Lâmpada', cost: 2, desc: 'Cura e escudo maciço.', action: (s) => { healPlayer(300); showFloatingText('Blindagem Ativa!', innerWidth/2, 200, 'gold'); } },
            { name: 'Sol', cost: 2, desc: 'Escudo absoluto.', action: (s) => { s.stats.armor += 20; showFloatingText('Defesa Fortalecida!', innerWidth/2, 200, 'gold'); } }
        ],
        blue: [
            { name: 'Pedra', cost: 1, desc: 'Dano físico pesado.', action: (s) => executeCardAttack('Pedra', () => dealDamage(s.stats.ad * 1.3)) },
            { name: 'Chicote', cost: 2, desc: 'Rouba uma carta.', action: (s) => { s.hand.push({ name: 'Carta Roubada', type: 'cabra', cost: 1, desc: 'Espólio', action: () => dealDamage(100) }); showFloatingText('Carta Roubada!', innerWidth/2, 200, 'cyan'); } },
            { name: 'Água', cost: 1, desc: 'Recupera vida e tinta.', action: (s) => { healPlayer(120); state.inkPots.blue = Math.min(state.inkPots.max, state.inkPots.blue + 1); showFloatingText('Vida e Tinta Restauradas!', innerWidth/2, 200, 'success'); } }
        ]
    },

    butterflyBots: [],
    roomChampions: [], activeEvent: null,
    marolaStacks: 0,
    isDead: false,
    
    myPlayerHp: 3000,
    myPlayerMaxHp: 3000,
    enemyPlayerHp: 3000,
    enemyPlayerMaxHp: 3000,

    stats: { ad: 15, ap: 15, armor: 10, mr: 10, crit: 0, vamp: 0, pen: 0, bonusHp: 0, shield: 0 },
    critCredit: 0
};

/* ==========================================================================
   3. INICIALIZAÇÃO & PAINEL DE BRAWL E PANCADARIA (HUD EXCLUSIVO)
   ========================================================================== */
document.addEventListener('DOMContentLoaded', () => {
    setupLobby();
    setupDragAndDrop();
});

function injectDynamicUI() {
    if (document.getElementById('floating-action-hud')) return;

    const hud = document.createElement('div');
    hud.id = 'floating-action-hud';
    hud.style.cssText = `
        position: fixed;
        top: 15px;
        right: 15px;
        width: 320px;
        background: rgba(15, 23, 42, 0.97);
        border: 2px solid #ef4444;
        border-radius: 12px;
        padding: 14px;
        display: flex;
        flex-direction: column;
        gap: 12px;
        z-index: 1000;
        box-shadow: 0 10px 25px rgba(0,0,0,0.8);
        backdrop-filter: blur(12px);
        box-sizing: border-box;
        max-height: 94vh;
        overflow-y: auto;
    `;

    hud.innerHTML = `
        <div style="font-size:0.82rem; color:#ef4444; font-weight:bold; border-bottom:1px solid #334155; padding-bottom:6px; display:flex; justify-content:space-between; align-items:center;">
            <span>⚔️ ARENA DE PANCADARIA</span>
            <span id="match-timer-hud" style="font-size:0.75rem; background:#7f1d1d; padding:2px 8px; border-radius:4px; color:#f87171; font-weight:bold;">20:00</span>
        </div>

        <div style="background:rgba(30,41,59,0.9); border:1px solid #38bdf8; padding:8px; border-radius:8px; text-align:center;">
            <div style="font-size:0.7rem; color:#38bdf8; font-weight:bold;">PLACAR DE KILLS (QUEM TIVER MAIS VENCE)</div>
            <div style="display:flex; justify-content:space-around; margin-top:6px; font-size:0.9rem; font-weight:bold;">
                <span style="color:#22c55e;">Suas Kills: <span id="my-kills-count">0</span></span>
                <span style="color:#ef4444;">Inimigo: <span id="enemy-kills-count">0</span></span>
            </div>
        </div>

        <div id="cabra-hud-panel" class="${state.player.champ === 'cabra' ? '' : 'hidden'}" style="background:rgba(30,41,59,0.85); border:1px solid #f59e0b; padding:10px; border-radius:8px;">
            <div style="font-size:0.75rem; color:#fbbf24; font-weight:bold; margin-bottom:8px; display:flex; justify-content:space-between; align-items:center;">
                <span>🎨 OFICINA DE TINTAS (LITTLEGOT)</span>
                <span style="font-size:0.6rem; color:#38bdf8;">Cabra</span>
            </div>
            <div style="display:flex; gap:6px; margin-bottom:8px;">
                <button class="btn" style="background:#ef4444; padding:6px 2px; flex:1; font-size:0.68rem; color:#fff;" onclick="addInk('red')">Verm (<span id="ink-red-count">3</span>)</button>
                <button class="btn" style="background:#3b82f6; padding:6px 2px; flex:1; font-size:0.68rem; color:#fff;" onclick="addInk('blue')">Azul (<span id="ink-blue-count">3</span>)</button>
                <button class="btn" style="background:#fbbf24; padding:6px 2px; flex:1; font-size:0.68rem; color:#000; font-weight:bold;" onclick="addInk('yellow')">Amar (<span id="ink-yellow-count">3</span>)</button>
            </div>
            <div style="font-size:0.7rem; color:#cbd5e1; margin-bottom:8px; background:#090d16; padding:6px; border-radius:4px; text-align:center;" id="ink-mix-display">Mistura Atual: Nenhuma</div>
            <div style="display:flex; gap:6px;">
                <button class="btn btn-gold" style="padding:8px 4px; flex:1; font-size:0.7rem; font-weight:bold;" onclick="mergeInksButton()">✨ MESCLAR TINTAS</button>
            </div>
        </div>

        <div style="background:rgba(30,41,59,0.75); border:1px solid #ef4444; padding:10px; border-radius:8px;">
            <div style="font-size:0.75rem; color:#ef4444; font-weight:bold; margin-bottom:6px;">🎯 ALVO PRINCIPAL (ATACAR INIMIGO DIRETAMENTE):</div>
            <select id="target-select" style="width:100%; background:#090d16; color:#fff; border:1px solid #334155; padding:8px; border-radius:6px; font-size:0.8rem;" onchange="changeTarget(this.value)">
                <option value="">Aguardando oponentes na sala...</option>
            </select>
        </div>

        <div>
            <button id="btn-end-turn" class="btn btn-danger" style="width:100%; padding:12px; font-size:0.85rem; font-weight:bold; border-radius:8px;" onclick="endTurn()">⏳ PASSAR TURNO</button>
        </div>
    `;

    document.body.appendChild(hud);

    const gameArea = document.querySelector('.game-board') || document.body;
    if (!document.getElementById('brawl-status-bar')) {
        const statusBar = document.createElement('div');
        statusBar.id = 'brawl-status-bar';
        statusBar.style.cssText = `
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 10px 20px;
            background: rgba(15, 23, 42, 0.9);
            border-bottom: 2px solid #ef4444;
            margin-bottom: 15px;
        `;
        statusBar.innerHTML = `
            <div style="display:flex; align-items:center; gap:12px;">
                <div style="font-weight:bold; color:#22c55e;" id="my-brawl-name">Você</div>
                <div style="width:150px; background:#1e293b; height:12px; border-radius:6px; overflow:hidden; border:1px solid #22c55e;">
                    <div id="my-player-hp-bar" style="width:100%; height:100%; background:#22c55e; transition:width 0.3s;"></div>
                </div>
                <span id="my-player-hp-text" style="font-size:0.75rem; color:#22c55e;">3000 HP</span>
            </div>
            <div style="font-weight:bold; color:#f87171; font-size:1.1rem;">VS</div>
            <div style="display:flex; align-items:center; gap:12px;">
                <span id="enemy-player-hp-text" style="font-size:0.75rem; color:#ef4444;">3000 HP</span>
                <div style="width:150px; background:#1e293b; height:12px; border-radius:6px; overflow:hidden; border:1px solid #ef4444;">
                    <div id="enemy-player-hp-bar" style="width:100%; height:100%; background:#ef4444; transition:width 0.3s;"></div>
                </div>
                <div style="font-weight:bold; color:#ef4444;" id="enemy-brawl-name">Inimigo</div>
            </div>
        `;
        gameArea.prepend(statusBar);
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
        state.player.name = document.getElementById('player-name').value || 'Brawler';
        state.player.room = document.getElementById('room-id').value || 'sala_brawl';
        if (!state.player.champ) return alert('Escolha um Miraculous!');

        applyChampBaseStats();
        buildDeck();

        state.myKey = await joinRoomFirebase(state.player.room, state.player.name, state.player.champ, state.myPlayerMaxHp);
        
        document.getElementById('lobby-screen').classList.add('hidden');
        document.getElementById('game-screen').classList.remove('hidden');

        injectDynamicUI();

        import('https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js').then(({ getDatabase, ref, onValue }) => {
            const db = getDatabase();
            const roomRef = ref(db, `rooms/${state.player.room}/players`);
            onValue(roomRef, (snapshot) => {
                const data = snapshot.val();
                if (!data) return;
                state.roomPlayers = data;

                let champsInRoom = [];
                let selectEl = document.getElementById('target-select');
                let optionsHtml = '';

                Object.keys(data).forEach(key => {
                    const p = data[key];
                    champsInRoom.push(p.champ);

                    if (key !== state.myKey) {
                        const isSelected = state.selectedEnemyKey === key ? 'selected' : '';
                        optionsHtml += `<option value="${key}" ${isSelected}>${p.name} (${p.champ.toUpperCase()} - ${Math.floor(p.hp || 3000)} HP)</option>`;
                    }
                });

                state.roomChampions = champsInRoom;
                updatePlayersBar();
                populateShop();

                if (selectEl) {
                    selectEl.innerHTML = optionsHtml || '<option value="">Sozinho na arena (Modo Treino vs Bot)</option>';
                }

                const otherKeys = Object.keys(data).filter(k => k !== state.myKey);
                if ((!state.selectedEnemyKey || !data[state.selectedEnemyKey]) && otherKeys.length > 0) {
                    state.selectedEnemyKey = otherKeys[0];
                    if (selectEl) selectEl.value = state.selectedEnemyKey;
                }

                if (state.selectedEnemyKey && data[state.selectedEnemyKey]) {
                    state.enemyPlayerHp = data[state.selectedEnemyKey].hp || 3000;
                    state.enemyPlayerMaxHp = data[state.selectedEnemyKey].maxHp || 3000;
                    state.enemyKey = state.selectedEnemyKey;
                    const enemyNameEl = document.getElementById('enemy-brawl-name');
                    if (enemyNameEl) enemyNameEl.innerText = data[state.selectedEnemyKey].name || 'Inimigo';
                } else {
                    state.selectedEnemyKey = null;
                }

                // Sincronizar próprio HP se modificado externamente no Firebase
                if (data[state.myKey] && data[state.myKey].hp !== undefined) {
                    state.myPlayerHp = data[state.myKey].hp;
                }

                updateUI();
            });
        });

        for (let i = 0; i < 4; i++) drawCard(true);
        startGameLoops();
        updateUI();
    });
}

window.changeTarget = function(targetKey) {
    state.selectedEnemyKey = targetKey;
    if (state.roomPlayers && state.roomPlayers[targetKey]) {
        state.enemyPlayerHp = state.roomPlayers[targetKey].hp || 3000;
        state.enemyKey = targetKey;
        const enemyNameEl = document.getElementById('enemy-brawl-name');
        if (enemyNameEl) enemyNameEl.innerText = state.roomPlayers[targetKey].name || 'Inimigo';
        showFloatingText(`Alvo focado: ${state.roomPlayers[targetKey].name}`, innerWidth/2, 160, 'cyan');
    }
    updateUI();
}

function applyChampBaseStats() {
    if (state.player.champ === 'galo') { state.stats.ad = 60; state.stats.crit = 20; state.stats.vamp = 20; }
    if (state.player.champ === 'cabra') { state.stats.ap = 55; state.stats.armor = 20; }
    if (state.player.champ === 'borboleta') { state.stats.ap = 60; state.stats.ad = 35; state.stats.mr = 30; }
}

/* ==========================================================================
   4. SISTEMA DE EXPERIÊNCIA E NÍVEL 18
   ========================================================================= */
function addXp(amount) {
    if (state.player.level >= 18) return;

    state.player.xp += amount;
    if (state.player.xp >= state.player.maxXp) {
        state.player.level++;
        state.player.xp = state.player.xp - state.player.maxXp;
        state.player.maxXp = Math.floor(state.player.maxXp * 1.3);
        
        state.stats.ad += 6;
        state.stats.ap += 6;
        state.stats.bonusHp += 150;
        state.myPlayerMaxHp += 150;
        healPlayer(150);

        showFloatingText(`🌟 LEVEL UP! Nível ${state.player.level}!`, innerWidth/2, innerHeight/2 - 100, 'gold');
    }
    updateUI();
}

/* ==========================================================================
   5. SISTEMA DE TURNOS E PASSAGEM
   ========================================================================= */
window.endTurn = function() {
    if (!state.isMyTurn) return;
    
    state.isMyTurn = false;
    const btnEnd = document.getElementById('btn-end-turn');
    if (btnEnd) {
        btnEnd.disabled = true;
        btnEnd.innerText = 'TURNO PROCESSANDO...';
    }
    showFloatingText('Fim do seu turno!', innerWidth/2, innerHeight/2, 'cyan');

    if (state.butterflyBots.length > 0) {
        executeButterflyBots();
    }

    const otherPlayersCount = Object.keys(state.roomPlayers).filter(k => k !== state.myKey).length;
    const waitTime = otherPlayersCount > 0 ? 4000 : 800;

    setTimeout(() => {
        state.turnNumber++;
        state.isMyTurn = true;
        
        state.energy = state.maxEnergy;
        if (state.player.champ === 'cabra') {
            state.inkPots.red = Math.min(state.inkPots.max, state.inkPots.red + 1);
            state.inkPots.blue = Math.min(state.inkPots.max, state.inkPots.blue + 1);
            state.inkPots.yellow = Math.min(state.inkPots.max, state.inkPots.yellow + 1);
        }
        
        if (btnEnd) {
            btnEnd.disabled = false;
            btnEnd.innerText = '⏳ PASSAR TURNO';
        }
        showFloatingText(`Seu Turno (Rodada ${state.turnNumber})`, innerWidth/2, innerHeight/2, 'gold');
        
        drawCard(true);
        updateUI();
    }, waitTime);
}

function spawnButterflyBot(s) {
    const copyTarget = state.roomChampions.length > 0 ? state.roomChampions[Math.floor(Math.random() * state.roomChampions.length)] : 'Oponente';
    showFloatingText(`🦋 Akuma invocado! Replicando: ${copyTarget.toUpperCase()}`, innerWidth/2, 220, 'purple');
    
    s.stats.ap += 15;
    s.stats.mr += 10;
    s.stats.armor += 10;
    healPlayer(150);

    const newBot = {
        id: Math.random(),
        name: `Sombra Akuma de ${copyTarget}`,
        power: s.stats.ap * 1.6,
        turnsLeft: 3
    };

    state.butterflyBots.push(newBot);
    updateUI();
}

function executeButterflyBots() {
    state.butterflyBots.forEach(bot => {
        let replicatedDmg = bot.power * 0.9;
        showFloatingText(`🦋 ${bot.name} atacou o oponente! (-${Math.floor(replicatedDmg)})`, innerWidth/2, 280, 'purple');
        dealDamage(replicatedDmg);
        bot.turnsLeft--;
    });
    
    state.butterflyBots = state.butterflyBots.filter(b => b.turnsLeft > 0);
}

/* ==========================================================================
   6. TINTAS DO LITTLEGOT (CABRA) & CARTAS BRANCAS
   ========================================================================= */
window.addInk = function(color) {
    if (state.inkPots[color] <= 0) return showFloatingText('Pote de Tinta Vazio!', innerWidth/2, 200, 'danger');
    if (state.currentInkMix.length >= 2) return showFloatingText('Máximo de 2 tintas misturadas!', innerWidth/2, 200, 'danger');
    
    state.inkPots[color]--;
    state.currentInkMix.push(color);
    showFloatingText(`Tinta ${color.toUpperCase()} adicionada!`, innerWidth/2, 200, 'cyan');
    updateUI();
}

window.mergeInksButton = function() {
    if (state.currentInkMix.length === 0) return showFloatingText('Adicione tintas antes de mesclar!', innerWidth/2, 200, 'danger');
    
    let mixKey = state.currentInkMix.sort().join('+');
    let cardName = `Magia Mesclada (${mixKey.toUpperCase()})`;
    let desc = `Fusão das tintas: ${mixKey}.`;
    let actionFn = (s) => executeCardAttack(cardName, () => {
        let dmg = s.stats.ap * 2.5;
        dealDamage(dmg);
        healPlayer(200);
        s.gold += 50;
        showFloatingText('✨ FUSÃO EXPLOSIVA!', innerWidth/2, 240, 'gold');
    });

    const mergedCard = {
        name: cardName,
        type: 'cabra',
        cost: 0,
        desc: desc,
        action: actionFn,
        instanceId: 'c_' + Math.random().toString(36).substring(2)
    };

    const blankIdx = state.hand.findIndex(c => c.name === 'Carta em Branco');
    if (blankIdx !== -1) {
        state.hand[blankIdx] = mergedCard;
    } else {
        if (state.hand.length < state.maxHandSize) {
            state.hand.push(mergedCard);
        } else {
            state.hand[0] = mergedCard;
        }
    }

    state.currentInkMix = [];
    showFloatingText('🎨 TINTAS MESCLADAS NA CARTA!', innerWidth/2, 210, 'gold');
    addXp(15);
    updateUI();
}

/* ==========================================================================
   7. SISTEMA DE CARTAS E DECK
   ========================================================================= */
function buildDeck() {
    state.deck = [];
    let pool = CHAMPION_CARDS[state.player.champ];
    if (!pool) pool = CHAMPION_CARDS['global'];

    if (state.player.champ === 'cabra') {
        pool = [...pool, ...state.inkDecks.red, ...state.inkDecks.yellow, ...state.inkDecks.blue];
    }

    for (let i = 0; i < state.maxDeckCards; i++) {
        const randCard = pool[Math.floor(Math.random() * pool.length)];
        state.deck.push({ ...randCard, instanceId: 'c_' + Math.random().toString(36).substring(2) });
    }
}

window.drawCard = function(free = false) {
    if (state.isDead) return;
    if (!state.isMyTurn && !free) return showFloatingText('Aguarde o seu turno!', innerWidth/2, 220, 'danger');
    
    if (state.hand.length >= state.maxHandSize) {
        return showFloatingText('⚠️ Limite máximo de cartas (7/7)!', innerWidth/2, 220, 'danger');
    }
    
    if (state.deck.length === 0) return showFloatingText('Monte Vazio!', innerWidth/2, 220, 'danger');
    
    if (!free && state.player.champ !== 'cabra') {
        if (state.energy < 1) return showFloatingText('Sem Energia!', innerWidth/2, 220, 'danger');
        state.energy--;
    }

    state.hand.push(state.deck.pop());
    updateUI();
}

/* ==========================================================================
   8. DRAG & DROP E ATAQUE DIRETO AO OPONENTE
   ========================================================================= */
function setupDragAndDrop() {
    const dropZone = document.getElementById('drop-zone');
    if (!dropZone) return;
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
    if (!state.isMyTurn) return showFloatingText('Aguarde o seu turno!', innerWidth/2, 220, 'danger');

    const idx = state.hand.findIndex(c => c.instanceId === instanceId);
    if (idx === -1) return;
    const card = state.hand[idx];
    
    if (state.energy < card.cost && state.player.champ !== 'cabra') {
        return showFloatingText('Sem Energia Suficiente!', innerWidth/2, innerHeight/2, 'danger');
    }
    
    state.energy -= card.cost;
    card.action(state);
    state.lastEnemySkillDmg = card.cost * 45;
    state.hand.splice(idx, 1);
    
    addXp(15);
    updateUI();
}

function executeCardAttack(cardName, damageCallback) {
    damageCallback();
}

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
        state.critCredit += critChance * 0.5;
    }

    let finalDmg = baseDmg;
    if (isCrit) {
        finalDmg *= 1.85;
        showFloatingText('💥 CRÍTICO FATAL!', innerWidth/2, innerHeight/2 - 50, 'gold');
    }

    let mitigation = 100 / (100 + Math.max(0, 40 - state.stats.pen));
    return Math.floor(finalDmg * mitigation);
}

function dealDamage(amount, isTrue = false) {
    state.enemyPlayerHp = Math.max(0, state.enemyPlayerHp - amount);
    state.gold += 30;
    addXp(12);

    showFloatingText(`-${Math.floor(amount)} (Dano no Inimigo!)`, innerWidth / 2, 180, 'danger');

    if (state.player.champ === 'galo') {
        state.stats.vamp = state.stats.crit;
    }
    if (state.stats.vamp > 0) {
        healPlayer(amount * (state.stats.vamp / 100));
    }

    // Sincroniza o HP do alvo atacado no Firebase em tempo real para o outro dispositivo
    if (state.selectedEnemyKey) {
        import('https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js').then(({ getDatabase, ref, update }) => {
            const db = getDatabase();
            const targetRef = ref(db, `rooms/${state.player.room}/players/${state.selectedEnemyKey}`);
            update(targetRef, { hp: state.enemyPlayerHp });
        });
    }

    // Se o inimigo foi derrotado, ganha +1 Kill!
    if (state.enemyPlayerHp <= 0) {
        state.player.kills++;
        showFloatingText('💀 INIMIGO ABATIDO! +1 KILL!', innerWidth/2, 220, 'gold');
        state.enemyPlayerHp = state.enemyPlayerMaxHp; // Respawn em combate
        if (state.selectedEnemyKey) {
            import('https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js').then(({ getDatabase, ref, update }) => {
                const db = getDatabase();
                const targetRef = ref(db, `rooms/${state.player.room}/players/${state.selectedEnemyKey}`);
                update(targetRef, { hp: state.enemyPlayerHp });
            });
        }
    }

    updateUI();
}

function healPlayer(amount) {
    let maxLimit = state.myPlayerMaxHp + state.stats.bonusHp;
    state.myPlayerHp = Math.min(maxLimit, state.myPlayerHp + amount);
    
    // Sincroniza cura própria no Firebase
    if (state.myKey) {
        import('https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js').then(({ getDatabase, ref, update }) => {
            const db = getDatabase();
            const myRef = ref(db, `rooms/${state.player.room}/players/${state.myKey}`);
            update(myRef, { hp: state.myPlayerHp });
        });
    }

    showFloatingText(`+${Math.floor(amount)} HP`, innerWidth/3, 200, 'success');
}

/* ==========================================================================
   9. LOJA E INVENTÁRIO
   ========================================================================= */
window.toggleShop = function() {
    const modal = document.getElementById('shop-modal');
    if (modal) modal.style.display = modal.style.display === 'flex' ? 'none' : 'flex';
}

function populateShop() {
    const grid = document.getElementById('shop-grid');
    if (!grid) return;
    grid.innerHTML = '';
    Object.keys(ALL_ITEMS).forEach(key => {
        const item = ALL_ITEMS[key];
        if (item.type !== 'all' && !state.roomChampions.includes(item.type)) return;

        grid.innerHTML += `
            <div style="background:rgba(0,0,0,0.7); border:1px solid #334155; padding:10px; border-radius:10px; display:flex; flex-direction:column; justify-content:space-between;">
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
            healPlayer(300);
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
    if (!list) return;
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
        if (mult > 0) healPlayer(stats.bonusHp);
    }
}

/* ==========================================================================
   10. MINIONS & FARM DE TROPAS
   ========================================================================= */
window.buyMinion = function(lvlKey) {
    const mType = MINION_TYPES[lvlKey];
    if (state.gold < mType.cost) return showFloatingText('Sem Ouro!', innerWidth/2, 200, 'danger');
    state.gold -= mType.cost;
    state.myMinions.push({ ...mType, currentHp: mType.hp, id: Math.random() });
    updateUI();
}

function spawnEnemyMinion() {
    if (state.enemyMinions.length >= 4) return;
    state.enemyMinions.push({ id: Math.random(), hp: 80, goldReward: 50 });
    renderEnemyMinions();
}

window.farmEnemyMinion = function(id, clientX, clientY, reward) {
    if (!state.isMyTurn) return showFloatingText('Aguarde o seu turno!', clientX, clientY, 'danger');
    
    state.enemyMinions = state.enemyMinions.filter(m => m.id !== id);
    state.gold += reward;
    addXp(12);
    showFloatingText(`+${reward} G (Farm)`, clientX, clientY, 'gold');
    renderEnemyMinions();
    updateUI();
}

/* ==========================================================================
   11. RENDERIZAÇÃO & LOOPS DE TEMPORIZADOR E BRAWL
   ========================================================================= */
function updateUI() {
    if (state.player.champ === 'galo') state.stats.vamp = state.stats.crit;
    let dynamicAp = state.stats.ap;
    if (state.inventory.includes('bf2300')) dynamicAp += state.stats.armor;

    const lvlText = document.getElementById('player-lvl-text');
    if (lvlText) lvlText.innerText = `NÍVEL ${state.player.level}`;
    const xpText = document.getElementById('player-xp-text');
    if (xpText) xpText.innerText = `${state.player.xp}/${state.player.maxXp} XP`;
    const xpBar = document.getElementById('player-xp-bar');
    if (xpBar) xpBar.style.width = `${(state.player.xp / state.player.maxXp) * 100}%`;

    if (state.player.champ === 'cabra') {
        const mixDisplay = document.getElementById('ink-mix-display');
        if (mixDisplay) mixDisplay.innerText = `Mistura: ${state.currentInkMix.join(' + ') || 'Nenhuma'}`;
        if (document.getElementById('ink-red-count')) document.getElementById('ink-red-count').innerText = state.inkPots.red;
        if (document.getElementById('ink-blue-count')) document.getElementById('ink-blue-count').innerText = state.inkPots.blue;
        if (document.getElementById('ink-yellow-count')) document.getElementById('ink-yellow-count').innerText = state.inkPots.yellow;
    }

    const myHpText = document.getElementById('my-player-hp-text');
    if (myHpText) myHpText.innerText = `${Math.floor(state.myPlayerHp)} HP`;
    let maxMyHp = state.myPlayerMaxHp + state.stats.bonusHp;
    const myHpBar = document.getElementById('my-player-hp-bar');
    if (myHpBar) myHpBar.style.width = `${Math.max(0, Math.min(100, (state.myPlayerHp / maxMyHp) * 100))}%`;

    const enemyPlayerHpText = document.getElementById('enemy-player-hp-text');
    if (enemyPlayerHpText) enemyPlayerHpText.innerText = `${Math.floor(state.enemyPlayerHp)} HP`;
    const enemyPlayerHpBar = document.getElementById('enemy-player-hp-bar');
    if (enemyPlayerHpBar) enemyPlayerHpBar.style.width = `${Math.max(0, Math.min(100, (state.enemyPlayerHp / state.enemyPlayerMaxHp) * 100))}%`;

    if (document.getElementById('my-kills-count')) document.getElementById('my-kills-count').innerText = state.player.kills;

    if (document.getElementById('stat-ad')) document.getElementById('stat-ad').innerText = Math.floor(state.stats.ad);
    if (document.getElementById('stat-ap')) document.getElementById('stat-ap').innerText = Math.floor(dynamicAp);
    if (document.getElementById('stat-armor')) document.getElementById('stat-armor').innerText = Math.floor(state.stats.armor);
    if (document.getElementById('stat-mr')) document.getElementById('stat-mr').innerText = Math.floor(state.stats.mr);
    if (document.getElementById('stat-crit')) document.getElementById('stat-crit').innerText = `${Math.floor(state.stats.crit)}%`;
    if (document.getElementById('stat-vamp')) document.getElementById('stat-vamp').innerText = `${Math.floor(state.stats.vamp)}%`;

    if (document.getElementById('gold-text')) document.getElementById('gold-text').innerText = `${Math.floor(state.gold)} G`;
    let extraGps = state.inventory.includes('cadelagem') ? 4 : 0;
    if (document.getElementById('gps-text')) document.getElementById('gps-text').innerText = `${state.baseGps + extraGps} G/s`;
    if (document.getElementById('energy-text')) document.getElementById('energy-text').innerText = `${state.energy}/${state.maxEnergy}`;
    if (document.getElementById('deck-count')) document.getElementById('deck-count').innerText = state.deck.length;
    if (document.getElementById('hand-limit-text')) document.getElementById('hand-limit-text').innerText = `${state.hand.length}/${state.maxHandSize}`;

    renderHand();
    renderMinions();
}

function renderHand() {
    const cont = document.getElementById('hand-container');
    if (!cont) return;
    cont.innerHTML = '';

    state.hand.forEach(c => {
        let el = document.createElement('div');
        el.className = 'card';
        if (c.name === 'Carta em Branco') el.classList.add('blank-card');
        
        el.draggable = c.name !== 'Carta em Branco';
        
        el.innerHTML = `
            <div>
                <strong class="card-title">${c.name}</strong>
                <p class="card-desc">${c.desc}</p>
            </div>
            <div class="card-footer">
                <span class="energy-cost">${c.name === 'Carta em Branco' ? '0' : (state.player.champ === 'cabra' ? '🎨' : c.cost + ' EN')}</span>
            </div>
        `;
        
        if (el.draggable) {
            el.addEventListener('dragstart', e => {
                el.classList.add('dragging');
                e.dataTransfer.setData('text/plain', c.instanceId);
            });
            el.addEventListener('dragend', () => el.classList.remove('dragging'));
        }
        cont.appendChild(el);
    });
}

function renderMinions() {
    const lane = document.getElementById('my-minions-lane');
    if (!lane) return;
    lane.innerHTML = '';
    state.myMinions.forEach(m => {
        lane.innerHTML += `<div class="minion-card" style="border-color:var(--cyan-glow)"><strong>${m.name}</strong><p>⚔️ ${m.atk} | ❤️ ${m.currentHp}</p></div>`;
    });
    state.butterflyBots.forEach(b => {
        lane.innerHTML += `<div class="minion-card" style="border-color:#a855f7"><strong>🦋 ${b.name}</strong><p>⏳ Turnos: ${b.turnsLeft}</p></div>`;
    });
}

function renderEnemyMinions() {
    const lane = document.getElementById('enemy-minions-lane');
    if (!lane) return;
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
    if (!b) return;
    b.innerHTML = `<span style="color:#94a3b8; font-weight:bold;">SALA BRAWL: ${state.player.room.toUpperCase()}</span><div class="players-list" id="plist"></div>`;
    state.roomChampions.forEach(c => {
        const plist = document.getElementById('plist');
        if (plist) plist.innerHTML += `<div class="player-chip"><span class="badge-champ badge-${c}">${c}</span></div>`;
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
    // Loop do Temporizador de Partida (Contagem regressiva de 20 min)
    setInterval(() => {
        if (!state.matchActive) return;
        if (state.matchTimeRemaining > 0) {
            state.matchTimeRemaining--;
            let mins = Math.floor(state.matchTimeRemaining / 60);
            let secs = state.matchTimeRemaining % 60;
            let timerEl = document.getElementById('match-timer-hud');
            if (timerEl) {
                timerEl.innerText = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
            }
        } else {
            state.matchActive = false;
            alert(`⏱️ TEMPO ESGOTADO! Fim da partida. Quem tiver mais kills (${state.player.kills}) ganha!`);
            window.location.reload();
        }
    }, 1000);

    setInterval(() => {
        if (state.isDead) return;
        let gps = state.baseGps + (state.inventory.includes('cadelagem') ? 4 : 0);
        state.gold += gps;
        updateUI();
    }, 2000);

    setInterval(() => {
        if (state.isDead) return;
        let totalDmg = 0;
        state.myMinions.forEach(m => totalDmg += m.atk);
        if (totalDmg > 0) dealDamage(totalDmg);
    }, 4000);

    setInterval(() => {
        if (!state.isDead) spawnEnemyMinion();
    }, 9000);

    setInterval(() => {
        if (!state.isDead && state.inventory.includes('java')) {
            healPlayer(5);
        }
    }, 20000);
}
