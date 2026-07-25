// ==========================================================================
// UNO LEGENDS: BRAWL ARENA - MOTOR DE JOGO DEFINITIVO (SEM NEXUS - DEATHMATCH)
// ==========================================================================
import { joinRoomFirebase, listenToRoomState } from './firebase.js';

/* ==========================================================================
   1. BANCO DE DADOS: ITENS, MINIONS E CARTAS DE CAMPEÕES
   ========================================================================== */
const ALL_ITEMS = {
    // Globais
    'pocao': { name: 'Poção de Cura Rápida', cost: 50, type: 'all', stats: {}, desc: 'Restaura 500 de HP instantaneamente.' },

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
    'java': { name: 'Java 1900g', cost: 1900, type: 'cabra', stats: { crit: 50, ap: 50, ad: 50 }, desc: 'Cura 15 de vida a cada 10s.' },
    'bf2300': { name: 'BF 2300g', cost: 2300, type: 'cabra', stats: { bonusHp: 200, ad: 20, ap: 40, armor: 50 }, desc: '+1 AP para cada 1 de Armadura.' },
    'cadelagem': { name: 'Cadelagem 2000g', cost: 2000, type: 'cabra', stats: { ad: 80, ap: 50 }, desc: '+4 de gold por segundo.' },
    'bota_cadelagem': { name: 'Bota (Cadelagem) 1000g', cost: 1000, type: 'cabra', stats: { ap: 3, ad: 4, crit: 5 }, desc: '+20 Vel. de carta.' },

    // Borboleta
    'incubus': { name: 'Incubus 3000g', cost: 3000, type: 'borboleta', stats: { ap: 80, ad: 50, armor: 30 }, desc: 'Recupere vida ao invocar bots.' },
    'dono_inferno': { name: 'Dono do Inferno 4000g', cost: 4000, type: 'borboleta', stats: { ad: 20, ap: 80, bonusHp: 300, armor: 90 }, desc: 'Renasça após a morte instantaneamente.' },
    'fome_luxuria': { name: 'Fome de Luxúria 3500g', cost: 3500, type: 'borboleta', stats: { ap: 110, crit: 40, mr: 40, bonusHp: 100 }, desc: 'Bloqueie uma ação inimiga.' },
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
        { name: 'Soco Direto', type: 'galo', cost: 1, desc: 'Ataque físico básico no oponente selecionado.', action: (s) => executeCardAttack('Soco Direto', () => dealDamageToSelected(calculateDeterministicCrit(s.stats.ad))) },
        { name: 'Marola', type: 'galo', cost: 2, desc: 'Pena envenenada. Acumule 3 pilhas para causar dano verdadeiro massivo.', action: (s) => executeCardAttack('Marola', () => { s.marolaStacks = (s.marolaStacks || 0) + 1; if(s.marolaStacks >= 3) { dealDamageToSelected(s.enemyPlayerHp * 0.25, true); s.marolaStacks = 0; showFloatingText('ESTOURO DE MAROLA!', innerWidth/2, 250, 'gold'); } else { dealDamageToSelected(s.stats.ad * 1.5); } }) },
        { name: 'Dessa cor eu não tenho', type: 'galo', cost: 2, desc: 'Golpe surpresa com dano amplificado.', action: (s) => executeCardAttack('Surpresa', () => dealDamageToSelected(s.stats.ad * 2.0)) },
        { name: 'Aiin', type: 'galo', cost: 2, desc: 'Autocura rápida em combate.', action: (s) => executeCardAttack('Aiin', () => healPlayer(400)) }
    ],
    'cabra': [
        { name: 'Carta em Branco', type: 'cabra', cost: 0, desc: 'Use a Oficina de Tintas para desenhar feitiços de dano!', action: (s) => showFloatingText('Carta em branco! Desenhe uma carta nas Tintas.', innerWidth/2, 200, 'danger') }
    ],
    'borboleta': [
        { name: 'Rajada Sombria', type: 'borboleta', cost: 1, desc: 'Disparo de energia arcana no alvo.', action: (s) => executeCardAttack('Rajada', () => dealDamageToSelected(s.stats.ap)) },
        { name: 'Akuma', type: 'borboleta', cost: 2, desc: 'Invoca um Bot Sombra que ataca o oponente automaticamente.', action: (s) => executeCardAttack('Akuma', () => spawnButterflyBot(s)) },
        { name: 'Beijo Saliente', type: 'borboleta', cost: 3, desc: 'Drena a vida do oponente e cura o usuário.', action: (s) => executeCardAttack('Dreno', () => { dealDamageToSelected(350); healPlayer(200); }) },
        { name: 'Desejo do Pecado', type: 'borboleta', cost: 2, desc: 'Explosão psíquica e roubo temporário de poder.', action: (s) => executeCardAttack('Pecado', () => { dealDamageToSelected(280); s.stats.ap += 20; showFloatingText('+20 AP Drenado!', innerWidth/2, 200, 'purple'); }) }
    ],
    'global': [
        { name: 'Poção Rápida', type: 'global', cost: 1, desc: 'Cura 250 HP.', action: (s) => executeCardAttack('Poção', () => healPlayer(250)) },
        { name: 'Postura Defensiva', type: 'global', cost: 2, desc: 'Aumenta Armadura e Resistência Mágica.', action: (s) => executeCardAttack('Defesa', () => { s.stats.armor += 20; s.stats.mr += 20; }) }
    ]
};

