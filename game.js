// ==========================================================================
// UNO LEGENDS: BRAWL ARENA - MODO PANCADARIA DIRETA (SEM NEXUS, COM KILLS & TEMPORIZADOR)
// ==========================================================================
import { joinRoomFirebase, syncMyPlayerState, listenToRoomState } from './firebase.js';

/* ==========================================================================
   1. BANCO DE DADOS: ITENS, MINIONS E CARTAS DE CAMPEÕES (GALO, CABRA, BORBOLETA)
   ========================================================================== */
const ALL_ITEMS = {
    // Globais
    'pocao': { name: 'Poção de Cura', cost: 50, type: 'all', stats: {}, desc: 'Restaura 400 de Vida instantaneamente.' },

    // Galo
    'lacre3000': { name: 'Lacre 3000g', cost: 3000, type: 'galo', stats: { crit: 10, ad: 100 }, desc: 'Executa inimigos com menos de 10% de vida.' },
    'skate2900': { name: 'Skate 2900g', cost: 2900, type: 'galo', stats: { crit: 5, ad: 60, armor: 40, mr: 30 }, desc: 'Paralisa inimigos por 3s ao causar dano.' },
    'mandrakit': { name: 'Mandrakit 2400g', cost: 2400, type: 'galo', stats: { crit: 30, ad: 30, ap: 30, mr: 30, bonusHp: 200 }, desc: 'Ganhe +15% de vida ao levar dano letal.' },
    'alma_sebosa': { name: 'Alma Sebosa 3000g', cost: 3000, type: 'galo', stats: { crit: 15, ap: 20 }, desc: 'Bloqueie controle de grupo por 10s.' },
    'pate': { name: 'E o Patê? 2000g', cost: 2000, type: 'galo', stats: { crit: 5, armor: 40, mr: 30 }, desc: 'Reduz dano recebido em 25%.' },
    'bota_sapatona': { name: 'Bota (Sapatona) 1000g', cost: 1000, type: 'galo', stats: { crit: 2, pen: 3, ad: 5 }, desc: '+30 Vel. de Spawn e +5 AD.' },

    // Cabra (Littlegot)
    'pyton': { name: 'Pyton 2000g', cost: 2000, type: 'cabra', stats: { ad: 20, ap: 100, crit: 3 }, desc: 'Veneno causa dano contínuo por 5s.' },
    'javascript': { name: 'Java Script 2800g', cost: 2800, type: 'cabra', stats: { ap: 80, mr: 20 }, desc: 'Ganha escudo ao ser atingido.' },
    'java': { name: 'Java 1900g', cost: 1900, type: 'cabra', stats: { crit: 50, ap: 50, ad: 50 }, desc: 'Cura 10 de vida a cada 10s.' },
    'bf2300': { name: 'BF 2300g', cost: 2300, type: 'cabra', stats: { bonusHp: 200, ad: 20, ap: 40, armor: 50 }, desc: '+1 AP para cada 1 de Armadura.' },
    'cadelagem': { name: 'Cadelagem 2000g', cost: 2000, type: 'cabra', stats: { ad: 80, ap: 50 }, desc: '+4 de gold por segundo.' },
    'bota_cadelagem': { name: 'Bota (Cadelagem) 1000g', cost: 1000, type: 'cabra', stats: { ap: 3, ad: 4, crit: 5 }, desc: '+20 Vel. de carta.' },

    // Borboleta
    'incubus': { name: 'Incubus 3000g', cost: 3000, type: 'borboleta', stats: { ap: 80, ad: 50, armor: 30 }, desc: 'Recupere vida ao invocar bots.' },
    'dono_inferno': { name: 'Dono do Inferno 4000g', cost: 4000, type: 'borboleta', stats: { ad: 20, ap: 80, bonusHp: 300, armor: 90 }, desc: 'Renasce instantaneamente após morrer.' },
    'fome_luxuria': { name: 'Fome de Luxúria 3500g', cost: 3500, type: 'borboleta', stats: { ap: 110, crit: 40, mr: 40, bonusHp: 100 }, desc: 'Bloqueie uma ação inimiga.' },
    'bibi_fogosa': { name: 'Bibi Fogosa 4000g', cost: 4000, type: 'borboleta', stats: { ap: 90, ad: 80 }, desc: 'Bots causam dano contínuo avassalador.' },
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
        { name: 'Auto Ataque', type: 'galo', cost: 1, desc: 'Ataque básico (Usa AD e Crítico determinístico).', action: (s) => executeCardAttack('Auto Ataque', () => dealDamageToSelectedEnemy(calculateDeterministicCrit(s.stats.ad))) },
        { name: 'Marola', type: 'galo', cost: 2, desc: 'Pena envenenada. 3 pilhas = 10% da vida atual do inimigo em dano verdadeiro.', action: (s) => executeCardAttack('Marola', () => { s.marolaStacks = (s.marolaStacks || 0) + 1; if(s.marolaStacks >= 3) { dealDamageToSelectedEnemy(s.enemyTargetHp * 0.10, true); s.marolaStacks = 0; showFloatingText('🔥 ESTOURO DE MAROLA (Dano Verdadeiro)!', innerWidth/2, 250, 'gold'); } else { dealDamageToSelectedEnemy(s.stats.ad * 1.4); showFloatingText(`Pena Envenenada (${s.marolaStacks}/3)`, innerWidth/2, 220, 'purple'); } }) },
        { name: 'Dessa cor eu não tenho', type: 'galo', cost: 2, desc: 'Copia a última habilidade gasta, exceto de borboleta, joaninha e gato preto.', action: (s) => executeCardAttack('Cópia', () => {
            let copiedDmg = s.lastEnemySkillDmg || (s.stats.ad * 1.6);
            dealDamageToSelectedEnemy(copiedDmg);
            showFloatingText('Habilidade Copiada!', innerWidth/2, 200, 'cyan');
        }) },
        { name: 'Aiin', type: 'galo', cost: 2, desc: 'Concede um escudo protetor que decai gradualmente.', action: (s) => executeCardAttack('Aiin', () => {
            s.stats.shield = (s.stats.shield || 0) + 350;
            showFloatingText('Escudo Aiin Ativado!', innerWidth/2, 200, 'success');
        }) },
        { name: 'UTI do Galo', type: 'galo', cost: 3, desc: 'Ganha mais crítico e mais dano em relação ao crítico atual.', action: (s) => executeCardAttack('UTI do Galo', () => {
            let bonusCrit = Math.floor(s.stats.crit * 0.5);
            s.stats.crit += bonusCrit;
            s.stats.ad += bonusCrit * 3;
            showFloatingText(`⚡ FRENESI UTI: +${bonusCrit}% Crit & AD Boost!`, innerWidth/2, 230, 'gold');
        }) }
    ],
    'cabra': [
        { name: 'Carta em Branco', type: 'cabra', cost: 0, desc: 'Sem efeito. Use a Oficina de Tintas (Vermelho, Amarelo, Azul) para criar cartas!', action: (s) => showFloatingText('Carta em branco! Desenhe usando tintas.', innerWidth/2, 200, 'danger') }
    ],
    'borboleta': [
        { name: 'Auto Ataque', type: 'borboleta', cost: 1, desc: 'Ataque básico arcano (AP).', action: (s) => executeCardAttack('Auto Ataque', () => dealDamageToSelectedEnemy(s.stats.ap)) },
        { name: 'Akuma', type: 'borboleta', cost: 2, desc: 'Carrega borboleta com energia negativa: nerfa cartas na mão e drena efeitos.', action: (s) => executeCardAttack('Akuma', () => spawnButterflyBot(s)) },
        { name: 'Beijo Saliente', type: 'borboleta', cost: 3, desc: 'Por 10s drene 5% da vida máxima do alvo por segundo para você.', action: (s) => executeCardAttack('Beijo Saliente', () => {
            let drainAmount = s.enemyTargetMaxHp * 0.05;
            dealDamageToSelectedEnemy(drainAmount * 5);
            healPlayer(drainAmount * 5);
            showFloatingText('💋 Beijo Saliente: Vida Drenada!', innerWidth/2, 200, 'purple');
        }) },
        { name: 'Desejo do Pecado', type: 'borboleta', cost: 2, desc: 'Manda borboleta disfarçada, roubando temporariamente os poderes do oponente.', action: (s) => executeCardAttack('Desejo do Pecado', () => {
            s.stats.ap += 25;
            s.stats.ad += 20;
            showFloatingText('✨ Poderes Drenados!', innerWidth/2, 200, 'purple');
        }) },
        { name: 'UTI da Borboleta', type: 'borboleta', cost: 4, desc: 'Explode energia negativa na mesa, drenando cartas e criando o caos.', action: (s) => executeCardAttack('UTI Borboleta', () => {
            s.deck.push({ name: 'Carta Caos Drenada', type: 'borboleta', cost: 0, desc: 'Carta roubada', action: () => dealDamageToSelectedEnemy(250) });
            showFloatingText('🌪️ CAOS NA MESA! Cartas drenadas para seu monte!', innerWidth/2, 230, 'purple');
        }) }
    ],
    'global': [
        { name: 'Poção Rápida', type: 'global', cost: 1, desc: 'Cura 150 de Vida.', action: (s) => executeCardAttack('Poção Rápida', () => healPlayer(150)) },
        { name: 'Muralha', type: 'global', cost: 2, desc: 'Aumenta Armadura e Resistência Mágica.', action: (s) => executeCardAttack('Muralha', () => { s.stats.armor += 15; s.stats.mr += 15; }) }
    ]
};

