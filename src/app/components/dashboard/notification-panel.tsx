import React from "react";
import { motion, AnimatePresence } from "motion/react";
import { X, Bell, Trash2, AlertTriangle, CheckCircle, Info, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  type: "info" | "success" | "warning" | "error";
  timestamp: Date;
  read: boolean;
}

interface NotificationPanelProps {
  isOpen: boolean;
  onClose: () => void;
  notifications: AppNotification[];
  onMarkAsRead: (id: string) => void;
  onClearAll: () => void;
}

export function NotificationPanel({ 
  isOpen, 
  onClose, 
  notifications, 
  onMarkAsRead, 
  onClearAll 
}: NotificationPanelProps) {
  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100]"
          />
          <motion.div 
            initial={{ opacity: 0, x: 100, scale: 0.95 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 100, scale: 0.95 }}
            className="fixed top-4 right-4 bottom-4 w-full max-w-md bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-900 rounded-3xl shadow-2xl z-[101] flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="p-6 border-b border-zinc-100 dark:border-zinc-900 flex items-center justify-between bg-zinc-50/50 dark:bg-zinc-900/50">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <Bell className="w-5 h-5 text-amber-500" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full border-2 border-white dark:border-black" />
                  )}
                </div>
                <div>
                  <h2 className="text-sm font-black uppercase tracking-widest text-zinc-900 dark:text-white">Central de Alertas</h2>
                  <p className="text-[10px] text-zinc-500 uppercase font-mono tracking-widest">
                    {unreadCount} notificações novas
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {notifications.length > 0 && (
                  <button 
                    onClick={onClearAll}
                    className="p-2 text-zinc-400 hover:text-red-500 transition-colors"
                    title="Limpar tudo"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
                <button 
                  onClick={onClose}
                  className="p-2 text-zinc-400 hover:text-amber-500 transition-colors bg-white dark:bg-zinc-900 rounded-xl border border-zinc-100 dark:border-zinc-800"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
              {notifications.length > 0 ? (
                notifications.map((notification) => (
                  <motion.div 
                    key={notification.id}
                    layout
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    onClick={() => onMarkAsRead(notification.id)}
                    className={cn(
                      "group relative p-4 rounded-2xl border transition-all cursor-pointer",
                      notification.read 
                        ? "bg-zinc-50/50 dark:bg-zinc-900/20 border-zinc-100 dark:border-zinc-900 opacity-60 hover:opacity-100" 
                        : "bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 shadow-sm hover:border-amber-500/30"
                    )}
                  >
                    <div className="flex gap-4">
                      <div className={cn(
                        "w-10 h-10 rounded-xl flex items-center justify-center shrink-0",
                        notification.type === "warning" && "bg-amber-500/10 text-amber-500",
                        notification.type === "error" && "bg-red-500/10 text-red-500",
                        notification.type === "success" && "bg-emerald-500/10 text-emerald-500",
                        notification.type === "info" && "bg-blue-500/10 text-blue-500"
                      )}>
                        {notification.type === "warning" && <AlertTriangle className="w-5 h-5" />}
                        {notification.type === "error" && <AlertTriangle className="w-5 h-5" />}
                        {notification.type === "success" && <CheckCircle className="w-5 h-5" />}
                        {notification.type === "info" && <Info className="w-5 h-5" />}
                      </div>
                      
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center justify-between">
                          <h3 className={cn(
                            "text-[11px] font-black uppercase tracking-wider",
                            notification.read ? "text-zinc-500" : "text-zinc-900 dark:text-white"
                          )}>
                            {notification.title}
                          </h3>
                          <span className="flex items-center gap-1 text-[9px] text-zinc-400 font-mono uppercase">
                            <Clock className="w-3 h-3" />
                            {new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' }).format(notification.timestamp)}
                          </span>
                        </div>
                        <p className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-relaxed uppercase tracking-tight">
                          {notification.message}
                        </p>
                      </div>
                    </div>
                    {!notification.read && (
                      <div className="absolute top-2 right-2 w-1.5 h-1.5 bg-amber-500 rounded-full" />
                    )}
                  </motion.div>
                ))
              ) : (
                <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
                  <div className="w-16 h-16 bg-zinc-50 dark:bg-zinc-900 rounded-full flex items-center justify-center border border-zinc-100 dark:border-zinc-800">
                    <Bell className="w-6 h-6 text-zinc-200 dark:text-zinc-800" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] text-zinc-400 font-black uppercase tracking-widest">Silêncio no Sistema</p>
                    <p className="text-[9px] text-zinc-500 font-mono uppercase">Nenhum alerta pendente</p>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 bg-zinc-50/50 dark:bg-zinc-900/50 border-t border-zinc-100 dark:border-zinc-900">
              <p className="text-[9px] text-zinc-400 text-center uppercase font-mono tracking-tighter">
                Logs de sistema são arquivados automaticamente após 15 dias
              </p>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
