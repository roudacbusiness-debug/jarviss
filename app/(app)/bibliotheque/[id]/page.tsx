import { PdfReaderLoader } from "@/components/library/pdf-reader-loader";

export const metadata = { title: "Lecture" };

export default async function LecturePage({ params }: PageProps<"/bibliotheque/[id]">) {
  const { id } = await params;
  return <PdfReaderLoader id={id} />;
}
