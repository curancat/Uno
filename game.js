// ==========================================================================
// UNO LEGENDS: MIRACULOUS PANCADARIA - ENGINE DEFINITIVA (SEM NEXUS - DUELO DIRETO)
// ==========================================================================
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getDatabase, ref, set, get, update, onValue, push, remove } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

// Configuração Firebase padrão (substitua com seu projeto se necessário)
const firebaseConfig = {
    databaseURL: "https://uno-legends-default-rtdb.firebaseio.com/"
};
let db = null;
try {
    const app = initializeApp(firebaseConfig);
    db = getDatabase(app);
} catch (e) {
    console.warn("Firebase rodando em modo local/fallback:", e);
}

/* ==========================================================================
   1. BANCO DE DADOS: ITENS, MINIONS E CARTAS DE CAMPEÕES
   ========================================================================== */
const ALL_ITEMS = {
    // Globais
    'pocao': { name: 'Poção de Cura', cost: 50, type: 'all', stats: { bonusHp: 250 }, desc: 'Restaura 250 de HP imediatamente.' },
    'mana_pot': { name: 'Poção de Mana', cost: 40, type: 'all', stats: {}, desc: 'Restaura 3 de Energia.' },

    // Galo
    'lacre3000': { name: 'Lacre 3000g', cost: 3000, type: 'galo', stats: { crit: 10, ad: 100 }, desc: 'Colete almas com menos de 90% da vida atual.' },
    'skate2900': { name: 'Skate 2900g', cost: 2900, type: 'galo', stats: { crit: 5, ad: 60, armor: 40, mr: 30 }, desc: 'Paralisa inimigos por 3s ao causar nojo.' },
    'mandrakit': { name: 'Mandrakit 2400g', cost: 2400, type: 'galo', stats: { crit: 30, ad: 30, ap: 30, mr: 30, bonusHp: 30 }, desc: 'Ganhe +15% de vida ao levar dano letal.' },
    'alma_sebosa': { name: 'Alma Sebosa 3000g', cost: 3000, type: 'galo', stats: { crit: 15, ap: 20 }, desc: 'Bloqueie CC por 10 segundos.' },
    'pate': { name: 'E o Patê? 2000g', cost: 2000, type: 'galo', stats: { crit: 5, armor: 40, mr: 30 }, desc: 'Atrasa dano inimigo por 5s.' },
    'bota_sapatona': { name: 'Bota (Sapatona) 1000g', cost: 1000, type: 'galo', stats: { crit: 2, pen: 3, ad: 5 }, desc: '+30 Vel. de Spawn e +5 AD.' },

    // Cabra (Littlegot)
    'pyton': { name: 'Pyton 2000g', cost: 2000, type: 'cabra', stats: { ad: 20, ap: 100, crit: 3 }, desc: 'Seu veneno dá dano contínuo por 5s.' },
    'javascript': { name: 'Java Script 2800g', cost: 2800, type: 'cabra', stats: { ap: 80, mr: 20 }, desc: 'Escudo a cada 4s ao ser atingido.' },
    'java': { name: 'Java 1900g', cost: 1900, type: 'cabra', stats: { crit: 50, ap: 50, ad: 50 }, desc: 'Cura 5 de vida a cada 20 segundos.' },
    'bf2300': { name: 'BF 2300g', cost: 2300, type: 'cabra', stats: { bonusHp: 200, ad: 20, ap: 40, armor: 50 }, desc: '+1 AP para cada 1 de resistência atual.' },
    'cadelagem': { name: 'Cadelagem 2000g', cost: 2000, type: 'cabra', stats: { ad: 80, ap: 50 }, desc: '+4 de gold a cada segundo.' },
    'bota_cadelagem': { name: 'Bota (Cadelagem) 1000g', cost: 1000, type: 'cabra', stats: { ap: 3, ad: 4, crit: 5 }, desc: '+20 Vel. de carta.' },

    // Borboleta
    'incubus': { name: 'Incubus 3000g', cost: 3000, type: 'borboleta', stats: { ap: 80, ad: 50, armor: 30 }, desc: 'Recupere vida ao atacar com borboletas.' },
    'dono_inferno': { name: 'Dono do Inferno 4000g', cost: 4000, type: 'borboleta', stats: { ad: 20, ap: 80, bonusHp: 300, armor: 90 }, desc: 'Renasça após a morte (CD 10 min).' },
    'fome_luxuria': { name: 'Fome de Luxúria 3500g', cost: 3500, type: 'borboleta', stats: { ap: 110, crit: 40, mr: 40, bonusHp: 100 }, desc: 'Bloqueie uma ação a cada 5 min.' },
    'bibi_fogosa': { name: 'Bibi Fogosa 4000g', cost: 4000, type: 'borboleta', stats: { ap: 90, ad: 80 }, desc: 'Nocauteie e dê dano contínuo por 6s.' },
    'vem_com_tudo': { name: 'Vem com Tudo 3900g', cost: 3900, type: 'borboleta', stats: { armor: 100, mr: 100 }, desc: 'Abaixo de 60% HP, reduza dano em 40%.' },
    'bota_funk': { name: 'Bota (Funk) 1000g', cost: 1000, type: 'borboleta', stats: { ap: 3, bonusHp: 40 }, desc: '+30 Vel. de carta.' }
};

