import { notFound, redirect } from "next/navigation";
import { isValidLang } from "@/lib/language";
import { isAuthenticated } from "@/lib/auth";

type Props = {
  params: Promise<{ lang: string }>;
  children: React.ReactNode;
};

export default async function ConsoleLayout({ params, children }: Props) {
  const { lang } = await params;
  if (!isValidLang(lang)) notFound();

  const authed = await isAuthenticated();
  if (!authed) {
    // No valid session (any environment): send to /signin, where Calieo login is always available.
    redirect(`/${lang}/signin`);
  }

  return <>{children}</>;

}
