import React from "react";
import { motion, AnimatePresence } from "motion/react";
import { AlertTriangle, Droplet, UtensilsCrossed, X } from "lucide-react";
import { cn } from "@/lib/utils";

{/*ESSE BOTAO PRECISA FICAR ACIONADO POR APENAS 2 SEGUNDOS */}
interface FeedingAlert {
  hiveId: string;
  hiveName: string;
  waterDaysAgo: number;
  foodDaysAgo: number;
  needsWater: boolean;
  needsFood: boolean;
}

interface FeedingAlertModalProps {
  alerts: FeedingAlert[];
  onClose: () => void;
  onAcknowledge: (hiveId: string) => void;
}

export function FeedingAlertModal({ alerts, onClose, onAcknowledge }: FeedingAlertModalProps) {
  if (alerts.length === 0) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        />

        {/* Modal */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          className="relative bg-white rounded-3xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden"
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-red-500 to-orange-500 p-6 text-white">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm">
                  <AlertTriangle className="w-8 h-8 animate-pulse" />
                </div>
                <div>
                  <h2 className="text-2xl font-black uppercase tracking-tight">Alerta Crítico</h2>
                  <p className="text-sm font-medium text-white/90 mt-1">
                    {alerts.length} {alerts.length === 1 ? 'colmeia necessita' : 'colmeias necessitam'} de atenção urgente
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-white/20 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="p-6 space-y-4 overflow-y-auto max-h-[50vh]">
            {alerts.map((alert) => (
              <motion.div
                key={alert.hiveId}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="bg-gradient-to-br from-red-50 to-orange-50 border-2 border-red-200 rounded-2xl p-5"
              >
                {/* Hive Name */}
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-black text-black">{alert.hiveName}</h3>
                  <span className="text-xs font-mono text-zinc-500 uppercase tracking-wider">
                    ID: {alert.hiveId}
                  </span>
                </div>

                {/* Alerts */}
                <div className="space-y-3">
                  {alert.needsWater && (
                    <div className="flex items-center gap-3 p-3 bg-cyan-500/10 border border-cyan-500/30 rounded-xl">
                      <div className="w-10 h-10 bg-cyan-500/20 rounded-lg flex items-center justify-center">
                        <Droplet className="w-5 h-5 text-cyan-600" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-bold text-cyan-900">Água não fornecida</p>
                        <p className="text-xs text-cyan-700">
                          Há <span className="font-black">{alert.waterDaysAgo} dias</span> sem acionamento
                        </p>
                      </div>
                    </div>
                  )}

                  {alert.needsFood && (
                    <div className="flex items-center gap-3 p-3 bg-red-500/10 border border-red-500/30 rounded-xl">
                      <div className="w-10 h-10 bg-red-500/20 rounded-lg flex items-center justify-center">
                        <UtensilsCrossed className="w-5 h-5 text-red-600" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-bold text-red-900">Alimentação não fornecida</p>
                        <p className="text-xs text-red-700">
                          Há <span className="font-black">{alert.foodDaysAgo} dias</span> sem acionamento
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Action Button */}
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => onAcknowledge(alert.hiveId)}
                  className="w-full mt-4 py-3 bg-gradient-to-r from-red-500 to-orange-500 text-white rounded-xl font-black uppercase text-xs tracking-wider shadow-lg hover:shadow-xl transition-all"
                >
                  Ir para Colmeia
                </motion.button>
              </motion.div>
            ))}
          </div>

          {/* Footer */}
          <div className="p-6 bg-zinc-50 border-t border-zinc-200">
            <div className="flex items-center justify-between">
              <p className="text-xs text-zinc-600">
                <span className="font-bold text-red-600">Atenção:</span> As abelhas necessitam de água e alimentação regular para sobreviver.
              </p>
              <button
                onClick={onClose}
                className="px-6 py-2.5 bg-zinc-200 hover:bg-zinc-300 text-zinc-700 rounded-xl font-bold text-xs uppercase tracking-wider transition-colors"
              >
                Fechar
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