const CHAMPION_CARDS = {
    'galo': [
        { name: 'Auto Ataque', type: 'galo', cost: 1, desc: 'Ataque básico com AD e Crítico determinístico.', action: (s) => executeCardAttack('Auto Ataque', calculateDeterministicCrit(s.stats.ad)) },
        { name: 'Marola', type: 'galo', cost: 2, desc: 'Pena envenenada. 3 pilhas = 10% da vida atual em dano verdadeiro.', action: (s) => triggerMarola() },
        { name: 'Dessa cor eu não tenho', type: 'galo', cost: 2, desc: 'Copia o último ataque recebido.', action: (s) => executeCardAttack('Cópia', s.stats.ad * 1.5) },
        { name: 'Aiin', type: 'galo', cost: 2, desc: 'Ganha um escudo protetor temporário.', action: (s) => addShield(250) }
    ],
    'cabra': [
        { name: 'Carta em Branco', type: 'cabra', cost: 0, desc: 'Misture tintas na Oficina para criar efeitos únicos!', action: (s) => showFloatingText('Use as Tintas para colorir esta carta!', innerWidth/2, 200, 'danger') }
    ],
    'borboleta': [
        { name: 'Auto Ataque', type: 'borboleta', cost: 1, desc: 'Ataque básico de energia escura.', action: (s) => executeCardAttack('Auto Ataque', s.stats.ad + s.stats.ap * 0.3) },
        { name: 'Akuma', type: 'borboleta', cost: 2, desc: 'Infesta o deck inimigo com energia negativa.', action: (s) => spawnButterflyBot() },
        { name: 'Beijo Saliente', type: 'borboleta', cost: 3, desc: 'Drena 5% da vida máxima do inimigo por segundo.', action: (s) => drainEnemyHp(0.05) },
        { name: 'Desejo do Pecado', type: 'borboleta', cost: 2, desc: 'Rouba temporariamente atributos do oponente.', action: (s) => stealEnemyAttributes() }
    ],
    'global': [
        { name: 'Poção Rápida', type: 'global', cost: 1, desc: 'Cura 150 de HP.', action: (s) => { s.hp = Math.min(s.maxHp, s.hp + 150); playSound('heal'); } },
        { name: 'Muralha', type: 'global', cost: 2, desc: 'Aumenta Armadura e MR em +15.', action: (s) => { s.stats.armor += 15; s.stats.mr += 15; playSound('buff'); } }
    ]
};

/* ==========================================================================
   2. ESTADO GLOBAL DO JOGO
   ========================================================================= */
let state = {
    player: { name: '', room: '', champ: '', level: 1, xp: 0, maxXp: 100, kills: 0, deaths: 0 },
    myKey: '',
    enemyKey: null,
    roomPlayers: {},
    
    gold: 500, baseGps: 5,
    energy: 5, maxEnergy: 5,
    hp: 3000, maxHp: 3000,
    shield: 0,
    hand: [], maxHandSize: 7,
    deck: [], maxDeckCards: 20,
    inventory: [],
    
    isMyTurn: true,
    turnNumber: 1,
    matchTimeLeft: 1200, // 20 minutos

    // Littlegot (Cabra)
    inkPots: { red: 2, blue: 2, yellow: 2, max: 5 },
    currentInkMix: [],

    // Borboleta
    butterflyBots: [],
    marolaStacks: 0,
    stats: { ad: 25, ap: 25, armor: 15, mr: 15, crit: 0, vamp: 0, pen: 0, bonusHp: 0 },
    critCredit: 0
};

/* ==========================================================================
   3. ÁUDIO SINTETIZADO (WEB AUDIO API)
   ========================================================================= */
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
function playSound(type) {
    if (!audioCtx) return;
    if (audioCtx.state === 'suspended') audioCtx.resume();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    
    const now = audioCtx.currentTime;
    if (type === 'hit') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(150, now);
        osc.frequency.exponentialRampToValueAtTime(40, now + 0.15);
        gain.gain.setValueAtTime(0.3, now);
        gain.gain.linearRampToValueAtTime(0.01, now + 0.15);
        osc.start(now); osc.stop(now + 0.15);
    } else if (type === 'crit') {
        osc.type = 'square';
        osc.frequency.setValueAtTime(400, now);
        osc.frequency.exponentialRampToValueAtTime(100, now + 0.25);
        gain.gain.setValueAtTime(0.4, now);
        gain.gain.linearRampToValueAtTime(0.01, now + 0.25);
        osc.start(now); osc.stop(now + 0.25);
    } else if (type === 'gold') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(600, now);
        osc.frequency.setValueAtTime(900, now + 0.08);
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.linearRampToValueAtTime(0.01, now + 0.2);
        osc.start(now); osc.stop(now + 0.2);
    } else if (type === 'heal') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(300, now);
        osc.frequency.linearRampToValueAtTime(600, now + 0.3);
        gain.gain.setValueAtTime(0.25, now);
        gain.gain.linearRampToValueAtTime(0.01, now + 0.3);
        osc.start(now); osc.stop(now + 0.3);
    } else if (type === 'buff') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(220, now);
        osc.frequency.linearRampToValueAtTime(440, now + 0.2);
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.linearRampToValueAtTime(0.01, now + 0.2);
        osc.start(now); osc.stop(now + 0.2);
    }
}

/* ==========================================================================
   4. INTERFACE GRÁFICA & HTML INJETADO (MOBILE & DESKTOP RESPONSIVO)
   ========================================================================= */
