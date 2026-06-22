import React from "react";
import { useState, useEffect } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area
} from "recharts";
import { ArrowLeft, Thermometer, Droplets, Volume2, Sun, Droplet, UtensilsCrossed, MoreVertical, Settings as SettingsIcon, Trash2, X, AlertTriangle } from "lucide-react";
import { HiveData } from "./hive-card";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";
import { arrayUnion, doc, onSnapshot, serverTimestamp, Timestamp, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { formatReadingLabel, mapHiveData } from "./firestore-hive";

type MetricId = "tempSN" | "tempN" | "umidadeSN" | "umidadeN" | "noise" | "luminosity";

function getReadingValue(reading: NonNullable<HiveData["leituras"]>[number], metricId: MetricId) {
  const fieldByMetric: Record<MetricId, keyof NonNullable<HiveData["leituras"]>[number]> = {
    tempN: "TempN",
    tempSN: "tempSN",
    umidadeN: "umidN",
    umidadeSN: "umidSN",
    noise: "ruido",
    luminosity: "lum"
  };

  const value = Number(reading[fieldByMetric[metricId]]);
  return Number.isFinite(value) ? value : null;
}

function getMetricSuggestion(metricId: MetricId, value: number) {
  const normalized = Number(value || 0);

  if (metricId === "tempN") {
    if (normalized < 30) return { level: "critical", title: "Temperatura baixa no ninho", message: "Verifique a presença da rainha e das crias. Em friagens, evite abrir a colmeia." };
    if (normalized > 36) return { level: "critical", title: "Temperatura alta no ninho", message: "Aplique sombreamento imediato e resfrie externamente a madeira borrifando água." };
    return { level: "success", title: "Temperatura do ninho adequada", message: "A temperatura do ninho está dentro da faixa esperada para a colmeia." };
  }
  if (metricId === "tempSN") {
    if (normalized < 30) return { level: "warning", title: "Temperatura baixa no sobreninho", message: "Acompanhe a condição térmica geral da colmeia e evite abertura desnecessária." };
    if (normalized > 36) return { level: "warning", title: "Temperatura alta no sobreninho", message: "Melhore o sombreamento e verifique se há excesso de calor externo." };
    return { level: "success", title: "Temperatura do sobreninho estável", message: "O sobreninho está dentro de uma faixa segura de temperatura." };
  }
  if (metricId === "umidadeN") {
    if (normalized < 70) return { level: "warning", title: "Umidade baixa no ninho", message: "Adicione algodão úmido com água limpa em um canto seguro da colmeia." };
    if (normalized > 75) return { level: "warning", title: "Umidade alta no ninho", message: "Melhore a ventilação interna da caixa." };
    return { level: "success", title: "Umidade do ninho ideal", message: "A umidade do ninho está adequada para o desenvolvimento das larvas." };
  }
  if (metricId === "umidadeSN") {
    if (normalized > 60) return { level: "warning", title: "Umidade alta no sobreninho", message: "O excesso pode estar ligado a chuvas. Tente melhorar a ventilação." };
    return { level: "success", title: "Umidade do sobreninho adequada", message: "O sobreninho está abaixo do limite recomendado." };
  }
  if (metricId === "luminosity") {
    if (normalized > 0) return { level: "critical", title: "Luminosidade detectada", message: "Pode indicar fresta ou problema físico na colmeia. Faça uma verificação visual." };
    return { level: "success", title: "Luminosidade zerada", message: "A ausência de luz indica que a colmeia permanece vedada de forma segura." };
  }
  if (metricId === "noise") {
    if (normalized < 200) return { level: "warning", title: "Ruído abaixo do esperado", message: "A colônia pode estar enfraquecida ou inativa. Observe alimentação." };
    if (normalized > 400) return { level: "critical", title: "Ruído elevado", message: "Pode indicar estresse, calor excessivo, predadores ou ausência de rainha." };
    return { level: "success", title: "Ruído dentro da faixa", message: "O nível sonoro está dentro da faixa esperada para atividade da colônia." };
  }
  return null;
}

interface HiveDetailsProps {
  hive: HiveData;
  userId?: string;
  onBack: () => void;
  onOpenSettings?: () => void;
  onDelete?: (id: string) => void | Promise<void>;
  showSobreninho?: boolean;
}

export function HiveDetails({ hive, userId, onBack, onOpenSettings, onDelete, showSobreninho = true }: HiveDetailsProps) {
  // Inicialização segura com fallbacks explícitos
  const [hiveData, setHiveData] = useState<HiveData>(() => ({
    id: hive?.id || "ID_DESCONHECIDO",
    name: hive?.name || "Colmeia",
    temperaturaNinho: typeof hive?.temperaturaNinho === "number" ? hive.temperaturaNinho : 0,
    temperaturaSobreninho: typeof hive?.temperaturaSobreninho === "number" ? hive.temperaturaSobreninho : 0,
    umidadeNinho: typeof hive?.umidadeNinho === "number" ? hive.umidadeNinho : 0,
    umidadeSobreninho: typeof hive?.umidadeSobreninho === "number" ? hive.umidadeSobreninho : 0,
    ruido: typeof hive?.ruido === "number" ? hive.ruido : 0,
    lum: typeof hive?.lum === "number" ? hive.lum : 0,
    lastUpdate: hive?.lastUpdate || new Date().toISOString()
  }));

  const [selectedChart, setSelectedChart] = useState<MetricId | null>("tempN");
  const [isActionsOpen, setIsActionsOpen] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
 
  const [activeControls, setActiveControls] = useState({
    agua: false,
    racao: false
  });

  useEffect(() => {
    setActiveControls({
      agua: hiveData.controls?.agua ?? false,
      racao: hiveData.controls?.racao ?? false
    });
  }, [hiveData.controls?.agua, hiveData.controls?.racao]);

  useEffect(() => {
    if (!showSobreninho && (selectedChart === "tempSN" || selectedChart === "umidadeSN")) {
      setSelectedChart("tempN");
    }
  }, [selectedChart, showSobreninho]);

  // --- ESCUTA EM TEMPO REAL COM O FIRESTORE ---
  useEffect(() => {
    if (!hive?.id) return;

    const hiveRef = doc(db, "colmeias", hive.id);

    const unsubscribe = onSnapshot(hiveRef, (snapshot) => {
      if (!snapshot.exists()) return;

      const data = snapshot.data();
      if (userId && data.usuarioId !== userId) {
        console.warn("Acesso bloqueado: colmeia pertence a outro usuário.");
        onBack();
        return;
      }

      setHiveData(mapHiveData(snapshot.id, data));
    }, (error) => {
      console.error("Erro Firestore Detalhes:", error);
    });

    return () => unsubscribe();
  }, [hive?.id, onBack, userId]);

  // --- ATUADORES DE ENTRADA DO FIRESTORE (2 SEGUNDOS ATIVOS) ---
  const toggleFirebaseControl = async (controlName: "agua" | "racao") => {
    if (!hiveData.id) return;
    if (userId && hiveData.usuarioId !== userId) return;

    const feedingKey = controlName === "agua" ? "water" : "food";
    const hiveRef = doc(db, "colmeias", hiveData.id);

    try {
      setActiveControls(prev => ({ ...prev, [controlName]: true }));
      await updateDoc(hiveRef, {
        [`controls.${controlName}`]: true,
        [`lastFeedingTime.${feedingKey}`]: Timestamp.now(),
        eventos: arrayUnion({
          tipo: controlName,
          acao: true,
          timestamp: Timestamp.now(),
          origem: "app"
        }),
        atualizadoEm: serverTimestamp()
      });

      setTimeout(async () => {
        try {
          await updateDoc(hiveRef, {
            [`controls.${controlName}`]: false,
            eventos: arrayUnion({
              tipo: controlName,
              acao: false,
              timestamp: Timestamp.now(),
              origem: "app"
            }),
            atualizadoEm: serverTimestamp()
          });
        } finally {
          setActiveControls(prev => ({ ...prev, [controlName]: false }));
        }
      }, 2000);

    } catch (error) {
      console.error(`Erro Atuador ${controlName}:`, error);
    }
  };

  // Garante valores numéricos válidos antes de aplicar qualquer formatação como .toFixed()
  const vTempN = typeof hiveData.temperaturaNinho === "number" ? hiveData.temperaturaNinho : 0;
  const vTempSN = typeof hiveData.temperaturaSobreninho === "number" ? hiveData.temperaturaSobreninho : 0;
  const vUmidN = typeof hiveData.umidadeNinho === "number" ? hiveData.umidadeNinho : 0;
  const vUmidSN = typeof hiveData.umidadeSobreninho === "number" ? hiveData.umidadeSobreninho : 0;
  const vRuido = typeof hiveData.ruido === "number" ? hiveData.ruido : 0;
  const vLum = typeof hiveData.lum === "number" ? hiveData.lum : 0;

  const metrics = [
    {
      id: "tempN" as const,
      label: "Temperatura Ninho",
      icon: Thermometer,
      value: vTempN,
      formattedValue: `${vTempN.toFixed(1)}°C`,
      unit: "°C",
      chartType: "area",
      base: 34,
      hexColor: "#f97316",
      bgSelected: "bg-orange-500/10 border-orange-500 ring-orange-500/20 text-orange-600",
      iconColor: "text-orange-500"
    },
    {
      id: "tempSN" as const,
      label: "Temperatura S. Ninho",
      icon: Thermometer,
      value: vTempSN,
      formattedValue: `${vTempSN.toFixed(1)}°C`,
      unit: "°C",
      chartType: "area",
      base: 32,
      hexColor: "#ef4444",
      bgSelected: "bg-red-500/10 border-red-500 ring-red-500/20 text-red-600",
      iconColor: "text-red-500"
    },
    {
      id: "umidadeN" as const,
      label: "Umidade Ninho",
      icon: Droplets,
      value: vUmidN,
      formattedValue: `${vUmidN.toFixed(1)}%`,
      unit: "%",
      chartType: "area",
      base: 72,
      hexColor: "#3b82f6",
      bgSelected: "bg-blue-500/10 border-blue-500 ring-blue-500/20 text-blue-600",
      iconColor: "text-blue-500"
    },
    {
      id: "umidadeSN" as const,
      label: "Umidade S. Ninho",
      icon: Droplets,
      value: vUmidSN,
      formattedValue: `${vUmidSN.toFixed(1)}%`,
      unit: "%",
      chartType: "area",
      base: 55,
      hexColor: "#1d4ed8",
      bgSelected: "bg-indigo-500/10 border-indigo-500 ring-indigo-500/20 text-indigo-600",
      iconColor: "text-blue-700"
    },
    {
      id: "noise" as const,
      label: "Ruído",
      icon: Volume2,
      value: vRuido,
      formattedValue: `${vRuido.toFixed(0)} dB`,
      unit: "dB",
      chartType: "line",
      base: 300,
      hexColor: "#a855f7",
      bgSelected: "bg-purple-500/10 border-purple-500 ring-purple-500/20 text-purple-600",
      iconColor: "text-purple-500"
    },
    {
      id: "luminosity" as const,
      label: "Luz",
      icon: Sun,
      value: vLum,
      formattedValue: `${vLum.toFixed(0)} lux`,
      unit: "lux",
      chartType: "line",
      base: 0,
      hexColor: "#eab308",
      bgSelected: "bg-amber-500/10 border-amber-500 ring-amber-500/20 text-amber-600",
      iconColor: "text-yellow-500"
    },
  ].filter((metric) => showSobreninho || (metric.id !== "tempSN" && metric.id !== "umidadeSN"));

  const selectedMetric = selectedChart ? metrics.find((m) => m.id === selectedChart) : null;
  const selectedSuggestion = selectedMetric ? getMetricSuggestion(selectedMetric.id, selectedMetric.value) : null;

  const chartHistory = selectedMetric
    ? (hiveData.leituras ?? [])
        .map((reading, idx) => ({
          day: formatReadingLabel(reading.timestamp, `Leitura ${idx + 1}`),
          valor: getReadingValue(reading, selectedMetric.id)
        }))
        .filter((item): item is { day: string; valor: number } => item.valor !== null)
    : [];

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black text-zinc-900 dark:text-zinc-100 pb-20 transition-colors duration-500">
      <div className="max-w-7xl mx-auto px-4 py-6 sm:py-10 space-y-8">
       
        {/* Topo com botão de voltar */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4 min-w-0">
            <button
              onClick={onBack}
              className="p-3 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors shadow-sm shrink-0"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="min-w-0">
              <h1 className="text-3xl font-black tracking-tight truncate">{hiveData.name}</h1>
              <p className="text-xs font-mono text-zinc-500 uppercase tracking-wider truncate">Firebase Conectado • REF: {hiveData.id}</p>
            </div>
          </div>
          <div className="relative shrink-0">
            <button
              onClick={() => setIsActionsOpen((current) => !current)}
              className="p-3 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors shadow-sm"
              aria-label="Abrir ações da colmeia"
            >
              <MoreVertical className="w-5 h-5" />
            </button>

            {isActionsOpen && (
              <div className="absolute right-0 top-14 z-40 w-56 overflow-hidden rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 shadow-2xl shadow-zinc-900/15">
                <button
                  onClick={() => {
                    setIsActionsOpen(false);
                    onOpenSettings?.();
                  }}
                  className="w-full flex items-center gap-3 px-4 py-3 text-left text-[11px] font-black uppercase tracking-widest text-zinc-700 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-900"
                >
                  <SettingsIcon className="w-4 h-4 text-amber-500" />
                  Configurações
                </button>
                {onDelete && (
                  <button
                    onClick={() => {
                      setIsActionsOpen(false);
                      setShowDeleteConfirm(true);
                    }}
                    className="w-full flex items-center gap-3 px-4 py-3 text-left text-[11px] font-black uppercase tracking-widest text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 border-t border-zinc-100 dark:border-zinc-900"
                  >
                    <Trash2 className="w-4 h-4" />
                    Apagar Colmeia
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Módulos de Métrica */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {metrics.map((metric) => {
            const Icon = metric.icon;
            const isSelected = selectedChart === metric.id;
            return (
              <button
                key={metric.id}
                onClick={() => setSelectedChart(isSelected ? null : metric.id)}
                className={cn(
                  "p-5 rounded-3xl border text-left transition-all space-y-3 relative overflow-hidden shadow-sm",
                  isSelected
                    ? metric.bgSelected + " ring-2"
                    : "bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-900 hover:border-zinc-300 dark:hover:border-zinc-800"
                )}
              >
                <div className="flex items-center justify-between">
                  <Icon className={cn("w-5 h-5", isSelected ? "" : "text-zinc-400")} style={{ color: isSelected ? metric.hexColor : undefined }} />
                  <span className="text-[9px] font-mono font-bold text-zinc-400 uppercase">{metric.unit}</span>
                </div>
                <div>
                  <p className="text-[9px] uppercase font-bold text-zinc-400 tracking-wider truncate">{metric.label}</p>
                  <p className={cn("text-2xl font-black tracking-tight", isSelected ? "" : "text-zinc-900 dark:text-white")}>
                    {metric.formattedValue}
                  </p>
                </div>
              </button>
            );
          })}
        </div>

        {/* CONTAINER DO GRÁFICO DINÂMICO */}
        {selectedChart && selectedMetric && (
          <ChartContainer title={selectedMetric.label} subtitle={`Histórico carregado do Firestore`}>
            <div className="h-72 w-full pt-4">
              {chartHistory.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  {selectedMetric.chartType === "area" ? (
                    <AreaChart data={chartHistory}>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                      <XAxis dataKey="day" stroke="#71717a" fontSize={11} tickLine={false} />
                      <YAxis stroke="#71717a" fontSize={11} tickLine={false} domain={['auto', 'auto']} />
                      <Tooltip contentStyle={{ background: '#18181b', borderRadius: '1rem', border: 'none', color: '#fff' }} />
                      <Area
                        type="monotone"
                        dataKey="valor"
                        name={selectedMetric.label}
                        stroke={selectedMetric.hexColor}
                        fill="url(#colorDynamicMetric)"
                        strokeWidth={3}
                      />
                      <defs>
                        <linearGradient id="colorDynamicMetric" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={selectedMetric.hexColor} stopOpacity={0.2}/>
                          <stop offset="95%" stopColor={selectedMetric.hexColor} stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                    </AreaChart>
                  ) : (
                    <LineChart data={chartHistory}>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                      <XAxis dataKey="day" stroke="#71717a" fontSize={11} tickLine={false} />
                      <YAxis stroke="#71717a" fontSize={11} tickLine={false} domain={['auto', 'auto']} />
                      <Tooltip contentStyle={{ background: '#18181b', borderRadius: '1rem', border: 'none', color: '#fff' }} />
                      <Line
                        type="monotone"
                        dataKey="valor"
                        name={selectedMetric.label}
                        stroke={selectedMetric.hexColor}
                        strokeWidth={3}
                        dot={{ r: 4, fill: selectedMetric.hexColor }}
                      />
                    </LineChart>
                  )}
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-xs font-bold uppercase tracking-wider text-zinc-400">
                  Sem histórico registrado no banco
                </div>
              )}
            </div>

            {/* SUGESTÃO DE INTELIGÊNCIA */}
            {selectedSuggestion && (
              <div className={cn(
                "p-4 rounded-2xl border-2 transition-all",
                selectedSuggestion.level === "critical" ? "bg-red-50 border-red-200 text-red-900" :
                selectedSuggestion.level === "warning" ? "bg-amber-50 border-amber-200 text-amber-900" :
                "bg-emerald-50 border-emerald-200 text-emerald-900"
              )}>
                <h4 className="text-xs font-black uppercase tracking-wider mb-1">{selectedSuggestion.title}</h4>
                <p className="text-xs opacity-90 leading-relaxed">{selectedSuggestion.message}</p>
              </div>
            )}
          </ChartContainer>
        )}

        {/* COMANDOS RÁPIDOS */}
        <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-900 p-6 rounded-[2rem] space-y-4 shadow-sm">
          <div>
            <h3 className="text-lg font-black tracking-tight">Comandos Rápidos de Campo</h3>
            <p className="text-xs text-zinc-500">Ativação direta de atuadores no Firestore (2 segundos ativos)</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <button
              onClick={() => toggleFirebaseControl('agua')}
              className={cn(
                "flex items-center justify-center gap-3 p-4 rounded-2xl border-2 font-bold uppercase text-xs tracking-wider transition-all active:scale-95",
                activeControls.agua
                  ? "bg-blue-500 text-white border-blue-600"
                  : "bg-zinc-50 text-blue-500 border-zinc-100 hover:border-blue-200 dark:bg-zinc-900 dark:border-zinc-800"
              )}
            >
              <Droplet className="w-5 h-5 stroke-[2.2]" />
              {activeControls.agua ? "Água Injetada" : "Injetar Água"}
            </button>

            <button
              onClick={() => toggleFirebaseControl('racao')}
              className={cn(
                "flex items-center justify-center gap-3 p-4 rounded-2xl border-2 font-bold uppercase text-xs tracking-wider transition-all active:scale-95",
                activeControls.racao
                  ? "bg-amber-500 text-white border-amber-600"
                  : "bg-zinc-50 text-amber-500 border-zinc-100 hover:border-amber-200 dark:bg-zinc-900 dark:border-zinc-800"
              )}
            >
              <UtensilsCrossed className="w-5 h-5 stroke-[2.2]" />
              {activeControls.racao ? "Alimento Injetado" : "Injetar Ração"}
            </button>
          </div>
        </div>

      </div>

      {showDeleteConfirm && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowDeleteConfirm(false)}
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 12 }}
            className="relative w-full max-w-sm bg-white dark:bg-zinc-950 border border-red-200 dark:border-red-900/60 rounded-3xl p-6 shadow-2xl"
          >
            <button
              onClick={() => setShowDeleteConfirm(false)}
              className="absolute right-4 top-4 p-2 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
              aria-label="Fechar confirmação"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="w-12 h-12 rounded-2xl bg-red-500/10 text-red-500 flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h3 className="text-base font-black text-center text-zinc-900 dark:text-white uppercase tracking-wider mb-2">Apagar colmeia?</h3>
            <p className="text-xs text-zinc-500 text-center leading-relaxed mb-6">
              A unidade {hiveData.name} será removida do banco junto com o vínculo da sua conta.
            </p>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="h-11 rounded-xl bg-zinc-100 dark:bg-zinc-900 text-zinc-700 dark:text-zinc-200 text-[10px] font-black uppercase tracking-widest"
              >
                Cancelar
              </button>
              <button
                onClick={async () => {
                  await onDelete?.(hiveData.id);
                  setShowDeleteConfirm(false);
                  onBack();
                }}
                className="h-11 rounded-xl bg-red-500 text-white text-[10px] font-black uppercase tracking-widest shadow-lg shadow-red-500/20"
              >
                Apagar
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}

interface ChartContainerProps {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}

function ChartContainer({ title, subtitle, children }: ChartContainerProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-900 p-6 rounded-[2rem] space-y-4 shadow-sm"
    >
      <div>
        <h3 className="text-lg font-black text-zinc-900 dark:text-white tracking-tight">{title}</h3>
        <p className="text-xs text-zinc-500">{subtitle}</p>
      </div>
      {children}
    </motion.div>
  );
}
