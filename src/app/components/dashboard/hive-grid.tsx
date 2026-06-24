import React, { useEffect, useState, useMemo, useRef } from "react";
import { FirebaseError } from "firebase/app";
import { HiveCard, HiveData } from "./hive-card";
import { HiveDetails } from "./hive-details";
import { Mission } from "./mission";
import { HiveListRow } from "./hive-list-row";
import { NotificationPanel, AppNotification } from "./notification-panel";
import { Settings } from "./settings";
import { TechInput } from "@/app/components/ui/tech-input";
import { TechButton } from "@/app/components/ui/tech-button";
import { Plus, LayoutGrid, List, Search, Bell, User, X, Info, Cpu, SearchX, Settings as SettingsIcon, Moon, Sun as SunIcon, LogOut, Menu, Clock, Trash2, Check, AlertTriangle, CheckCircle2 } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import logoImage from '@/assets/69de2de8cbe1c6eb64f795e4bb75e930fcb77729.png';
import {
  arrayRemove,
  arrayUnion,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  where
} from "firebase/firestore";
import { deleteUser } from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import { mapHiveSnapshot, valueToMillis } from "./firestore-hive";

function getFirebaseErrorCode(error: unknown) {
  return error instanceof FirebaseError ? error.code : "unknown";
}

interface DashboardProps {
  onLogout?: () => void;
  user?: any;
  onUpdateUser?: (updates: { displayName?: string; email?: string }) => void;
}

type AccountSettings = {
  showSobreninho: boolean;
};

type WinterModeSettings = {
  enabled: boolean;
  time: string;
  activeUntilMonth: number;
  waterDurationMs: number;
  foodDurationMs: number;
  lastRunDate?: string;
  autoDisabledAt?: unknown;
};

type HiveWriteResult = {
  totalCount: number;
  failedCount: number;
};

const defaultAccountSettings: AccountSettings = {
  showSobreninho: true
};

const defaultWinterMode: WinterModeSettings = {
  enabled: false,
  time: "06:00",
  activeUntilMonth: 5,
  waterDurationMs: 2000,
  foodDurationMs: 3000
};

function buildWinterModePayload(settings: WinterModeSettings): Record<string, unknown> {
  const payload: Record<string, unknown> = {
    enabled: settings.enabled,
    time: settings.time || defaultWinterMode.time,
    activeUntilMonth: settings.activeUntilMonth || defaultWinterMode.activeUntilMonth,
    waterDurationMs: settings.waterDurationMs || defaultWinterMode.waterDurationMs,
    foodDurationMs: settings.foodDurationMs || defaultWinterMode.foodDurationMs,
    updatedAt: serverTimestamp()
  };

  if (typeof settings.lastRunDate === "string" && settings.lastRunDate.length > 0) {
    payload.lastRunDate = settings.lastRunDate;
  }

  if (settings.autoDisabledAt !== undefined) {
    payload.autoDisabledAt = settings.autoDisabledAt;
  }

  return payload;
}

function isWinterModeSeason(date = new Date(), activeUntilMonth = 5) {
  const month = date.getMonth() + 1;
  return month === 12 || month <= activeUntilMonth;
}

function shouldAutoDisableWinterMode(date = new Date(), activeUntilMonth = 5) {
  const month = date.getMonth() + 1;
  return month > activeUntilMonth && month < 12;
}

function getLocalDateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function Dashboard({ onLogout, user, onUpdateUser }: DashboardProps) {

  const [hives, setHives] = useState<HiveData[]>([]);
  const [isLoadingHives, setIsLoadingHives] = useState(true);
  const [accountSettings, setAccountSettings] = useState<AccountSettings>(defaultAccountSettings);
  
  const [selectedHive, setSelectedHive] = useState<HiveData | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isNotificationPanelOpen, setIsNotificationPanelOpen] = useState(false);
  const [hivePendingDelete, setHivePendingDelete] = useState<HiveData | null>(null);
  const [isWinterModeOpen, setIsWinterModeOpen] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [winterMode, setWinterMode] = useState<WinterModeSettings>(defaultWinterMode);
  const [winterTimeDraft, setWinterTimeDraft] = useState(defaultWinterMode.time);
  const winterRunInProgressRef = useRef(false);
  const winterTimeoutIdsRef = useRef<Set<number>>(new Set());
  const isDashboardMountedRef = useRef(true);
  
  // Maintenance Settings
  const [maintenanceSettings, setMaintenanceSettings] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('kolmena_maintenance_settings');
      return saved ? JSON.parse(saved) : { enabled: true, time: "12:00", lastMaintenance: new Date().toISOString() };
    }
    return { enabled: true, time: "12:00", lastMaintenance: new Date().toISOString() };
  });

  useEffect(() => {
    return () => {
      isDashboardMountedRef.current = false;
      winterTimeoutIdsRef.current.forEach((timeoutId) => window.clearTimeout(timeoutId));
      winterTimeoutIdsRef.current.clear();
      winterRunInProgressRef.current = false;
    };
  }, []);

  useEffect(() => {
    localStorage.setItem('kolmena_maintenance_settings', JSON.stringify(maintenanceSettings));
  }, [maintenanceSettings]);

  useEffect(() => {
    if (!user?.uid || user?.isDemo) {
      setAccountSettings(defaultAccountSettings);
      return;
    }

    const userRef = doc(db, "usuarios", user.uid);
    const unsubscribe = onSnapshot(userRef, (snapshot) => {
      const data = snapshot.data();

      setAccountSettings({
        showSobreninho: data?.settings?.showSobreninho !== false
      });
    }, (error) => {
      console.error("Erro ao carregar preferencias da conta:", error);
      toast.error("Erro ao carregar preferências da conta.");
    });

    return () => unsubscribe();
  }, [user?.uid, user?.isDemo]);

  const handleUpdateAccountSettings = async (settings: AccountSettings) => {
    const previousSettings = accountSettings;
    setAccountSettings(settings);

    if (!user?.uid || user?.isDemo) return;

    try {
      await setDoc(doc(db, "usuarios", user.uid), {
        settings,
        atualizadoEm: serverTimestamp()
      }, { merge: true });
    } catch (error) {
      console.error("Erro ao salvar preferencias da conta:", error);
      setAccountSettings(previousSettings);
      throw error;
    }
  };

  const resetMaintenanceTimer = () => {
    setMaintenanceSettings((prev: any) => ({ ...prev, lastMaintenance: new Date().toISOString() }));
    toast.success("Contador de limpeza reiniciado!");
    addNotification("Manutenção Registrada", "A limpeza dos sensores foi marcada como concluída.", "success");
  };

  const [notifications, setNotifications] = useState<AppNotification[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('kolmena_notifications');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          return parsed.map((n: any) => ({ ...n, timestamp: new Date(n.timestamp) }));
        } catch (e) {
          return [];
        }
      }
    }
    return [];
  });

  useEffect(() => {
    localStorage.setItem('kolmena_notifications', JSON.stringify(notifications));
  }, [notifications]);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [currentView, setCurrentView] = useState<"dashboard" | "mission">("dashboard");

  const updateWinterModeInHives = async (persistedWinterMode: Record<string, unknown>): Promise<HiveWriteResult> => {
    if (hives.length === 0) return { totalCount: 0, failedCount: 0 };

    const results = await Promise.allSettled(hives.map((hive) => updateDoc(doc(db, "colmeias", hive.id), {
      winterMode: persistedWinterMode,
      atualizadoEm: serverTimestamp()
    })));

    const failures = results.filter((result) => result.status === "rejected");
    if (failures.length > 0) {
      console.error("Falha ao salvar Modo Inverno em algumas colmeias:", failures);
    }

    if (failures.length === hives.length) {
      throw new Error("Nenhuma colmeia aceitou a atualização do Modo Inverno.");
    }

    return {
      totalCount: hives.length,
      failedCount: failures.length
    };
  };

  const persistWinterMode = async (nextSettings: WinterModeSettings): Promise<HiveWriteResult> => {
    if (!user?.uid || user?.isDemo) {
      setWinterMode(nextSettings);
      setWinterTimeDraft(nextSettings.time);
      return { totalCount: 0, failedCount: 0 };
    }

    const persistedWinterMode = buildWinterModePayload(nextSettings);

    const result = await updateWinterModeInHives(persistedWinterMode);

    setWinterMode(nextSettings);
    setWinterTimeDraft(nextSettings.time);
    return result;
  };

  const handleToggleWinterMode = async () => {
    if (winterMode.enabled) {
      setShowConfirmModal(true);
    } else {
      const nextSettings = {
        ...winterMode,
        enabled: true,
        time: winterTimeDraft || defaultWinterMode.time,
        activeUntilMonth: 5,
        waterDurationMs: 2000,
        foodDurationMs: 3000
      };
      // Otimistic update ANTES do async
      const previousSettings = winterMode;
      const previousTimeDraft = winterTimeDraft;
      setWinterMode(nextSettings);
      try {
        const result = await persistWinterMode(nextSettings);
        if (result.failedCount > 0) {
          toast.warning(`Modo Inverno salvo em ${result.totalCount - result.failedCount} de ${result.totalCount} colmeias.`);
        } else {
          toast.success("Modo Inverno ativado com sucesso", {
            style: { background: '#18181b', color: '#f59e0b', border: '1px solid #f59e0b' }
          });
        }
      } catch (error) {
        console.error("Erro ao ativar Modo Inverno:", error);
        setWinterMode(previousSettings);
        setWinterTimeDraft(previousTimeDraft);
        toast.error("Erro ao ativar Modo Inverno.");
      }
    }
  };

  const confirmDeactivation = async () => {
    const nextSettings = {
      ...winterMode,
      enabled: false,
      time: winterTimeDraft || winterMode.time
    };
    // Otimistic update: seta estado local ANTES do async para bloquear race conditions
    const previousSettings = winterMode;
    const previousTimeDraft = winterTimeDraft;
    setWinterMode(nextSettings);
    setShowConfirmModal(false);

    try {
      const result = await persistWinterMode(nextSettings);
      if (result.failedCount > 0) {
        toast.warning(`Modo Inverno desativado em ${result.totalCount - result.failedCount} de ${result.totalCount} colmeias.`);
      } else {
        toast.warning("Modo Inverno desativado manualmente", {
          style: { background: '#18181b', color: '#ef4444', border: '1px solid #ef4444' }
        });
      }
    } catch (error) {
      console.error("Erro ao desativar Modo Inverno:", error);
      setWinterMode(previousSettings);
      setWinterTimeDraft(previousTimeDraft);
      toast.error("Erro ao desativar Modo Inverno.");
    }
  };
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("Todas Unidades");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [isOnline, setIsOnline] = useState(true);
  
  const [newName, setNewName] = useState("");
  const [newId, setNewId] = useState("");

  // Feeding Alert State
  const [feedingAlerts, setFeedingAlerts] = useState<Array<{
    hiveId: string;
    hiveName: string;
    waterDaysAgo: number;
    foodDaysAgo: number;
    needsWater: boolean;
    needsFood: boolean;
  }>>([]);
  const [showFeedingAlertModal, setShowFeedingAlertModal] = useState(false);
  const [feedingAlertDismissed, setFeedingAlertDismissed] = useState(false);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Initial check
    setIsOnline(window.navigator.onLine);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    if (!user?.uid || user?.isDemo) {
      setHives([]);
      setSelectedHive(null);
      setIsLoadingHives(false);
      return;
    }

    setIsLoadingHives(true);
    const hivesQuery = query(collection(db, "colmeias"), where("usuarioId", "==", user.uid));

    const unsubscribe = onSnapshot(
      hivesQuery,
      (snapshot) => {
        const nextHives = snapshot.docs
          .map(mapHiveSnapshot)
          .sort((a, b) => a.id.localeCompare(b.id));

        setHives(nextHives);
        setSelectedHive((current) => {
          if (!current) return null;
          return nextHives.find((hive) => hive.id === current.id) ?? null;
        });
        setIsLoadingHives(false);
      },
      (error) => {
        console.error("Erro ao carregar colmeias do Firestore:", error);
        toast.error("Erro ao carregar suas colmeias.");
        setIsLoadingHives(false);
      }
    );

    return () => unsubscribe();
  }, [user?.uid, user?.isDemo]);

  useEffect(() => {
    const source = hives.find((hive) => hive.winterMode?.enabled) ?? hives[0];
    const nextWinterMode = source?.winterMode
      ? {
          enabled: Boolean(source.winterMode.enabled),
          time: source.winterMode.time || defaultWinterMode.time,
          activeUntilMonth: source.winterMode.activeUntilMonth || 5,
          waterDurationMs: source.winterMode.waterDurationMs || 2000,
          foodDurationMs: source.winterMode.foodDurationMs || 3000,
          lastRunDate: typeof source.winterMode.lastRunDate === "string" ? source.winterMode.lastRunDate : undefined,
          autoDisabledAt: source.winterMode.autoDisabledAt ?? undefined
        }
      : defaultWinterMode;

    setWinterMode(nextWinterMode);
    setWinterTimeDraft(nextWinterMode.time);
  }, [hives]);

  useEffect(() => {
    if (!winterMode.enabled || !shouldAutoDisableWinterMode(new Date(), winterMode.activeUntilMonth)) return;

    persistWinterMode({
      ...winterMode,
      enabled: false,
      autoDisabledAt: serverTimestamp()
    }).then((result) => {
      if (result.failedCount > 0) {
        toast.warning(`Modo Inverno desligado em ${result.totalCount - result.failedCount} de ${result.totalCount} colmeias.`);
      } else {
        toast.info("Modo Inverno desligado automaticamente após o mês de maio.");
      }
    }).catch((error) => {
      console.error("Erro ao desligar Modo Inverno automaticamente:", error);
    });
  }, [winterMode.enabled, winterMode.activeUntilMonth]);

  useEffect(() => {
    if (!winterMode.enabled || hives.length === 0) return;

    const scheduleTimeout = (callback: () => void, delay: number) => {
      const timeoutId = window.setTimeout(() => {
        winterTimeoutIdsRef.current.delete(timeoutId);
        if (isDashboardMountedRef.current) callback();
      }, delay);
      winterTimeoutIdsRef.current.add(timeoutId);
    };

    const runWinterFeedingIfNeeded = async () => {
      const now = new Date();
      if (!isWinterModeSeason(now, winterMode.activeUntilMonth)) return;

      const [targetHours, targetMinutes] = (winterMode.time || defaultWinterMode.time).split(":").map(Number);
      if (now.getHours() !== targetHours || now.getMinutes() !== targetMinutes) return;

      const todayKey = getLocalDateKey(now);
      if (winterMode.lastRunDate === todayKey || winterRunInProgressRef.current) return;

      winterRunInProgressRef.current = true;

      try {
        const startTime = Timestamp.now();
        const waterDuration = winterMode.waterDurationMs || defaultWinterMode.waterDurationMs;
        const foodDuration = winterMode.foodDurationMs || defaultWinterMode.foodDurationMs;

        const startResults = await Promise.allSettled(hives.map((hive) => updateDoc(doc(db, "colmeias", hive.id), {
          "controls.agua": true,
          "controls.racao": true,
          "lastFeedingTime.water": startTime,
          "lastFeedingTime.food": startTime,
          "winterMode.lastRunDate": todayKey,
          eventos: arrayUnion({
            tipo: "modo_inverno",
            acao: true,
            timestamp: startTime,
            origem: "app",
            horario: winterMode.time
          }),
          atualizadoEm: serverTimestamp()
        })));

        const startFailures = startResults.filter((result) => result.status === "rejected");
        if (startFailures.length > 0) {
          console.error("Falha ao iniciar Modo Inverno em algumas colmeias:", startFailures);
        }

        if (startFailures.length === hives.length) {
          throw new Error("Nenhuma colmeia aceitou a execução do Modo Inverno.");
        }

        if (!isDashboardMountedRef.current) return;

        const persistResult = await persistWinterMode({
          ...winterMode,
          lastRunDate: todayKey
        });

        if (!isDashboardMountedRef.current) return;

        scheduleTimeout(() => {
          Promise.allSettled(hives.map((hive) => updateDoc(doc(db, "colmeias", hive.id), {
              "controls.agua": false,
              eventos: arrayUnion({
                tipo: "agua",
                acao: false,
                timestamp: Timestamp.now(),
                origem: "modo_inverno"
              }),
              atualizadoEm: serverTimestamp()
            }))).then((results) => {
              const failures = results.filter((result) => result.status === "rejected");
              if (failures.length > 0) console.error("Erro ao finalizar água do Modo Inverno:", failures);
            });
        }, waterDuration);

        scheduleTimeout(() => {
          Promise.allSettled(hives.map((hive) => updateDoc(doc(db, "colmeias", hive.id), {
              "controls.racao": false,
              eventos: arrayUnion({
                tipo: "racao",
                acao: false,
                timestamp: Timestamp.now(),
                origem: "modo_inverno"
              }),
              atualizadoEm: serverTimestamp()
            }))).then((results) => {
              const failures = results.filter((result) => result.status === "rejected");
              if (failures.length > 0) console.error("Erro ao finalizar ração do Modo Inverno:", failures);
            });
        }, foodDuration);

        if (startFailures.length > 0 || persistResult.failedCount > 0) {
          toast.warning("Suplementação do Modo Inverno executada parcialmente.");
        } else {
          toast.success("Suplementação do Modo Inverno executada.");
        }
      } catch (error) {
        console.error("Erro ao executar Modo Inverno:", error);
        toast.error("Erro ao executar Modo Inverno.");
      } finally {
        if (!isDashboardMountedRef.current) {
          winterRunInProgressRef.current = false;
          return;
        }

        scheduleTimeout(() => {
          winterRunInProgressRef.current = false;
        }, 65000);
      }
    };

    runWinterFeedingIfNeeded();
    const interval = window.setInterval(runWinterFeedingIfNeeded, 60000);
    return () => {
      window.clearInterval(interval);
    };
  }, [hives, winterMode]);

  const filteredHives = useMemo(() => {
    if (!searchTerm) return hives;
    const term = searchTerm.toLowerCase().trim();
    return hives.filter(hive => 
      hive.name.toLowerCase().includes(term) || 
      hive.id.toLowerCase().includes(term)
    );
  }, [hives, searchTerm]);

  useEffect(() => {
    // Request permission for native notifications
    if (typeof window !== "undefined" && "Notification" in window) {
      if (Notification.permission === "default") {
        Notification.requestPermission();
      }
    }

    const cleanup = () => {
      const fifteenDaysAgo = new Date();
      fifteenDaysAgo.setDate(fifteenDaysAgo.getDate() - 15);
      
      setNotifications(prev => prev.filter(n => n.timestamp > fifteenDaysAgo));
    };

    cleanup();
    const interval = setInterval(cleanup, 1000 * 60 * 60); // Check every hour
    return () => clearInterval(interval);
  }, []);

  // Feeding Alert - Check for hives that need water/food (more than 2 days)
  useEffect(() => {
    if (feedingAlertDismissed || hives.length === 0) return;

    const checkFeedingStatus = () => {
      const alerts: typeof feedingAlerts = [];
      const twoDaysInMs = 2 * 24 * 60 * 60 * 1000; // 2 days in milliseconds

      hives.forEach((hive) => {
        const alertedKey = `hive_${hive.id}_alertShown`; // Nova chave para rastrear alertas já mostrados
        const alertedTimes = localStorage.getItem(alertedKey);
        
        const waterLastTime = valueToMillis(hive.lastFeedingTime?.water);
        const foodLastTime = valueToMillis(hive.lastFeedingTime?.food);
        let waterAlertShown = 0;
        let foodAlertShown = 0;

        if (alertedTimes) {
          try {
            const alerted = JSON.parse(alertedTimes);
            waterAlertShown = alerted.water || 0;
            foodAlertShown = alerted.food || 0;
          } catch (e) {
            console.error("Erro ao ler alertas:", e);
          }
        }

        const now = Date.now();
        const waterDiffMs = now - waterLastTime;
        const foodDiffMs = now - foodLastTime;

        const needsWater = waterLastTime === 0 || waterDiffMs > twoDaysInMs;
        const needsFood = foodLastTime === 0 || foodDiffMs > twoDaysInMs;

        // NOVA LÓGICA: Só mostrar alerta se:
        // 1. Precisa de água/comida (passou de 2 dias)
        // 2. E ainda NÃO foi mostrado alerta para esse período
        // 3. Ou o último acionamento foi DEPOIS do último alerta (significa que foi resolvido e passou 2 dias de novo)
        
        const shouldAlertWater = needsWater && (waterAlertShown === 0 || waterLastTime > waterAlertShown);
        const shouldAlertFood = needsFood && (foodAlertShown === 0 || foodLastTime > foodAlertShown);

        if (shouldAlertWater || shouldAlertFood) {
          const waterDaysAgo = waterLastTime === 0 ? 999 : Math.floor(waterDiffMs / (24 * 60 * 60 * 1000));
          const foodDaysAgo = foodLastTime === 0 ? 999 : Math.floor(foodDiffMs / (24 * 60 * 60 * 1000));

          alerts.push({
            hiveId: hive.id,
            hiveName: hive.name,
            waterDaysAgo,
            foodDaysAgo,
            needsWater: shouldAlertWater,
            needsFood: shouldAlertFood
          });

          // Marcar que o alerta foi mostrado para este período
          try {
            const alertData = {
              water: shouldAlertWater ? now : waterAlertShown,
              food: shouldAlertFood ? now : foodAlertShown
            };
            localStorage.setItem(alertedKey, JSON.stringify(alertData));
          } catch (e) {
            console.error("Erro ao salvar alerta:", e);
          }
        }
      });

      setFeedingAlerts(alerts);
      if (alerts.length > 0) {
        setShowFeedingAlertModal(true);
      }
    };

    // Verificar imediatamente
    checkFeedingStatus();

    // Verificar a cada 1 hora
    const interval = setInterval(checkFeedingStatus, 60 * 60 * 1000);
    return () => clearInterval(interval);
  }, [hives, feedingAlertDismissed]);

  const handleFeedingAlertAcknowledge = (hiveId: string) => {
    const hive = hives.find(h => h.id === hiveId);
    if (hive) {
      setSelectedHive(hive);
      setShowFeedingAlertModal(false);
    }
  };

  const handleFeedingAlertClose = () => {
    setShowFeedingAlertModal(false);
    setFeedingAlertDismissed(true);
  };

  // System to simulate critical alerts and maintenance reminders
  useEffect(() => {
    const checkCriticalLevels = () => {
      hives.forEach(hive => {
        // ... (existing critical checks)
      });
    };

    const checkMaintenanceReminder = () => {
      if (!maintenanceSettings.enabled) return;

      const now = new Date();
      const [targetHours, targetMinutes] = maintenanceSettings.time.split(':').map(Number);
      
      if (now.getHours() === targetHours && now.getMinutes() === targetMinutes) {
        if (now.getDate() % 2 === 0) {
          const title = "Manutenção Preventiva";
          const message = "Lembrete: Realize a limpeza dos sensores hoje para garantir a máxima precisão no monitoramento das colmeias.";
          
          const alreadySent = notifications.some(n => 
            n.title === title && 
            new Date(n.timestamp).toDateString() === now.toDateString()
          );

          if (!alreadySent) {
            addNotification(title, message, "info");
            
            if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
              new Notification(`KOLMENA: ${title}`, {
                body: message,
              });
            }

            console.log("Email de manutenção disparado para o usuário às " + maintenanceSettings.time);
            toast.info("E-mail de lembrete de manutenção enviado!");
          }
        }
      }
    };

    const criticalInterval = setInterval(checkCriticalLevels, 120000);
    const maintenanceInterval = setInterval(checkMaintenanceReminder, 60000); // Check every minute for the 12:00 window
    
    return () => {
      clearInterval(criticalInterval);
      clearInterval(maintenanceInterval);
    };
  }, [hives, notifications]);

  const addNotification = (title: string, message: string, type: AppNotification["type"] = "info") => {
    const newNotif: AppNotification = {
      id: Math.random().toString(36).substr(2, 9),
      title,
      message,
      type,
      timestamp: new Date(),
      read: false
    };
    setNotifications(prev => [newNotif, ...prev]);
  };

  const markNotificationAsRead = (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  };

  const clearNotifications = () => {
    setNotifications([]);
    toast.info("Histórico de alertas limpo.");
  };

  // Cleaning History State
  const [cleaningHistory, setCleaningHistory] = useState<string[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('kolmena_cleaning_history');
      return saved ? JSON.parse(saved) : [];
    }
    return [];
  });

  useEffect(() => {
    localStorage.setItem('kolmena_cleaning_history', JSON.stringify(cleaningHistory));
  }, [cleaningHistory]);