/* ==========================================================================
   2. ESTADO GLOBAL DO JOGO (MODO BRAWL DIRETO & TEMPORIZADOR)
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
    
    // Sistema de Pancadaria Puro (Sem Nexus)
    kills: 0,
    deaths: 0,
    matchTimeSeconds: 15 * 60, // 15 minutos de partida padrão (ajustável até 50 min)
    matchTimerInterval: null,

    // Sistema Littlegot (Cabra) com Decks de Tintas Específicos
    inkPots: { red: 3, blue: 3, yellow: 3, max: 6 },
    currentInkMix: [],
    inkDecks: {
        red: [
            { name: 'Bola de Fogo', cost: 2, desc: 'Atira bola de fogo com dano contínuo por 4s.', action: (s) => executeCardAttack('Bola de Fogo', () => dealDamageToSelectedEnemy(s.stats.ap * 1.5)) },
            { name: 'Laser', cost: 2, desc: 'Tiro potente queimando o oponente.', action: (s) => executeCardAttack('Laser', () => dealDamageToSelectedEnemy(s.stats.ap * 1.8)) },
            { name: 'Lança Chamas', cost: 3, desc: 'Dano contínuo em área crescente com AP.', action: (s) => executeCardAttack('Lança Chamas', () => dealDamageToSelectedEnemy(s.stats.ap * 2.2)) }
        ],
        yellow: [
            { name: 'Lanterna', cost: 1, desc: 'Cria um escudo protetor.', action: (s) => { s.stats.shield = (s.stats.shield || 0) + 150; showFloatingText('Lanterna: Escudo Criado!', innerWidth/2, 200, 'gold'); } },
            { name: 'Lâmpada', cost: 2, desc: 'Dá um super escudo de vida.', action: (s) => { healPlayer(300); showFloatingText('Lâmpada: Vida Blindada!', innerWidth/2, 200, 'gold'); } },
            { name: 'Sol', cost: 2, desc: 'Escudo absoluto nas cartas.', action: (s) => { s.stats.armor += 20; showFloatingText('Sol: Proteção Ativada!', innerWidth/2, 200, 'gold'); } }
        ],
        blue: [
            { name: 'Pedra', cost: 1, desc: 'Joga uma pedra pesada no oponente.', action: (s) => executeCardAttack('Pedra', () => dealDamageToSelectedEnemy(s.stats.ad * 1.3)) },
            { name: 'Chicote', cost: 2, desc: 'Chicoteia alguém, roubando carta.', action: (s) => { s.hand.push({ name: 'Carta Roubada', type: 'cabra', cost: 1, desc: 'Espólio', action: () => dealDamageToSelectedEnemy(100) }); showFloatingText('Chicote: Carta Roubada!', innerWidth/2, 200, 'cyan'); } },
            { name: 'Água', cost: 1, desc: 'Hidrate-se e recupere vida ou restaure tinta.', action: (s) => { healPlayer(120); state.inkPots.blue = Math.min(state.inkPots.max, state.inkPots.blue + 1); showFloatingText('Água: Vida e Tinta Restauradas!', innerWidth/2, 200, 'success'); } }
        ]
    },

    butterflyBots: [],
    roomChampions: [],
    marolaStacks: 0,
    isDead: false,
    
    myHp: 3000,
    myMaxHp: 3000,
    enemyTargetHp: 3000,
    enemyTargetMaxHp: 3000,

    stats: { ad: 15, ap: 15, armor: 10, mr: 10, crit: 0, vamp: 0, pen: 0, bonusHp: 0, shield: 0 },
    critCredit: 0
};

/* ==========================================================================
   3. INICIALIZAÇÃO & INTERFACE FLUTUANTE (BRAWL HUD)
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
        top: 20px;
        right: 20px;
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
        backdrop-filter: blur(10px);
        box-sizing: border-box;
        max-height: 92vh;
        overflow-y: auto;
    `;

    hud.innerHTML = `
        <div style="font-size:0.8rem; color:#ef4444; font-weight:bold; border-bottom:1px solid #334155; padding-bottom:6px; display:flex; justify-content:space-between; align-items:center;">
            <span>🔥 ARENA BRAWL (PANCADARIA)</span>
            <span id="match-timer-display" style="font-size:0.75rem; background:#1e293b; padding:2px 8px; border-radius:4px; color:#fbbf24; font-weight:bold;">15:00</span>
        </div>

        <div style="display:flex; justify-content:space-between; background:rgba(0,0,0,0.5); padding:8px; border-radius:6px; font-size:0.8rem; font-weight:bold;">
            <span style="color:#38bdf8;">Kills: <span id="hud-kills">0</span></span>
            <span style="color:#ef4444;">Mortes: <span id="hud-deaths">0</span></span>
        </div>

        <div id="cabra-hud-panel" class="${state.player.champ === 'cabra' ? '' : 'hidden'}" style="background:rgba(30,41,59,0.85); border:1px solid #f59e0b; padding:10px; border-radius:8px;">
            <div style="font-size:0.75rem; color:#fbbf24; font-weight:bold; margin-bottom:8px; display:flex; justify-content:space-between; align-items:center;">
                <span>🎨 OFICINA DE TINTAS (LITTLEGOT)</span>
            </div>
            <div style="font-size:0.68rem; color:#94a3b8; margin-bottom:6px;">Dependência Total de Tintas para Jogar!</div>
            <div style="display:flex; gap:6px; margin-bottom:8px;">
                <button class="btn" style="background:#ef4444; padding:6px 2px; flex:1; font-size:0.68rem; color:#fff;" onclick="addInk('red')">Verm (<span id="ink-red-count">3</span>)</button>
                <button class="btn" style="background:#3b82f6; padding:6px 2px; flex:1; font-size:0.68rem; color:#fff;" onclick="addInk('blue')">Azul (<span id="ink-blue-count">3</span>)</button>
                <button class="btn" style="background:#fbbf24; padding:6px 2px; flex:1; font-size:0.68rem; color:#000; font-weight:bold;" onclick="addInk('yellow')">Amar (<span id="ink-yellow-count">3</span>)</button>
            </div>
            <div style="font-size:0.7rem; color:#cbd5e1; margin-bottom:8px; background:#090d16; padding:6px; border-radius:4px; text-align:center;" id="ink-mix-display">Mistura Atual: Nenhuma</div>
            <div style="display:flex; gap:6px; margin-bottom:8px;">
                <button class="btn btn-gold" style="padding:8px 4px; flex:1; font-size:0.7rem; font-weight:bold;" onclick="mergeInksButton()">✨ MESCLAR TINTAS</button>
            </div>
        </div>

        <div style="background:rgba(30,41,59,0.75); border:1px solid #ef4444; padding:10px; border-radius:8px;">
            <div style="font-size:0.75rem; color:#ef4444; font-weight:bold; margin-bottom:6px;">🎯 ALVO PARA ATACAR DIRETAMENTE:</div>
            <select id="target-select" style="width:100%; background:#090d16; color:#fff; border:1px solid #334155; padding:8px; border-radius:6px; font-size:0.8rem;" onchange="changeTarget(this.value)">
                <option value="">Procurando oponentes na arena...</option>
            </select>
        </div>

        <div>
            <button id="btn-end-turn" class="btn btn-danger" style="width:100%; padding:12px; font-size:0.85rem; font-weight:bold; border-radius:8px;" onclick="endTurn()">⏳ PASSAR TURNO</button>
        </div>
    `;

    document.body.appendChild(hud);
    startMatchTimer();
}

function startMatchTimer() {
    if (state.matchTimerInterval) clearInterval(state.matchTimerInterval);
    state.matchTimerInterval = setInterval(() => {
        if (state.matchTimeSeconds > 0) {
            state.matchTimeSeconds--;
            let mins = Math.floor(state.matchTimeSeconds / 60);
            let secs = state.matchTimeSeconds % 60;
            let timerEl = document.getElementById('match-timer-display');
            if (timerEl) {
                timerEl.innerText = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
            }
        } else {
            clearInterval(state.matchTimerInterval);
            endMatchByTime();
        }
    }, 1000);
}

function endMatchByTime() {
    alert(`⏱️ FIM DO TEMPO DA PARTIDA! Placar Final -> Suas Kills: ${state.kills} | Mortes: ${state.deaths}`);
    window.location.reload();
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
        if (!state.player.champ) return alert('Escolha um Campeão!');

        applyChampBaseStats();
        buildDeck();

        state.myKey = await joinRoomFirebase(state.player.room, state.player.name, state.player.champ, state.myMaxHp);
        
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
                    selectEl.innerHTML = optionsHtml || '<option value="">Sozinho na sala (Modo Treino vs Bot)</option>';
                }

                const otherKeys = Object.keys(data).filter(k => k !== state.myKey);
                if ((!state.selectedEnemyKey || !data[state.selectedEnemyKey]) && otherKeys.length > 0) {
                    state.selectedEnemyKey = otherKeys[0];
                    if (selectEl) selectEl.value = state.selectedEnemyKey;
                }

                if (state.selectedEnemyKey && data[state.selectedEnemyKey]) {
                    state.enemyTargetHp = data[state.selectedEnemyKey].hp || 3000;
                    state.enemyTargetMaxHp = data[state.selectedEnemyKey].maxHp || 3000;
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
        state.enemyTargetHp = state.roomPlayers[targetKey].hp || 3000;
        state.enemyKey = targetKey;
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
        btnEnd.innerText = 'BATALHANDO...';
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
    showFloatingText(`🦋 Akuma invocado! Drenando estatísticas: ${copyTarget.toUpperCase()}`, innerWidth/2, 220, 'purple');
    
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
        showFloatingText(`🦋 ${bot.name} atacou o brawler inimigo! (-${Math.floor(replicatedDmg)})`, innerWidth/2, 280, 'purple');
        dealDamageToSelectedEnemy(replicatedDmg);
        bot.turnsLeft--;
    });
    
    state.butterflyBots = state.butterflyBots.filter(b => b.turnsLeft > 0);
}

/* ==========================================================================
   6. TINTAS DA CABRA & CARTAS BRANCAS
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
    let actionFn = (s) => executeCardAttack(cardName, () => {
        dealDamageToSelectedEnemy(s.stats.ap * 2.5);
        healPlayer(200);
        s.gold += 50;
        showFloatingText('✨ FUSÃO DE TINTAS!', innerWidth/2, 240, 'gold');
    });

    const mergedCard = {
        name: cardName,
        type: 'cabra',
        cost: 0,
        desc: `Efeito fusão: ${mixKey}`,
        action: actionFn,
        instanceId: 'c_' + Math.random().toString(36).substring(2)
    };

    const blankIdx = state.hand.findIndex(c => c.name === 'Carta em Branco');
    if (blankIdx !== -1) {
        state.hand[blankIdx] = mergedCard;
    } else if (state.hand.length < state.maxHandSize) {
        state.hand.push(mergedCard);
    } else {
        state.hand[0] = mergedCard;
    }

    state.currentInkMix = [];
    showFloatingText('🎨 TINTAS MESCLADAS NA CARTA!', innerWidth/2, 210, 'gold');
    addXp(15);
    updateUI();
}

/* ==========================================================================
   7. CARTAS E DECK
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
    if (!state.isMyTurn && !free) return showFloatingText('Aguarde seu turno!', innerWidth/2, 220, 'danger');
    
    if (state.hand.length >= state.maxHandSize) {
        return showFloatingText('⚠️ Mão cheia (7/7)! Jogue uma carta.', innerWidth/2, 220, 'danger');
    }
    
    if (state.deck.length === 0) return showFloatingText('Monte Vazio! Recarregue na Loja.', innerWidth/2, 220, 'danger');
    
    if (state.player.champ === 'cabra') {
        let totalInks = state.inkPots.red + state.inkPots.blue + state.inkPots.yellow;
        if (totalInks <= 0 && !free) {
            return showFloatingText('❌ Sem tintas nos potes! A Cabra não consegue agir!', innerWidth/2, 220, 'danger');
        }
    }

    if (!free && state.player.champ !== 'cabra') {
        if (state.energy < 1) return showFloatingText('Sem Energia!', innerWidth/2, 220, 'danger');
        state.energy--;
    }

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

/* ==========================================================================
   8. DRAG & DROP E COMBATE DIRETO AO OPONENTE (SEM NEXUS)
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
    if (!state.isMyTurn) return showFloatingText('Aguarde seu turno!', innerWidth/2, 220, 'danger');

    if (state.player.champ === 'borboleta' && state.butterflyBots.length > 0) {
        return showFloatingText('⚠️ Cartas nerfadas pelos Bots Akuma!', innerWidth/2, 220, 'danger');
    }

    const idx = state.hand.findIndex(c => c.instanceId === instanceId);
    if (idx === -1) return;
    const card = state.hand[idx];
    
    if (state.energy < card.cost && state.player.champ !== 'cabra') {
        return showFloatingText('Energia Insuficiente!', innerWidth/2, innerHeight/2, 'danger');
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
        showFloatingText('💥 CRÍTICO FATAL DO GALO!', innerWidth/2, innerHeight/2 - 50, 'gold');
    }

    let mitigation = 100 / (100 + Math.max(0, 40 - state.stats.pen));
    return Math.floor(finalDmg * mitigation);
}

function dealDamageToSelectedEnemy(amount, isTrue = false) {
    state.enemyTargetHp = Math.max(0, state.enemyTargetHp - amount);
    state.gold += 35;
    addXp(15);

    showFloatingText(`-${Math.floor(amount)} Dano Direto!`, innerWidth / 2, 180, 'danger');

    if (state.player.champ === 'galo') {
        state.stats.vamp = state.stats.crit;
    }
    if (state.stats.vamp > 0) {
        healPlayer(amount * (state.stats.vamp / 100));
    }

    if (state.selectedEnemyKey) {
        import('https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js').then(({ getDatabase, ref, update }) => {
            const db = getDatabase();
            const targetRef = ref(db, `rooms/${state.player.room}/players/${state.selectedEnemyKey}`);
            update(targetRef, { hp: state.enemyTargetHp });
        });
    }

    // Se o HP do inimigo zerou, você pontua uma KILL!
    if (state.enemyTargetHp <= 0) {
        state.kills++;
        showFloatingText('⚔️ INIMIGO DERROTADO! +1 KILL!', innerWidth/2, 230, 'gold');
        document.getElementById('hud-kills').innerText = state.kills;
        
        // Reseta o HP do alvo simulando respawn na arena
        state.enemyTargetHp = state.enemyTargetMaxHp;
    }
}

function healPlayer(amount) {
    let maxLimit = state.myMaxHp + state.stats.bonusHp;
    state.myHp = Math.min(maxLimit, state.myHp + amount);
    showFloatingText(`+${Math.floor(amount)} Vida`, innerWidth/3, 200, 'success');
    syncMyPlayerState(state.player.room, state.myKey, state.myHp, state.kills, state.deaths);
}

function takePlayerDamage(amount) {
    state.myHp = Math.max(0, state.myHp - amount);
    showFloatingText(`OUCH! -${Math.floor(amount)} Vida`, innerWidth/3, 220, 'danger');
    syncMyPlayerState(state.player.room, state.myKey, state.myHp, state.kills, state.deaths);

    if (state.myHp <= 0) {
        state.deaths++;
        document.getElementById('hud-deaths').innerText = state.deaths;
        showFloatingText('💀 VOCÊ MORREU! Respawnando em instantes...', innerWidth/2, innerHeight/2, 'danger');
        setTimeout(() => {
            state.myHp = state.myMaxHp + state.stats.bonusHp;
            updateUI();
        }, 3000);
    }
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
            healPlayer(400);
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
    state.enemyMinions.push({ id: Math.random(), hp: 80, goldReward: 50 });
    renderEnemyMinions();
}

window.farmEnemyMinion = function(id, clientX, clientY, reward) {
    if (!state.isMyTurn) return showFloatingText('Aguarde seu turno para farmar!', clientX, clientY, 'danger');
    
    state.enemyMinions = state.enemyMinions.filter(m => m.id !== id);
    state.gold += reward;
    addXp(12);
    showFloatingText(`+${reward} G (Farm)`, clientX, clientY, 'gold');
    renderEnemyMinions();
    updateUI();
}

/* ==========================================================================
   11. RENDERIZAÇÃO & LOOPS
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
    if (myHpText) myHpText.innerText = `${Math.floor(state.myHp)} HP`;
    let maxMyHp = state.myMaxHp + state.stats.bonusHp;
    const myHpBar = document.getElementById('my-hp-bar');
    if (myHpBar) myHpBar.style.width = `${Math.max(0, Math.min(100, (state.myHp / maxMyHp) * 100))}%`;

    const enemyPlayerHpText = document.getElementById('enemy-player-hp-text');
    if (enemyPlayerHpText) enemyPlayerHpText.innerText = `${Math.floor(state.enemyTargetHp)} HP`;
    const enemyPlayerHpBar = document.getElementById('enemy-player-hp-bar');
    if (enemyPlayerHpBar) enemyPlayerHpBar.style.width = `${Math.max(0, Math.min(100, (state.enemyTargetHp / state.enemyTargetMaxHp) * 100))}%`;
    
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

    let isHandBlank = (state.player.champ === 'borboleta' && state.butterflyBots.length > 0);

    state.hand.forEach(c => {
        let el = document.createElement('div');
        el.className = 'card';
        if (isHandBlank || c.name === 'Carta em Branco') el.classList.add('blank-card');
        
        el.draggable = !isHandBlank && c.name !== 'Carta em Branco';
        
        el.innerHTML = `
            <div>
                <strong class="card-title">${isHandBlank ? '🌀 [NERFADO]' : c.name}</strong>
                <p class="card-desc">${isHandBlank ? 'Cartas sob efeito de energia negativa.' : c.desc}</p>
            </div>
            <div class="card-footer">
                <span class="energy-cost">${isHandBlank || c.name === 'Carta em Branco' ? '0' : (state.player.champ === 'cabra' ? '🎨' : c.cost + ' EN')}</span>
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
                <strong style="color:var(--danger)">Tropa</strong>
                <p style="font-size:0.65rem">CLIQUE (+${m.goldReward}G)</p>
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
        if (totalDmg > 0 && state.selectedEnemyKey) dealDamageToSelectedEnemy(totalDmg);
    }, 4000);

    setInterval(() => {
        if (!state.isDead) spawnEnemyMinion();
    }, 9000);

    setInterval(() => {
        if (!state.isDead && state.inventory.includes('java')) {
            healPlayer(10);
        }
    }, 20000);
}
