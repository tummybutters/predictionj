import { Panel } from "@/components/ui/panel";

export default async function JournalIndexPage() {
  return (
    <Panel className="p-6">
      <div className="text-sm font-medium">Select a note</div>
      <div className="mt-1 text-sm text-muted">Pick one from the left, or create a new note.</div>
    </Panel>
  );
}
