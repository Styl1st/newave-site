"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

/**
 * Rend ses enfants directement dans <body>.
 *
 * Sans ça, un panneau en position fixe reste prisonnier du contexte
 * d'empilement de son parent : l'en-tête et le contenu principal ont
 * tous deux un z-index, donc un menu ouvert depuis l'en-tête passait
 * derrière le texte de la page, quel que soit son propre z-index.
 */
export default function Portal({ children }: { children: React.ReactNode }) {
  const [monte, setMonte] = useState(false);
  useEffect(() => setMonte(true), []);
  if (!monte) return null;
  return createPortal(children, document.body);
}
