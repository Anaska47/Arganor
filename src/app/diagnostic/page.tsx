"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { getAffiliateLink } from "@/lib/affiliate";

// Simulation of products for the client side
const mockProducts = [
  {
    id: "p-face-dry",
    name: "Sérum Anti-Âge Acide Hyaluronique",
    category: "Soin du Visage",
    image: "https://images.unsplash.com/photo-1620916566398-39f1143ab7be?q=80&w=1887&auto=format&fit=crop",
    description: "Le remède absolu pour repulper la peau sèche et combler les rides.",
    match: { target: "visage", concern: "anti-age" }
  },
  {
    id: "p-hair-growth",
    name: "Huile de Ricin Pure & Romarin",
    category: "Soin des Cheveux",
    image: "https://images.unsplash.com/photo-1598440947619-2c35fc9aa908?q=80&w=1935&auto=format&fit=crop",
    description: "Stimule la pousse capillaire et densifie la fibre en 4 semaines.",
    match: { target: "cheveux", concern: "pousse" }
  },
  {
    id: "p-body-hydrate",
    name: "Baume Corporel Argan & Karité",
    category: "Soin du Corps",
    image: "https://images.unsplash.com/photo-1616683693504-3ea7e9ad6fec?q=80&w=1974&auto=format&fit=crop",
    description: "Hydratation profonde de 48h pour les peaux les plus sensibles.",
    match: { target: "corps", concern: "hydratation" }
  },
  {
    id: "p-face-acne",
    name: "Huile de Jojoba Purifiante",
    category: "Soin du Visage",
    image: "https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?q=80&w=2070&auto=format&fit=crop",
    description: "Régule le sébum et élimine les imperfections naturellement.",
    match: { target: "visage", concern: "imperfections" }
  }
];

