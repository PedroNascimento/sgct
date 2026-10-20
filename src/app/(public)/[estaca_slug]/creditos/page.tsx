import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/infrastructure/supabase/server";
import { SupabaseCreditRepository } from "@/infrastructure/supabase/supabase-credit-repository";
import { MemberCreditsView } from "@/components/credit/member-credits-view";

interface CreditosPageProps {
  params: Promise<{
    estaca_slug: string;
  }>;
}

export default async function CreditosPage({ params }: CreditosPageProps) {
  const { estaca_slug } = await params;
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/${estaca_slug}/auth/login?redirectTo=/${estaca_slug}/creditos`);
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", user.id)
    .single();

  const creditRepo = new SupabaseCreditRepository(supabase);
  const credits = await creditRepo.findByUserId(user.id);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 py-10">
      <MemberCreditsView credits={credits} userName={profile?.full_name} />
    </div>
  );
}
