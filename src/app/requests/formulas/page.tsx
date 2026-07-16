import { FormulaLibraryAdmin } from "@/components/FormulaLibraryAdmin";
import { PageShell } from "@/components/PageShell";

export default function FormulaLibraryPage() {
  return (
    <PageShell
      title="Formula library"
      breadcrumbs={[
        { label: "Home", href: "/" },
        { label: "Formula library" },
      ]}
    >
      <FormulaLibraryAdmin />
    </PageShell>
  );
}