document.addEventListener('DOMContentLoaded', () => {
    injectGameStyles();
    buildLobbyHTML();
});

function injectGameStyles() {
    const style = document.createElement('style');
    style.innerHTML = `
        :root {
            --bg-dark: #090d16;
            --panel-bg: rgba(15, 23, 42, 0.95);
            --cyan-glow: #38bdf8;
            --gold: #fbbf24;
            --danger: #ef4444;
            --purple: #a855f7;
        }
        * { box-sizing: border-box; margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; user-select: none; }
        body { background: var(--bg-dark); color: #f8fafc; min-height: 100vh; overflow-x: hidden; }
        .hidden { display: none !important; }
        
        /* LOBBY */
        #lobby-screen { display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 100vh; padding: 20px; background: radial-gradient(circle at center, #1e293b 0%, #090d16 100%); }
        .lobby-card { background: var(--panel-bg); border: 2px solid var(--cyan-glow); border-radius: 16px; padding: 30px; width: 100%; max-width: 500px; box-shadow: 0 15px 35px rgba(0,0,0,0.7); display: flex; flex-direction: column; gap: 20px; }
        .lobby-title { font-size: 1.6rem; font-weight: 900; color: var(--cyan-glow); text-align: center; letter-spacing: 1px; }
        .input-group { display: flex; flex-direction: column; gap: 6px; }
        .input-group label { font-size: 0.85rem; color: #94a3b8; font-weight: bold; }
        .input-group input { background: #020617; border: 1px solid #334155; color: #fff; padding: 12px; border-radius: 8px; font-size: 1rem; outline: none; }
        .champs-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
        .champ-select-btn { background: #1e293b; border: 2px solid #334155; border-radius: 10px; padding: 12px 6px; text-align: center; cursor: pointer; transition: all 0.2s; color: #fff; font-weight: bold; font-size: 0.85rem; }
        .champ-select-btn.active { border-color: var(--cyan-glow); background: rgba(56, 189, 248, 0.2); box-shadow: 0 0 15px rgba(56, 189, 248, 0.4); }
        .btn-main { background: linear-gradient(135deg, #0284c7, #2563eb); color: #fff; border: none; padding: 14px; border-radius: 10px; font-size: 1rem; font-weight: bold; cursor: pointer; transition: transform 0.1s; }
        .btn-main:active { transform: scale(0.98); }

        /* GAME SCREEN */
        #game-screen { display: flex; flex-direction: column; height: 100vh; padding: 10px; gap: 10px; max-width: 1400px; margin: 0 auto; }
        .top-bar { display: flex; justify-content: space-between; align-items: center; background: var(--panel-bg); border: 1px solid #334155; padding: 10px 16px; border-radius: 12px; font-size: 0.9rem; flex-wrap: wrap; gap: 10px; }
        .timer-badge { background: #1e293b; border: 1px solid var(--danger); color: var(--danger); padding: 4px 10px; border-radius: 6px; font-weight: bold; font-family: monospace; }
        
        .battle-arena { display: grid; grid-template-columns: 1fr 320px; gap: 15px; flex: 1; min-height: 0; }
        @media (max-width: 900px) { .battle-arena { grid-template-columns: 1fr; overflow-y: auto; } }

        .play-area { display: flex; flex-direction: column; gap: 10px; background: rgba(15, 23, 42, 0.7); border: 1px solid #334155; border-radius: 12px; padding: 15px; position: relative; }
        .combatants-row { display: flex; justify-content: space-between; align-items: center; background: #020617; padding: 15px; border-radius: 10px; border: 1px solid #1e293b; }
        .fighter-card { text-align: center; flex: 1; }
        .fighter-name { font-size: 1rem; font-weight: bold; color: var(--cyan-glow); margin-bottom: 4px; }
        .hp-bar-bg { width: 100%; max-width: 220px; height: 14px; background: #1e293b; border-radius: 7px; margin: 0 auto; overflow: hidden; border: 1px solid #475569; position: relative; }
        .hp-bar-fill { height: 100%; background: #22c55e; width: 100%; transition: width 0.3s; }
        .shield-bar-fill { height: 100%; background: #38bdf8; width: 0%; position: absolute; top: 0; left: 0; opacity: 0.7; }

        /* HAND & CARDS */
        .hand-container { display: flex; gap: 10px; overflow-x: auto; padding: 10px; min-height: 160px; align-items: center; justify-content: center; }
        .card { background: linear-gradient(135deg, #1e293b, #0f172a); border: 2px solid #475569; border-radius: 12px; width: 130px; height: 170px; padding: 10px; display: flex; flex-direction: column; justify-content: space-between; cursor: pointer; transition: transform 0.2s, border-color 0.2s; box-shadow: 0 4px 10px rgba(0,0,0,0.5); flex-shrink: 0; }
        .card:hover { transform: translateY(-8px); border-color: var(--cyan-glow); box-shadow: 0 8px 20px rgba(56,189,248,0.3); }
        .card-header { display: flex; justify-content: space-between; font-size: 0.7rem; font-weight: bold; color: #94a3b8; }
        .card-title { font-size: 0.85rem; font-weight: bold; color: #fff; text-align: center; }
        .card-desc { font-size: 0.65rem; color: #cbd5e1; text-align: center; line-height: 1.2; }
        .card-cost { background: #3b82f6; color: #fff; font-size: 0.7rem; padding: 2px 6px; border-radius: 4px; align-self: center; font-weight: bold; }

        /* SIDEBAR (SHOP & INVENTORY & HUD) */
        .sidebar { display: flex; flex-direction: column; gap: 10px; background: var(--panel-bg); border: 1px solid #334155; border-radius: 12px; padding: 12px; max-height: 100%; overflow-y: auto; }
        .section-title { font-size: 0.8rem; font-weight: bold; color: var(--cyan-glow); border-bottom: 1px solid #334155; padding-bottom: 4px; margin-bottom: 6px; display: flex; justify-content: space-between; }
        .shop-grid, .inv-grid { display: flex; flex-direction: column; gap: 6px; max-height: 200px; overflow-y: auto; }
        .shop-item, .inv-item { background: #1e293b; border: 1px solid #334155; border-radius: 8px; padding: 8px; display: flex; justify-content: space-between; align-items: center; font-size: 0.75s; }
        .btn-action { background: #0284c7; color: #fff; border: none; padding: 4px 8px; border-radius: 4px; font-size: 0.7rem; cursor: pointer; font-weight: bold; }
        .btn-action:hover { background: #0369a1; }
        .btn-danger { background: var(--danger); }
        .btn-danger:hover { background: #dc2626; }

        /* FLOATING TEXT */
        .floating-text { position: fixed; font-weight: 900; font-size: 1.2rem; pointer-events: none; z-index: 9999; animation: floatUp 1s ease-out forwards; text-shadow: 0 2px 4px rgba(0,0,0,0.8); }
        @keyframes floatUp { 0% { opacity: 1; transform: translateY(0) scale(1); } 100% { opacity: 0; transform: translateY(-60px) scale(1.2); } }
    `;
    document.head.appendChild(style);
}

