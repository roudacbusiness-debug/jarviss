import { Suspense } from "react";

export const metadata = { title: "Connexion" };

export default function ConnexionLayout({ children }: LayoutProps<"/connexion">) {
  return <Suspense>{children}</Suspense>;
}
