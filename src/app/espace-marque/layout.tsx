import { requireUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function BrandSpaceLayout({ children }: { children: React.ReactNode }) {
  await requireUser();
  return <div className="mx-auto w-full max-w-5xl px-[var(--pad)] py-10">{children}</div>;
}
