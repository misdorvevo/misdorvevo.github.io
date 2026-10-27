import type { Metadata } from 'next';

const PROJECT_ID = 'audiocave-f02ca';

// Songs are publicly readable, so the Firestore REST API works without credentials.
export async function generateMetadata({ params }: { params: Promise<{ id: string; songId: string }> }): Promise<Metadata> {
  const { id, songId } = await params;
  try {
    const res = await fetch(
      `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/samplePacks/${encodeURIComponent(id)}/songs/${encodeURIComponent(songId)}`,
      { next: { revalidate: 300 } }
    );
    if (!res.ok) return {};
    const fields = (await res.json()).fields ?? {};
    const title: string | undefined = fields.title?.stringValue;
    const author: string | undefined = fields.authorName?.stringValue;
    if (!title) return {};
    const description = (fields.description?.stringValue as string | undefined)?.slice(0, 200) || `Listen to ${title} on Co-Drop.`;
    const fullTitle = `${title}${author ? ` by ${author}` : ''} | Co-Drop`;
    return {
      title: fullTitle,
      description,
      openGraph: { title: fullTitle, description, type: 'music.song', siteName: 'Co-Drop' },
      twitter: { card: 'summary', title: fullTitle, description },
    };
  } catch {
    return {};
  }
}

export default function SongLayout({ children }: { children: React.ReactNode }) {
  return children;
}