function buildLobbyHTML() {
    const root = document.createElement('div');
    root.id = 'app-root';
    root.innerHTML = `
        <div id="lobby-screen">
            <div class="lobby-card">
                <div class="lobby-title">UNO LEGENDS: MIRACULOUS</div>
                <div class="input-group">
                    <label>NOME DO INVOCADOR</label>
                    <input type="text" id="player-name" placeholder="Ex: Cataclismo99" value="Invocador_${Math.floor(Math.random()*900+100)}">
                </div>
                <div class="input-group">
                    <label>CÓDIGO DA SALA (IP/SALA)</label>
                    <input type="text" id="room-id" value="sala_principal">
                </div>
                <div class="input-group">
                    <label>ESCOLHA SEU MIRACULOUS</label>
                    <div class="champs-grid">
                        <div class="champ-select-btn active" data-champ="galo">GALO<br><span style="font-size:0.6rem; color:#94a3b8;">Crítico & AD</span></div>
                        <div class="champ-select-btn" data-champ="cabra">CABRA<br><span style="font-size:0.6rem; color:#94a3b8;">Tintas & AP</span></div>
                        <div class="champ-select-btn" data-champ="borboleta">BORBOLETA<br><span style="font-size:0.6rem; color:#94a3b8;">Akuma & Drenagem</span></div>
                    </div>
                </div>
                <button class="btn-main" id="btn-join-game">ENTRAR NA BATALHA</button>
            </div>
        </div>

        <div id="game-screen" class="hidden">
            <div class="top-bar">
                <div style="display:flex; gap:15px; align-items:center;">
                    <span id="room-display" style="font-weight:bold; color:var(--cyan-glow);">SALA: SALA_1</span>
                    <span class="timer-badge" id="match-timer">20:00</span>
                </div>
                <div style="display:flex; gap:15px; font-weight:bold; font-size:0.85rem;">
                    <span>🪙 <span id="gold-display">500</span>g</span>
                    <span>⚡ <span id="energy-display">5/5</span></span>
                    <span>⭐ Nível <span id="lvl-display">1</span> (<span id="xp-display">0/100</span>)</span>
                    <span>💀 Kills: <span id="kills-display">0</span></span>
                </div>
            </div>

            <div class="battle-arena">
                <div class="play-area">
                    <div class="combatants-row">
                        <div class="fighter-card">
                            <div class="fighter-name" id="my-name-display">EU</div>
                            <div class="hp-bar-bg">
                                <div class="shield-bar-fill" id="my-shield-bar"></div>
                                <div class="hp-bar-fill" id="my-hp-bar"></div>
                            </div>
                            <div style="font-size:0.75rem; margin-top:4px; font-weight:bold;"><span id="my-hp-text">3000</span>/<span id="my-maxhp-text">3000</span> HP</div>
                        </div>
                        <div style="font-size:1.2rem; font-weight:900; color:var(--danger);">VS</div>
                        <div class="fighter-card">
                            <div class="fighter-name" id="enemy-name-display">OPONENTE</div>
                            <div class="hp-bar-bg">
                                <div class="hp-bar-fill" id="enemy-hp-bar" style="background:#ef4444;"></div>
                            </div>
                            <div style="font-size:0.75rem; margin-top:4px; font-weight:bold;"><span id="enemy-hp-text">3000</span>/<span id="enemy-maxhp-text">3000</span> HP</div>
                        </div>
                    </div>

                    <div style="flex:1; display:flex; flex-direction:column; justify-content:center; align-items:center; background:rgba(2,6,23,0.5); border-radius:10px; padding:10px; border:1px solid #1e293b;" id="arena-center-info">
                        <div style="font-size:0.9rem; color:#94a3b8; font-weight:bold; margin-bottom:10px;">ESCOLHA UMA CARTA PARA JOGAR NO SEU TURNO</div>
                        <div id="cabra-workshop" class="hidden" style="background:rgba(30,41,59,0.9); border:1px solid #f59e0b; padding:10px; border-radius:8px; margin-bottom:10px; width:100%; max-width:400px; text-align:center;">
                            <div style="font-size:0.8rem; color:#fbbf24; font-weight:bold; margin-bottom:6px;">🎨 OFICINA DE TINTAS (CABRA)</div>
                            <div style="display:flex; justify-content:center; gap:8px; margin-bottom:8px;">
                                <button class="btn-action" style="background:#ef4444;" onclick="addInk('red')">Vermelho (<span id="ink-red">2</span>)</button>
                                <button class="btn-action" style="background:#3b82f6;" onclick="addInk('blue')">Azul (<span id="ink-blue">2</span>)</button>
                                <button class="btn-action" style="background:#fbbf24; color:#000;" onclick="addInk('yellow')">Amarelo (<span id="ink-yellow">2</span>)</button>
                            </div>
                            <div style="font-size:0.75rem; color:#cbd5e1; margin-bottom:8px;" id="ink-mix-status">Mistura atual: Nenhuma</div>
                            <button class="btn-action" style="background:#22c55e; width:100%;" onclick="craftInkCard()">Criar Carta com Tinta</button>
                        </div>
                        <select id="target-player-select" style="background:#020617; color:#fff; border:1px solid #334155; padding:8px; border-radius:6px; font-size:0.85rem; width:100%; max-width:300px; margin-bottom:10px;" onchange="changeTarget(this.value)">
                            <option value="">Procurando oponentes na sala...</option>
                        </select>
                        <button class="btn-action btn-danger" style="padding:10px 20px; font-weight:bold;" onclick="endTurn()">⏳ PASSAR TURNO</button>
                    </div>

                    <div style="display:flex; flex-direction:column; gap:6px;">
                        <div style="font-size:0.8rem; font-weight:bold; color:var(--cyan-glow); display:flex; justify-content:space-between;">
                            <span>SUA MÃO DE CARTAS</span>
                            <button class="btn-action" onclick="buyDeck()" style="font-size:0.65rem;">Comprar Deck (100g)</button>
                        </div>
                        <div class="hand-container" id="player-hand-container"></div>
                    </div>
                </div>

                <div class="sidebar">
                    <div class="section-title"><span>🛒 LOJA DE ITENS</span></div>
                    <div class="shop-grid" id="shop-items-container"></div>

                    <div class="section-title" style="margin-top:10px;"><span>🎒 SEU INVENTÁRIO</span></div>
                    <div class="inv-grid" id="inventory-container"></div>

                    <div class="section-title" style="margin-top:10px;"><span>📊 STATUS DE COMBATE</span></div>
                    <div style="font-size:0.75rem; display:flex; flex-direction:column; gap:4px; background:#020617; padding:8px; border-radius:8px; border:1px solid #1e293b;" id="stats-display-box">
                        <div>AD: <span id="stat-ad">25</span> | AP: <span id="stat-ap">25</span></div>
                        <div>Armadura: <span id="stat-armor">15</span> | MR: <span id="stat-mr">15</span></div>
                        <div>Crítico: <span id="stat-crit">0</span>% | Vamp: <span id="stat-vamp">0</span>%</div>
                    </div>
                </div>
            </div>
        </div>
    `;
    document.body.appendChild(root);
    initLobbyEvents();
}

