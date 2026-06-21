import React, { useState, useEffect } from "react";
import { Thermometer, Droplets, Volume2, Sun, CheckCircle2, Droplet, UtensilsCrossed } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "motion/react";
import { ref, set, onValue } from "firebase/database";
import { db } from "@/lib/firebase";

// ID fixo conforme sua imagem para garantir a conexão
const USER_ID = "krMVeLw23JZeovrdoMPCpI4lyzD2";

export interface HiveData {
  id: string; // Ex: "MEL-001"
  name: string;
  temperaturaSobreninho: number;
  temperaturaNinho: number;
  umidadeSobreninho: number;
  umidadeNinho: number;
  ruido: number;
  lum: number;
  status: "ideal" | "attention" | "critical";
  lastUpdate: string;
  lastCleaning: string;
}

interface HiveCardProps {
  hive: HiveData;
  onViewDetails: (hive: HiveData) => void;
  onDelete?: (id: string) => void;
  onConfirmCleaning?: (id: string) => void;
}

function isCritical(label: string, value: number) {
  const key = label
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();

  if (key === "ninho") return value < 30 || value > 36;
  if (key === "s. ninho" || key === "s ninho") return value < 30 || value > 36;
  if (key === "umid. n" || key === "umid n") return value < 70 || value > 75;
  if (key === "umid. sn" || key === "umid sn") return value > 60;
  if (key === "ruido") return value < 200 || value > 400;
  if (key === "luz") return value > 0;
  return false;
}

function getCriticalStatus(label: string, value: number) {
  const key = label
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();

  if (key === "ninho" || key === "s. ninho" || key === "s ninho") return value > 36 ? "ALTA" : "BAIXA";
  if (key === "umid. n" || key === "umid n") return value > 75 ? "ALTA" : "BAIXA";
  if (key === "umid. sn" || key === "umid sn") return "ALTA";
  if (key === "ruido") return value > 400 ? "ALTO" : "BAIXO";
  if (key === "luz") return "EXPOSTA";
  return "";
}

