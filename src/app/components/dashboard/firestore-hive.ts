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
  const leituras = Array.isArray(data.leituras) ? data.leituras : [];
  const lastReading = leituras.length > 0 ? leituras[leituras.length - 1] : {};

  const read = (field: string) => {
    const v = ultimaLeitura[field];
    if (v !== undefined && v !== null) return numberOrZero(v);
    return numberOrZero(lastReading[field]);
  };

  return {
    id,
    name: data.apelido || data.name || id,
    usuarioId: data.usuarioId,
    status: data.status || "ideal",
    temperaturaNinho: read("TempN"),
    temperaturaSobreninho: read("tempSN"),
    umidadeNinho: read("umidN"),
    umidadeSobreninho: read("umidSN"),
    ruido: read("ruido"),
    lum: read("lum"),
    controls: {
      agua: Boolean(data.controls?.agua),
      racao: Boolean(data.controls?.racao)
    },
    winterMode: {
      enabled: Boolean(data.winterMode?.enabled),
      time: typeof data.winterMode?.time === "string" ? data.winterMode.time : "06:00",
      activeUntilMonth: numberOrZero(data.winterMode?.activeUntilMonth) || 5,
      waterDurationMs: numberOrZero(data.winterMode?.waterDurationMs) || 2000,
      foodDurationMs: numberOrZero(data.winterMode?.foodDurationMs) || 3000,
      lastRunDate: typeof data.winterMode?.lastRunDate === "string" ? data.winterMode.lastRunDate : undefined,
      autoDisabledAt: data.winterMode?.autoDisabledAt ?? null
    },
    lastFeedingTime: {
      food: data.lastFeedingTime?.food ?? null,
      water: data.lastFeedingTime?.water ?? null
    },
    leituras,
    eventos: Array.isArray(data.eventos) ? data.eventos : [],
    lastUpdate: valueToIso(data.atualizadoEm ?? ultimaLeitura.timestamp ?? lastReading.timestamp),
    lastCleaning: valueToIso(data.lastCleaning ?? data.atualizadoEm ?? ultimaLeitura.timestamp ?? lastReading.timestamp)
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
