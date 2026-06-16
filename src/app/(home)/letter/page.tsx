import LetterForm from "@/src/components/app/letters/letter";
import { getLetter } from "@/src/actions/letterActions";
import LetterReadMarker from "@/src/components/app/letters/LetterReadMarker";

interface LetterPageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function LetterPage({ searchParams }: LetterPageProps) {
  const params = await searchParams;
  const letterId = params.id ? parseInt(params.id as string) : null;
  const isViewMode = params.viewOnly === "true";

  let letterData = null;
  let pageTitle = "نامه جدید";

  if (letterId) {
    const result = await getLetter(letterId);
    if (result.success && result.letter) {
      letterData = {
        ...result.letter,
        attachments: result.letter.attachments.map(att => ({
          ...att,
          fileName: att.fileName ?? null
        }))
      };
      pageTitle = isViewMode ? "مشاهده نامه" : "ویرایش نامه";
    }
  }

  return (
    <div className="w-full">
      {letterId && isViewMode && <LetterReadMarker letterId={letterId} />}
      <LetterForm
        initialLetter={letterData}
        isViewMode={isViewMode}
        pageTitle={pageTitle}
      />
    </div>
  );
}
