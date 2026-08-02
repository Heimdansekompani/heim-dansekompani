import { ProjectForm } from "@/components/admin/project-form";

export default function NyttProsjektPage() {
  return (
    <div>
      <h1 className="font-serif text-2xl tracking-wide">Nytt prosjekt</h1>
      <div className="mt-8">
        <ProjectForm mode="create" />
      </div>
    </div>
  );
}