const handleConfirmCleaning = async (id: string) => {
  const hive = hives.find(h => h.id === id);
  if (!hive || hive.usuarioId !== user?.uid) return;

  try {
    await updateDoc(doc(db, "colmeias", id), {
      lastCleaning: Timestamp.now(),
      atualizadoEm: serverTimestamp(),
      eventos: arrayUnion({
        tipo: "limpeza",
        acao: true,
        timestamp: Timestamp.now(),
        origem: "app"
      })
    });

    setCleaningHistory(prev => {
      const today = new Date().toISOString().split("T")[0];
      return prev.includes(today) ? prev : [...prev, today];
    });

    toast.success(`Manutenção da ${hive.name} registrada!`, {
      description: "O cronômetro de 72h foi reiniciado.",
      icon: <CheckCircle2 className="w-4 h-4 text-green-500" />
    });
  } catch (error) {
    console.error("Erro ao registrar manutenção:", error);
    toast.error("Erro ao registrar manutenção.");
  }
};

  useEffect(() => {
    const checkMaintenanceTimeout = () => {
      const now = new Date();
      hives.forEach(hive => {
        const last = new Date(hive.lastCleaning);
        const diffInHours = (now.getTime() - last.getTime()) / (1000 * 60 * 60);
        
        if (diffInHours > 72) {
          const title = "Alerta Crítico: Sensores";
          const message = `A unidade ${hive.name} está sem manutenção há mais de 72 horas. As medições podem estar imprecisas por conta da obstrução dos sensores, gerando falhas de análise.`;
          
          const alreadyNotified = notifications.some(n => 
            n.title === title && 
            n.message.includes(hive.name) && 
            (now.getTime() - new Date(n.timestamp).getTime()) < 12 * 60 * 60 * 1000
          );

          if (!alreadyNotified) {
            addNotification(title, message, "warning");
            toast.error(message, { duration: 6000 });
            
            if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
              new Notification(`KOLMENA: ${title}`, { body: message });
            }
          }
        }
      });
    };

    const interval = setInterval(checkMaintenanceTimeout, 3600000); // Check every hour
    checkMaintenanceTimeout(); // Initial check
    
    return () => clearInterval(interval);
  }, [hives, notifications]);

  const handleAddHive = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName || !newId) return;
    if (!user?.uid || user?.isDemo) {
      toast.error("Entre com uma conta válida para cadastrar colmeias.");
      return;
    }

    const hiveId = newId.trim().toUpperCase();
    if (hives.some((hive) => hive.id === hiveId)) {
      toast.error("Essa unidade já está cadastrada na sua conta.");
      return;
    }

    const hiveRef = doc(db, "colmeias", hiveId);

    try {
      await setDoc(hiveRef, {
        apelido: newName.trim(),
        usuarioId: user.uid,
        controls: {
          agua: false,
          racao: false
        },
        winterMode: buildWinterModePayload(winterMode),
        lastFeedingTime: {
          food: null,
          water: null
        },
        ultimaLeitura: {
          TempN: 0,
          tempSN: 0,
          umidN: 0,
          umidSN: 0,
          lum: 0,
          ruido: 0,
          timestamp: serverTimestamp()
        },
        leituras: [],
        eventos: [],
        status: "ideal",
        lastCleaning: serverTimestamp(),
        atualizadoEm: serverTimestamp()
      });

      await setDoc(doc(db, "usuarios", user.uid), {
        nome: user.displayName || user.email || "Operador",
        email: user.email || "",
        colmeias: arrayUnion(hiveId)
      }, { merge: true });

      setIsAdding(false);
      setNewName("");
      setNewId("");
      setSearchTerm("");
      toast.success("Unidade Kolmena cadastrada com sucesso.");
      addNotification("Novo Dispositivo", `Unidade ${hiveId} foi registrada com sucesso.`, "success");
    } catch (error) {
      console.error("Erro ao cadastrar colmeia:", error);
      if (error instanceof FirebaseError && error.code === "permission-denied") {
        toast.error("Firestore negou o cadastro. Confira as rules publicadas no Firebase.");
        return;
      }

      toast.error(`Erro ao cadastrar unidade (${getFirebaseErrorCode(error)}).`);
    }
  };

  const handleDeleteHive = async (id: string) => {
    const hive = hives.find(h => h.id === id);
    if (!hive || hive.usuarioId !== user?.uid) return;

    try {
      await deleteDoc(doc(db, "colmeias", id));
      await updateDoc(doc(db, "usuarios", user.uid), {
        colmeias: arrayRemove(id)
      });
      toast.info("Unidade removida do sistema.");
      addNotification("Dispositivo Removido", `A unidade ${hive?.name || id} foi desconectada.`, "warning");
    } catch (error) {
      console.error("Erro ao remover colmeia:", error);
      toast.error("Erro ao remover unidade.");
    }
  };

  const requestDeleteHive = (id: string) => {
    const hive = hives.find(h => h.id === id);
    if (!hive) return;
    setHivePendingDelete(hive);
  };

  const handleDeleteAccount = async () => {
    if (!user?.uid || user?.isDemo) {
      toast.error("Conta demo não pode ser deletada.");
      return;
    }

    if (!auth.currentUser) {
      toast.error("Sessão inválida. Entre novamente para deletar a conta.");
      return;
    }

    try {
      const ownedHives = hives.filter((hive) => hive.usuarioId === user.uid);
      await Promise.all(ownedHives.map((hive) => deleteDoc(doc(db, "colmeias", hive.id))));
      await deleteDoc(doc(db, "usuarios", user.uid));
      await deleteUser(auth.currentUser);
      toast.info("Conta deletada com sucesso.");
    } catch (error) {
      console.error("Erro ao deletar conta:", error);
      if (error instanceof FirebaseError && error.code === "auth/requires-recent-login") {
        toast.error("Entre novamente na conta e tente deletar de novo.");
        return;
      }
      toast.error("Erro ao deletar conta.");
    }
  };

  const renderCleaningFrequency = (alignment: "start" | "end" = "end") => {
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      const dateStr = d.toISOString().split('T')[0];
      const dayName = d.toLocaleDateString('pt-BR', { weekday: 'narrow' });
      return { dateStr, dayName };
    });

    return (
      <div className={cn("flex flex-col gap-2", alignment === "end" ? "items-end" : "items-start")}>
        <p className="text-[9px] text-zinc-400 dark:text-zinc-500 uppercase font-black tracking-[0.2em]">Frequência Semanal</p>
        <div className="flex gap-1.5">
          {last7Days.map(({ dateStr, dayName }) => {
            const isDone = cleaningHistory.includes(dateStr);
            return (
              <div key={dateStr} className="flex flex-col items-center gap-1">
                <div 
                  className={cn(
                    "w-7 h-7 rounded-lg flex items-center justify-center transition-all border-2",
                    isDone 
                      ? "bg-amber-500 border-amber-400 text-black shadow-[0_0_15px_rgba(245,158,11,0.2)]" 
                      : "bg-zinc-100 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-400"
                  )}
                  title={dateStr}
                >
                  {isDone ? <Check className="w-4 h-4" strokeWidth={4} /> : <div className="w-1 h-1 rounded-full bg-current opacity-20" />}
                </div>
                <span className="text-[8px] uppercase font-black text-zinc-500">{dayName}</span>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  if (selectedHive) {
    return (
      <>
        <HiveDetails
          hive={selectedHive}
          userId={user?.uid}
          onBack={() => setSelectedHive(null)}
          onOpenSettings={() => setIsSettingsOpen(true)}
          onDelete={handleDeleteHive}
          showSobreninho={accountSettings.showSobreninho}
        />
        <Settings
          isOpen={isSettingsOpen}
          onClose={() => setIsSettingsOpen(false)}
          user={user}
          onLogout={onLogout || (() => {})}
          onDeleteAccount={handleDeleteAccount}
          onUpdateUser={onUpdateUser || (() => {})}
          maintenanceSettings={maintenanceSettings}
          onUpdateMaintenance={setMaintenanceSettings}
          accountSettings={accountSettings}
          onUpdateAccountSettings={handleUpdateAccountSettings}
        />
      </>
    );
  }

  if (currentView === 'mission') {
    return <Mission onBack={() => setCurrentView('dashboard')} />;
  }

  const calculateTimeSinceLastMaintenance = () => {
    const last = new Date(maintenanceSettings.lastMaintenance);
    const now = new Date();
    const diffInMs = now.getTime() - last.getTime();
    
    const days = Math.floor(diffInMs / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diffInMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diffInMs % (1000 * 60 * 60)) / (1000 * 60));

    if (days > 0) return `${days}d ${hours}h`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-50 via-white to-amber-50/30 text-black selection:bg-[#FFA500]/30 transition-colors duration-500">
      {/* Animated Background Elements */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute top-[-20%] right-[-10%] w-[50%] h-[50%] bg-gradient-to-br from-[#FFA500]/8 to-transparent blur-[120px] rounded-full animate-pulse" />
        <div className="absolute bottom-[-20%] left-[-10%] w-[50%] h-[50%] bg-gradient-to-tr from-[#FFB520]/8 to-transparent blur-[120px] rounded-full animate-pulse" style={{ animationDelay: '1s' }} />
        
        {/* Hexagon grid pattern */}
        <div className="absolute inset-0 opacity-[0.015]">
          <svg className="w-full h-full">
            <defs>
              <pattern id="hexagons" x="0" y="0" width="60" height="60" patternUnits="userSpaceOnUse">
                <polygon points="30,5 50,17.5 50,42.5 30,55 10,42.5 10,17.5" fill="none" stroke="currentColor" strokeWidth="1"/>
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#hexagons)"/>
          </svg>
        </div>
      </div>

      {/* Header */}
      <header className="border-b border-zinc-200/80 bg-white/70 backdrop-blur-2xl sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="absolute inset-0 bg-[#FFA500]/20 blur-lg rounded-full" />
              <img 
                src={logoImage} 
                alt="KOLMENA Logo" 
                className="relative w-11 h-11 object-contain"
              />
            </div>
            <div>
              <span className="text-2xl font-black tracking-tighter text-black">KOLMENA</span>
              <span className="block text-[8px] text-zinc-500 uppercase tracking-[0.3em] font-bold -mt-1">Hive Intelligence</span>
            </div>
          </div>
          
          {/* Navegação Desktop */}
          <nav className="hidden lg:flex items-center gap-1.5">
            {['Monitoramento', 'Nossa Missão', 'Modo Inverno', 'Configurações'].map((item) => (
              <button 
                key={item} 
                onClick={() => {
                  if (item === 'Nossa Missão') setCurrentView('mission');
                  if (item === 'Monitoramento') setCurrentView('dashboard');
                  if (item === 'Modo Inverno') setIsWinterModeOpen(true);
                  if (item === 'Configurações') setIsSettingsOpen(true);
                }}
                className={cn(
                  "px-4 py-2 text-sm font-medium transition-all rounded-xl",
                  (item === 'Monitoramento' && currentView === 'dashboard') || (item === 'Nossa Missão' && currentView) 
                    ? "text-[#FFA500] bg-[#FFA500]/10" 
                    : "text-zinc-600 hover:text-black hover:bg-zinc-100 dark:hover:bg-zinc-900"
                )}
              >
                {item}
              </button>
            ))}
          </nav>

          {/* Ações do Usuário */}
          <div className="flex items-center">
            <button 
              onClick={() => setIsNotificationPanelOpen(true)}
              className="p-2.5 text-zinc-600 hover:text-[#FFA500] transition-colors relative rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-900 ml-2"
            >
              <Bell className="w-5 h-5" />
              {notifications.some(n => !n.read) && (
                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full animate-pulse" />
              )}
            </button>
            
            <div className="flex items-center gap-3">
              <span className="text-sm text-zinc-700 hidden md:block">
                {user?.displayName?.split(" ")[0] || "Operador"}
              </span>
              <div className="w-10 h-10 rounded-full bg-[#FFA500]/20 border-2 border-[#FFA500]/40 flex items-center justify-center text-[#FFA500]">
                {user?.photoURL ? (
                  <img src={user.photoURL} alt="User" className="w-full h-full rounded-full object-cover" />
                ) : (
                  <User className="w-5 h-5" />
                )}
              </div>
            </div>

            <button className="lg:hidden p-2 text-zinc-600" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
              <Menu className="w-6 h-6" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8 sm:py-12 relative z-10">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-8 mb-12 sm:mb-16">
          <div className="space-y-4">
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tighter text-zinc-900 dark:text-white">
              SISTEMA DE <span className="text-[#FFA500]">CONTROLE</span>
            </h1>
            <div className="flex items-center gap-4">
              <div className="h-12 px-6 flex flex-col items-center justify-center border-2 border-zinc-200 dark:border-zinc-800 rounded-2xl bg-white dark:bg-zinc-950 shadow-sm min-w-[100px]">
                <span className="text-2xl sm:text-3xl font-black tracking-tight text-[#FFA500]" style={{ fontFamily: "'Bebas Neue', sans-serif" }}>
                  {String(hives.length).padStart(2, '0')}
                </span>
                <span className="text-[8px] uppercase font-bold text-zinc-500 tracking-[0.2em] leading-none mt-0.5">Unidades</span>
              </div>
              <div className="h-12 px-6 flex flex-col items-center justify-center border-2 border-zinc-200 dark:border-zinc-800 rounded-2xl bg-white dark:bg-zinc-950 shadow-sm min-w-[100px]">
                <div className="flex items-center gap-1.5">
                  <div className={cn(
                    "w-2 h-2 rounded-full",
                    isOnline ? "bg-emerald-500 animate-pulse" : "bg-red-500"
                  )} />
                  <span className={cn(
                    "text-sm font-black uppercase tracking-wider",
                    isOnline ? "text-emerald-600 dark:text-emerald-500" : "text-red-600 dark:text-red-500"
                  )}>
                    {isOnline ? "ONLINE" : "OFFLINE"}
                  </span>
                </div>
                <span className="text-[8px] uppercase font-bold text-zinc-500 tracking-[0.2em] leading-none mt-1">Status</span>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-xl shadow-zinc-900/5">
            <div className="flex items-center gap-2 p-1.5 bg-zinc-50 border-b sm:border-b-0 sm:border-r border-zinc-200">
              <button 
                onClick={() => setViewMode("grid")} 
                className={cn(
                  "px-4 py-2 rounded-lg transition-all text-sm font-medium flex items-center gap-2",
                  viewMode === "grid" ? "bg-[#FFA500] text-black shadow-sm" : "text-zinc-600 hover:text-black"
                )}
              >
                <LayoutGrid className="w-4 h-4" />
                <span className="hidden sm:inline">Cards</span>
              </button>
              <button 
                onClick={() => setViewMode("list")} 
                className={cn(
                  "px-4 py-2 rounded-lg transition-all text-sm font-medium flex items-center gap-2",
                  viewMode === "list" ? "bg-[#FFA500] text-black shadow-sm" : "text-zinc-600 hover:text-black"
                )}
              >
                <List className="w-4 h-4" />
                <span className="hidden sm:inline">Lista</span>
              </button>
            </div>

            <div className="relative flex-1 group sm:w-72">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 group-focus-within:text-[#FFA500] transition-colors" />
              <input 
                type="text" 
                placeholder="Buscar unidade..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="bg-white border-0 pl-12 pr-12 py-4 text-sm text-black placeholder:text-zinc-400 focus:ring-2 focus:ring-[#FFA500]/20 focus:outline-none w-full transition-all"
              />
              {searchTerm && (
                <button onClick={() => setSearchTerm("")} className="absolute right-4 top-1/2 -translate-y-1/2 p-1 text-zinc-400 hover:text-[#FFA500] transition-colors">
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            <button 
              onClick={() => setIsAdding(true)}
              className="bg-[#FFA500] text-black px-6 py-4 flex items-center justify-center gap-2 hover:bg-[#FF9500] transition-all active:scale-95 font-bold text-sm whitespace-nowrap border-t sm:border-t-0 sm:border-l border-amber-600/20"
            >
              <Plus className="w-5 h-5" />
              Nova Unidade
            </button>
          </div>
        </div>

        {hives.length > 0 ? (
          <div className="space-y-6">
            <AnimatePresence mode="popLayout">
              {filteredHives.length > 0 ? (
                viewMode === "grid" ? (
                  <motion.div 
                    layout
                    className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 py-6"
                  >
                    {filteredHives.map((hive) => (
                      <motion.div 
                        key={hive.id} 
                        layout 
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                      >
                        <HiveCard 
                          hive={hive} 
                          onViewDetails={(h) => setSelectedHive(h)} 
                          onDelete={requestDeleteHive}
                          onConfirmCleaning={handleConfirmCleaning} 
                          showSobreninho={accountSettings.showSobreninho}
                        />
                      </motion.div>
                    ))}
                  </motion.div>
                ) : (
                  <motion.div 
                    layout
                    className="flex flex-col gap-4 py-6"
                  >
                    {filteredHives.map((hive) => (
                      <motion.div 
                        key={hive.id} 
                        layout 
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                      >
                        <HiveListRow 
                          hive={hive} 
                          onViewDetails={(h) => setSelectedHive(h)} 
                          onDelete={requestDeleteHive}
                          onConfirmCleaning={handleConfirmCleaning} 
                        />
                      </motion.div>
                    ))}
                  </motion.div>
                )
              ) : (
                <SearchEmptyState searchTerm={searchTerm} onClear={() => setSearchTerm("")} />
              )}
            </AnimatePresence>
          </div>
        ) : (
          <EmptyState onAdd={() => setIsAdding(true)} />
        )}
      </main>

      {/* Settings Modal */}
      <Settings 
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        user={user}
        onLogout={onLogout || (() => {})}
        onDeleteAccount={handleDeleteAccount}
        onUpdateUser={onUpdateUser || (() => {})}
        maintenanceSettings={maintenanceSettings}
        onUpdateMaintenance={setMaintenanceSettings}
        accountSettings={accountSettings}
        onUpdateAccountSettings={handleUpdateAccountSettings}
      />

      {/* Add Hive Modal */}
      <AnimatePresence>
        {isAdding && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }} 
              onClick={() => setIsAdding(false)} 
              className="absolute inset-0 bg-black/70 backdrop-blur-lg" 
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }} 
              animate={{ opacity: 1, scale: 1, y: 0 }} 
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="relative w-full max-w-md"
            >
              {/* Glow effect */}
              <div className="absolute inset-0 bg-gradient-to-br from-[#FFA500]/20 to-transparent blur-2xl rounded-3xl" />
              
              <div className="relative bg-white border-2 border-zinc-200 p-8 rounded-3xl shadow-2xl">
                {/* Header */}
                <div className="flex items-start justify-between mb-8">
                  <div className="flex items-center gap-4">
                    <div className="relative">
                      <div className="absolute inset-0 bg-[#FFA500]/20 blur-xl rounded-2xl" />
                      <div className="relative w-14 h-14 flex items-center justify-center bg-gradient-to-br from-[#FFA500] to-[#FFB520] rounded-2xl shadow-lg shadow-[#FFA500]/30">
                        <Plus className="w-7 h-7 text-black" strokeWidth={3} />
                      </div>
                    </div>
                    <div>
                      <h2 className="text-2xl font-black tracking-tight text-black">Nova Unidade</h2>
                      <p className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider mt-0.5">Registro de Dispositivo</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => setIsAdding(false)} 
                    className="w-10 h-10 flex items-center justify-center rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-500 hover:text-zinc-700 transition-all"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Form */}
                <form onSubmit={handleAddHive} className="space-y-6">
                  <TechInput 
                    label="Nome da Colmeia" 
                    placeholder="Ex: Setor Norte #01" 
                    value={newName} 
                    onChange={(e) => setNewName(e.target.value)} 
                    required 
                  />
                  <TechInput 
                    label="Identificador (ID)" 
                    placeholder="Ex: MEL-002" 
                    value={newId} 
                    onChange={(e) => setNewId(e.target.value.toUpperCase())} 
                    required 
                  />
                  
                  {/* Info box */}
                  <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl">
                    <div className="flex gap-3">
                      <Info className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-xs text-amber-800 font-semibold mb-1">Configuração Automática</p>
                        <p className="text-[11px] text-amber-700 leading-relaxed">
                          Os sensores serão inicializados com valores padrão. Configure os parâmetros após o cadastro.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Submit button */}
                  <div className="pt-2">
                    <motion.button
                      type="submit"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className="w-full h-14 bg-gradient-to-r from-[#FFA500] to-[#FFB520] text-black rounded-xl font-black text-sm uppercase tracking-wider shadow-lg shadow-[#FFA500]/30 hover:shadow-xl hover:shadow-[#FFA500]/40 transition-all"
                    >
                      Cadastrar Unidade
                    </motion.button>
                  </div>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {hivePendingDelete && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setHivePendingDelete(null)}
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
              <h3 className="text-base font-black text-center text-zinc-900 dark:text-white uppercase tracking-wider mb-2">Apagar colmeia?</h3>
              <p className="text-xs text-zinc-500 text-center leading-relaxed mb-6">
                A unidade {hivePendingDelete.name} será removida do banco de dados. Não será possível desfazer.
              </p>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setHivePendingDelete(null)}
                  className="h-11 rounded-xl bg-zinc-100 dark:bg-zinc-900 text-zinc-700 dark:text-zinc-200 text-[10px] font-black uppercase tracking-widest"
                >
                  Cancelar
                </button>
                <button
                  onClick={async () => {
                    await handleDeleteHive(hivePendingDelete.id);
                    setHivePendingDelete(null);
                  }}
                  className="h-11 rounded-xl bg-red-500 text-white text-[10px] font-black uppercase tracking-widest shadow-lg shadow-red-500/20"
                >
                  Apagar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Mobile Menu Backdrop */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <div className="fixed inset-0 z-[100] lg:hidden">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsMobileMenuOpen(false)} className="absolute inset-0 bg-black/80 backdrop-blur-md" />
            <motion.div initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }} transition={{ type: "spring", damping: 25, stiffness: 200 }} className="absolute right-0 top-0 bottom-0 w-[80%] max-w-xs bg-white dark:bg-zinc-950 p-8 flex flex-col gap-8 shadow-2xl">
               <div className="flex justify-between items-center">
                  <span className="text-xl font-black tracking-widest text-amber-500">MENU</span>
                  <button onClick={() => setIsMobileMenuOpen(false)} className="p-2 text-zinc-500"><X className="w-6 h-6" /></button>
               </div>
               <nav className="flex flex-col gap-6">
                 {['Nossa Missão', 'Manual do Usuário', 'Monitoramento', 'Modo Inverno', 'Configurações'].map((item) => (
                   <button 
                    key={item} 
                    onClick={() => {
                      if (item === 'Nossa Missão') setCurrentView('mission');
                      if (item === 'Monitoramento') setCurrentView('dashboard');
                      if (item === 'Modo Inverno') setIsWinterModeOpen(true);
                      if (item === 'Configurações') setIsSettingsOpen(true);
                      setIsMobileMenuOpen(false);
                    }}
                    className={cn(
                      "text-left text-lg font-bold uppercase tracking-widest transition-colors",
                      (item === 'Monitoramento' && currentView === 'dashboard') || (item === 'Nossa Missão' && currentView)
                        ? "text-amber-500"
                        : "text-zinc-400 hover:text-amber-500"
                    )}
                  >
                    {item}
                  </button>
                 ))}
               </nav>
               <div className="mt-auto pt-8 border-t border-zinc-100 dark:border-zinc-900">
                  <button onClick={() => { setIsMobileMenuOpen(false); if (onLogout) onLogout(); }} className="flex items-center gap-3 text-red-500 font-black tracking-widest uppercase text-sm">
                    <LogOut className="w-5 h-5" /> SAIR DO SISTEMA
                  </button>
               </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Winter Mode Modal */}
      <AnimatePresence>
        {isWinterModeOpen && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsWinterModeOpen(false)} className="absolute inset-0 bg-black/80 backdrop-blur-xl" />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }} 
              animate={{ opacity: 1, scale: 1, y: 0 }} 
              exit={{ opacity: 0, scale: 0.9, y: 20 }} 
              className="relative w-full max-w-lg bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-900 p-6 sm:p-8 rounded-[2rem] sm:rounded-[2.5rem] shadow-2xl overflow-y-auto max-h-[90vh] custom-scrollbar"
            >
              {/* Background Glow */}
              <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 blur-3xl rounded-full -mr-10 -mt-10" />
              
              <div className="flex items-center justify-between mb-8 relative">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 flex items-center justify-center bg-blue-500/10 rounded-2xl shrink-0">
                    <Moon className="w-6 h-6 text-blue-500" />
                  </div>
                  <div>
                    <h2 className="text-xl font-black tracking-tight text-zinc-900 dark:text-white uppercase italic">Modo Inverno</h2>
                    <p className="text-[10px] text-zinc-500 uppercase font-mono tracking-widest">Protocolo Amazônico</p>
                  </div>
                </div>
                <button onClick={() => setIsWinterModeOpen(false)} className="w-10 h-10 flex items-center justify-center rounded-xl bg-zinc-100 dark:bg-zinc-900 text-zinc-500 hover:text-amber-500 transition-colors shrink-0">
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="space-y-6 relative">
                <div className="p-5 sm:p-6 bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-2xl sm:rounded-3xl">
                  <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed font-medium mb-4">
                    O <span className="text-amber-500 font-bold uppercase italic tracking-wider">Modo Inverno</span> foi desenvolvido para auxiliar as colmeias durante o período do inverno amazônico (dezembro a maio), caracterizado pelo aumento das chuvas e redução de flores.
                  </p>
                  
                  <div className="space-y-4">
                    <p className="text-[11px] sm:text-xs text-zinc-500 dark:text-zinc-400 uppercase tracking-wider leading-relaxed">
                      O sistema executa a suplementação automática no horário confirmado e mantém a configuração vigente até 31 de maio. Após maio, o protocolo é desligado automaticamente.
                    </p>
                    
                    <div className="pt-4 flex flex-col gap-4">
                      <div className="flex items-center justify-between p-4 bg-zinc-100 dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800">
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            "w-10 h-10 rounded-xl flex items-center justify-center transition-colors",
                            winterMode.enabled ? "bg-amber-500/20 text-amber-500" : "bg-zinc-200 dark:bg-zinc-800 text-zinc-400"
                          )}>
                            <Cpu className="w-5 h-5" />
                          </div>
                          <div>
                            <span className="text-[10px] text-zinc-900 dark:text-white font-black uppercase tracking-widest block">Sistema</span>
                            <span className={cn(
                              "text-[9px] font-bold uppercase tracking-tighter",
                              winterMode.enabled ? "text-amber-500" : "text-zinc-500"
                            )}>
                              {winterMode.enabled ? "Protocolo Ativo" : "Protocolo Pausado"}
                            </span>
                          </div>
                        </div>
                        
                        <button 
                          onClick={handleToggleWinterMode}
                          className={cn(
                            "relative w-12 h-6 rounded-full transition-colors duration-300 focus:outline-none cursor-pointer",
                            winterMode.enabled ? "bg-amber-500" : "bg-zinc-300 dark:bg-zinc-800"
                          )}
                        >
                          <div className={cn(
                            "absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform duration-300 shadow-sm",
                            winterMode.enabled ? "translate-x-6" : "translate-x-0"
                          )} />
                        </button>
                      </div>

                      <div className="space-y-3">
                        <TechInput
                          label="Horário da Suplementação"
                          type="time"
                          icon={<Clock className="w-4 h-4" />}
                          value={winterTimeDraft}
                          onChange={(e) => setWinterTimeDraft(e.target.value)}
                        />
                        <button
                          onClick={async () => {
                            try {
                              const result = await persistWinterMode({
                                ...winterMode,
                                time: winterTimeDraft || defaultWinterMode.time,
                                activeUntilMonth: 5,
                                waterDurationMs: 2000,
                                foodDurationMs: 3000
                              });
                              if (result.failedCount > 0) {
                                toast.warning(`Horário salvo em ${result.totalCount - result.failedCount} de ${result.totalCount} colmeias.`);
                              } else {
                                toast.success("Horário do Modo Inverno salvo.");
                              }
                            } catch (error) {
                              console.error("Erro ao salvar horário do Modo Inverno:", error);
                              toast.error("Erro ao salvar horário.");
                            }
                          }}
                          className="w-full h-11 rounded-xl bg-zinc-900 dark:bg-white text-white dark:text-black text-[10px] font-black uppercase tracking-[0.2em] hover:opacity-90 transition-opacity"
                        >
                          Confirmar Horário
                        </button>
                      </div>

                      {/* Modal de Confirmação Personalizado */}
                      <AnimatePresence>
                        {showConfirmModal && (
                          <motion.div 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
                          >
                            <motion.div 
                              initial={{ scale: 0.9, opacity: 0, y: 20 }}
                              animate={{ scale: 1, opacity: 1, y: 0 }}
                              exit={{ scale: 0.9, opacity: 0, y: 20 }}
                              className="w-full max-w-xs bg-zinc-900 border border-zinc-800 rounded-3xl p-6 shadow-2xl"
                            >
                              <div className="w-12 h-12 bg-red-500/10 rounded-2xl flex items-center justify-center text-red-500 mb-4 mx-auto">
                                <AlertTriangle className="w-6 h-6" />
                              </div>
                              <h3 className="text-white font-bold text-center text-base mb-2 uppercase tracking-tight">
                                Desativar Protocolo?
                              </h3>
                              <p className="text-zinc-400 text-[11px] text-center leading-relaxed mb-6">
                                Você está prestes a desativar o Modo Inverno. Isso interromperá a suplementação automática de alimento. Deseja continuar?
                              </p>
                              <div className="grid grid-cols-2 gap-3">
                                <button 
                                  onClick={() => setShowConfirmModal(false)}
                                  className="h-10 rounded-xl bg-zinc-800 text-white text-[10px] font-bold uppercase tracking-wider hover:bg-zinc-700 transition-colors"
                                >
                                  Cancelar
                                </button>
                                <button 
                                  onClick={confirmDeactivation}
                                  className="h-10 rounded-xl bg-red-500 text-white text-[10px] font-bold uppercase tracking-wider hover:bg-red-600 transition-colors shadow-lg shadow-red-500/20"
                                >
                                  Sim, Desativar
                                </button>
                              </div>
                            </motion.div>
                          </motion.div>
                        )}
                      </AnimatePresence>

                      <p className="text-[10px] text-zinc-400 dark:text-zinc-600 italic leading-relaxed text-center px-2">
                        Gestão eficiente para garantir a sobrevivência e produtividade das abelhas durante condições climáticas adversas.
                      </p>
                    </div>
                  </div>
                </div>

                <TechButton onClick={() => setIsWinterModeOpen(false)} className="w-full h-14 rounded-xl sm:rounded-2xl text-[11px] font-black uppercase tracking-[0.2em]">
                  Fechar Painel
                </TechButton>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <NotificationPanel 
        isOpen={isNotificationPanelOpen}
        onClose={() => setIsNotificationPanelOpen(false)}
        notifications={notifications}
        onMarkAsRead={markNotificationAsRead}
        onClearAll={clearNotifications}
      />

      <footer className="mt-20 border-t border-zinc-200 dark:border-zinc-900 bg-white dark:bg-black py-10 px-4">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6 text-[10px] text-zinc-400 dark:text-zinc-600 uppercase font-mono tracking-[0.3em] font-black">
          <div className="flex flex-wrap justify-center items-center gap-8">
            <span className="flex items-center gap-2">
              <span className={cn(
                "w-2 h-2 rounded-full",
                isOnline ? "bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]" : "bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]"
              )} />
              {isOnline ? "Sincronia Global Ativa" : "Falha na Troca de Dados"}
            </span>
          </div>
          <div className="text-center md:text-right">
            &copy; Problemas? Contate: kolmenabehave@gmail.com
          </div>
        </div>
      </footer>
    </div>
  );
}

