// ==========================================================================
// UNO LEGENDS: MIRACULOUS NEXUS - GAME ENGINE DEFINITIVA (V8 - COMPLETA & RIGIDA)
// ==========================================================================
import { joinRoomFirebase, syncMyNexusHP, listenToRoomState } from './firebase.js';

/* ==========================================================================
   1. BANCO DE DADOS: ITENS, MINIONS E CARTAS DE CAMPEÕES ESPECIFICADAS
   ========================================================================== */
const ALL_ITEMS = {
    'pocao': { name: 'Poção de Cura', cost: 50, type: 'all', stats: {}, desc: 'Restaura 250 de HP do Nexus.' },

    // Galo
    'lacre3000': { name: 'Lacre 3000g', cost: 3000, type: 'galo', stats: { crit: 10, ad: 100 }, desc: 'Colete almas com menos de 90% da vida atual.' },
    'skate2900': { name: 'Skate 2900g', cost: 2900, type: 'galo', stats: { crit: 5, ad: 60, armor: 40, mr: 30 }, desc: 'Paralisa inimigos por 3s ao causar nojo.' },
    'mandrakit': { name: 'Mandrakit 2400g', cost: 2400, type: 'galo', stats: { crit: 30, ad: 30, ap: 30, mr: 30, bonusHp: 30 }, desc: 'Ganhe +15% de vida ao levar dano letal.' },
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
    'dono_inferno': { name: 'Dono do Inferno 4000g', cost: 4000, type: 'borboleta', stats: { ad: 20, ap: 80, bonusHp: 300, armor: 90 }, desc: 'Renasça após a morte (10 min CD).' },
    'fome_luxuria': { name: 'Fome de Luxúria 3500g', cost: 3500, type: 'borboleta', stats: { ap: 110, crit: 40, mr: 40, bonusHp: 100 }, desc: 'Bloqueie uma ação inimiga a cada 5 min.' },
    'bibi_fogosa': { name: 'Bibi Fogosa 4000g', cost: 4000, type: 'borboleta', stats: { ap: 90, ad: 80 }, desc: 'Bots nocauteiam e dão dano contínuo.' },
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
        { name: 'Auto Ataque', type: 'galo', cost: 1, desc: 'Ataque básico direto no inimigo (Usa AD e Crítico determinístico).', action: (s) => executeCardAttack('Auto Ataque', () => dealDamage(calculateDeterministicCrit(s.stats.ad))) },
        { name: 'Marola', type: 'galo', cost: 2, desc: 'Joga uma pena envenenada que dá dano contínuo. 3 pilhas = 10% da vida atual do inimigo em dano verdadeiro.', action: (s) => executeCardAttack('Marola', () => { 
            s.marolaStacks = (s.marolaStacks || 0) + 1; 
            if(s.marolaStacks >= 3) { 
                dealDamage(s.enemyPlayerHp * 0.10, true); 
                s.marolaStacks = 0; 
                showFloatingText('ESTOURO DE MAROLA (10% HP Visto)!', innerWidth/2, 250, 'gold'); 
            } else { 
                dealDamage(s.stats.ad * 1.2); 
                showFloatingText(`Pena Envenenada! Pilha ${s.marolaStacks}/3`, innerWidth/2, 220, 'danger');
            } 
        }) },
        { name: 'Dessa cor eu não tenho', type: 'galo', cost: 2, desc: 'Copia a última habilidade gasta, menos a da borboleta, joaninha e gato preto.', action: (s) => executeCardAttack('Cópia', () => {
            if (s.lastEnemyAbility && !['borboleta', 'joaninha', 'gato'].includes(s.lastEnemyAbility.type)) {
                showFloatingText(`Copiada habilidade: ${s.lastEnemyAbility.name}`, innerWidth/2, 200, 'gold');
                dealDamage(s.stats.ad * 1.8);
            } else {
                showFloatingText('Impossível copiar esta habilidade!', innerWidth/2, 200, 'danger');
                dealDamage(s.stats.ad);
            }
        }) },
        { name: 'Aiin', type: 'galo', cost: 2, desc: 'Concede um escudo protetor que absorve dano e decai gradativamente.', action: (s) => executeCardAttack('Aiin', () => {
            s.galoShield = (s.galoShield || 0) + 400;
            showFloatingText('Escudo Aiin Ativo!', innerWidth/2, 200, 'success');
        }) },
        { name: 'Ultimate Galo', type: 'galo', cost: 3, desc: 'Aumenta critico e dano em relação ao crítico atual.', action: (s) => executeCardAttack('Ultimate Galo', () => {
            s.stats.crit += 15;
            s.stats.ad += s.stats.crit * 2;
            showFloatingText('PODER TOTAL DO GALO!', innerWidth/2, 200, 'gold');
            dealDamage(s.stats.ad * 2.2);
        }) }
    ],
    'cabra': [
        { name: 'Carta em Branco', type: 'cabra', cost: 0, desc: 'Sem efeito base. Use a Oficina de Tintas e mescle para definir seu poder!', action: (s) => showFloatingText('Carta em branco! Desenhe ou mescle tintas.', innerWidth/2, 200, 'danger') }
    ],
    'borboleta': [
        { name: 'Auto Ataque', type: 'borboleta', cost: 1, desc: 'Ataque básico de energia escura no inimigo.', action: (s) => executeCardAttack('Auto Ataque', () => dealDamage(s.stats.ap)) },
        { name: 'Akuma', type: 'borboleta', cost: 2, desc: 'Carrega borboleta com energia negativa no deck inimigo: cartas na mão ficam nerfadas e drenam efeitos para seu monte.', action: (s) => executeCardAttack('Akuma', () => spawnButterflyBot(s)) },
        { name: 'Beijo Saliente', type: 'borboleta', cost: 3, desc: 'Infecta o inimigo e drena 5% da vida máxima por segundo durante 10 segundos, tomando para você.', action: (s) => executeCardAttack('Beijo Saliente', () => { 
            let dCount = 0;
            let drainInterval = setInterval(() => {
                if (dCount >= 10 || state.isDead) { clearInterval(drainInterval); return; }
                let drainAmount = state.enemyPlayerMaxHp * 0.05;
                dealDamage(drainAmount, true);
                healNexus(drainAmount);
                showFloatingText(`💋 Drenado ${Math.floor(drainAmount)} HP!`, innerWidth/2, 200, 'purple');
                dCount++;
            }, 1000);
        }) },
        { name: 'Desejo do Pecado', type: 'borboleta', cost: 2, desc: 'Manda borboleta para a mão do inimigo, dando os poderes do campeão inimigo para você até ser jogada.', action: (s) => executeCardAttack('Desejo do Pecado', () => { 
            dealDamage(200); 
            s.stats.ap += 20; 
            showFloatingText('Poderes do inimigo usurpados!', innerWidth/2, 200, 'purple'); 
        }) },
        { name: 'Ultimate Borboleta (Caos)', type: 'borboleta', cost: 4, desc: 'Explode energia negativa na mesa, drenando as cartas da mão de todos para seu monte e embaralhando.', action: (s) => executeCardAttack('Explosão Caos', () => {
            showFloatingText('🌪️ CAOS NA MESA! Cartas drenadas!', innerWidth/2, 200, 'purple');
            for(let i=0; i<3; i++) {
                if(state.deck.length < state.maxDeckCards) state.deck.push({ name: 'Eco Sombrio', type: 'borboleta', cost: 1, desc: 'Eco drenado', action: (st) => dealDamage(st.stats.ap) });
            }
            dealDamage(350);
        }) }
    ],
    'global': [
        { name: 'Poção Rápida', type: 'global', cost: 1, desc: 'Cura 150 HP do Nexus.', action: (s) => executeCardAttack('Poção Rápida', () => healNexus(150)) },
        { name: 'Muralha', type: 'global', cost: 2, desc: 'Aumenta Armadura e Resistência Mágica.', action: (s) => executeCardAttack('Muralha', () => { s.stats.armor += 15; s.stats.mr += 15; }) }
    ]
};

