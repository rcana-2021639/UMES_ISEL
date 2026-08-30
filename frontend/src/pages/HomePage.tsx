import { useEffect, useState } from "react";
import type { MasterProgram } from "@/types/program";
import { programs as localPrograms } from "@/data/programs";
import { getPrograms } from "@/lib/api";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Hero } from "@/components/sections/Hero";
import { ProgramsSection } from "@/components/sections/ProgramsSection";
import { MethodologySection } from "@/components/sections/MethodologySection";
import { ObjectivesSection } from "@/components/sections/ObjectivesSection";
import { AdvisorSection } from "@/components/sections/AdvisorSection";
import { AdmissionCta } from "@/components/sections/AdmissionCta";

export function HomePage() {
  const [programs, setPrograms] = useState<MasterProgram[]>(localPrograms);

  useEffect(() => {
    document.title = "ISEL | Instituto Salesiano de Educación en Línea";
  }, []);

  useEffect(() => {
    let active = true;
    getPrograms().then((data) => {
      if (active && data.length) setPrograms(data);
    });
    return () => {
      active = false;
    };
  }, []);

  return (
    <>
      <Navbar />
      <main>
        <Hero />
        <ProgramsSection programs={programs} />
        <MethodologySection />
        <ObjectivesSection />
        <AdvisorSection />
        <AdmissionCta programs={programs} />
      </main>
      <Footer />
    </>
  );
}