/* ==========================================================================
   5. INICIALIZAÇÃO DE EVENTOS E LOBBY
   ========================================================================= */
function initLobbyEvents() {
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
        buildInitialDeck();

        if (db) {
            try {
                const playerRef = push(ref(db, `rooms/${state.player.room}/players`));
                state.myKey = playerRef.key;
                await set(playerRef, {
                    name: state.player.name,
                    champ: state.player.champ,
                    hp: state.hp,
                    maxHp: state.maxHp,
                    kills: 0
                });

                // Sincronizar dados em tempo real da sala
                onValue(ref(db, `rooms/${state.player.room}/players`), (snapshot) => {
                    const data = snapshot.val();
                    if (!data) return;
                    state.roomPlayers = data;
                    updateRoomPlayersUI(data);
                });
            } catch (err) {
                console.warn("Erro ao conectar ao Firebase:", err);
            }
        }

        document.getElementById('lobby-screen').classList.add('hidden');
        document.getElementById('game-screen').classList.remove('hidden');

        if (state.player.champ === 'cabra') {
            document.getElementById('cabra-workshop').classList.remove('hidden');
        }

        startGameLoops();
        for (let i = 0; i < 4; i++) drawCard();
        updateUI();
        showFloatingText('Batalha iniciada!', innerWidth/2, 100, 'gold');
    });
}

function applyChampStats() {
    if (state.player.champ === 'galo') {
        state.stats.ad = 60; state.stats.crit = 20; state.stats.vamp = 15;
    } else if (state.player.champ === 'cabra') {
        state.stats.ap = 70; state.stats.armor = 20;
    } else if (state.player.champ === 'borboleta') {
        state.stats.ap = 60; state.stats.ad = 30; state.stats.mr = 25;
    }
}

/* ==========================================================================
   6. SISTEMA DE CARTAS, BARALHO E LOJA
   ========================================================================= */
