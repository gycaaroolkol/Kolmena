import { initializeApp } from "firebase/app";
import {
  createUserWithEmailAndPassword,
  getAuth,
  signInWithEmailAndPassword,
  updateProfile
} from "firebase/auth";
import {
  doc,
  getFirestore,
  serverTimestamp,
  setDoc,
  Timestamp
} from "firebase/firestore";
import fs from "node:fs";
import path from "node:path";

function loadEnv(filePath) {
  const env = {};
  const raw = fs.readFileSync(filePath, "utf8");

  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const separatorIndex = trimmed.indexOf("=");
    if (separatorIndex === -1) continue;

    const key = trimmed.slice(0, separatorIndex).trim();
    const value = trimmed
      .slice(separatorIndex + 1)
      .trim()
      .replace(/^["']|["']$/g, "");

    env[key] = value;
  }

  return env;
}

function getArg(name, fallback) {
  const prefix = `--${name}=`;
  const arg = process.argv.find((item) => item.startsWith(prefix));
  return arg ? arg.slice(prefix.length) : fallback;
}

function round(value) {
  return Number(value.toFixed(1));
}

function buildReadings(count) {
  const now = Date.now();
  const intervalMs = 60 * 60 * 1000;

  return Array.from({ length: count }, (_, index) => {
    const wave = Math.sin(index / 3);
    const smallerWave = Math.cos(index / 4);
    const timestamp = new Date(now - (count - index - 1) * intervalMs);

    return {
      TempN: round(34 + wave * 1.3),
      tempSN: round(32.4 + smallerWave * 1.1),
      umidN: round(72 + smallerWave * 2.2),
      umidSN: round(56 + wave * 2.8),
      lum: index % 11 === 0 ? 1 : 0,
      ruido: Math.round(285 + wave * 55 + smallerWave * 20),
      timestamp: Timestamp.fromDate(timestamp)
    };
  });
}

const envPath = path.resolve(process.cwd(), ".env");
const env = loadEnv(envPath);

const firebaseConfig = {
  apiKey: env.VITE_FIREBASE_API_KEY,
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: env.VITE_FIREBASE_APP_ID,
  measurementId: env.VITE_FIREBASE_MEASUREMENT_ID
};

const suffix = Date.now().toString(36);
const email = getArg("email", `teste-historico-${suffix}@kolmena.local`);
const password = getArg("password", "KolmenaTeste123!");
const hiveId = getArg("hive-id", `MEL-TESTE-${suffix}`.toUpperCase());
const hiveName = getArg("hive-name", "Colmeia Teste Historico");
const readingsCount = Number(getArg("count", "36"));

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

async function getOrCreateUser() {
  try {
    const credential = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(credential.user, { displayName: "Teste Historico" });
    return credential.user;
  } catch (error) {
    if (error?.code !== "auth/email-already-in-use") throw error;
    return signInWithEmailAndPassword(auth, email, password).then((credential) => credential.user);
  }
}

const user = await getOrCreateUser();
const readings = buildReadings(readingsCount);
const latestReading = readings.at(-1);

await setDoc(doc(db, "usuarios", user.uid), {
  nome: user.displayName || "Teste Historico",
  email: user.email || email,
  colmeias: [hiveId],
  atualizadoEm: serverTimestamp(),
  criadoEm: serverTimestamp()
}, { merge: true });

await setDoc(doc(db, "colmeias", hiveId), {
  apelido: hiveName,
  usuarioId: user.uid,
  controls: {
    agua: false,
    racao: false
  },
  lastFeedingTime: {
    food: null,
    water: null
  },
  ultimaLeitura: latestReading,
  leituras: readings,
  eventos: [],
  status: "ideal",
  lastCleaning: serverTimestamp(),
  atualizadoEm: serverTimestamp()
}, { merge: true });

console.log("Historico de sensores criado com sucesso.");
console.log(`Email: ${email}`);
console.log(`Senha: ${password}`);
console.log(`UID: ${user.uid}`);
console.log(`Colmeia: ${hiveId}`);
console.log(`Leituras: ${readings.length}`);
