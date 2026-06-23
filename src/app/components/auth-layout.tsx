import React from "react";
import bgImage from "../components/../../assets/9845a51d03cbe39850723366e5e93e1fc7de1ca0.png";

export const AuthLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <div className="min-h-screen w-full flex items-center justify-center overflow-hidden relative font-sans bg-white">
      {/* Textura leve de abelhinhas no fundo */}
      <div 
        className="absolute inset-0"
        style={{
          ///backgroundImage: `url(${bgImage})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          opacity: 0.7
        }}
      />

      {/* Gradientes sutis para profundidade */}
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-[#FFA500]/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-[#FF9500]/5 rounded-full blur-[120px] pointer-events-none" />

      {/* Conteúdo sem card - direto sobre o fundo */}
      <main className="relative z-10 w-full max-w-md px-6 sm:px-8 py-12 my-auto">
        {children}
      </main>
    </div>
  );
};