function buildInitialDeck() {
    const champCards = CHAMPION_CARDS[state.player.champ] || [];
    const globalCards = CHAMPION_CARDS['global'];
    state.deck = [];
    for (let i = 0; i < 10; i++) {
        state.deck.push(champCards[Math.floor(Math.random() * champCards.length)]);
        state.deck.push(globalCards[Math.floor(Math.random() * globalCards.length)]);
    }
}

function drawCard() {
    if (state.deck.length === 0) buildInitialDeck();
    if (state.hand.length >= state.maxHandSize) return;
    const card = state.deck.pop();
    state.hand.push(card);
    updateUI();
}

window.buyDeck = function() {
    if (state.gold < 100) return showFloatingText('Gold insuficiente!', innerWidth/2, 200, 'danger');
    state.gold -= 100;
    buildInitialDeck();
    for(let i=0; i<3; i++) drawCard();
    playSound('gold');
    showFloatingText('Deck comprado (+3 cartas)!', innerWidth/2, 200, 'gold');
    updateUI();
};

/* ==========================================================================
   7. MECÂNICAS DE COMBATE DIRETO & LOLL CRIT SYSTEM
   ========================================================================= */
function calculateDeterministicCrit(baseDamage) {
    let critChance = state.stats.crit;
    state.critCredit += critChance;
    let isCrit = false;
    if (state.critCredit >= 100) {
        isCrit = true;
        state.critCredit -= 100;
    }
    let dmg = isCrit ? baseDamage * 2 : baseDamage;
    if (isCrit) playSound('crit');
    else playSound('hit');
    return dmg;
}

window.executeCardAttack = function(cardName, damage) {
    if (!state.isMyTurn) return showFloatingText('Não é seu turno!', innerWidth/2, 200, 'danger');
    if (state.energy < 1) return showFloatingText('Sem energia!', innerWidth/2, 200, 'danger');
    state.energy -= 1;

    let finalDmg = damage * (1 + (state.stats.ad + state.stats.ap) * 0.01);
    dealDamageToEnemy(finalDmg);
    
    // Vampirismo
    if (state.stats.vamp > 0) {
        let healed = finalDmg * (state.stats.vamp / 100);
        state.hp = Math.min(state.maxHp, state.hp + healed);
    }
    
    addXp(25);
    updateUI();
};

function triggerMarola() {
    if (!state.isMyTurn) return;
    state.marolaStacks = (state.marolaStacks || 0) + 1;
    if (state.marolaStacks >= 3) {
        let trueDmg = 500;
        dealDamageToEnemy(trueDmg, true);
        state.marolaStacks = 0;
        showFloatingText('ESTOURO DE MAROLA (10% Dano Verdadeiro)!', innerWidth/2, 200, 'gold');
    } else {
        executeCardAttack('Marola', state.stats.ad * 1.3);
    }
}

window.addShield = function(amount) {
    state.shield += amount;
    playSound('buff');
    showFloatingText(`+${amount} Escudo!`, innerWidth/2, 200, 'cyan');
    updateUI();
};

function dealDamageToEnemy(dmg, isTrue = false) {
    if (!state.enemyKey || !state.roomPlayers[state.enemyKey]) {
        // Modo treino se não houver oponente conectado
        showFloatingText(`-${Math.floor(dmg)} Dano no Alvo!`, innerWidth/2, 250, 'danger');
        return;
    }
    let enemy = state.roomPlayers[state.enemyKey];
    let newEnemyHp = Math.max(0, enemy.hp - dmg);
    
    if (db) {
        update(ref(db, `rooms/${state.player.room}/players/${state.enemyKey}`), { hp: newEnemyHp });
    }
    showFloatingText(`-${Math.floor(dmg)} Dano!`, innerWidth/2, 250, 'danger');
    
    if (newEnemyHp <= 0) {
        state.player.kills++;
        state.gold += 300;
        showFloatingText('INIMIGO DERROTADO! +300g', innerWidth/2, 180, 'gold');
        playSound('gold');
    }
}

window.changeTarget = function(key) {
    state.enemyKey = key;
    showFloatingText('Alvo selecionado!', innerWidth/2, 180, 'cyan');
};

/* ==========================================================================
   8. SISTEMA DE TINTAS (CABRA) & BORBOLETA
   ========================================================================= */
window.addInk = function(color) {
    if (state.player.champ !== 'cabra') return;
    if (state.inkPots[color] > 0) {
        state.inkPots[color]--;
        state.currentInkMix.push(color);
        document.getElementById('ink-mix-status').innerText = `Mistura: ${state.currentInkMix.join(' + ').toUpperCase()}`;
        updateUI();
    }
};

window.craftInkCard = function() {
    if (state.currentInkMix.length === 0) return showFloatingText('Selecione tintas primeiro!', innerWidth/2, 200, 'danger');
    let craftedCard = { name: `Carta Tinta [${state.currentInkMix.join('/')}]`, type: 'cabra', cost: 2, desc: 'Carta mágica personalizada com tinta.', action: () => executeCardAttack('Magia de Tinta', state.stats.ap * 2.5) };
    state.hand.push(craftedCard);
    state.currentInkMix = [];
    document.getElementById('ink-mix-status').innerText = 'Mistura: Nenhuma';
    showFloatingText('Carta de Tinta criada!', innerWidth/2, 200, 'gold');
    updateUI();
};