/* ==========================================================================
   2. ESTADO GLOBAL DO JOGO & TIMER DE BRAWL
   ========================================================================= */
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

    // Sistema Littlegot (Cabra)
    inkPots: { red: 2, blue: 2, yellow: 2, max: 5 },
    currentInkMix: [],

    // Sistema Borboleta
    butterflyBots: [],
    
    roomChampions: [], activeEvent: null,
    marolaStacks: 0,
    isDead: false,
    
    playerHp: 3000,
    playerMaxHp: 3000,
    enemyPlayerHp: 3000,
    enemyPlayerMaxHp: 3000,

    // Cronômetro do Match (10 minutos = 600 segundos)
    matchTimeRemaining: 600,
    matchInterval: null,

    stats: { ad: 25, ap: 25, armor: 15, mr: 15, crit: 10, vamp: 0, pen: 0, bonusHp: 0 },
    critCredit: 0
};

/* ==========================================================================
   3. INICIALIZAÇÃO & INTERFACE FLUTUANTE DE BRAWL
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
        background: rgba(15, 23, 42, 0.95);
        border: 2px solid #ef4444;
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
        <div style="font-size:0.8rem; color:#ef4444; font-weight:bold; border-bottom:1px solid #334155; padding-bottom:6px; display:flex; justify-content:space-between; align-items:center;">
            <span>⚔️ ARENA DEATHMATCH</span>
            <span id="match-timer-badge" style="font-size:0.75rem; background:#7f1d1d; padding:2px 8px; border-radius:4px; color:#fca5a5; font-weight:bold;">10:00</span>
        </div>

        <div style="background:rgba(30,41,59,0.75); border:1px solid #ef4444; padding:10px; border-radius:8px;">
            <div style="font-size:0.75rem; color:#ef4444; font-weight:bold; margin-bottom:6px;">🎯 ALVO DA PANCADARIA:</div>
            <select id="target-select" style="width:100%; background:#090d16; color:#fff; border:1px solid #334155; padding:8px; border-radius:6px; font-size:0.8rem;" onchange="changeTarget(this.value)">
                <option value="">Procurando oponentes na sala...</option>
            </select>
        </div>

        <div id="cabra-hud-panel" class="${state.player.champ === 'cabra' ? '' : 'hidden'}" style="background:rgba(30,41,59,0.75); border:1px solid #f59e0b; padding:10px; border-radius:8px;">
            <div style="font-size:0.75rem; color:#fbbf24; font-weight:bold; margin-bottom:8px; display:flex; justify-content:space-between; align-items:center;">
                <span>🎨 OFICINA DE TINTAS</span>
                <span style="font-size:0.6rem; color:#38bdf8;">Littlegot</span>
            </div>
            <div style="display:flex; gap:6px; margin-bottom:8px;">
                <button class="btn" style="background:#ef4444; padding:6px 2px; flex:1; font-size:0.68rem; color:#fff;" onclick="addInk('red')">Verm (<span id="ink-red-count">2</span>)</button>
                <button class="btn" style="background:#3b82f6; padding:6px 2px; flex:1; font-size:0.68rem; color:#fff;" onclick="addInk('blue')">Azul (<span id="ink-blue-count">2</span>)</button>
                <button class="btn" style="background:#fbbf24; padding:6px 2px; flex:1; font-size:0.68rem; color:#000; font-weight:bold;" onclick="addInk('yellow')">Amar (<span id="ink-yellow-count">2</span>)</button>
            </div>
            <div style="font-size:0.7rem; color:#cbd5e1; margin-bottom:8px; background:#090d16; padding:6px; border-radius:4px; text-align:center;" id="ink-mix-display">Mistura: Nenhuma</div>
            <div style="display:flex; gap:6px;">
                <button class="btn btn-cyan" style="padding:6px 2px; flex:1; font-size:0.65rem;" onclick="drawShape('bola')">⭕ Bola</button>
                <button class="btn btn-cyan" style="padding:6px 2px; flex:1; font-size:0.65rem;" onclick="drawShape('cima')">⬆️ Cima</button>
                <button class="btn btn-cyan" style="padding:6px 2px; flex:1; font-size:0.65rem;" onclick="drawShape('deitado')">➡️ Deitado</button>
            </div>
        </div>

        <div>
            <button id="btn-end-turn" class="btn btn-danger" style="width:100%; padding:12px; font-size:0.85rem; font-weight:bold; border-radius:8px;" onclick="endTurn()">⏳ PASSAR TURNO</button>
        </div>
    `;

    document.body.appendChild(hud);

    // Barra de Nível e Placar de Kills do Jogador
    const myPanel = document.querySelector('.nexus-card');
    if (myPanel && !document.getElementById('player-lvl-text')) {
        const infoDiv = document.createElement('div');
        infoDiv.style.cssText = 'margin-top:10px; background:rgba(0,0,0,0.5); padding:8px; border-radius:6px; border:1px solid #ef4444;';
        infoDiv.innerHTML = `
            <div style="display:flex; justify-content:space-between; font-size:0.8rem; font-weight:bold; color:#ef4444;">
                <span id="player-lvl-text">NÍVEL 1</span>
                <span id="player-kills-text">💀 Kills: 0</span>
            </div>
            <div style="width:100%; height:8px; background:#1e293b; border-radius:4px; margin-top:4px; overflow:hidden;">
                <div id="player-xp-bar" style="width:0%; height:100%; background:#ef4444; transition:width 0.3s;"></div>
            </div>
        `;
        myPanel.appendChild(infoDiv);
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
        state.player.room = document.getElementById('room-id').value || 'brawl_sala_1';
        if (!state.player.champ) return alert('Escolha um Campeão!');

        applyChampBaseStats();
        buildDeck();

        state.myKey = await joinRoomFirebase(state.player.room, state.player.name, state.player.champ, state.playerMaxHp);
        
        document.getElementById('lobby-screen').classList.add('hidden');
        document.getElementById('game-screen').classList.remove('hidden');

        injectDynamicUI();
        startMatchTimer();

        // Escuta em tempo real dos jogadores na sala via Firebase
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
                        optionsHtml += `<option value="${key}" ${isSelected}>${p.name} (${(p.champ || '').toUpperCase()} - ${Math.floor(p.hp || 0)} HP | 💀 ${p.kills || 0})</option>`;
                    }
                });

                state.roomChampions = champsInRoom;
                updatePlayersBar();
                populateShop();

                if (selectEl) {
                    selectEl.innerHTML = optionsHtml || '<option value="">Sozinho na Arena (Modo Solo)</option>';
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
        showFloatingText(`🎯 Alvo: ${state.roomPlayers[targetKey].name}`, innerWidth/2, 160, 'cyan');
    }
    updateUI();
}

function applyChampBaseStats() {
    if (state.player.champ === 'galo') { state.stats.ad = 60; state.stats.crit = 20; state.stats.vamp = 15; }
    if (state.player.champ === 'cabra') { state.stats.ap = 65; state.stats.armor = 25; }
    if (state.player.champ === 'borboleta') { state.stats.ap = 60; state.stats.ad = 35; state.stats.mr = 25; }
}

/* ==========================================================================
   4. CRONÔMETRO DE PARTIDA (10 MINUTOS) & VITÓRIA POR KILLS
   ========================================================================= */
