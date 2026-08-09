import UserTable from "@/components/admin/UserTable";
import { IconUser } from "@/components/Icons";
import { requireAdmin } from "@/lib/auth";
import { adminGetProfiles, adminGetUserBrands } from "@/lib/admin-queries";

export default async function AdminUsers() {
  const [me, profiles] = await Promise.all([requireAdmin(), adminGetProfiles()]);

  // Le nombre de marques gérées par compte, pour distinguer d'un coup
  // d'œil un créateur d'un simple membre.
  const users = await Promise.all(
    profiles.map(async (p) => ({
      ...p,
      brands: (await adminGetUserBrands(p.id)).length,
    }))
  );

  return (
    <>
      <header className="mb-5 sm:mb-7">
        <p className="eyebrow m-0 flex items-center gap-2">
          <IconUser /> La communauté
        </p>
        <h1 className="m-0 mt-2 text-[clamp(20px,4.4vw,29px)] font-extrabold tracking-[-0.03em] text-white">
          Comptes
        </h1>
      </header>

      <UserTable users={users} meId={me.id} />
    </>
  );
}
