import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AuthLayout } from "@/app/components/auth-layout";
import { LoginForm } from "@/app/components/auth/login-form";
import { RegisterForm } from "@/app/components/auth/register-form";
import { Dashboard } from "@/app/components/dashboard/hive-grid";
import imagem from "../assets/69de2de8cbe1c6eb64f795e4bb75e930fcb77729.png";
import { auth } from "@/lib/firebase";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup,
  updateProfile,
  sendPasswordResetEmail,
  signOut
} from "firebase/auth";

import { toast } from "sonner";

type AppView = "login" | "register" | "dashboard";

export default function App() {
  const [view, setView] = useState<AppView>("login");
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        setView("dashboard");
      } else {
        setUser((prev: any) => {
          if (prev?.isDemo) return prev;
          if (view === "dashboard") setView("login");
          return null;
        });
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [view]);

  const handleUpdateUser = (updates: { displayName?: string; email?: string }) => {
    setUser((prev: any) => ({
      ...prev,
      ...updates
    }));

    if (auth.currentUser && !user?.isDemo) {
      updateProfile(auth.currentUser, updates).catch(() => {
        toast.error("Erro ao atualizar perfil.");
      });
    }
  };

  const handleGoogleAuth = async () => {
    setLoading(true);
    const provider = new GoogleAuthProvider();

    try {
      await signInWithPopup(auth, provider);
      toast.success("Login com Google realizado.");
    } catch (error: any) {
      if (error.code === "auth/configuration-not-found") {
        setUser({
          displayName: "Demo User",
          email: "demo@kolmena.com",
          isDemo: true
        });
        setView("dashboard");
        toast.info("Modo demo ativado.");
      } else {
        toast.error("Erro no login.");
      }
      setLoading(false);
    }
  };

  const handleEmailLogin = async (email: string, pass: string) => {
    setLoading(true);

    try {
      await signInWithEmailAndPassword(auth, email, pass);
      toast.success("Bem-vindo!");
    } catch {
      toast.error("Email ou senha inválidos.");
      setLoading(false);
    }
  };

  const handleEmailRegister = async (name: string, email: string, pass: string) => {
    setLoading(true);

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, pass);
      await updateProfile(userCredential.user, { displayName: name });

      setUser({
        ...userCredential.user,
        displayName: name
      });

      toast.success("Conta criada!");
    } catch {
      toast.error("Erro ao registrar.");
      setLoading(false);
    }
  };

  const handleForgotPassword = async (email: string) => {
    try {
      await sendPasswordResetEmail(auth, email);
      toast.success("Email enviado.");
    } catch {
      toast.error("Erro ao enviar email.");
    }
  };

  const handleLogout = async () => {
    setLoading(true);

    try {
      if (!user?.isDemo) await signOut(auth);
      setUser(null);
      setView("login");
    } catch {
      toast.error("Erro ao sair.");
    } finally {
      setLoading(false);
    }
  };

  if (view === "dashboard" && user) {
    return (
      <Dashboard
        onLogout={handleLogout}
        user={user}
        onUpdateUser={handleUpdateUser}
      />
    );
  }

  return (

      <div className="flex min-h-screen w-full">

        {/* LADO ESQUERDO (PC) */}
        <div className="hidden md:flex w-[40%] text-white flex-col justify-center px-16" 
 style={{
    backgroundImage: "url('https://i.pinimg.com/736x/86/65/eb/8665ebfffc7b4b4ad297bda11ff8f559.jpg')",
    backgroundSize: "cover",
    backgroundPosition: "center"
  }} >
{/*bg-gradient-to-br from-yellow-700 via-yellow-500 to-yellow-300*/}
{/*      
          <h1 className="text-4xl font-bold mb-4">KOLMENA</h1>
          <h2 className="text-3xl font-bold text-yellow-400">
            Dolor sit amet <br /> Consectetur
          </h2>
          <p className="mt-4 text-sm opacity-80">
            Suas abelhas mais saudáveis.
          </p>
        </div> */}
        </div>

        {/* ⚪ LADO DIREITO (LOGIN) */}
        <div className="w-full md:w-[50%] flex items-center justify-center px-3">
          <div className="w-full max-w-md space-y-2">

            {/* LOGO */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center gap-4"
            >
              <img src={imagem} style={{ width: "120px" }} />

              <h1 className="text-4xl font-black tracking-[0.2em] text-black uppercase">
                KOLMENA
              </h1>

              <p className="text-xs text-zinc-500 uppercase tracking-[0.2em]">
                Suas abelhas mais saudáveis.
              </p>
            </motion.div>

            {/* FORM */}
            <AnimatePresence mode="wait">
              {view === "login" ? (
                <motion.div
                  key="login"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                >
                  <LoginForm
                    onSwitchToRegister={() => setView("register")}
                    onGoogleLogin={handleGoogleAuth}
                    onEmailLogin={handleEmailLogin}
                    onForgotPassword={handleForgotPassword}
                  />
                </motion.div>
              ) : (
                <motion.div
                  key="register"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                >
                  <RegisterForm
                    onSwitchToLogin={() => setView("login")}
                    onGoogleRegister={handleGoogleAuth}
                    onEmailRegister={handleEmailRegister}
                  />
                </motion.div>
              )}
            </AnimatePresence>

          </div>
        </div>

        {/* LOADING */}
        {loading && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center">
            <div className="w-12 h-12 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
          </div>
        )}

      </div>
  );
}