function startMatchTimer() {
    state.matchInterval = setInterval(() => {
        if (state.matchTimeRemaining > 0) {
            state.matchTimeRemaining--;
            let mins = Math.floor(state.matchTimeRemaining / 60);
            let secs = state.matchTimeRemaining % 60;
            let timeStr = `${mins}:${secs < 10 ? '0' : ''}${secs}`;
            
            const badge = document.getElementById('match-timer-badge');
            if (badge) badge.innerText = timeStr;
        } else {
            clearInterval(state.matchInterval);
            endMatchByTime();
        }
    }, 1000);
}

function endMatchByTime() {
    let winnerName = state.player.name;
    let maxKills = state.player.kills;

    Object.keys(state.roomPlayers).forEach(k => {
        let p = state.roomPlayers[k];
        if ((p.kills || 0) > maxKills) {
            maxKills = p.kills;
            winnerName = p.name;
        }
    });

    alert(`⏰ TEMPO ESGOTADO! FIM DA PARTIDA DE BRAWL!\n🏆 Vencedor: ${winnerName} com ${maxKills} Kills!`);
    window.location.reload();
}

/* ==========================================================================
   5. SISTEMA DE EXPERIÊNCIA E NÍVEL
   ========================================================================= */
function addXp(amount) {
    if (state.player.level >= 18) return;

    state.player.xp += amount;
    if (state.player.xp >= state.player.maxXp) {
        state.player.level++;
        state.player.xp = state.player.xp - state.player.maxXp;
        state.player.maxXp = Math.floor(state.player.maxXp * 1.3);
        
        state.stats.ad += 8;
        state.stats.ap += 8;
        state.stats.bonusHp += 150;
        state.playerMaxHp += 150;
        healPlayer(200);

        showFloatingText(`🌟 LEVEL UP! Nível ${state.player.level}!`, innerWidth/2, innerHeight/2 - 100, 'gold');
    }
    updateUI();
}

