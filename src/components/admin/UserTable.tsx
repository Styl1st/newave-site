"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useConfirmationCle } from "@/lib/confirmation";
import { deleteUserAccount, updateUserRole } from "@/app/admin/actions";
import { IconArrow, IconTrash, IconUser } from "@/components/Icons";
import { ROLE_LABEL, type Profile, type Role } from "@/lib/types";

type Row = Profile & { brands: number };

/**
 * Tableau des comptes : recherche, changement de rôle, accès à la fiche.
 * La recherche se fait côté navigateur — quelques centaines de comptes
 * tiennent en mémoire sans effort, et le résultat est instantané.
 */
export default function UserTable({ users, meId }: { users: Row[]; meId: string }) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"tous" | Role>("tous");
  const [note, setNote] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const { cle, demander, desarmer } = useConfirmationCle();

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    return users.filter((u) => {
      if (filter !== "tous" && u.role !== filter) return false;
      if (!q) return true;
      return (
        (u.email ?? "").toLowerCase().includes(q) ||
        (u.display_name ?? "").toLowerCase().includes(q)
      );
    });
  }, [users, query, filter]);

  function supprimer(user: Row) {
    if (!demander(user.id)) {
      setNote(
        `Appuie encore pour supprimer définitivement le compte de ${user.email}. Ses favoris, coups de cœur et rattachements partiront avec ; les marques resteront.`
      );
      return;
    }
    desarmer();

    const formData = new FormData();
    formData.set("user_id", user.id);

    startTransition(async () => {
      const res = await deleteUserAccount(formData);
      setNote(res.ok ? null : (res.error ?? "La suppression a échoué."));
      router.refresh();
    });
  }

  function changeRole(userId: string, role: Role) {
    const formData = new FormData();
    formData.set("user_id", userId);
    formData.set("role", role);

    startTransition(async () => {
      const res = await updateUserRole(formData);
      setNote(res.ok ? null : (res.error ?? "Le changement a échoué."));
      router.refresh();
    });
  }

  const chip =
    "rounded-full px-3.5 py-2 text-[11.5px] font-bold uppercase tracking-[0.07em] transition active:scale-[.97]";
  const off = "bg-white/12 text-white/80 hover:bg-white/22 hover:text-white";
  const on = "bg-white text-[var(--color-ink)]";

  return (
    <>
      <div className="glass mb-5 flex flex-col gap-3 p-5">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Chercher par email ou par nom…"
          className="w-full rounded-[13px] border border-white/60 bg-white/94 px-4 py-3 text-[14px] font-semibold text-[var(--color-ink)] placeholder:font-medium placeholder:text-[#8a7bab] focus:outline-none focus:ring-[3px] focus:ring-white/55"
        />
        <div className="flex flex-wrap gap-2">
          <button onClick={() => setFilter("tous")} className={`${chip} ${filter === "tous" ? on : off}`}>
            Tous ({users.length})
          </button>
          <button onClick={() => setFilter("admin")} className={`${chip} ${filter === "admin" ? on : off}`}>
            Admins
          </button>
          <button onClick={() => setFilter("createur")} className={`${chip} ${filter === "createur" ? on : off}`}>
            Créateurs
          </button>
          <button onClick={() => setFilter("membre")} className={`${chip} ${filter === "membre" ? on : off}`}>
            Membres
          </button>
        </div>
      </div>

      {note && (
        <p className="glass m-0 mb-5 px-5 py-3 text-[13.5px] leading-relaxed text-white">{note}</p>
      )}

      {results.length === 0 ? (
        <div className="glass p-8 text-center">
          <p className="m-0 text-[15px] text-white/85">Aucun compte ne correspond.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {results.map((u) => (
            <div key={u.id} className="card-light p-4">
              <div className="relative z-3 flex flex-wrap items-center gap-4">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[rgba(23,10,51,0.08)] text-[15px] font-black text-[var(--color-ink)]">
                  {(u.display_name ?? u.email ?? "?").charAt(0).toUpperCase()}
                </span>

                <Link href={`/admin/utilisateurs/${u.id}`} className="min-w-0 flex-1">
                  <span className="block truncate text-[14.5px] font-extrabold text-[var(--color-ink)]">
                    {u.display_name ?? u.email}
                    {u.id === meId && (
                      <span className="ml-2 text-[11px] font-bold text-[#6a5a92]">(toi)</span>
                    )}
                  </span>
                  <span className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[12px] font-semibold text-[#6a5a92]">
                    {u.display_name && <span className="truncate">{u.email}</span>}
                    {u.brands > 0 && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-[rgba(23,10,51,0.07)] px-2 py-0.5 text-[10.5px] font-bold uppercase tracking-[0.06em]">
                        <IconUser className="h-3 w-3" /> {u.brands} marque{u.brands > 1 ? "s" : ""}
                      </span>
                    )}
                  </span>
                </Link>

                <select
                  value={u.role}
                  disabled={pending}
                  onChange={(e) => changeRole(u.id, e.target.value as Role)}
                  aria-label={`Rôle de ${u.email}`}
                  className="rounded-[11px] border border-[rgba(23,10,51,0.18)] bg-white px-3 py-2 text-[12.5px] font-bold text-[var(--color-ink)] disabled:opacity-50"
                >
                  <option value="membre">{ROLE_LABEL.membre}</option>
                  <option value="createur">{ROLE_LABEL.createur}</option>
                  <option value="admin">{ROLE_LABEL.admin}</option>
                </select>

                <Link
                  href={`/admin/utilisateurs/${u.id}`}
                  aria-label={`Voir ${u.email}`}
                  className="grid h-9 w-9 place-items-center rounded-full bg-[rgba(23,10,51,0.07)] text-[#3a2470] transition hover:bg-[rgba(23,10,51,0.15)]"
                >
                  <IconArrow className="h-4 w-4" />
                </Link>

                {/* Ni soi-même, ni un autre administrateur : il faut
                    d'abord lui retirer le rôle, ce qui force à y penser. */}
                {u.id !== meId && u.role !== "admin" && (
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => supprimer(u)}
                    onBlur={desarmer}
                    aria-label={`Supprimer le compte de ${u.email}`}
                    title={cle === u.id ? "Appuie encore pour confirmer" : "Supprimer ce compte"}
                    className={`inline-flex h-9 items-center justify-center gap-1.5 rounded-full transition disabled:opacity-40 ${
                      cle === u.id
                        ? "bg-[#c2273f] px-3 text-[11.5px] font-black text-white"
                        : "w-9 bg-[rgba(194,39,63,0.1)] text-[#c2273f] hover:bg-[#c2273f] hover:text-white"
                    }`}
                  >
                    <IconTrash className="h-4 w-4" />
                    {cle === u.id && <span>Confirmer</span>}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
