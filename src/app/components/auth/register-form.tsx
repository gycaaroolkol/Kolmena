import React, { useState } from "react";
import { TechInput } from "@/app/components/ui/tech-input";
import { TechButton } from "@/app/components/ui/tech-button";
import { Eye, EyeOff, Lock, Mail, User } from "lucide-react";
import { motion } from "motion/react";

interface RegisterFormProps {
  onSwitchToLogin: () => void;
  onGoogleRegister?: () => void;
  onEmailRegister?: (name: string, email: string, pass: string) => void;
}

export function RegisterForm({ onSwitchToLogin, onGoogleRegister, onEmailRegister }: RegisterFormProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (onEmailRegister) {
      onEmailRegister(name, email, password);
    }
  };

  return (
    <div className="w-full space-y-8">
      {/* Título Principal - HIERARQUIA 1 */}
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center"
      >
        <h2 className="text-2xl sm:text-3xl font-bold text-black mb-2">
          Criar Nova Conta
        </h2>
        <p className="text-sm text-zinc-600">
          Inicie o monitoramento da sua unidade
        </p>
      </motion.div>

      {/* Formulário - HIERARQUIA 2 */}
      <motion.form 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        onSubmit={handleSubmit}
        className="space-y-5"
      >
        <TechInput
          label="Nome Completo"
          type="text"
          placeholder="Seu nome"
          value={name}
          onChange={(e) => setName(e.target.value)}
          icon={<User className="w-5 h-5" />}
          required
        />

        <TechInput
          label="E-mail"
          type="email"
          placeholder="seu@email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          icon={<Mail className="w-5 h-5" />}
          required
        />
        
        <TechInput
          label="Senha"
          type={showPassword ? "text" : "password"}
          placeholder="••••••••"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          icon={<Lock className="w-5 h-5" />}
          rightElement={
            <button
              type="button"
              onClick={() => setShowPassword((current) => !current)}
              aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
              aria-pressed={showPassword}
              className="flex h-10 w-10 items-center justify-center rounded-md text-zinc-500 transition-colors hover:text-[#FFA500] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFA500]/40"
            >
              {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          }
          required
        />

        <div className="space-y-3 pt-4">
          <TechButton type="submit" className="h-12 text-base">
            Criar Conta
          </TechButton>

          <div className="relative flex items-center py-4">
            <div className="flex-grow border-t border-zinc-300"></div>
            <span className="flex-shrink mx-4 text-xs text-zinc-500 uppercase">Ou</span>
            <div className="flex-grow border-t border-zinc-300"></div>
          </div>

          <TechButton 
            variant="outline" 
            type="button" 
            onClick={onGoogleRegister}
            className="h-12 gap-3 text-sm"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
              <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Cadastrar com Google
          </TechButton>
        </div>
      </motion.form>

      {/* Ação Secundária - HIERARQUIA 3 */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="text-center pt-4"
      >
        <p className="text-sm text-zinc-600">
          Já possui uma conta?{" "}
          <button 
            onClick={onSwitchToLogin}
            className="text-[#FFA500] font-bold hover:text-[#FF9500] transition-colors"
          >
            Fazer login
          </button>
        </p>
      </motion.div>
    </div>
  );
}
