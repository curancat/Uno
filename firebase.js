// ==========================================================================
// FIREBASE MODULE: SINCRONIZAÇÃO EM TEMPO REAL (SALAS E NEXUS)
// ==========================================================================
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getDatabase, ref, set, push, onValue, update, remove } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

// ==========================================================================
// CONFIGURAÇÃO DO SEU BANCO DE DADOS FIREBASE
// (Substitua abaixo com as credenciais do seu projeto criado no console do Firebase)
// ==========================================================================
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyDhFkKHWP0W4zupa9VCt3Rt7Uzr-qGWHPE",
  authDomain: "uno3-17cc6.firebaseapp.com",
  databaseURL: "https://uno3-17cc6-default-rtdb.firebaseio.com",
  projectId: "uno3-17cc6",
  storageBucket: "uno3-17cc6.firebasestorage.app",
  messagingSenderId: "834810148105",
  appId: "1:834810148105:web:e2824feabb794c39670fd8",
  measurementId: "G-PTCZVR4Z77"
};

// Inicializa o Firebase
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

/**
 * Entra em uma sala do Firebase e registra o jogador atual
 * @param {string} roomName - Código da sala digitado
 * @param {string} playerName - Nome do invocador
 * @param {string} champ - Miraculous escolhido (galo, cabra, borboleta)
 * @param {number} maxHp - Vida máxima inicial do Nexus
 * @returns {Promise<string>} - Retorna o ID único (chave) do jogador na sala
 */
export async function joinRoomFirebase(roomName, playerName, champ, maxHp) {
    const roomRef = ref(db, `rooms/${roomName}/players`);
    const newPlayerRef = push(roomRef);
    const playerKey = newPlayerRef.key;

    // Registra os dados iniciais do jogador na sala
    await set(newPlayerRef, {
        name: playerName,
        champ: champ,
        hp: maxHp,
        alive: true
    });

    // Remove o jogador automaticamente da sala se fechar ou atualizar a aba (Bedwars style)
    window.addEventListener('beforeunload', () => {
        remove(newPlayerRef);
    });

    return playerKey;
}

/**
 * Sincroniza o HP atual do seu Nexus no banco de dados para os outros verem
 * @param {string} roomName - Código da sala
 * @param {string} playerKey - Sua chave única no Firebase
 * @param {number} hp - HP atual
 */
export async function syncMyNexusHP(roomName, playerKey, hp) {
    if (!playerKey) return;
    const playerRef = ref(db, `rooms/${roomName}/players/${playerKey}`);
    await update(playerRef, { hp: hp });
}

/**
 * Escuta em tempo real as mudanças na sala (vida dos oponentes e campeões presentes)
 * @param {string} roomName - Código da sala
 * @param {string} myKey - Sua chave para diferenciar você dos inimigos
 * @param {Function} onEnemyHpUpdate - Callback chamado quando o HP inimigo muda
 * @param {Function} onChampsUpdate - Callback chamado quando a lista de campeões na sala muda
 */
export function listenToRoomState(roomName, myKey, onEnemyHpUpdate, onChampsUpdate) {
    const roomRef = ref(db, `rooms/${roomName}/players`);
    
    onValue(roomRef, (snapshot) => {
        const data = snapshot.val();
        if (!data) return;

        let champsInRoom = [];
        let enemyHp = 5000;
        let enemyKey = null;

        // Percorre todos os jogadores conectados na mesma sala
        Object.keys(data).forEach(key => {
            const player = data[key];
            champsInRoom.push(player.champ);

            // Se a chave não for a minha, é o oponente/inimigo na sala
            if (key !== myKey) {
                enemyHp = player.hp;
                enemyKey = key;
            }
        });

        // Atualiza a barra de campeões no topo e o HP do Nexus oponente
        onChampsUpdate(champsInRoom);
        if (enemyKey) {
            onEnemyHpUpdate(enemyHp, 'Inimigo', enemyKey);
        }
    });
}