export default function DiagnosticPage() {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({ target: "", concern: "" });
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<any>(null);

  const handleAnswer = (key: string, value: string) => {
    const newAnswers = { ...answers, [key]: value };
    setAnswers(newAnswers);
    
    if (step === 0) {
      setStep(1);
    } else if (step === 1) {
      // Simulate AI analysis
      setStep(2);
      setIsAnalyzing(true);
      setTimeout(() => {
        setIsAnalyzing(false);
        // Find best match
        let bestMatch = mockProducts[0];
        for (const p of mockProducts) {
          if (p.match.target === newAnswers.target && p.match.concern === newAnswers.concern) {
            bestMatch = p;
            break;
          }
        }
        if (!bestMatch) {
            bestMatch = newAnswers.target === "cheveux" ? mockProducts[1] : mockProducts[0];
        }
        setResult(bestMatch);
      }, 2500);
    }
  };

  return (
    <>
      <Header />
      <main style={{ minHeight: '80vh', background: 'var(--color-black)', color: 'var(--color-white)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '4rem 1rem' }}>
        <div className="diagnostic-container" style={{ maxWidth: '600px', width: '100%', background: '#1A1A1A', borderRadius: '16px', padding: '3rem', border: '1px solid #333', boxShadow: '0 20px 40px rgba(0,0,0,0.5)', textAlign: 'center' }}>
          
          {step === 0 && (
            <div className="fade-in">
              <span style={{ color: 'var(--color-gold)', textTransform: 'uppercase', letterSpacing: '2px', fontSize: '0.9rem' }}>Diagnostic Expert</span>
              <h1 style={{ fontSize: '2.5rem', margin: '1rem 0 2rem 0', fontFamily: 'var(--font-playfair)' }}>Quelle est votre priorité ?</h1>
              <div style={{ display: 'grid', gap: '1rem' }}>
                <button onClick={() => handleAnswer('target', 'visage')} style={btnStyle}>✨ Soin du Visage</button>
                <button onClick={() => handleAnswer('target', 'cheveux')} style={btnStyle}>🌿 Soin des Cheveux</button>
                <button onClick={() => handleAnswer('target', 'corps')} style={btnStyle}>🧴 Soin du Corps</button>
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="fade-in">
              <span style={{ color: 'var(--color-gold)', textTransform: 'uppercase', letterSpacing: '2px', fontSize: '0.9rem' }}>Étape 2/2</span>
              <h1 style={{ fontSize: '2.5rem', margin: '1rem 0 2rem 0', fontFamily: 'var(--font-playfair)' }}>Quel est votre objectif principal ?</h1>
              <div style={{ display: 'grid', gap: '1rem' }}>
                {answers.target === 'visage' && (
                  <>
                    <button onClick={() => handleAnswer('concern', 'anti-age')} style={btnStyle}>Anti-âge & Rides</button>
                    <button onClick={() => handleAnswer('concern', 'imperfections')} style={btnStyle}>Acné & Imperfections</button>
                  </>
                )}
                {answers.target === 'cheveux' && (
                  <>
                    <button onClick={() => handleAnswer('concern', 'pousse')} style={btnStyle}>Stimuler la Pousse</button>
                    <button onClick={() => handleAnswer('concern', 'hydratation')} style={btnStyle}>Réparer les pointes sèches</button>
                  </>
                )}
                {answers.target === 'corps' && (
                  <button onClick={() => handleAnswer('concern', 'hydratation')} style={btnStyle}>Hydratation Profonde</button>
                )}
              </div>
            </div>
          )}

          {step === 2 && isAnalyzing && (
            <div className="fade-in pulse" style={{ padding: '4rem 0' }}>
              <div style={{ width: '60px', height: '60px', border: '3px solid #333', borderTop: '3px solid var(--color-gold)', borderRadius: '50%', margin: '0 auto 2rem auto', animation: 'spin 1s linear infinite' }}></div>
              <h2 style={{ fontFamily: 'var(--font-playfair)', fontSize: '1.8rem', color: 'var(--color-gold)' }}>Analyse algorithmique en cours...</h2>
              <p style={{ color: '#888', marginTop: '1rem' }}>Recherche du traitement naturel optimal pour vos besoins.</p>
              <style>{`
                @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
                .pulse { animation: pulse 2s infinite; }
                @keyframes pulse { 0% { opacity: 0.8; } 50% { opacity: 1; } 100% { opacity: 0.8; } }
              `}</style>
            </div>
          )}

          {step === 2 && !isAnalyzing && result && (
            <div className="fade-in" style={{ animation: 'slideUp 0.6s ease-out' }}>
              <span style={{ background: 'var(--color-gold)', color: '#000', padding: '4px 12px', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 'bold', textTransform: 'uppercase' }}>Correspondance à 98%</span>
              <h1 style={{ fontSize: '2rem', margin: '1.5rem 0', fontFamily: 'var(--font-playfair)', color: 'var(--color-white)' }}>Votre Prescription Beauté</h1>
              
              <div style={{ background: '#000', padding: '2rem', borderRadius: '12px', border: '1px solid #333', marginBottom: '2rem' }}>
                <a href={getAffiliateLink({ name: result.name } as any, 'fr')} target="_blank" rel="noopener noreferrer">
                  <img src={result.image} alt={result.name} style={{ width: '100%', height: '250px', objectFit: 'cover', borderRadius: '8px', marginBottom: '1.5rem', border: '1px solid #444' }} />
                </a>
                <h3 style={{ fontSize: '1.5rem', marginBottom: '0.5rem', color: 'var(--color-gold-light)' }}>{result.name}</h3>
                <p style={{ color: '#AAA', fontSize: '0.95rem', lineHeight: '1.6', marginBottom: '1.5rem' }}>{result.description}</p>
                
                <a 
                  href={getAffiliateLink({ name: result.name } as any, 'fr')} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  style={{ display: 'block', width: '100%', padding: '16px', background: '#FF9900', color: '#000', fontWeight: 'bold', fontSize: '1.1rem', borderRadius: '8px', textDecoration: 'none', transition: 'all 0.3s ease' }}
                  onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.02)'}
                  onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
                >
                  🛒 Commander sur Amazon
                </a>
              </div>
              
              <button onClick={() => setStep(0)} style={{ background: 'transparent', color: '#888', border: 'none', textDecoration: 'underline', cursor: 'pointer' }}>Refaire le diagnostic</button>
            </div>
          )}

          <style>{`
            .fade-in { animation: fadeIn 0.4s ease-in; }
            @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
            @keyframes slideUp { from { opacity: 0; transform: translateY(30px); } to { opacity: 1; transform: translateY(0); } }
          `}</style>
        </div>
      </main>
      <Footer />
    </>
  );
}

const btnStyle = {
  background: 'transparent',
  border: '1px solid #444',
  color: 'var(--color-white)',
  padding: '16px 24px',
  fontSize: '1.1rem',
  borderRadius: '8px',
  cursor: 'pointer',
  transition: 'all 0.2s',
  textAlign: 'left' as const,
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center'
};