/* ==========================================================================
   2. ESTADO GLOBAL DO JOGO & SISTEMA DE TURNOS/NÍVEIS
   ========================================================================= */
let state = {
    player: { name: '', room: '', champ: '', level: 1, xp: 0, maxXp: 100 },
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

    // Sistema Littlegot (Cabra) - Rigoroso com tintas
    inkPots: { red: 3, blue: 3, yellow: 3, max: 5 },
    currentInkMix: [],
    nextCardCustomEffect: null,

    // Sistema Borboleta
    butterflyBots: [],
    
    roomChampions: [], activeEvent: null,
    marolaStacks: 0,
    isDead: false,
    myNexus: { hp: 5000, maxHp: 5000 },
    enemyNexus: { hp: 5000, maxHp: 5000 },
    
    enemyPlayerHp: 3000,
    enemyPlayerMaxHp: 3000,
    nexusVulnerable: false,
    nexusVulnerabilityTimer: null,

    stats: { ad: 15, ap: 15, armor: 10, mr: 10, crit: 0, vamp: 0, pen: 0, bonusHp: 0 },
    critCredit: 0,
    lastEnemyAbility: null,
    galoShield: 0
};

/* ==========================================================================
   3. INICIALIZAÇÃO & INTERFACE FLUTUANTE EXCLUSIVA (CABRA COM TINTAS E BOTÃO DE MESCLAR)
   ========================================================================= */
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
        top: 20px;
        right: 20px;
        width: 310px;
        background: rgba(15, 23, 42, 0.96);
        border: 2px solid #38bdf8;
        border-radius: 12px;
        padding: 14px;
        display: flex;
        flex-direction: column;
        gap: 12px;
        z-index: 1000;
        box-shadow: 0 10px 25px rgba(0,0,0,0.6);
        backdrop-filter: blur(8px);
        box-sizing: border-box;
        max-height: 90vh;
        overflow-y: auto;
    `;

    hud.innerHTML = `
        <div style="font-size:0.8rem; color:#38bdf8; font-weight:bold; border-bottom:1px solid #334155; padding-bottom:6px; display:flex; justify-content:space-between; align-items:center;">
            <span>⚡ PAINEL DE COMBATE PVP</span>
            <span style="font-size:0.6rem; background:#1e293b; padding:2px 6px; border-radius:4px; color:#fbbf24;">HUD Ativo</span>
        </div>

        <div id="cabra-hud-panel" class="${state.player.champ === 'cabra' ? '' : 'hidden'}" style="background:rgba(30,41,59,0.85); border:1px solid #f59e0b; padding:10px; border-radius:8px;">
            <div style="font-size:0.75rem; color:#fbbf24; font-weight:bold; margin-bottom:8px; display:flex; justify-content:space-between; align-items:center;">
                <span>🎨 OFICINA DE TINTAS & DECKS</span>
                <span style="font-size:0.6rem; color:#38bdf8;">Littlegot</span>
            </div>
            <div style="display:flex; gap:6px; margin-bottom:8px;">
                <button class="btn" style="background:#ef4444; padding:6px 2px; flex:1; font-size:0.68rem; color:#fff;" onclick="addInk('red')">Verm (<span id="ink-red-count">3</span>)</button>
                <button class="btn" style="background:#3b82f6; padding:6px 2px; flex:1; font-size:0.68rem; color:#fff;" onclick="addInk('blue')">Azul (<span id="ink-blue-count">3</span>)</button>
                <button class="btn" style="background:#fbbf24; padding:6px 2px; flex:1; font-size:0.68rem; color:#000; font-weight:bold;" onclick="addInk('yellow')">Amar (<span id="ink-yellow-count">3</span>)</button>
            </div>
            <div style="font-size:0.7rem; color:#cbd5e1; margin-bottom:8px; background:#090d16; padding:6px; border-radius:4px; text-align:center;" id="ink-mix-display">Mistura Atual: Nenhuma</div>
            <div style="display:flex; gap:6px; margin-bottom:8px;">
                <button class="btn btn-cyan" style="padding:6px 2px; flex:1; font-size:0.65rem;" onclick="selectInkDeck('red')">🔴 Deck Verm</button>
                <button class="btn btn-cyan" style="padding:6px 2px; flex:1; font-size:0.65rem;" onclick="selectInkDeck('yellow')">🟡 Deck Amar</button>
                <button class="btn btn-cyan" style="padding:6px 2px; flex:1; font-size:0.65rem;" onclick="selectInkDeck('blue')">🔵 Deck Azul</button>
            </div>
            <div>
                <button class="btn btn-gold" style="width:100%; padding:8px; font-size:0.75rem; font-weight:bold; background:#d97706; color:#fff;" onclick="mergeInks()">✨ MESCLAR TINTAS & CRIAR CARTA</button>
            </div>
        </div>

        <div style="background:rgba(30,41,59,0.75); border:1px solid #ef4444; padding:10px; border-radius:8px;">
            <div style="font-size:0.75rem; color:#ef4444; font-weight:bold; margin-bottom:6px;">🎯 ALVO DO JOGADOR INIMIGO:</div>
            <select id="target-select" style="width:100%; background:#090d16; color:#fff; border:1px solid #334155; padding:8px; border-radius:6px; font-size:0.8rem;" onchange="changeTarget(this.value)">
                <option value="">Aguardando oponentes na sala...</option>
            </select>
        </div>

        <div>
            <button id="btn-end-turn" class="btn btn-danger" style="width:100%; padding:12px; font-size:0.85rem; font-weight:bold; border-radius:8px;" onclick="endTurn()">⏳ PASSAR TURNO</button>
        </div>
    `;

    document.body.appendChild(hud);

    const myNexusCard = document.querySelector('.nexus-card');
    if (myNexusCard && !document.getElementById('player-lvl-text')) {
        const xpDiv = document.createElement('div');
        xpDiv.style.cssText = 'margin-top:10px; background:rgba(0,0,0,0.5); padding:8px; border-radius:6px; border:1px solid var(--cyan-glow, #38bdf8);';
        xpDiv.innerHTML = `
            <div style="display:flex; justify-content:space-between; font-size:0.8rem; font-weight:bold; color:var(--cyan-glow, #38bdf8);">
                <span id="player-lvl-text">NÍVEL 1</span>
                <span id="player-xp-text">0/100 XP</span>
            </div>
            <div style="width:100%; height:8px; background:#1e293b; border-radius:4px; margin-top:4px; overflow:hidden;">
                <div id="player-xp-bar" style="width:0%; height:100%; background:var(--cyan-glow, #38bdf8); transition:width 0.3s;"></div>
            </div>
        `;
        myNexusCard.appendChild(xpDiv);
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
                        optionsHtml += `<option value="${key}" ${isSelected}>${p.name} (${p.champ.toUpperCase()} - ${Math.floor(p.hp)} HP)</option>`;
                    }
                });

                state.roomChampions = champsInRoom;
                updatePlayersBar();
                populateShop();

                if (selectEl) {
                    selectEl.innerHTML = optionsHtml || '<option value="">Sozinho na sala (Modo Solo PvP)</option>';
                }

                const otherKeys = Object.keys(data).filter(k => k !== state.myKey);
                if ((!state.selectedEnemyKey || !data[state.selectedEnemyKey]) && otherKeys.length > 0) {
                    state.selectedEnemyKey = otherKeys[0];
                    if (selectEl) selectEl.value = state.selectedEnemyKey;
                }

                if (state.selectedEnemyKey && data[state.selectedEnemyKey]) {
                    state.enemyPlayerHp = data[state.selectedEnemyKey].hp;
                    state.enemyPlayerMaxHp = data[state.selectedEnemyKey].maxHp || 3000;
                    state.enemyKey = state.selectedEnemyKey;
                } else {
                    state.selectedEnemyKey = null;
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
        state.enemyPlayerHp = state.roomPlayers[targetKey].hp;
        state.enemyKey = targetKey;
        showFloatingText(`Alvo PVP alterado para ${state.roomPlayers[targetKey].name}`, innerWidth/2, 160, 'cyan');
    }
    updateUI();
}

function applyChampBaseStats() {
    if (state.player.champ === 'galo') { state.stats.ad = 55; state.stats.crit = 15; state.stats.vamp = 15; }
    if (state.player.champ === 'cabra') { state.stats.ap = 50; state.stats.armor = 20; }
    if (state.player.champ === 'borboleta') { state.stats.ap = 50; state.stats.ad = 30; state.stats.mr = 25; }
}

/* ==========================================================================
   4. SISTEMA DE EXPERIÊNCIA E NÍVEL
   ========================================================================= */
function addXp(amount) {
    if (state.player.level >= 18) return;

    state.player.xp += amount;
    if (state.player.xp >= state.player.maxXp) {
        state.player.level++;
        state.player.xp = state.player.xp - state.player.maxXp;
        state.player.maxXp = Math.floor(state.player.maxXp * 1.3);
        
        state.stats.ad += 5;
        state.stats.ap += 5;
        state.stats.bonusHp += 100;
        healNexus(100);

        showFloatingText(`🌟 LEVEL UP! Nível ${state.player.level}!`, innerWidth/2, innerHeight/2 - 100, 'gold');
    }
    updateUI();
}

/* ==========================================================================
   5. SISTEMA DE TURNOS E BOTS DA BORBOLETA
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
    showFloatingText(`🦋 Akuma lançado! Drenando atributos e criando Sombra!`, innerWidth/2, 220, 'purple');
    s.ap += 15;
    s.armor += 10;
    
    const newBot = {
        id: Math.random(),
        name: `Sombra Borboleta`,
        power: s.stats.ap * 1.5,
        turnsLeft: 3
    };

    state.butterflyBots.push(newBot);
    updateUI();
}

function executeButterflyBots() {
    state.butterflyBots.forEach(bot => {
        let replicatedDmg = bot.power * 0.8;
        showFloatingText(`🦋 ${bot.name} ataca o inimigo! (-${Math.floor(replicatedDmg)})`, innerWidth/2, 280, 'purple');
        dealDamage(replicatedDmg);
        bot.turnsLeft--;
    });
    
    state.butterflyBots = state.butterflyBots.filter(b => b.turnsLeft > 0);
}

/* ==========================================================================
   6. SISTEMA RIGOROSO DE TINTAS DO LITTLEGOT (CABRA) & BOTÃO MESCLAR
   ========================================================================= */
window.addInk = function(color) {
    if (state.inkPots[color] <= 0) return showFloatingText('Pote de Tinta Vazio!', innerWidth/2, 200, 'danger');
    if (state.currentInkMix.length >= 2) return showFloatingText('Máximo de 2 tintas na mistura!', innerWidth/2, 200, 'danger');
    
    state.inkPots[color]--;
    state.currentInkMix.push(color);
    updateUI();
}

let selectedInkDeckType = 'red';
window.selectInkDeck = function(deckType) {
    selectedInkDeckType = deckType;
    showFloatingText(`Deck de Tinta selecionado: ${deckType.toUpperCase()}`, innerWidth/2, 200, 'cyan');
}

window.mergeInks = function() {
    // Verifica rigorosamente se as tintas acabaram
    let totalInks = state.inkPots.red + state.inkPots.blue + state.inkPots.yellow;
    if (totalInks <= 0 && state.currentInkMix.length === 0) {
        return showFloatingText('🚨 Tintas esgotadas! A Cabra está travada e não pode fazer nada!', innerWidth/2, 200, 'danger');
    }
    if (state.currentInkMix.length === 0) {
        return showFloatingText('Adicione pelo menos 1 tinta para mesclar!', innerWidth/2, 200, 'danger');
    }
    if (!state.isMyTurn) return showFloatingText('Aguarde seu turno para mesclar tintas!', innerWidth/2, 200, 'danger');

    let mixStr = state.currentInkMix.join(' + ');
    let customName = `Tinta Mesclada (${mixStr.toUpperCase()})`;
    let customDesc = `Poder especial criado com ${mixStr}. A próxima carta puxada herdará este efeito!`;

    // Define o efeito customizado para a próxima carta puxada (Mecânica de Carta Branca / Tinta)
    state.nextCardCustomEffect = {
        name: customName,
        desc: customDesc,
        type: 'cabra',
        cost: 0,
        action: (s) => {
            executeCardAttack(customName, () => {
                let dmg = s.stats.ap * 2.5;
                dealDamage(dmg);
                healNexus(200);
                s.gold += 50;
                showFloatingText('✨ PODER DA TINTA MESCLADA DISPARADO!', innerWidth/2, 230, 'gold');
            });
        }
    };

    state.currentInkMix = [];
    showFloatingText('🎨 TINTAS MESCLADAS COM SUCESSO! Próxima carta puxada será customizada!', innerWidth/2, 200, 'gold');
    addXp(15);
    updateUI();
}

/* ==========================================================================
   7. SISTEMA DE CARTAS E DECK PADRÃO
   ========================================================================= */
function buildDeck() {
    state.deck = [];
    let pool = CHAMPION_CARDS[state.player.champ];
    if (!pool) pool = CHAMPION_CARDS['global'];

    for (let i = 0; i < state.maxDeckCards; i++) {
        const randCard = pool[Math.floor(Math.random() * pool.length)];
        state.deck.push({ ...randCard, instanceId: 'c_' + Math.random().toString(36).substring(2) });
    }
}

window.drawCard = function(free = false) {
    if (state.isDead) return;
    if (!state.isMyTurn && !free) return showFloatingText('Aguarde o seu turno!', innerWidth/2, 220, 'danger');
    if (state.hand.length >= state.maxHandSize) return;

    // Verificação rigorosa para Cabra sem tintas
    if (state.player.champ === 'cabra') {
        let totalInks = state.inkPots.red + state.inkPots.blue + state.inkPots.yellow;
        if (totalInks <= 0 && state.inkPots.max === 0) {
            return showFloatingText('🚨 Sem tintas! Cabra travada!', innerWidth/2, 220, 'danger');
        }
    }

    if (state.deck.length === 0) return showFloatingText('Monte Vazio! Compre reposição na Loja.', innerWidth/2, 220, 'danger');
    
    if (!free && state.player.champ !== 'cabra') {
        if (state.energy < 1) return showFloatingText('Sem Energia!', innerWidth/2, 220, 'danger');
        state.energy--;
    }

    let cardToDraw = state.deck.pop();

    // Se a Cabra mesclou tintas, a carta puxada vira o efeito mesclado (Carta Branca/Tinta)
    if (state.player.champ === 'cabra' && state.nextCardCustomEffect) {
        cardToDraw = { ...state.nextCardCustomEffect, instanceId: 'c_' + Math.random().toString(36).substring(2) };
        state.nextCardCustomEffect = null;
    }

    state.hand.push(cardToDraw);
    updateUI();
}

window.buyDeckReload = function() {
    if (state.gold < 100) return showFloatingText('Ouro Insuficiente (100G)', innerWidth/2, 220, 'danger');
    state.gold -= 100;
    buildDeck();
    showFloatingText('Deck Reposto com Sucesso!', innerWidth/2, 220, 'gold');
    updateUI();
}

/* ==========================================================================
   8. DRAG & DROP E COMBATE PVP DIRETO
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
    
    if (state.player.champ !== 'cabra' && state.energy < card.cost) {
        return showFloatingText('Sem Energia Suficiente!', innerWidth/2, innerHeight/2, 'danger');
    }
    
    if (state.player.champ !== 'cabra') {
        state.energy -= card.cost;
    }

    state.lastEnemyAbility = card;
    card.action(state);
    state.hand.splice(idx, 1);
    
    addXp(15);
    updateUI();
}

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
        finalDmg *= 1.75;
        showFloatingText('CRÍTICO DO GALO!', innerWidth/2, innerHeight/2 - 50, 'gold');
    }

    let mitigation = 100 / (100 + Math.max(0, 40 - state.stats.pen));
    return Math.floor(finalDmg * mitigation);
}

function dealDamage(amount, isTrue = false) {
    // Foco principal: atacar o jogador inimigo em PVP
    state.enemyPlayerHp = Math.max(0, state.enemyPlayerHp - amount);

    state.gold += 30;
    addXp(12);

    showFloatingText(`-${Math.floor(amount)} (Dano no Inimigo)`, innerWidth / 2, 180, 'danger');
    
    const enemyCardEl = document.querySelector('.nexus-card.enemy');
    if (enemyCardEl) {
        enemyCardEl.classList.add('taking-damage');
        setTimeout(() => enemyCardEl.classList.remove('taking-damage'), 300);
    }

    // Passiva do Galo: Vampirismo proporcional ao crítico
    if (state.player.champ === 'galo') {
        state.stats.vamp = state.stats.crit;
    }
    if (state.stats.vamp > 0) {
        healNexus(amount * (state.stats.vamp / 100));
    }

    triggerNexusVulnerabilityWindow();

    if (state.nexusVulnerable) {
        state.enemyNexus.hp = Math.max(0, state.enemyNexus.hp - (amount * 0.6));
        showFloatingText(`💥 NEXUS ATINGIDO NA BRECHA!`, innerWidth / 2, 230, 'gold');
    }

    if (state.selectedEnemyKey) {
        import('https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js').then(({ getDatabase, ref, update }) => {
            const db = getDatabase();
            const targetRef = ref(db, `rooms/${state.player.room}/players/${state.selectedEnemyKey}`);
            update(targetRef, { hp: state.enemyPlayerHp });
        });
    }

    if (state.enemyPlayerHp <= 0) {
        alert('VITÓRIA PVP! Jogador Inimigo Aniquilado!');
        window.location.reload();
    }
}

function triggerNexusVulnerabilityWindow() {
    state.nexusVulnerable = true;
    let banner = document.getElementById('event-banner');
    if (banner) {
        banner.innerText = "⚡ BRECHA ABERTA! NEXUS VULNERÁVEL POR 20 SEGUNDOS!";
        banner.classList.add('active');
    }

    if (state.nexusVulnerabilityTimer) clearTimeout(state.nexusVulnerabilityTimer);

    state.nexusVulnerabilityTimer = setTimeout(() => {
        state.nexusVulnerable = false;
        if (banner) banner.classList.remove('active');
        showFloatingText(`🛡️ O Nexus fechou as defesas!`, innerWidth / 2, 200, 'danger');
        updateUI();
    }, 20000);
}

function healNexus(amount) {
    let maxLimit = state.myNexus.maxHp + state.stats.bonusHp;
    state.myNexus.hp = Math.min(maxLimit, state.myNexus.hp + amount);
    showFloatingText(`+${Math.floor(amount)} HP`, innerWidth/3, 200, 'success');
    syncMyNexusHP(state.player.room, state.myKey, state.myNexus.hp);
}

/* ==========================================================================
   9. LOJA E INVENTÁRIO
   ========================================================================== */
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
        if (mult > 0) healNexus(stats.bonusHp);
    }
}

/* ==========================================================================
   10. MINIONS & FARM
   ========================================================================== */
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
    if (!state.isMyTurn) return showFloatingText('Aguarde o seu turno para farmar!', clientX, clientY, 'danger');
    
    state.enemyMinions = state.enemyMinions.filter(m => m.id !== id);
    state.gold += reward;
    addXp(10);
    showFloatingText(`+${reward} G (Farm)`, clientX, clientY, 'gold');
    renderEnemyMinions();
    updateUI();
}

/* ==========================================================================
   11. EVENTOS ALEATÓRIOS
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
   12. RENDERIZAÇÃO & LOOPS DO JOGO
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

    const myHpText = document.getElementById('my-hp-text');
    if (myHpText) myHpText.innerText = `${Math.floor(state.myNexus.hp)} HP`;
    let maxMyHp = state.myNexus.maxHp + state.stats.bonusHp;
    const myHpBar = document.getElementById('my-hp-bar');
    if (myHpBar) myHpBar.style.width = `${Math.max(0, Math.min(100, (state.myNexus.hp / maxMyHp) * 100))}%`;

    const enemyPlayerHpText = document.getElementById('enemy-player-hp-text');
    if (enemyPlayerHpText) enemyPlayerHpText.innerText = `${Math.floor(state.enemyPlayerHp)} HP`;
    const enemyPlayerHpBar = document.getElementById('enemy-player-hp-bar');
    if (enemyPlayerHpBar) enemyPlayerHpBar.style.width = `${Math.max(0, Math.min(100, (state.enemyPlayerHp / state.enemyPlayerMaxHp) * 100))}%`;

    const enemyHpText = document.getElementById('enemy-hp-text');
    if (enemyHpText) {
        enemyHpText.innerText = `${Math.floor(state.enemyNexus.hp)} HP ${state.nexusVulnerable ? '⚡(VULNERÁVEL)' : '🛡️(BLINDADO)'}`;
    }
    const enemyHpBar = document.getElementById('enemy-hp-bar');
    if (enemyHpBar) enemyHpBar.style.width = `${Math.max(0, Math.min(100, (state.enemyNexus.hp / state.enemyNexus.maxHp) * 100))}%`;
    
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
        el.draggable = true;
        
        el.innerHTML = `
            <div>
                <strong class="card-title">${c.name}</strong>
                <p class="card-desc">${c.desc}</p>
            </div>
            <div class="card-footer">
                <span class="energy-cost">${state.player.champ === 'cabra' ? '🎨' : c.cost + ' EN'}</span>
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
    b.innerHTML = `<span style="color:#94a3b8; font-weight:bold;">SALA: ${state.player.room.toUpperCase()}</span><div class="players-list" id="plist"></div>`;
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
        if (!state.isDead && Math.random() > 0.45) triggerRandomEvent();
    }, 35000);

    setInterval(() => {
        if (!state.isDead && state.inventory.includes('java')) {
            healNexus(5);
        }
    }, 20000);
}
