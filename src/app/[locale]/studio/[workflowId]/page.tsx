import StudioEditor from '@/components/StudioEditor';

export default function StudioPage({ params }: { params: { workflowId: string } }) {
  return <StudioEditor workflowId={params.workflowId} />;
}
