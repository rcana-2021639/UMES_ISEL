import type { MasterProgram } from "@/types/program";

/**
 * Local fallback copy of the six ISEL programs — used instantly on first paint
 * and whenever the .NET API (backend/UmesIsel.Api) isn't reachable.
 * Source of truth in production is the API; see src/lib/api.ts.
 *
 * IMPORTANT: PensumUrl / interviewUrl are placeholders pointing at the
 * original UMES-hosted files. Swap them for your own once available.
 */
const INTERVIEW_URL = "https://b24-we8qvv.bitrix24.site/crm_form_2iluh/";

export const programs: MasterProgram[] = [
  {
    slug: "docencia-superior",
    title: "Maestría en Innovación de los Aprendizajes en la Educación Superior",
    tagline: "Programa en modalidad online",
    cardImage: "/images/programs/docencia-superior.jpg",
    detailImage: "/images/programs/docencia-superior-detalle.jpg",
    paragraphs: [
      "El egresado de la Maestría en Innovación de los Aprendizajes en la Educación Superior de Universidad Mesoamericana ha adquirido conocimientos profundos y extensos de las tendencias de la educación superior, como también en competencias digitales que podrá aplicar inmediatamente en su ejercicio docente, acompañado del dominio de diversidad de métodos, estrategias y procesos de enseñanza diversificados, orientados a la consecución de aprendizajes efectivos e integrales dentro de un ambiente colaborativo; respaldados en la reflexión crítica de su quehacer docente y los principios de la institución en la que labore.",
      "Al egresar del Postgrado el estudiante alcanzará competencias, conocimientos, habilidades y valores en Docencia Superior.",
    ],
    pensumUrl: "https://www.umes.edu.gt/_files/ugd/1724d0_d57062dfba2849a19b1b6c181325c1d2.pdf",
    interviewUrl: INTERVIEW_URL,
    plan: {
      duracion: "Un año y medio (6 trimestres)",
      modalidad: "Modalidad online por medio de módulos de estudios.",
      tutorias: "Tutorías sincrónicas.",
      costos: [
        { label: "Inscripción por trimestre", value: "Q. 400.00" },
        { label: "Cuota mensual", value: "Q. 1,400.00" },
      ],
      notaCostos:
        "Los pagos por enseñanza corresponden a la totalidad de los servicios que ofrece la Universidad en el ciclo lectivo, los cuales son divididos en cuotas. Costos sujetos a cambios.",
    },
  },
  {
    slug: "administracion-empresas-inteligencia-negocios",
    title: "Maestría en Administración de Empresas e Inteligencia de Negocios",
    tagline: "Programa en modalidad online",
    cardImage: "/images/programs/administracion-empresas.jpg",
    detailImage: "/images/programs/administracion-empresas-detalle.jpg",
    paragraphs: [
      "Este programa de Maestrías está basado en las competencias gerenciales requeridas por las organizaciones del futuro. Por estas razones, el currículum de cada una de nuestras maestrías ha sido diseñado como un clúster interactivo de cuatro grandes áreas de conocimiento: dirección estratégica, competencias gerenciales, finanzas, legislación y marketing.",
      "Los participantes deberán realizar ejercicios de aplicación real en las empresas para las cuales trabajan, como complemento permanente de las actividades académicas virtuales. Al mismo tiempo se estimulará la participación de los estudiantes de maestría en diversos eventos de actualización gerencial a través de los medios de comunicación y aprendizaje disponibles.",
    ],
    pensumUrl: "https://www.umes.edu.gt/_files/ugd/9726ef_305d2930272143ef936656e99966eae1.pdf",
    interviewUrl: INTERVIEW_URL,
    plan: {
      duracion: "Un año y medio (6 trimestres)",
      modalidad: "Modalidad online por medio de módulo de estudios.",
      tutorias: "Tutorías sincrónicas.",
      costos: [
        { label: "Inscripción trimestral", value: "Q. 400.00" },
        { label: "Cuota mensual (I trimestre)", value: "Q. 1,500.00" },
      ],
      notaCostos:
        "Los pagos por enseñanza corresponden a la totalidad de los servicios que ofrece la Universidad en el ciclo lectivo, los cuales son divididos en cuotas. Costos sujetos a cambios.",
    },
  },
  {
    slug: "marketing-digital-comercio-electronico",
    title: "Maestría en Marketing Digital y Comercio Electrónico",
    tagline: "Programa en modalidad online",
    cardImage: "/images/programs/marketing-digital.jpg",
    detailImage: "/images/programs/marketing-digital-detalle.jpg",
    paragraphs: [
      "Este programa de Maestrías está basado en las competencias gerenciales requeridas por las organizaciones del futuro. Por estas razones, el currículum de cada una de nuestras maestrías ha sido diseñado como un clúster interactivo de cuatro grandes áreas de conocimiento: dirección estratégica, competencias gerenciales, finanzas, legislación y marketing.",
      "Los participantes deberán realizar ejercicios de aplicación real en las empresas para las cuales trabajan, como complemento permanente de las actividades académicas virtuales. Al mismo tiempo se estimulará la participación de los estudiantes de maestría en diversos eventos de actualización gerencial a través de los medios de comunicación y aprendizaje disponibles.",
    ],
    pensumUrl: "https://www.umes.edu.gt/_files/ugd/9726ef_0126cb9e377141a5850faf2a2d0c49b3.pdf",
    interviewUrl: INTERVIEW_URL,
    plan: {
      duracion: "Un año y medio (6 trimestres)",
      modalidad: "Modalidad online por medio de módulos de estudios.",
      tutorias: "Tutorías sincrónicas.",
      costos: [
        { label: "Inscripción trimestral", value: "Q. 400.00" },
        { label: "Cuota mensual (I trimestre)", value: "Q. 1,500.00" },
      ],
      notaCostos:
        "Los pagos por enseñanza corresponden a la totalidad de los servicios que ofrece la Universidad en el ciclo lectivo, los cuales son divididos en cuotas. Costos sujetos a cambios.",
    },
  },
  {
    slug: "fintech",
    title: "Maestría en Administración de Empresas con Especialidad en Finanzas y Tecnología (FINTECH)",
    tagline: "Programa en modalidad online",
    cardImage: "/images/programs/fintech.jpg",
    detailImage: "/images/programs/fintech-detalle.jpg",
    paragraphs: [
      "Este programa de Maestrías está basado en las competencias gerenciales requeridas por las organizaciones del futuro. Por estas razones, el currículum de cada una de nuestras maestrías ha sido diseñado como un clúster interactivo de cuatro grandes áreas de conocimiento: dirección estratégica, competencias gerenciales, finanzas, legislación y marketing.",
      "Los participantes deberán realizar ejercicios de aplicación real en las empresas para las cuales trabajan, como complemento permanente de las actividades académicas presenciales. Al mismo tiempo se estimulará la participación de los estudiantes de maestría en diversos eventos de actualización gerencial a través de los medios de comunicación y aprendizaje disponibles.",
    ],
    pensumUrl: "https://www.umes.edu.gt/_files/ugd/9726ef_70ad1326b00a4641a03b1f2d7e7889cf.pdf",
    interviewUrl: INTERVIEW_URL,
    plan: {
      duracion: "Un año y medio (6 trimestres)",
      modalidad: "Modalidad online por medio de módulos de estudios.",
      tutorias: "Tutorías sincrónicas.",
      costos: [
        { label: "Inscripción trimestral", value: "Q. 400.00" },
        { label: "Cuota mensual (I trimestre)", value: "Q. 1,500.00" },
      ],
      notaCostos:
        "Los pagos por enseñanza corresponden a la totalidad de los servicios que ofrece la Universidad en el ciclo lectivo, los cuales son divididos en cuotas. Costos sujetos a cambios.",
    },
  },
  {
    slug: "talento-humano",
    title: "Maestría en Gestión Estratégica del Talento Humano",
    tagline: "Programa en modalidad online",
    cardImage: "/images/programs/talento-humano.jpg",
    detailImage: "/images/programs/talento-humano-detalle.jpg",
    paragraphs: [
      "La Maestría en Gestión Estratégica del Talento Humano forma líderes capaces de transformar a las personas en el motor principal de las organizaciones.",
      "Nuestro programa combina teoría y práctica para que los estudiantes aprendan a diseñar e implementar estrategias innovadoras que fortalezcan la cultura organizacional, impulsen el desarrollo de equipos y aumenten la competitividad empresarial.",
    ],
    pensumUrl: "https://www.umes.edu.gt/_files/ugd/9726ef_87c46d0e7aa94fc58093bb6728a87a9f.pdf",
    interviewUrl: INTERVIEW_URL,
    plan: {
      duracion: "Un año y medio (6 trimestres)",
      modalidad: "Modalidad online por medio de módulos de estudios.",
      tutorias: "Tutorías sincrónicas cada 15 días.",
      costos: [
        { label: "Inscripción trimestral", value: "Q. 400.00" },
        { label: "Cuota mensual (I trimestre)", value: "Q. 1,500.00" },
      ],
      notaCostos:
        "Los pagos por enseñanza corresponden a la totalidad de los servicios que ofrece la Universidad en el ciclo lectivo, los cuales son divididos en cuotas. Costos sujetos a cambios.",
    },
  },
  {
    slug: "auditoria-desempeno",
    title: "Maestría en Auditoría de Desempeño",
    tagline: "Programa en modalidad online",
    cardImage: "/images/programs/auditoria-desempeno.jpg",
    detailImage: "/images/programs/auditoria-desempeno-detalle.jpg",
    paragraphs: [
      "La auditoría de desempeño es de relevancia porque permite determinar el alcance de objetivos y metas con indicadores estratégicos y de gestión, para conocer los resultados de la aplicación de los recursos públicos y el impacto social que se genera a través de diversos programas, proyectos, obras, procesos, actividades, entre otros; por lo que promueve la gobernanza económica, eficaz y eficiente, contribuyendo a la rendición de cuentas y a la transparencia.",
    ],
    pensumUrl: "https://www.umes.edu.gt/_files/ugd/9726ef_a4f3bd66c17f4138a789a61c9a7bfb00.pdf",
    interviewUrl: INTERVIEW_URL,
    plan: {
      duracion: "Un año y medio (6 trimestres)",
      modalidad: "Modalidad online por medio de módulos de estudios.",
      tutorias: "Tutorías sincrónicas.",
      costos: [
        { label: "Inscripción trimestral", value: "Q. 1,100.00" },
        { label: "Cuota mensual", value: "Q. 1,900.00" },
      ],
      notaCostos:
        "Los pagos por enseñanza corresponden a la totalidad de los servicios que ofrece la Universidad en el ciclo lectivo, los cuales son divididos en cuotas. Costos sujetos a cambios.",
    },
  },
];
