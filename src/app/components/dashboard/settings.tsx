import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { X, Settings as SettingsIcon, LogOut, User, Mail, Lock, Clock, Eye, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { TechInput } from "@/app/components/ui/tech-input";
import { TechButton } from "@/app/components/ui/tech-button";
import { toast } from "sonner";

interface SettingsProps {
  isOpen: boolean;
  onClose: () => void;
  user: any;
  onLogout: () => void;
  onDeleteAccount: () => void | Promise<void>;
  maintenanceSettings: { enabled: boolean; time: string; lastMaintenance: string };
  onUpdateMaintenance: (settings: any) => void;
  onUpdateUser?: (updates: { displayName?: string; email?: string }) => void;
  accountSettings: { showSobreninho: boolean };
  onUpdateAccountSettings: (settings: { showSobreninho: boolean }) => void | Promise<void>;
}

export function Settings({ 
  isOpen, 
  onClose, 
  user, 
  onLogout,
  onDeleteAccount,
  maintenanceSettings,
  onUpdateMaintenance,
  onUpdateUser,
  accountSettings,
  onUpdateAccountSettings
}: SettingsProps) {
  const [activeTab, setActiveTab] = useState<"profile" | "security" | "maintenance" | "display">("profile");
  const [showConfirmDisable, setShowConfirmDisable] = useState(false);
  const [showConfirmDeleteAccount, setShowConfirmDeleteAccount] = useState(false);
  
  // Profile state
  const [username, setUsername] = useState(user?.displayName || "Operador");
  const [email, setEmail] = useState(user?.email || "operador@kolmena.tech");
  
  // Security state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const handleUpdateProfile = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Atualizar o usuário no sistema
    if (onUpdateUser) {
      onUpdateUser({ displayName: username, email: email });
    }
    
    toast.success("Sistema atualizado com sucesso!", {
      description: "Suas informações de perfil foram salvas.",
      duration: 4000
    });
  };

  const handleUpdatePassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast.error("As senhas não coincidem!");
      return;
    }
    toast.success("Senha alterada com segurança.");
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }} 
            onClick={onClose} 
            className="absolute inset-0 bg-black/60 dark:bg-black/90 backdrop-blur-md" 
          />
          <motion.div 
            initial={{ opacity: 0, scale: 0.9, y: 20 }} 
            animate={{ opacity: 1, scale: 1, y: 0 }} 
            exit={{ opacity: 0, scale: 0.9, y: 20 }} 
            className="relative w-full max-w-2xl bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-900 rounded-[2rem] shadow-2xl overflow-hidden flex flex-col md:flex-row h-[600px] max-h-[90vh]"
          >
            {/* Sidebar */}
            <div className="w-full md:w-64 bg-zinc-50 dark:bg-zinc-900/50 border-b md:border-b-0 md:border-r border-zinc-200 dark:border-zinc-900 p-6 flex flex-col">
              <div className="flex items-center gap-4 mb-10">
                <div className="w-10 h-10 flex items-center justify-center relative bg-amber-500/10 rounded-xl">
                  <SettingsIcon className="w-5 h-5 text-amber-500 animate-[spin_10s_linear_infinite]" />
                </div>
                <div>
                  <h2 className="text-sm font-black tracking-tight text-zinc-900 dark:text-white uppercase">KOLMENA</h2>
                  <p className="text-[9px] text-zinc-500 uppercase font-mono tracking-widest">Configurações</p>
                </div>
              </div>

              <nav className="space-y-2 flex-1">
                {[
                  { id: "profile", label: "Meu Perfil", icon: User },
                  { id: "security", label: "Segurança", icon: Lock },
                  { id: "maintenance", label: "Manutenção", icon: SettingsIcon },
                  { id: "display", label: "Exibição", icon: Eye },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={cn(
                      "w-full flex items-center gap-3 px-4 py-3 rounded-xl text-[10px] uppercase font-black tracking-widest transition-all",
                      activeTab === tab.id 
                        ? "bg-amber-500 text-black shadow-lg shadow-amber-500/20" 
                        : "text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-amber-500"
                    )}
                  >
                    <tab.icon className="w-4 h-4" />
                    {tab.label}
                  </button>
                ))}
              </nav>

              <div className="mt-auto space-y-2">
                <button 
                  onClick={() => { onClose(); if (onLogout) onLogout(); }} 
                  className="w-full flex items-center gap-3 px-4 py-3 text-[10px] text-red-500 uppercase font-black tracking-widest hover:bg-red-500/5 transition-all rounded-xl"
                >
                  <LogOut className="w-4 h-4" />
                  Sair do Sistema
                </button>
                <button
                  onClick={() => setShowConfirmDeleteAccount(true)}
                  className="w-full flex items-center gap-3 px-4 py-3 text-[10px] text-red-700 dark:text-red-400 uppercase font-black tracking-widest hover:bg-red-500/10 transition-all rounded-xl"
                >
                  <Trash2 className="w-4 h-4" />
                  Deletar Conta
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 flex flex-col min-h-0 overflow-hidden bg-white dark:bg-zinc-950">
              <div className="p-6 md:p-10 flex-1 overflow-y-auto custom-scrollbar">
                <div className="flex items-center justify-between mb-8">
                  <h3 className="text-lg font-black uppercase tracking-[0.2em] text-zinc-900 dark:text-white">
                    {activeTab === "profile" && "Informações Pessoais"}
                    {activeTab === "security" && "Acesso e Segurança"}
                    {activeTab === "maintenance" && "Cronograma de Limpeza"}
                    {activeTab === "display" && "Preferências Visuais"}
                  </h3>
                  <button onClick={onClose} className="p-2 text-zinc-400 hover:text-amber-500 transition-colors">
                    <X className="w-6 h-6" />
                  </button>
                </div>

                <AnimatePresence mode="wait">
                  {activeTab === "profile" && (
                    <motion.div 
                      key="profile" 
                      initial={{ opacity: 0, x: 10 }} 
                      animate={{ opacity: 1, x: 0 }} 
                      exit={{ opacity: 0, x: -10 }}
                    >
                      <form onSubmit={handleUpdateProfile} className="space-y-6">
                        <TechInput 
                          label="Nome de Usuário" 
                          icon={<User className="w-4 h-4" />}
                          value={username}
                          onChange={(e) => setUsername(e.target.value)}
                        />
                        <TechInput 
                          label="Endereço de E-mail" 
                          icon={<Mail className="w-4 h-4" />}
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                        />
                        <div className="pt-4">
                          <TechButton type="submit" className="w-full h-14 rounded-xl text-[10px]">
                            Salvar Alterações
                          </TechButton>
                        </div>
                      </form>
                    </motion.div>
                  )}

                  {activeTab === "security" && (
                    <motion.div 
                      key="security" 
                      initial={{ opacity: 0, x: 10 }} 
                      animate={{ opacity: 1, x: 0 }} 
                      exit={{ opacity: 0, x: -10 }}
                    >
                      <form onSubmit={handleUpdatePassword} className="space-y-6">
                        <TechInput 
                          label="Senha Atual" 
                          icon={<Lock className="w-4 h-4" />}
                          type="password"
                          value={currentPassword}
                          onChange={(e) => setCurrentPassword(e.target.value)}
                        />
                        <TechInput 
                          label="Nova Senha" 
                          icon={<Lock className="w-4 h-4" />}
                          type="password"
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                        />
                        <TechInput 
                          label="Confirmar Nova Senha" 
                          icon={<Lock className="w-4 h-4" />}
                          type="password"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                        />
                        <div className="pt-4">
                          <TechButton type="submit" className="w-full h-14 rounded-xl text-[10px]">
                            Atualizar Credenciais
                          </TechButton>
                        </div>
                      </form>
                    </motion.div>
                  )}

                  {activeTab === "maintenance" && (
                    <motion.div 
                        key="maintenance" 
                        initial={{ opacity: 0, x: 10 }} 
                        animate={{ opacity: 1, x: 0 }} 
                        exit={{ opacity: 0, x: -10 }}
                        className="space-y-8"
                      >
                        <div className="space-y-4">
                          <div className="flex items-center justify-between p-6 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl">
                            <div className="space-y-1">
                              <h4 className="text-[11px] font-black uppercase tracking-widest text-zinc-900 dark:text-white">Alertas de Manutenção</h4>
                              <p className="text-[10px] text-zinc-500 uppercase font-mono tracking-tighter">Lembretes automáticos a cada 2 dias</p>
                            </div>
                            <button 
                              onClick={() => {
                                if (maintenanceSettings.enabled) {
                                  setShowConfirmDisable(true);
                                } else {
                                  onUpdateMaintenance({ ...maintenanceSettings, enabled: true });
                                  toast.success("Lembretes reativados.");
                                }
                              }}
                              className={cn(
                                "relative w-12 h-6 rounded-full transition-colors duration-300 flex items-center px-1",
                                maintenanceSettings.enabled ? "bg-amber-500" : "bg-zinc-300 dark:bg-zinc-800"
                              )}
                            >
                              <div className={cn(
                                "w-4 h-4 bg-white rounded-full transition-transform duration-300",
                                maintenanceSettings.enabled ? "translate-x-6" : "translate-x-0"
                              )} />
                            </button>
                          </div>

                          {showConfirmDisable && (
                            <motion.div 
                              initial={{ opacity: 0, scale: 0.95 }}
                              animate={{ opacity: 1, scale: 1 }}
                              className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl space-y-3"
                            >
                              <p className="text-[10px] text-red-500 font-bold uppercase tracking-widest text-center">
                                Desativar os lembretes pode comprometer a precisão dos dados. Deseja prosseguir?
                              </p>
                              <div className="flex gap-2">
                                <button 
                                  onClick={() => {
                                    onUpdateMaintenance({ ...maintenanceSettings, enabled: false });
                                    setShowConfirmDisable(false);
                                    toast.warning("Lembretes desativados.");
                                  }}
                                  className="flex-1 py-2 bg-red-500 text-white text-[9px] font-black uppercase tracking-widest rounded-lg"
                                >
                                  Sim, Desativar
                                </button>
                                <button 
                                  onClick={() => setShowConfirmDisable(false)}
                                  className="flex-1 py-2 bg-zinc-800 text-white text-[9px] font-black uppercase tracking-widest rounded-lg"
                                >
                                  Cancelar
                                </button>
                              </div>
                            </motion.div>
                          )}
                        </div>

                        <div className={cn("space-y-4 transition-opacity", !maintenanceSettings.enabled && "opacity-50 pointer-events-none")}>
                          <TechInput 
                            label="Horário do Lembrete" 
                            type="time"
                            icon={<Clock className="w-4 h-4" />}
                            value={maintenanceSettings.time}
                            onChange={(e) => onUpdateMaintenance({ ...maintenanceSettings, time: e.target.value })}
                          />
                          <p className="text-[9px] text-zinc-500 font-mono uppercase leading-relaxed text-center">
                            A limpeza regular dos sensores garante que as métricas de umidade e ruído operem com 100% de eficiência.
                          </p>
                        </div>
                      </motion.div>
                    )}

                  {activeTab === "display" && (
                    <motion.div
                      key="display"
                      initial={{ opacity: 0, x: 10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -10 }}
                      className="space-y-6"
                    >
                      <div className="flex items-center justify-between p-6 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl">
                        <div className="space-y-1 pr-4">
                          <h4 className="text-[11px] font-black uppercase tracking-widest text-zinc-900 dark:text-white">Dados do Sobreninho</h4>
                          <p className="text-[10px] text-zinc-500 uppercase font-mono tracking-tighter leading-relaxed">
                            Exibe temperatura, umidade e gráficos do sobreninho
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={async () => {
                            const nextValue = !accountSettings.showSobreninho;
                            try {
                              await onUpdateAccountSettings({ ...accountSettings, showSobreninho: nextValue });
                              toast.success(nextValue ? "Sobreninho exibido." : "Sobreninho ocultado.");
                            } catch {
                              toast.error("Erro ao salvar preferência.");
                            }
                          }}
                          className={cn(
                            "relative w-12 h-6 rounded-full transition-colors duration-300 flex items-center px-1 shrink-0",
                            accountSettings.showSobreninho ? "bg-amber-500" : "bg-zinc-300 dark:bg-zinc-800"
                          )}
                        >
                          <div className={cn(
                            "w-4 h-4 bg-white rounded-full transition-transform duration-300",
                            accountSettings.showSobreninho ? "translate-x-6" : "translate-x-0"
                          )} />
                        </button>
                      </div>
                    </motion.div>
                  )}
                  </AnimatePresence>
              </div>
            </div>
          </motion.div>

          {showConfirmDeleteAccount && (
            <div className="absolute inset-0 z-[120] flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowConfirmDeleteAccount(false)}
                className="absolute inset-0 bg-black/70 backdrop-blur-sm"
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 12 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 12 }}
                className="relative w-full max-w-sm bg-white dark:bg-zinc-950 border border-red-200 dark:border-red-900/60 rounded-3xl p-6 shadow-2xl"
              >
                <div className="w-12 h-12 rounded-2xl bg-red-500/10 text-red-500 flex items-center justify-center mx-auto mb-4">
                  <Trash2 className="w-6 h-6" />
                </div>
                <h3 className="text-base font-black text-center text-zinc-900 dark:text-white uppercase tracking-wider mb-2">Deletar conta?</h3>
                <p className="text-xs text-zinc-500 text-center leading-relaxed mb-6">
                  Essa ação remove sua conta, suas colmeias e os históricos vinculados. Não será possível desfazer.
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setShowConfirmDeleteAccount(false)}
                    className="h-11 rounded-xl bg-zinc-100 dark:bg-zinc-900 text-zinc-700 dark:text-zinc-200 text-[10px] font-black uppercase tracking-widest"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={async () => {
                      await onDeleteAccount();
                      setShowConfirmDeleteAccount(false);
                    }}
                    className="h-11 rounded-xl bg-red-500 text-white text-[10px] font-black uppercase tracking-widest shadow-lg shadow-red-500/20"
                  >
                    Deletar
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </div>
      )}
    </AnimatePresence>
  );
}
