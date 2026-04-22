import { Header } from "@/components/header";
import { Hero } from "@/components/hero";
import { SkillGrid } from "@/components/skill-grid";
import { Footer } from "@/components/footer";
import { EmptyStateFirstRun } from "@/components/empty-first-run";
import { loadSkillsData } from "@/lib/skills";

export default function HomePage() {
  const data = loadSkillsData();
  const hasSkills = data.skills.length > 0;

  return (
    <main className="min-h-screen flex flex-col">
      <Header />

      {hasSkills ? (
        <>
          <Hero data={data} />
          <SkillGrid data={data} />
          <Footer data={data} />
        </>
      ) : (
        <EmptyStateFirstRun />
      )}
    </main>
  );
}
