import React, { useState, useEffect } from "react";
import { HiveData } from "./hive-card";
import { Thermometer, Droplets, Volume2, Sun, ChevronRight, Activity, Trash2, Zap, CheckCircle2, Clock, AlertCircle, Droplet, UtensilsCrossed } from "lucide-react";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";
import { ref, set, onValue } from "firebase/database";
import { db } from "@/lib/firebase";

interface HiveListRowProps {
  hive: HiveData;
  onViewDetails: (hive: HiveData) => void;
  onDelete?: (id: string) => void;
  onConfirmCleaning?: (id: string) => void;
}

export function HiveListRow({ hive, onViewDetails, onDelete, onConfirmCleaning }: HiveListRowProps) {
  const [controls, setControls] = useState({
    water: false,
    food: false,
    ...hive.controls
  });

  // Sincronizar com Firebase
  useEffect(() => {
    const controlsRef = ref(db, `hives/${hive.id}/controls`);
    const unsubscribe = onValue(controlsRef, (snapshot) => {
      if (snapshot.exists()) {
        setControls(prev => ({ ...prev, ...snapshot.val() }));
      }
    });
    return () => unsubscribe();
  }, [hive.id]);

  const toggleControl = async (controlName: keyof typeof controls, e: React.MouseEvent) => {
    e.stopPropagation();
    const newValue = !controls[controlName];
    const updatedControls = { ...controls, [controlName]: newValue };
    setControls(updatedControls);
    
    // Salvar no localStorage como backup
    try {
      const storageKey = `hive_${hive.id}_controls`;
      const feedingTimeKey = `hive_${hive.id}_feedingTime`;
      
      localStorage.setItem(storageKey, JSON.stringify(updatedControls));
      
      if (newValue) {
        const feedingTimes = JSON.parse(localStorage.getItem(feedingTimeKey) || '{}');
        feedingTimes[controlName] = Date.now();
        localStorage.setItem(feedingTimeKey, JSON.stringify(feedingTimes));
      }
    } catch (error) {
      console.error("Erro ao salvar no localStorage:", error);
    }
    
    // Tentar enviar para Firebase (opcional se houver permissão)
    try {
      await set(ref(db, `hives/${hive.id}/controls/${controlName}`), newValue);
      
      // Se estiver ligando o controle, salvar o timestamp
      if (newValue) {
        await set(ref(db, `hives/${hive.id}/lastFeedingTime/${controlName}`), Date.now());
      }
    } catch (error) {
      // Silenciar erro do Firebase - já salvamos no localStorage
      console.log(`Controle ${controlName} salvo localmente (Firebase offline)`);
    }
  };

  const statusConfig = {
    ideal: { 
      dot: "bg-emerald-500", 
      label: "OPERACIONAL",
      text: "text-emerald-500",
      bg: "bg-emerald-500/10",
      border: "border-emerald-500/30"
    },
    attention: { 
      dot: "bg-amber-500", 
      label: "ATENÇÃO",
      text: "text-amber-500",
      bg: "bg-amber-500/10",
      border: "border-amber-500/30"
    },
    critical: { 
      dot: "bg-red-500", 
      label: "CRÍTICO",
      text: "text-red-500",
      bg: "bg-red-500/10",
      border: "border-red-500/30"
    }
  };

  const getTimeSinceCleaning = () => {
    const last = new Date(hive.lastCleaning);
    const now = new Date();
    const diffInMs = now.getTime() - last.getTime();
    
    const days = Math.floor(diffInMs / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diffInMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diffInMs % (1000 * 60 * 60)) / (1000 * 60));
    
    return { days, hours, minutes, totalHours: diffInMs / (1000 * 60 * 60) };
  };

  const formatTimeSinceCleaning = () => {
    const { days, hours, minutes } = getTimeSinceCleaning();
    
    if (days >= 30) {
      const months = Math.floor(days / 30);
      const remainingDays = days % 30;
      if (remainingDays > 0) {
        return `${months}m ${remainingDays}d`;
      }
      return `${months} ${months === 1 ? 'mês' : 'meses'}`;
    }
    
    if (days > 0) {
      return `${days}d ${hours}h`;
    }
    
    if (hours > 0) {
      return `${hours}h`;
    }
    
    return `${minutes}m`;
  };

  const config = statusConfig[hive.status];
  const { totalHours } = getTimeSinceCleaning();
  const isOverdue = totalHours > 72;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ x: 4, scale: 1.01 }}
      onClick={() => onViewDetails(hive)}
      className="relative group"
    >
      {/* Glow effect on hover */}
      <div className={cn(
        "absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-xl",
        isOverdue ? "bg-red-500/20" : "bg-[#FFA500]/20"
      )} />

      <div
        className={cn(
          "relative bg-gradient-to-r from-amber-50/80 via-white to-yellow-50/60 border-2 p-6 rounded-2xl flex items-center justify-between gap-6 transition-all duration-300 cursor-pointer shadow-md",
          isOverdue 
            ? "border-red-500/40 hover:border-red-500/60 hover:shadow-red-500/10" 
            : "border-amber-200 hover:border-[#FFA500]/60 hover:shadow-lg hover:shadow-[#FFA500]/10"
        )}
      >
        {/* Subtle hexagon pattern */}
        <div className="absolute top-0 right-0 w-32 h-full opacity-[0.03] pointer-events-none overflow-hidden rounded-r-2xl">
          <svg viewBox="0 0 100 100" className="w-full h-full">
            <defs>
              <pattern id={`hex-list-${hive.id}`} x="0" y="0" width="30" height="30" patternUnits="userSpaceOnUse">
                <polygon points="15,3 24,9 24,21 15,27 6,21 6,9" fill="none" stroke="currentColor" strokeWidth="0.5"/>
              </pattern>
            </defs>
            <rect width="100" height="100" fill={`url(#hex-list-${hive.id})`}/>
          </svg>
        </div>

        {/* Gradient accent bar */}
        <div className={cn(
          "absolute left-0 top-0 bottom-0 w-1.5 rounded-l-2xl",
          isOverdue 
            ? "bg-gradient-to-b from-red-500 via-red-400 to-red-500" 
            : "bg-gradient-to-b from-[#FFA500] via-[#FFB520] to-[#FFA500]"
        )} />

        {/* COLUNA 1: Nome e Status */}
        <div className="flex items-center gap-4 min-w-[200px] relative z-10">
          <div className="flex flex-col items-center gap-2">
            <div className={cn("w-3 h-3 rounded-full animate-pulse shadow-lg", config.dot, config.dot.replace('bg-', 'shadow-'))} />
            <div className="h-8 w-[2px] bg-gradient-to-b from-[#FFA500]/40 to-transparent" />
          </div>
          <div>
            <h3 className="text-lg font-black text-black mb-1 tracking-tight">{hive.name}</h3>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-zinc-500 font-mono uppercase tracking-wider">ID: {hive.id}</span>
              <span className={cn(
                "text-[8px] px-2 py-1 rounded-md font-black uppercase tracking-wider border",
                config.bg, config.text, config.border
              )}>
                {config.label}
              </span>
            </div>
          </div>
        </div>

        {/* COLUNA 2: Métricas Compactas */}
        <div className="hidden lg:flex items-center gap-6 flex-1 relative z-10">
          <div className="flex items-center gap-2 px-3 py-2 bg-orange-500/10 border border-orange-500/20 rounded-xl">
            <div className="w-8 h-8 bg-orange-500/20 rounded-lg flex items-center justify-center">
              <Thermometer className="w-4 h-4 text-orange-600" />
            </div>
            <div>
              <span className="text-xs font-bold text-orange-600 block">{hive.temperature.toFixed(1)}°C</span>
              <span className="text-[8px] text-zinc-500 uppercase tracking-wider">Temp</span>
            </div>
          </div>
          <div className="flex items-center gap-2 px-3 py-2 bg-blue-500/10 border border-blue-500/20 rounded-xl">
            <div className="w-8 h-8 bg-blue-500/20 rounded-lg flex items-center justify-center">
              <Droplets className="w-4 h-4 text-blue-600" />
            </div>
            <div>
              <span className="text-xs font-bold text-blue-600 block">{hive.humidity.toFixed(0)}%</span>
              <span className="text-[8px] text-zinc-500 uppercase tracking-wider">Umid</span>
            </div>
          </div>
          <div className="flex items-center gap-2 px-3 py-2 bg-purple-500/10 border border-purple-500/20 rounded-xl">
            <div className="w-8 h-8 bg-purple-500/20 rounded-lg flex items-center justify-center">
              <Volume2 className="w-4 h-4 text-purple-600" />
            </div>
            <div>
              <span className="text-xs font-bold text-purple-600 block">{hive.noise.toFixed(0)}dB</span>
              <span className="text-[8px] text-zinc-500 uppercase tracking-wider">Ruído</span>
            </div>
          </div>
          <div className="flex items-center gap-2 px-3 py-2 bg-yellow-500/10 border border-yellow-500/20 rounded-xl">
            <div className="w-8 h-8 bg-yellow-500/20 rounded-lg flex items-center justify-center">
              <Sun className="w-4 h-4 text-yellow-600" />
            </div>
            <div>
              <span className="text-xs font-bold text-yellow-600 block">{hive.luminosity.toFixed(0)}lx</span>
              <span className="text-[8px] text-zinc-500 uppercase tracking-wider">Luz</span>
            </div>
          </div>
        </div>

        {/* COLUNA 2.5: Controles Compactos */}
        <div className="hidden xl:flex items-center gap-2 relative z-10">
          <button
            onClick={(e) => toggleControl("water", e)}
            className={cn(
              "p-2 rounded-lg transition-all duration-300 border",
              controls.water
                ? "bg-cyan-500/20 border-cyan-500/50 text-cyan-600"
                : "bg-white border-zinc-200 text-zinc-400 hover:border-zinc-300"
            )}
            title="Água"
          >
            <Droplet className="w-4 h-4" />
          </button>
          <button
            onClick={(e) => toggleControl("food", e)}
            className={cn(
              "p-2 rounded-lg transition-all duration-300 border",
              controls.food
                ? "bg-red-500/20 border-red-500/50 text-red-600"
                : "bg-white border-zinc-200 text-zinc-400 hover:border-zinc-300"
            )}
            title="Alimentação"
          >
            <UtensilsCrossed className="w-4 h-4" />
          </button>
        </div>

        {/* COLUNA 3: Limpeza */}
        <div className="hidden md:flex items-center gap-4 relative z-10">
          <div className={cn(
            "flex items-center gap-2 px-3 py-2 rounded-xl border",
            isOverdue ? "bg-red-500/10 border-red-500/30" : "bg-amber-500/10 border-amber-500/30"
          )}>
            <div className={cn(
              "w-7 h-7 rounded-lg flex items-center justify-center",
              isOverdue ? "bg-red-500/20" : "bg-amber-500/20"
            )}>
              {isOverdue ? (
                <AlertCircle className="w-4 h-4 text-red-600" />
              ) : (
                <Clock className="w-4 h-4 text-amber-600" />
              )}
            </div>
            <div>
              <span className={cn(
                "text-xs font-bold block",
                isOverdue ? "text-red-600" : "text-amber-600"
              )}>
                {formatTimeSinceCleaning()}
              </span>
              <span className="text-[8px] text-zinc-500 uppercase tracking-wider">
                {isOverdue ? "Atrasado" : "Última"}
              </span>
            </div>
          </div>
          <motion.button 
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={(e) => { e.stopPropagation(); onConfirmCleaning?.(hive.id); }}
            className={cn(
              "px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2 transition-all shadow-sm",
              isOverdue 
                ? "bg-red-500 text-white hover:bg-red-600 shadow-red-500/20" 
                : "bg-gradient-to-r from-[#FFA500] to-[#FFB520] text-black hover:shadow-lg hover:shadow-[#FFA500]/30"
            )}
          >
            <CheckCircle2 className="w-4 h-4" />
            {isOverdue ? "Higienizar" : "Confirmar"}
          </motion.button>
        </div>

        {/* COLUNA 4: Ações */}
        <div className="flex items-center gap-3 relative z-10">
          {onDelete && (
            <motion.button 
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={(e) => { e.stopPropagation(); onDelete(hive.id); }}
              className="p-2.5 text-zinc-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
            >
              <Trash2 className="w-4 h-4" />
            </motion.button>
          )}
          <div className="w-11 h-11 bg-gradient-to-br from-[#FFA500]/20 to-[#FFB520]/20 border-2 border-[#FFA500]/40 rounded-xl flex items-center justify-center text-[#FFA500] group-hover:bg-gradient-to-br group-hover:from-[#FFA500] group-hover:to-[#FFB520] group-hover:text-black group-hover:border-[#FFA500] transition-all shadow-sm">
            <ChevronRight className="w-5 h-5 transition-transform group-hover:translate-x-1" strokeWidth={3} />
          </div>
        </div>
      </div>
    </motion.div>
  );
}