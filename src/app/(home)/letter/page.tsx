import LetterForm from "@/src/components/app/letters/letter";
import { getLetter } from "@/src/actions/letterActions";
import LetterArchiveSuggestionToast from "@/src/components/app/letters/LetterArchiveSuggestionToast";

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
    <div className="min-h-full w-full">
      {letterId && isViewMode && (
        <LetterArchiveSuggestionToast
          key={letterId}
          letterId={letterId}
        />
      )}
      <LetterForm
        initialLetter={letterData}
        isViewMode={isViewMode}
        pageTitle={pageTitle}
      />
    </div>
  );
}
