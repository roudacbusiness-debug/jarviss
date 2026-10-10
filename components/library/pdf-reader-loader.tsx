"use client";

import dynamic from "next/dynamic";
import { Loader2 } from "lucide-react";

// pdf.js touche `document` au chargement : le lecteur n'est rendu que côté navigateur.
const PdfReader = dynamic(() => import("./pdf-reader").then((m) => m.PdfReader), {
  ssr: false,
  loading: () => (
    <div className="flex h-dvh items-center justify-center text-muted">
      <Loader2 className="h-5 w-5 animate-spin" />
    </div>
  ),
});

export function PdfReaderLoader({ id }: { id: string }) {
  return <PdfReader id={id} />;
}
