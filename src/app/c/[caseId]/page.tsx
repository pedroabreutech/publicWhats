import { notFound } from 'next/navigation';
import { CaseViewer } from './viewer';
import { listConversationsUnified, resolveCase } from '@/lib/cms/unified';
import { avatarUrl } from '@/lib/avatar';

export const dynamic = 'force-dynamic';

export default async function CasePage({
  params,
}: {
  params: Promise<{ caseId: string }>;
}) {
  const { caseId } = await params;
  const c = await resolveCase(caseId);
  if (!c || !c.published) notFound();

  const conversations = (await listConversationsUnified(caseId)).map((conv) => ({
    ...conv,
    avatar: conv.avatar || avatarUrl(conv.id),
  }));

  return (
    <CaseViewer caseId={c.id} caseTitle={c.title} conversations={conversations} />
  );
}