const SearchEmptyState = React.forwardRef<HTMLDivElement, { searchTerm: string, onClear: () => void }>(({ searchTerm, onClear }, ref) => {
  return (
    <motion.div ref={ref} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center justify-center py-24 px-6 text-center bg-white dark:bg-zinc-900/20 border-2 border-dashed border-zinc-200 dark:border-zinc-900 rounded-[2rem]">
      <div className="w-20 h-20 bg-zinc-50 dark:bg-zinc-900 flex items-center justify-center rounded-2xl mb-8 border border-zinc-200 dark:border-zinc-800 shadow-inner">
        <SearchX className="w-8 h-8 text-zinc-300 dark:text-zinc-700" />
      </div>
      <h3 className="text-lg font-black uppercase tracking-[0.3em] text-zinc-400 mb-3">Unidade não mapeada</h3>
      <p className="text-[11px] text-zinc-500 uppercase tracking-widest font-mono max-w-sm mb-10 leading-relaxed">
        O sistema não localizou registros para "<span className="text-amber-500 font-black">{searchTerm}</span>". Verifique os parâmetros de busca.
      </p>
      <button onClick={onClear} className="bg-zinc-900 dark:bg-white text-white dark:text-black px-10 py-4 rounded-xl text-[10px] font-black uppercase tracking-[0.3em] hover:bg-amber-500 hover:text-black dark:hover:bg-amber-500 transition-all shadow-xl">Limpar Filtros</button>
    </motion.div>
  );
});

