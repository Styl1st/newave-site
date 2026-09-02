/**
 * Jeu d'icônes du site.
 *
 * Des SVG plutôt que des emoji : les emoji changent de dessin selon
 * l'appareil, s'alignent mal sur le texte, et jurent avec une identité
 * chromée. Ceux-ci héritent de la couleur du texte et restent nets.
 */

type Props = { className?: string };

const base = "h-[1.05em] w-[1.05em] shrink-0";

function Svg({ className, children }: Props & { children: React.ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.1"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={`${base} ${className ?? ""}`}
    >
      {children}
    </svg>
  );
}

export const IconBack = (p: Props) => (
  <Svg {...p}><path d="M19 12H5" /><path d="m12 19-7-7 7-7" /></Svg>
);
export const IconArrow = (p: Props) => (
  <Svg {...p}><path d="M5 12h14" /><path d="m12 5 7 7-7 7" /></Svg>
);
export const IconPencil = (p: Props) => (
  <Svg {...p}><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" /></Svg>
);
export const IconCheck = (p: Props) => (
  <Svg {...p}><path d="M20 6 9 17l-5-5" /></Svg>
);
export const IconCross = (p: Props) => (
  <Svg {...p}><path d="M18 6 6 18" /><path d="m6 6 12 12" /></Svg>
);
export const IconClock = (p: Props) => (
  <Svg {...p}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></Svg>
);
export const IconPlus = (p: Props) => (
  <Svg {...p}><path d="M12 5v14" /><path d="M5 12h14" /></Svg>
);
export const IconTrash = (p: Props) => (
  <Svg {...p}><path d="M3 6h18" /><path d="M8 6V4h8v2" /><path d="M19 6l-1 14H6L5 6" /></Svg>
);
export const IconGrid = (p: Props) => (
  <Svg {...p}><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /></Svg>
);
export const IconTag = (p: Props) => (
  <Svg {...p}><path d="M20.6 13.4 12 22l-9-9V3h10l7.6 7.6a2 2 0 0 1 0 2.8Z" /><circle cx="7.5" cy="7.5" r="1.2" fill="currentColor" /></Svg>
);
export const IconImage = (p: Props) => (
  <Svg {...p}><rect x="3" y="4" width="18" height="16" rx="2" /><circle cx="8.5" cy="9.5" r="1.6" /><path d="m21 16-5-5L5 20" /></Svg>
);
export const IconInbox = (p: Props) => (
  <Svg {...p}><path d="M3 12h5l2 3h4l2-3h5" /><path d="M5 5h14l2 7v5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-5Z" /></Svg>
);
export const IconExternal = (p: Props) => (
  <Svg {...p}><path d="M15 3h6v6" /><path d="M10 14 21 3" /><path d="M21 14v5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5" /></Svg>
);
export const IconEye = (p: Props) => (
  <Svg {...p}><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7-10-7-10-7Z" /><circle cx="12" cy="12" r="3" /></Svg>
);
export const IconDownload = (p: Props) => (
  <Svg {...p}><path d="M12 3v12" /><path d="m7 10 5 5 5-5" /><path d="M4 21h16" /></Svg>
);
export const IconUser = (p: Props) => (
  <Svg {...p}><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></Svg>
);
/* L'entonnoir : le dessin que tout le monde reconnaît comme « filtrer ». */
export const IconFiltre = (p: Props) => (
  <Svg {...p}><path d="M3 5h18l-7 8v6l-4 2v-8Z" /></Svg>
);
export const IconChevron = (p: Props) => (
  <Svg {...p}><path d="m6 9 6 6 6-6" /></Svg>
);
export const IconLoupe = (p: Props) => (
  <Svg {...p}><circle cx="11" cy="11" r="7" /><path d="m20 20-3.6-3.6" /></Svg>
);
/* Le cœur en trait, celui d'un raccourci. Le cœur PLEIN, lui, dit
   « déjà mis de côté » et vit dans `FavoriteButton` : deux sens
   différents ne doivent pas partager le même dessin. */
export const IconCoeur = (p: Props) => (
  <Svg {...p}>
    <path d="M12 20.5 4.3 13a4.8 4.8 0 0 1 6.8-6.8l.9.9.9-.9A4.8 4.8 0 0 1 19.7 13Z" />
  </Svg>
);
