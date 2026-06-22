import { DocumentData, QueryDocumentSnapshot, Timestamp } from "firebase/firestore";
import { HiveData } from "./hive-card";

export function valueToDate(value: unknown): Date | null {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (value instanceof Timestamp) return value.toDate();
  if (typeof value === "object" && "toDate" in value && typeof value.toDate === "function") {
    return value.toDate();
  }
  if (typeof value === "string" || typeof value === "number") {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }
  return null;
}

export function valueToIso(value: unknown, fallback = new Date().toISOString()) {
  return valueToDate(value)?.toISOString() ?? fallback;
}

export function valueToMillis(value: unknown) {
  return valueToDate(value)?.getTime() ?? 0;
}

function numberOrZero(value: unknown) {
  const normalized = Number(value);
  return Number.isFinite(normalized) ? normalized : 0;
}

export function mapHiveData(id: string, data: DocumentData): HiveData {
  const ultimaLeitura = data.ultimaLeitura ?? {};

  return {
    id,
    name: data.apelido || data.name || id,
    usuarioId: data.usuarioId,
    status: data.status || "ideal",
    temperaturaNinho: numberOrZero(ultimaLeitura.TempN),
    temperaturaSobreninho: numberOrZero(ultimaLeitura.tempSN),
    umidadeNinho: numberOrZero(ultimaLeitura.umidN),
    umidadeSobreninho: numberOrZero(ultimaLeitura.umidSN),
    ruido: numberOrZero(ultimaLeitura.ruido),
    lum: numberOrZero(ultimaLeitura.lum),
    controls: {
      agua: Boolean(data.controls?.agua),
      racao: Boolean(data.controls?.racao)
    },
    lastFeedingTime: {
      food: data.lastFeedingTime?.food ?? null,
      water: data.lastFeedingTime?.water ?? null
    },
    leituras: Array.isArray(data.leituras) ? data.leituras : [],
    eventos: Array.isArray(data.eventos) ? data.eventos : [],
    lastUpdate: valueToIso(data.atualizadoEm ?? ultimaLeitura.timestamp),
    lastCleaning: valueToIso(data.lastCleaning ?? data.atualizadoEm ?? ultimaLeitura.timestamp)
  };
}

export function mapHiveSnapshot(snapshot: QueryDocumentSnapshot<DocumentData>): HiveData {
  return mapHiveData(snapshot.id, snapshot.data());
}

export function formatReadingLabel(timestamp: unknown, fallback: string) {
  const date = valueToDate(timestamp);
  if (!date) return fallback;

  return date.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  });
}