function spawnButterflyBot() {
    showFloatingText('Borboleta Akuma disparada!', innerWidth/2, 200, 'purple');
    dealDamageToEnemy(state.stats.ap * 1.8);
}

function drainEnemyHp(pct) {
    let drain = 150;
    state.hp = Math.min(state.maxHp, state.hp + drain);
    dealDamageToEnemy(drain);
    showFloatingText('Vida drenada com sucesso!', innerWidth/2, 200, 'purple');
}

function stealEnemyAttributes() {
    state.stats.ap += 10;
    state.stats.ad += 10;
    showFloatingText('Atributos absorvidos!', innerWidth/2, 200, 'cyan');
    updateUI();
}

/* ==========================================================================
   9. LOJA E INVENTÁRIO (COM VENDA DE ITENS)
   ========================================================================= */
function populateShop() {
    const container = document.getElementById('shop-items-container');
    if (!container) return;
    container.innerHTML = '';

    Object.keys(ALL_ITEMS).forEach(key => {
        const item = ALL_ITEMS[key];
        if (item.type !== 'all' && item.type !== state.player.champ) return;

        const div = document.createElement('div');
        div.className = 'shop-item';
        div.innerHTML = `
            <div>
                <div style="font-weight:bold; font-size:0.8rem;">${item.name}</div>
                <div style="font-size:0.65rem; color:#94a3b8;">${item.desc}</div>
            </div>
            <button class="btn-action" onclick="buyItem('${key}')">${item.cost}g</button>
        `;
        container.appendChild(div);
    });
}

window.buyItem = function(key) {
    const item = ALL_ITEMS[key];
    if (state.gold < item.cost) return showFloatingText('Gold insuficiente!', innerWidth/2, 200, 'danger');
    state.gold -= item.cost;
    state.inventory.push({ id: key, ...item });

    // Aplicar stats
    if (item.stats) {
        if (item.stats.ad) state.stats.ad += item.stats.ad;
        if (item.stats.ap) state.stats.ap += item.stats.ap;
        if (item.stats.armor) state.stats.armor += item.stats.armor;
        if (item.stats.mr) state.stats.mr += item.stats.mr;
        if (item.stats.crit) state.stats.crit += item.stats.crit;
        if (item.stats.bonusHp) { state.maxHp += item.stats.bonusHp; state.hp += item.stats.bonusHp; }
    }
    playSound('gold');
    showFloatingText(`Item comprado: ${item.name}`, innerWidth/2, 200, 'gold');
    updateUI();
};

window.sellItem = function(index) {
    const item = state.inventory[index];
    const refund = Math.floor(item.cost * 0.7);
    state.gold += refund;

    // Remover stats
    if (item.stats) {
        if (item.stats.ad) state.stats.ad -= item.stats.ad;
        if (item.stats.ap) state.stats.ap -= item.stats.ap;
        if (item.stats.armor) state.stats.armor -= item.stats.armor;
        if (item.stats.mr) state.stats.mr -= item.stats.mr;
        if (item.stats.crit) state.stats.crit -= item.stats.crit;
        if (item.stats.bonusHp) { state.maxHp -= item.stats.bonusHp; state.hp = Math.min(state.hp, state.maxHp); }
    }

    state.inventory.splice(index, 1);
    playSound('gold');
    showFloatingText(`Item vendido por ${refund}g`, innerWidth/2, 200, 'gold');
    updateUI();
};

/* ==========================================================================
   10. SISTEMA DE XP, NÍVEL E LOOPS DE JOGO
   ========================================================================= */
function addXp(amount) {
    if (state.player.level >= 18) return;
    state.player.xp += amount;
    if (state.player.xp >= state.player.maxXp) {
        state.player.level++;
        state.player.xp = 0;
        state.player.maxXp = Math.floor(state.player.maxXp * 1.3);
        state.maxHp += 200;
        state.hp = state.maxHp;
        state.stats.ad += 8;
        state.stats.ap += 8;
        showFloatingText(`🌟 LEVEL UP! Nível ${state.player.level}!`, innerWidth/2, 200, 'gold');
        playSound('buff');
    }
    updateUI();
}

window.endTurn = function() {
    if (!state.isMyTurn) return;
    state.isMyTurn = false;
    showFloatingText('Passando turno...', innerWidth/2, 200, 'cyan');

    setTimeout(() => {
        state.turnNumber++;
        state.isMyTurn = true;
        state.energy = state.maxEnergy;
        drawCard();
        showFloatingText(`Turno ${state.turnNumber} iniciado!`, innerWidth/2, 200, 'gold');
        updateUI();
    }, 1500);
};

function startGameLoops() {
    // Loop de Gold Passivo (5g/s ou a cada 2s) + Recarga de Energia
    setInterval(() => {
        let gps = state.baseGps + (state.inventory.some(i => i.id === 'cadelagem') ? 4 : 0);
        state.gold += gps;
        state.energy = Math.min(state.maxEnergy, state.energy + 1);
        
        // Sincronizar com Firebase se ativo
        if (db && state.myKey) {
            update(ref(db, `rooms/${state.player.room}/players/${state.myKey}`), {
                hp: state.hp,
                maxHp: state.maxHp,
                kills: state.player.kills
            });
        }
        updateUI();
    }, 2000);

    // Loop do Temporizador da Partida (20 minutos)
    setInterval(() => {
        if (state.matchTimeLeft > 0) {
            state.matchTimeLeft--;
            const min = Math.floor(state.matchTimeLeft / 60);
            const sec = state.matchTimeLeft % 60;
            const timerEl = document.getElementById('match-timer');
            if (timerEl) timerEl.innerText = `${min}:${sec < 10 ? '0' : ''}${sec}`;
        }
    }, 1000);
}

