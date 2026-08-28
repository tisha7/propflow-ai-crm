import { Construction } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { Badge } from "@/components/ui/badge";

export function ModulePlaceholder({
  title,
  description,
  checkpoint,
}: {
  title: string;
  description: string;
  /** Which build checkpoint (per the roadmap) implements this module. */
  checkpoint: string;
}) {
  return (
    <>
      <PageHeader
        title={title}
        description={description}
        actions={<Badge variant="neutral">{checkpoint}</Badge>}
      />
      <EmptyState
        icon={<Construction className="size-5" />}
        title="This module is scaffolded, not built yet"
        description={`The ${title.toLowerCase()} route, layout, and navigation entry are wired up. Functionality lands in ${checkpoint}.`}
      />
    </>
  );
}