export function HiveCard({ hive, onViewDetails, onDelete, onConfirmCleaning }: HiveCardProps) {
  const [currentTime, setCurrentTime] = useState(new Date());
 
  // Estado para Sensores (Output)
  const [sensorData, setSensorData] = useState({
    TempN: 0,
    tempSN: 0,
    umidN: 0,
    umidSN: 0,
    ruido: 0,
    lum: 0
  });

  // Estado visual para os botões (Input)
  const [activeControls, setActiveControls] = useState({
    agua: false,
    racao: false
  });

  // --- 1. LISTENER EM TEMPO REAL (OUTPUT) ---
  useEffect(() => {
    const sensorRef = ref(db, `usuarios/${USER_ID}/${hive.id}/Output`);

    const unsubscribe = onValue(sensorRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        setSensorData({
          TempN: data.TempN || 0,
          tempSN: data.tempSN || 0,
          umidN: data.umidN || 0,
          umidSN: data.umidSN || 0,
          ruido: data.ruido || 0,
          lum: data.lum || 0
        });
      }
    }, (error) => {
      console.error("Erro no listener de sensores:", error);
    });

    return () => unsubscribe();
  }, [hive.id]);

  // --- 2. CONTROLE DOS BOTÕES (INPUT) ---
  const toggleControl = async (controlName: "agua" | "racao", e: React.MouseEvent) => {
    e.stopPropagation(); // Impede que o clique abra a tela de gráficos
   
    const controlRef = ref(db, `usuarios/${USER_ID}/${hive.id}/Input/${controlName}`);

    try {
      await set(controlRef, true);
      setActiveControls(prev => ({ ...prev, [controlName]: true }));

      setTimeout(async () => {
        await set(controlRef, false);
        setActiveControls(prev => ({ ...prev, [controlName]: false }));
      }, 2000);

    } catch (error) {
      console.error(`Erro ao acionar ${controlName}:`, error);
    }
  };

  // --- LÓGICA DE HIGIENE ---
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  const lastCleaningDate = new Date(hive.lastCleaning || new Date()).getTime();
  const hoursSinceCleaning = (currentTime.getTime() - lastCleaningDate) / (1000 * 60 * 60);
 
  // Dispara o aviso vermelho com mais de 48h (2 dias)
  const isOverdue = hoursSinceCleaning >= 48;

  const formatTimeSinceCleaning = () => {
    const diffInHours = Math.floor(hoursSinceCleaning);
    if (diffInHours < 24) return `${diffInHours}h`;
    const days = Math.floor(diffInHours / 24);
    return `${days}d ${diffInHours % 24}h`;
  };

  const hasCriticalSensor =
    isCritical("Ninho", sensorData.TempN) ||
    isCritical("S. Ninho", sensorData.tempSN) ||
    isCritical("Umid. N", sensorData.umidN) ||
    isCritical("Umid. SN", sensorData.umidSN) ||
    isCritical("Ruído", sensorData.ruido) ||
    isCritical("Luz", sensorData.lum);

  const showAlert = isOverdue || hasCriticalSensor;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4, scale: 1.01 }} // Efeito visual de flutuação premium
      onClick={() => onViewDetails(hive)} // Torna o Card clicável para ver os gráficos
      className="relative group cursor-pointer select-none"
    >
      <div className={cn(
        "bg-white border-2 rounded-3xl p-6 space-y-4 shadow-md transition-all group-hover:shadow-xl",
        showAlert ? "border-red-500/40 shadow-red-50" : "border-amber-200 group-hover:border-amber-300"
      )}>
       
        {/* Nome e Status */}
        <div className="flex justify-between items-start">
          <div>
            <h3 className="text-xl font-black text-zinc-900 tracking-tight group-hover:text-amber-500 transition-colors">
              {hive.name}
            </h3>
            <p className="text-xs font-mono text-zinc-500 tracking-tighter">REF: {hive.id}</p>
          </div>
          <div className={cn(
            "px-2 py-1 rounded-md text-[10px] font-bold tracking-wider",
            showAlert ? "bg-red-100 text-red-600 animate-pulse" : "bg-emerald-100 text-emerald-600"
          )}>
            {isOverdue ? "MANUTENÇÃO" : hasCriticalSensor ? "ATENÇÃO" : "ONLINE"}
          </div>
        </div>

        {/* GRID DE SENSORES */}
        <div className="grid grid-cols-2 gap-3">
          <SensorItem label="Ninho" val={sensorData.TempN} color="orange" unit="°C" icon={<Thermometer className="w-6 h-6 text-orange-500" />} />
          <SensorItem label="S. Ninho" val={sensorData.tempSN} color="orange" unit="°C" icon={<Thermometer className="w-6 h-6 text-red-500" />} />
          <SensorItem label="Umid. N" val={sensorData.umidN} color="blue" unit="%" icon={<Droplets className="w-6 h-6 text-blue-500" />} />
          <SensorItem label="Umid. SN" val={sensorData.umidSN} color="darkBlue" unit="%" icon={<Droplets className="w-6 h-6 text-blue-700" />} />
          <SensorItem label="Ruído" val={sensorData.ruido} unit="dB" color="purple" icon={<Volume2 className="w-6 h-6 text-purple-500" />} />
          <SensorItem label="Luz" val={sensorData.lum} unit="lux" color="yellow" icon={<Sun className="w-6 h-6 text-yellow-500" />} />
        </div>

        {/* CONTROLES (INPUT) */}
        <div className="grid grid-cols-2 gap-3 pt-2">
          <button
            onClick={(e) => toggleControl('agua', e)}
            className={cn(
              "flex flex-col items-center p-3 rounded-2xl border-2 transition-all active:scale-95",
              activeControls.agua ? "bg-blue-500 text-white border-blue-600" : "bg-zinc-50 text-blue-500 border-zinc-100 hover:border-blue-200"
            )}
          >
            <Droplet className="w-8 h-8 mb-2 stroke-[2.2]" />
            <span className="text-[10px] font-bold uppercase">Água</span>
          </button>

          <button
            onClick={(e) => toggleControl('racao', e)}
            className={cn(
              "flex flex-col items-center p-3 rounded-2xl border-2 transition-all active:scale-95",
              activeControls.racao ? "bg-amber-500 text-white border-amber-600" : "bg-zinc-50 text-amber-500 border-zinc-100 hover:border-amber-200"
            )}
          >
            <UtensilsCrossed className="w-8 h-8 mb-2 stroke-[2.2]" />
            <span className="text-[10px] font-bold uppercase">Ração</span>
          </button>
        </div>

        {/* Higiene */}
        <div className={cn("p-4 rounded-2xl border-2 transition-colors", isOverdue ? "bg-red-50 border-red-100" : "bg-zinc-50 border-zinc-100")}>
          <div className="flex justify-between items-center">
            <div>
              <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider">Última Limpeza</p>
              <p className={cn("text-lg font-black", isOverdue ? "text-red-600" : "text-zinc-700")}>{formatTimeSinceCleaning()}</p>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation(); // Impede o redirecionamento ao confirmar limpeza
                onConfirmCleaning?.(hive.id);
              }}
              className="p-2 bg-white rounded-xl shadow-sm hover:bg-zinc-100 transition-colors border border-zinc-100"
            >
              <CheckCircle2 className={cn("w-5 h-5", isOverdue ? "text-red-500" : "text-zinc-400")} />
            </button>
          </div>
        </div>

      </div>
    </motion.div>
  );
}

const styles = {
  orange: "bg-orange-50 border-orange-200",
  red: "bg-red-50 border-red-200",
  blue: "bg-blue-50 border-blue-200",
  darkBlue: "bg-indigo-50 border-indigo-200",
  purple: "bg-purple-50 border-purple-200",
  yellow: "bg-amber-50 border-amber-200",
};

const textStyles = {
  orange: "text-orange-600",
  red: "text-red-600",
  blue: "text-blue-600",
  darkBlue: "text-indigo-600",
  purple: "text-purple-600",
  yellow: "text-amber-600",
};

type SensorColor = "orange" | "red" | "blue" | "darkBlue" | "purple" | "yellow";

interface SensorItemProps {
  label: string;
  val: number;
  unit: string;
  icon: React.ReactNode;
  color: SensorColor;
}

function SensorItem({ label, val, unit, icon, color }: SensorItemProps) {
  const critical = isCritical(label, val ?? 0);
  const criticalType = getCriticalStatus(label, val ?? 0);

  return (
    <div className={cn(
      "p-3 rounded-2xl border transition-all relative overflow-hidden",
      critical ? "bg-red-50 border-red-300 shadow-sm shadow-red-50" : styles[color]
    )}>
      {critical && (
        <span className="absolute top-2 right-2 text-[8px] font-black bg-red-600 text-white px-1 rounded">
          {criticalType}
        </span>
      )}

      <div className="flex items-center gap-1.5 mb-3">
        {icon}
        <span className="text-[9px] font-bold text-zinc-500 uppercase truncate">{label}</span>
      </div>

      <div className="flex items-baseline gap-1">
        <span className={cn("text-md font-black", critical ? "text-red-600" : textStyles[color])}>
          {(val ?? 0).toFixed(1)}
        </span>
        <span className="text-[9px] font-bold text-zinc-400">{unit}</span>
      </div>
    </div>
  );
}