function updateRoomPlayersUI(playersData) {
    const select = document.getElementById('target-player-select');
    if (!select) return;
    let html = '';
    let enemyCount = 0;

    Object.keys(playersData).forEach(key => {
        if (key === state.myKey) return;
        enemyCount++;
        const p = playersData[key];
        const isSelected = state.enemyKey === key ? 'selected' : '';
        html += `<option value="${key}" ${isSelected}>${p.name} (${p.champ.toUpperCase()} - ${Math.floor(p.hp)} HP)</option>`;
    });

    select.innerHTML = enemyCount > 0 ? html : '<option value="">Aguardando oponentes...</option>';
    if (!state.enemyKey && enemyCount > 0) {
        state.enemyKey = Object.keys(playersData).find(k => k !== state.myKey);
    }
}

function updateUI() {
    document.getElementById('gold-display').innerText = state.gold;
    document.getElementById('energy-display').innerText = `${state.energy}/${state.maxEnergy}`;
    document.getElementById('lvl-display').innerText = state.player.level;
    document.getElementById('xp-display').innerText = `${state.player.xp}/${state.player.maxXp}`;
    document.getElementById('kills-display').innerText = state.player.kills;
    document.getElementById('my-name-display').innerText = state.player.name.toUpperCase();

    // Barras de Vida e Escudo
    const myHpPct = (state.hp / state.maxHp) * 100;
    document.getElementById('my-hp-bar').style.width = `${myHpPct}%`;
    document.getElementById('my-hp-text').innerText = Math.floor(state.hp);
    document.getElementById('my-maxhp-text').innerText = state.maxHp;

    const shieldPct = Math.min(100, (state.shield / state.maxHp) * 100);
    document.getElementById('my-shield-bar').style.width = `${shieldPct}%`;

    // Inimigo selecionado
    if (state.enemyKey && state.roomPlayers[state.enemyKey]) {
        const enemy = state.roomPlayers[state.enemyKey];
        document.getElementById('enemy-name-display').innerText = enemy.name.toUpperCase();
        const enHpPct = Math.max(0, (enemy.hp / enemy.maxHp) * 100);
        document.getElementById('enemy-hp-bar').style.width = `${enHpPct}%`;
        document.getElementById('enemy-hp-text').innerText = Math.floor(enemy.hp);
        document.getElementById('enemy-maxhp-text').innerText = enemy.maxHp;
    }

    // Stats
    document.getElementById('stat-ad').innerText = state.stats.ad;
    document.getElementById('stat-ap').innerText = state.stats.ap;
    document.getElementById('stat-armor').innerText = state.stats.armor;
    document.getElementById('stat-mr').innerText = state.stats.mr;
    document.getElementById('stat-crit').innerText = state.stats.crit;
    document.getElementById('stat-vamp').innerText = state.stats.vamp;

    // Tintas Cabra
    if (state.player.champ === 'cabra') {
        ['red', 'blue', 'yellow'].forEach(c => {
            const el = document.getElementById(`ink-${c}`);
            if (el) el.innerText = state.inkPots[c];
        });
    }

    // Renderizar Mão
    const handContainer = document.getElementById('player-hand-container');
    if (handContainer) {
        handContainer.innerHTML = '';
        state.hand.forEach((card, idx) => {
            const cardEl = document.createElement('div');
            cardEl.className = 'card';
            cardEl.innerHTML = `
                <div class="card-header">
                    <span>${card.type.toUpperCase()}</span>
                    <span class="card-cost">${card.cost}⚡</span>
                </div>
                <div class="card-title">${card.name}</div>
                <div class="card-desc">${card.desc}</div>
                <button class="btn-action" style="font-size:0.65rem; padding:4px;" onclick="playCard(${idx})">JOGAR</button>
            `;
            handContainer.appendChild(cardEl);
        });
    }

    // Renderizar Inventário
    const invContainer = document.getElementById('inventory-container');
    if (invContainer) {
        invContainer.innerHTML = '';
        state.inventory.items = state.inventory.items || [];
        state.inventory.forEach((item, idx) => {
            const div = document.createElement('div');
            div.className = 'inv-item';
            div.innerHTML = `
                <span style="font-size:0.75rem; font-weight:bold;">${item.name}</span>
                <button class="btn-action btn-danger" style="font-size:0.6rem;" onclick="sellItem(${idx})">Vender (${Math.floor(item.cost*0.7)}g)</button>
            `;
            invContainer.appendChild(div);
        });
    }
}

window.playCard = function(index) {
    const card = state.hand[index];
    if (state.energy < card.cost) return showFloatingText('Energia insuficiente!', innerWidth/2, 200, 'danger');
    state.energy -= card.cost;
    state.hand.splice(index, 1);
    card.action(state);
    updateUI();
};

function showFloatingText(txt, x, y, type) {
    const el = document.createElement('div');
    el.className = `floating-text`;
    el.style.color = type === 'gold' ? '#fbbf24' : type === 'danger' ? '#ef4444' : type === 'cyan' ? '#38bdf8' : '#a855f7';
    el.innerText = txt;
    el.style.left = `${x - 40}px`;
    el.style.top = `${y}px`;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 1100);
}