/* ==========================================================================
   6. SISTEMA DE TURNOS E BOTS DA BORBOLETA
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
    const waitTime = otherPlayersCount > 0 ? 3000 : 800;

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
    showFloatingText(`🦋 Akuma invocado para atacar o oponente!`, innerWidth/2, 220, 'purple');
    
    const newBot = {
        id: Math.random(),
        name: `Bot Sombra`,
        power: s.stats.ap * 1.2,
        turnsLeft: 3
    };

    state.butterflyBots.push(newBot);
    updateUI();
}

function executeButterflyBots() {
    state.butterflyBots.forEach(bot => {
        let replicatedDmg = bot.power;
        showFloatingText(`🦋 Bot atacou por -${Math.floor(replicatedDmg)}!`, innerWidth/2, 280, 'purple');
        dealDamageToSelected(replicatedDmg);
        bot.turnsLeft--;
    });
    
    state.butterflyBots = state.butterflyBots.filter(b => b.turnsLeft > 0);
}

/* ==========================================================================
   7. SISTEMA DE TINTAS DO LITTLEGOT (CABRA)
   ========================================================================= */
window.addInk = function(color) {
    if (state.inkPots[color] <= 0) return showFloatingText('Pote Vazio!', innerWidth/2, 200, 'danger');
    if (state.currentInkMix.length >= 2) return showFloatingText('Máximo de 2 tintas por carta!', innerWidth/2, 200, 'danger');
    
    state.inkPots[color]--;
    state.currentInkMix.push(color);
    updateUI();
}