const EmptyState = React.forwardRef<HTMLDivElement, { onAdd: () => void }>(({ onAdd }, ref) => {
  return (
    <motion.div ref={ref} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col items-center justify-center py-32 px-6 text-center space-y-12">
      <div className="relative">
        <div className="w-32 h-32 flex items-center justify-center relative animate-[pulse_4s_infinite]">
          <div className="absolute inset-0 border-2 border-zinc-200 dark:border-zinc-800 opacity-30" style={{ clipPath: "polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%)" }} />
          <div className="absolute inset-4 border border-zinc-100 dark:border-zinc-900 opacity-20" style={{ clipPath: "polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%)" }} />
          <Cpu className="w-12 h-12 text-zinc-200 dark:text-zinc-800" />
        </div>
      </div>
      <div className="max-w-lg space-y-4">
        <h2 className="text-2xl sm:text-3xl font-black tracking-[0.3em] text-zinc-300 dark:text-zinc-800 uppercase">Sistema Vazio</h2>
        <p className="text-xs sm:text-sm text-zinc-400 dark:text-zinc-700 uppercase tracking-widest font-mono leading-relaxed">Nenhum endpoint de monitoramento ativo detectado. A integração física é necessária para visualização de telemetria.</p>
      </div>
      <button onClick={onAdd} className="bg-amber-500 text-black px-12 py-5 rounded-2xl text-[11px] font-black uppercase tracking-[0.3em] hover:bg-amber-400 hover:scale-105 active:scale-95 transition-all shadow-2xl shadow-amber-500/20">Registrar Hardware</button>
    </motion.div>
  );
});
