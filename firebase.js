// ==========================================================================
// UNO LEGENDS: MIRACULOUS NEXUS - FIREBASE REALTIME ENGINE (SYNC DE SALA)
// ==========================================================================

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getDatabase, ref, set, onValue, update } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

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

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

/**
 * Registra o jogador e o seu campeão escolhido na sala do Firebase
 */
export async function joinRoomFirebase(roomId, playerName, champ, initialHp) {
    const playerKey = sanitizeKey(playerName);
    const roomRef = ref(db, `rooms/${roomId}/${playerKey}`);

    try {
        await set(roomRef, {
            name: playerName,
            champion: champ,
            nexusHp: initialHp,
            timestamp: Date.now()
        });
        return playerKey;
    } catch (error) {
        console.error("[Firebase] Erro ao entrar na sala:", error);
    }
}

/**
 * Atualiza o HP atual do seu Nexus no banco de dados
 */
export function syncMyNexusHP(roomId, playerKey, currentHp) {
    if (!roomId || !playerKey) return;
    const playerRef = ref(db, `rooms/${roomId}/${playerKey}`);
    update(playerRef, {
        nexusHp: currentHp,
        timestamp: Date.now()
    });
}

/**
 * Escuta em tempo real o estado completo da sala (HP do inimigo e campeões presentes)
 */
export function listenToRoomState(roomId, myPlayerKey, onEnemyHpUpdate, onRoomChampionsUpdate) {
    const roomRef = ref(db, `rooms/${roomId}`);
    
    onValue(roomRef, (snapshot) => {
        const data = snapshot.val();
        if (!data) return;

        let activeChampions = [];

        Object.keys(data).forEach(key => {
            const playerData = data[key];
            
            // Coleta o campeão de todos os players na sala
            if (playerData && playerData.champion) {
                if (!activeChampions.includes(playerData.champion)) {
                    activeChampions.push(playerData.champion);
                }
            }

            // Atualiza o HP do oponente (quem não é você)
            if (key !== myPlayerKey && playerData && typeof playerData.nexusHp !== 'undefined') {
                onEnemyHpUpdate(playerData.nexusHp, playerData.name);
            }
        });

        // Envia a lista unificada de campeões para atualizar a loja de todos
        if (onRoomChampionsUpdate) {
            onRoomChampionsUpdate(activeChampions);
        }
    });
}

function sanitizeKey(str) {
    return str.replace(/[.#$\/\[\]]/g, "_").toLowerCase();
}