window.drawShape = function(shape) {
    if (state.currentInkMix.length === 0) return showFloatingText('Adicione tinta primeiro!', innerWidth/2, 200, 'danger');
    if (!state.isMyTurn) return showFloatingText('Aguarde seu turno para desenhar!', innerWidth/2, 200, 'danger');

    let isDoubleEffect = state.currentInkMix.length === 2;
    let cardName = `Magia: ${shape.toUpperCase()}`;
    let desc = `Ataque pintado com ${state.currentInkMix.join(' + ')}.`;
    
    if (isDoubleEffect) {
        cardName += ' ✨ DUPLO';
        desc += ' (Causa Dano Alto + Cura)';
    }

    const newCustomCard = {
        name: cardName,
        type: 'cabra',
        cost: 0,
        desc: desc,
        action: (s) => executeCardAttack(cardName, () => {
            let dmg = s.stats.ap * (shape === 'bola' ? 2.5 : 1.8);
            dealDamageToSelected(dmg);
            if (isDoubleEffect) {
                healPlayer(250);
                s.gold += 40;
                showFloatingText('✨ MAGIA DUPLA!', innerWidth/2, 230, 'gold');
            }
        })
    };

    const blankIdx = state.hand.findIndex(c => c.name === 'Carta em Branco');
    if (blankIdx !== -1) {
        state.hand[blankIdx] = { ...newCustomCard, instanceId: 'c_' + Math.random().toString(36).substring(2) };
    } else {
        state.hand.push({ ...newCustomCard, instanceId: 'c_' + Math.random().toString(36).substring(2) });
    }

    state.currentInkMix = [];
    showFloatingText('🎨 MAGIA DESENHADA!', innerWidth/2, 200, 'cyan');
    addXp(15);
    updateUI();
}

/* ==========================================================================
   8. SISTEMA DE CARTAS E DECK
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
    if (state.deck.length === 0) return showFloatingText('Deck Vazio!', innerWidth/2, 220, 'danger');
    
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
    showFloatingText('Deck Recarregado!', innerWidth/2, 220, 'gold');
    updateUI();
}

/* ==========================================================================
   9. DRAG & DROP E COMBATE DIRETO AO OPONENTE
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
    
    if (state.energy < card.cost) return showFloatingText('Sem Energia Suficiente!', innerWidth/2, innerHeight/2, 'danger');
    
    state.energy -= card.cost;
    card.action(state);
    state.hand.splice(idx, 1);
    
    addXp(15);
    updateUI();
}

function executeCardAttack(cardName, damageCallback) {
    const targetCardEl = document.querySelector('.nexus-card.enemy');
    if (!targetCardEl) {
        damageCallback();
        return;
    }

    const rectTarget = targetCardEl.getBoundingClientRect();
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
        showFloatingText('💥 CRÍTICO!', innerWidth/2, innerHeight/2 - 50, 'gold');
    }

    let mitigation = 100 / (100 + Math.max(0, 40 - state.stats.pen));
    return Math.floor(finalDmg * mitigation);
}

function dealDamageToSelected(amount) {
    if (!state.selectedEnemyKey) {
        showFloatingText('Nenhum alvo selecionado!', innerWidth/2, 200, 'danger');
        return;
    }

    state.enemyPlayerHp = Math.max(0, state.enemyPlayerHp - amount);
    state.gold += 35;
    addXp(20);

    showFloatingText(`-${Math.floor(amount)} DANO`, innerWidth / 2, 180, 'danger');
    
    const targetEl = document.querySelector('.nexus-card.enemy');
    if (targetEl) {
        targetEl.classList.add('taking-damage');
        setTimeout(() => targetEl.classList.remove('taking-damage'), 300);
    }

    if (state.stats.vamp > 0) {
        healPlayer(amount * (state.stats.vamp / 100));
    }

    // Atualiza HP do inimigo no Firebase
    import('https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js').then(({ getDatabase, ref, update }) => {
        const db = getDatabase();
        const targetRef = ref(db, `rooms/${state.player.room}/players/${state.selectedEnemyKey}`);
        update(targetRef, { hp: state.enemyPlayerHp });
    });

    // Se o inimigo morreu
    if (state.enemyPlayerHp <= 0) {
        state.player.kills++;
        showFloatingText('💀 INIMIGO ABATIDO (+1 KILL)!', innerWidth / 2, 230, 'gold');
        
        // Atualiza Kills no Firebase
        import('https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js').then(({ getDatabase, ref, update }) => {
            const db = getDatabase();
            const myRef = ref(db, `rooms/${state.player.room}/players/${state.myKey}`);
            update(myRef, { kills: state.player.kills });
        });
    }
}

function healPlayer(amount) {
    let maxLimit = state.playerMaxHp + state.stats.bonusHp;
    state.playerHp = Math.min(maxLimit, state.playerHp + amount);
    showFloatingText(`+${Math.floor(amount)} HP`, innerWidth/2, 200, 'success');
    
    import('https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js').then(({ getDatabase, ref, update }) => {
        const db = getDatabase();
        const myRef = ref(db, `rooms/${state.player.room}/players/${state.myKey}`);
        update(myRef, { hp: state.playerHp });
    });
}

/* ==========================================================================
   10. LOJA E ITENS
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
                    <h4 style="color:#fbbf24; font-size:0.9rem;">${item.name}</h4>
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
            healPlayer(500);
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
   11. MINIONS & FARM NA ARENA
   ========================================================================== */
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
    if (!state.isMyTurn) return showFloatingText('Aguarde seu turno!', clientX, clientY, 'danger');
    
    state.enemyMinions = state.enemyMinions.filter(m => m.id !== id);
    state.gold += reward;
    addXp(15);
    showFloatingText(`+${reward} G (Farm)`, clientX, clientY, 'gold');
    renderEnemyMinions();
    updateUI();
}

