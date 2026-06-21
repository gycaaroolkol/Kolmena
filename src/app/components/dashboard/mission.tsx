import React from "react";
import { motion } from "motion/react";
import { ArrowLeft, Instagram, Users, Target, Rocket } from "lucide-react";
import { ImageWithFallback } from "@/app/components/figma/ImageWithFallback";

interface MissionProps {
  onBack: () => void;
}

export function Mission({ onBack }: MissionProps) {
  const team = [
    { name: "Caroline Menezes" },
    { name: "Helena Iannuzzi" },
    { name: "Rebeca Azevedo" }
  ];

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black text-zinc-900 dark:text-zinc-100 selection:bg-amber-500/30">
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-amber-500/5 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-amber-500/5 blur-[120px] rounded-full" />
      </div>

      <header className="border-b border-zinc-200 dark:border-zinc-900 bg-white/70 dark:bg-black/70 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 h-16 sm:h-20 flex items-center gap-4">
          <button 
            onClick={onBack}
            className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-900 rounded-xl transition-colors text-zinc-500 hover:text-amber-500"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <div className="flex items-center gap-3">
            <span className="text-xl font-black tracking-[0.3em] uppercase bg-gradient-to-r from-amber-500 to-amber-200 bg-clip-text text-transparent">Nossa Missão</span>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-12 sm:py-20 relative z-10">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-16"
        >
          {/* Hero Section */}
          <div className="text-center space-y-6">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-amber-500/10 border border-amber-500/20 rounded-full mb-4">
              <Target className="w-4 h-4 text-amber-500" />
              <span className="text-[10px] text-amber-500 uppercase font-black tracking-[0.2em]">O Propósito Kolmena</span>
            </div>
            <h1 className="text-4xl sm:text-6xl font-black tracking-tighter leading-tight">
              TECNOLOGIA PARA A <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-500 to-amber-300">PRESERVAÇÃO DA VIDA</span>
            </h1>
            <p className="text-lg text-zinc-600 dark:text-zinc-400 font-medium leading-relaxed max-w-2xl mx-auto">
              Olá, seja bem-vindo ao projeto KOLMENA! É um prazer ter você por aqui, e com certeza, suas abelhas agradecem.
            </p>
          </div>

          {/* Team Section */}
          <div className="space-y-10">
            <div className="flex items-center gap-4">
              <Users className="w-6 h-6 text-amber-500" />
              <h2 className="text-xl font-black uppercase tracking-widest">A Equipe</h2>
            </div>
            
            <p className="text-zinc-600 dark:text-zinc-400 leading-relaxed">
              Somos um trio de projeto de Mecatrônica da fundação <strong>Matias Machline</strong>, composto pelas alunas: <strong>Caroline Menezes</strong>, <strong>Helena Iannuzzi</strong> e <strong>Rebeca Azevedo</strong>.
            </p>
          </div>

          {/* Project Details */}
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-8 sm:p-12 rounded-[2.5rem] relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/5 blur-3xl rounded-full -mr-32 -mt-32" />
            
            <div className="space-y-8 relative z-10">
              <div className="flex items-center gap-4">
                <Rocket className="w-6 h-6 text-amber-500" />
                <h2 className="text-xl font-black uppercase tracking-widest text-zinc-900 dark:text-white">Nossa Visão</h2>
              </div>
              
              <div className="space-y-6 text-zinc-600 dark:text-zinc-400 leading-relaxed text-lg">
                <p>
                  Somos um projeto voltado ao desenvolvimento de soluções tecnológicas para a proteção das abelhas e das colmeias frente aos desafios impostos pelas mudanças climáticas.
                </p>
                <p>
                  Trabalhamos na criação de um sistema embarcado semi-autônomo capaz de monitorar variáveis essenciais à vida das colmeias, como temperatura e umidade, buscando melhorar o bem-estar das abelhas e, consequentemente, sua produtividade.
                </p>
                <p className="font-bold text-zinc-900 dark:text-zinc-100">
                  Acreditamos que a tecnologia é a maior aliada da natureza. Nosso propósito é unir inovação e ciência para monitorar, proteger e garantir que o zumbido das abelhas continue ecoando, transformando dados em sobrevivência, evitando sua extinção.
                </p>
              </div>
            </div>
          </div>

          {/* Social Media */}
          <div className="flex flex-col items-center gap-8 pt-10">
            <div className="h-[1px] w-24 bg-zinc-200 dark:bg-zinc-800" />
            <a 
              href="https://instagram.com/kolmena.bee" 
              target="_blank" 
              rel="noopener noreferrer"
              className="group flex items-center gap-4 px-8 py-4 bg-zinc-900 dark:bg-white text-white dark:text-black rounded-2xl hover:bg-amber-500 dark:hover:bg-amber-500 hover:text-black transition-all shadow-2xl"
            >
              <Instagram className="w-6 h-6" />
              <span className="font-black uppercase tracking-widest text-sm">@kolmena.bee</span>
            </a>
            <p className="text-[10px] text-zinc-500 uppercase tracking-[0.4em] font-black">Acompanhe nossa jornada</p>
          </div>
        </motion.div>
      </main>
    </div>
  );
}