/* ==========================================================================
   12. RENDERIZAÇÃO & LOOPS DO BRAWL
   ========================================================================= */
function updateUI() {
    let dynamicAp = state.stats.ap;
    if (state.inventory.includes('bf2300')) dynamicAp += state.stats.armor;

    const lvlText = document.getElementById('player-lvl-text');
    if (lvlText) lvlText.innerText = `NÍVEL ${state.player.level}`;
    const killsText = document.getElementById('player-kills-text');
    if (killsText) killsText.innerText = `💀 Kills: ${state.player.kills}`;
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
    if (myHpText) myHpText.innerText = `${Math.floor(state.playerHp)} HP`;
    let maxMyHp = state.playerMaxHp + state.stats.bonusHp;
    const myHpBar = document.getElementById('my-hp-bar');
    if (myHpBar) myHpBar.style.width = `${Math.max(0, Math.min(100, (state.playerHp / maxMyHp) * 100))}%`;

    const enemyHpText = document.getElementById('enemy-hp-text');
    if (enemyHpText) {
        enemyHpText.innerText = `${Math.floor(state.enemyPlayerHp)} HP (OPONENTE)`;
    }
    const enemyHpBar = document.getElementById('enemy-hp-bar');
    if (enemyHpBar) enemyHpBar.style.width = `${Math.max(0, Math.min(100, (state.enemyPlayerHp / state.enemyPlayerMaxHp) * 100))}%`;
    
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
        el.draggable = c.name !== 'Carta em Branco';
        
        el.innerHTML = `
            <div>
                <strong class="card-title">${c.name}</strong>
                <p class="card-desc">${c.desc}</p>
            </div>
            <div class="card-footer">
                <span class="energy-cost">${c.name === 'Carta em Branco' ? '🎨' : c.cost + ' EN'}</span>
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
        lane.innerHTML += `<div class="minion-card" style="border-color:#38bdf8"><strong>${m.name}</strong><p>⚔️ ${m.atk} | ❤️ ${m.currentHp}</p></div>`;
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
            <div class="minion-card" style="border-color:#ef4444; cursor:pointer;" onclick="farmEnemyMinion(${m.id}, event.clientX, event.clientY, ${m.goldReward})">
                <strong style="color:#ef4444">Alvo de Farm</strong>
                <p style="font-size:0.65rem">CLIQUE (+${m.goldReward}G)</p>
            </div>`;
    });
}

function updatePlayersBar() {
    const b = document.getElementById('players-bar');
    if (!b) return;
    b.innerHTML = `<span style="color:#94a3b8; font-weight:bold;">ARENA: ${state.player.room.toUpperCase()}</span><div class="players-list" id="plist"></div>`;
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
        state.myMinions.forEach(m => totalDsmg += m.atk);
        if (totalDmg > 0 && state.selectedEnemyKey) {
            dealDamageToSelected(totalDmg);
        }
    }, 4000);

    setInterval(() => {
        if (!state.isDead) spawnEnemyMinion();
    }, 9000);

    setInterval(() => {
        if (!state.isDead && state.inventory.includes('java')) {
            healPlayer(15);
        }
    }, 15000);
}
