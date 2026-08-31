using UmesIsel.Api.Models;

namespace UmesIsel.Api.Data;

/// <summary>
/// In-memory seed data for the six ISEL master's programs.
/// Content (titles, paragraphs, costs, links) mirrors the original
/// https://www.umes.edu.gt/isel-umes page 1:1, as requested.
///
/// NOTE: PensumUrl / InterviewUrl currently point at the original UMES-hosted
/// files as placeholders. Replace them with your own hosted PDF / form links
/// when available — nothing else needs to change.
/// </summary>
public static class IselSeedData
{
    private const string InterviewUrl = "https://b24-we8qvv.bitrix24.site/crm_form_2iluh/";

    public static readonly IReadOnlyList<MasterProgram> Programs = new List<MasterProgram>
    {
        new(
            Slug: "docencia-superior",
            Title: "Maestría en Innovación de los Aprendizajes en la Educación Superior",
            Tagline: "Programa en modalidad online",
            CardImage: "/images/programs/docencia-superior.avif",
            DetailImage: "/images/programs/docencia-superior-detalle.avif",
            Paragraphs: new[]
            {
                "El egresado de la Maestría en Innovación de los Aprendizajes en la Educación Superior de Universidad Mesoamericana ha adquirido conocimientos profundos y extensos de las tendencias de la educación superior, como también en competencias digitales que podrá aplicar inmediatamente en su ejercicio docente, acompañado del dominio de diversidad de métodos, estrategias y procesos de enseñanza diversificados, orientados a la consecución de aprendizajes efectivos e integrales dentro de un ambiente colaborativo; respaldados en la reflexión crítica de su quehacer docente y los principios de la institución en la que labore.",
                "Al egresar del Postgrado el estudiante alcanzará competencias, conocimientos, habilidades y valores en Docencia Superior."
            },
            PensumUrl: "https://www.umes.edu.gt/_files/ugd/1724d0_d57062dfba2849a19b1b6c181325c1d2.pdf",
            InterviewUrl: InterviewUrl,
            Plan: new StudyPlan(
                Duracion: "Un año y medio (6 trimestres)",
                Modalidad: "Modalidad online por medio de módulos de estudios.",
                Tutorias: "Tutorías sincrónicas.",
                Costos: new[]
                {
                    new CostItem("Inscripción por trimestre", "Q. 400.00"),
                    new CostItem("Cuota mensual", "Q. 1,400.00")
                },
                NotaCostos: "Los pagos por enseñanza corresponden a la totalidad de los servicios que ofrece la Universidad en el ciclo lectivo, los cuales son divididos en cuotas. Costos sujetos a cambios."
            )
        ),
        new(
            Slug: "administracion-empresas-inteligencia-negocios",
            Title: "Maestría en Administración de Empresas e Inteligencia de Negocios",
            Tagline: "Programa en modalidad online",
            CardImage: "/images/programs/administracion-empresas.avif",
            DetailImage: "/images/programs/administracion-empresas-detalle.avif",
            Paragraphs: new[]
            {
                "Este programa de Maestrías está basado en las competencias gerenciales requeridas por las organizaciones del futuro. Por estas razones, el currículum de cada una de nuestras maestrías ha sido diseñado como un clúster interactivo de cuatro grandes áreas de conocimiento: dirección estratégica, competencias gerenciales, finanzas, legislación y marketing.",
                "Los participantes deberán realizar ejercicios de aplicación real en las empresas para las cuales trabajan, como complemento permanente de las actividades académicas virtuales. Al mismo tiempo se estimulará la participación de los estudiantes de maestría en diversos eventos de actualización gerencial a través de los medios de comunicación y aprendizaje disponibles."
            },
            PensumUrl: "https://www.umes.edu.gt/_files/ugd/9726ef_305d2930272143ef936656e99966eae1.pdf",
            InterviewUrl: InterviewUrl,
            Plan: new StudyPlan(
                Duracion: "Un año y medio (6 trimestres)",
                Modalidad: "Modalidad online por medio de módulo de estudios.",
                Tutorias: "Tutorías sincrónicas.",
                Costos: new[]
                {
                    new CostItem("Inscripción trimestral", "Q. 400.00"),
                    new CostItem("Cuota mensual (I trimestre)", "Q. 1,500.00")
                },
                NotaCostos: "Los pagos por enseñanza corresponden a la totalidad de los servicios que ofrece la Universidad en el ciclo lectivo, los cuales son divididos en cuotas. Costos sujetos a cambios."
            )
        ),
        new(
            Slug: "marketing-digital-comercio-electronico",
            Title: "Maestría en Marketing Digital y Comercio Electrónico",
            Tagline: "Programa en modalidad online",
            CardImage: "/images/programs/marketing-digital.avif",
            DetailImage: "/images/programs/marketing-digital-detalle.avif",
            Paragraphs: new[]
            {
                "Este programa de Maestrías está basado en las competencias gerenciales requeridas por las organizaciones del futuro. Por estas razones, el currículum de cada una de nuestras maestrías ha sido diseñado como un clúster interactivo de cuatro grandes áreas de conocimiento: dirección estratégica, competencias gerenciales, finanzas, legislación y marketing.",
                "Los participantes deberán realizar ejercicios de aplicación real en las empresas para las cuales trabajan, como complemento permanente de las actividades académicas virtuales. Al mismo tiempo se estimulará la participación de los estudiantes de maestría en diversos eventos de actualización gerencial a través de los medios de comunicación y aprendizaje disponibles."
            },
            PensumUrl: "https://www.umes.edu.gt/_files/ugd/9726ef_0126cb9e377141a5850faf2a2d0c49b3.pdf",
            InterviewUrl: InterviewUrl,
            Plan: new StudyPlan(
                Duracion: "Un año y medio (6 trimestres)",
                Modalidad: "Modalidad online por medio de módulos de estudios.",
                Tutorias: "Tutorías sincrónicas.",
                Costos: new[]
                {
                    new CostItem("Inscripción trimestral", "Q. 400.00"),
                    new CostItem("Cuota mensual (I trimestre)", "Q. 1,500.00")
                },
                NotaCostos: "Los pagos por enseñanza corresponden a la totalidad de los servicios que ofrece la Universidad en el ciclo lectivo, los cuales son divididos en cuotas. Costos sujetos a cambios."
            )
        ),
        new(
            Slug: "fintech",
            Title: "Maestría en Administración de Empresas con Especialidad en Finanzas y Tecnología (FINTECH)",
            Tagline: "Programa en modalidad online",
            CardImage: "/images/programs/fintech.avif",
            DetailImage: "/images/programs/fintech-detalle.avif",
            Paragraphs: new[]
            {
                "Este programa de Maestrías está basado en las competencias gerenciales requeridas por las organizaciones del futuro. Por estas razones, el currículum de cada una de nuestras maestrías ha sido diseñado como un clúster interactivo de cuatro grandes áreas de conocimiento: dirección estratégica, competencias gerenciales, finanzas, legislación y marketing.",
                "Los participantes deberán realizar ejercicios de aplicación real en las empresas para las cuales trabajan, como complemento permanente de las actividades académicas presenciales. Al mismo tiempo se estimulará la participación de los estudiantes de maestría en diversos eventos de actualización gerencial a través de los medios de comunicación y aprendizaje disponibles."
            },
            PensumUrl: "https://www.umes.edu.gt/_files/ugd/9726ef_70ad1326b00a4641a03b1f2d7e7889cf.pdf",
            InterviewUrl: InterviewUrl,
            Plan: new StudyPlan(
                Duracion: "Un año y medio (6 trimestres)",
                Modalidad: "Modalidad online por medio de módulos de estudios.",
                Tutorias: "Tutorías sincrónicas.",
                Costos: new[]
                {
                    new CostItem("Inscripción trimestral", "Q. 400.00"),
                    new CostItem("Cuota mensual (I trimestre)", "Q. 1,500.00")
                },
                NotaCostos: "Los pagos por enseñanza corresponden a la totalidad de los servicios que ofrece la Universidad en el ciclo lectivo, los cuales son divididos en cuotas. Costos sujetos a cambios."
            )
        ),
        new(
            Slug: "talento-humano",
            Title: "Maestría en Gestión Estratégica del Talento Humano",
            Tagline: "Programa en modalidad online",
            CardImage: "/images/programs/talento-humano.avif",
            DetailImage: "/images/programs/talento-humano-detalle.avif",
            Paragraphs: new[]
            {
                "La Maestría en Gestión Estratégica del Talento Humano forma líderes capaces de transformar a las personas en el motor principal de las organizaciones.",
                "Nuestro programa combina teoría y práctica para que los estudiantes aprendan a diseñar e implementar estrategias innovadoras que fortalezcan la cultura organizacional, impulsen el desarrollo de equipos y aumenten la competitividad empresarial."
            },
            PensumUrl: "https://www.umes.edu.gt/_files/ugd/9726ef_87c46d0e7aa94fc58093bb6728a87a9f.pdf",
            InterviewUrl: InterviewUrl,
            Plan: new StudyPlan(
                Duracion: "Un año y medio (6 trimestres)",
                Modalidad: "Modalidad online por medio de módulos de estudios.",
                Tutorias: "Tutorías sincrónicas cada 15 días.",
                Costos: new[]
                {
                    new CostItem("Inscripción trimestral", "Q. 400.00"),
                    new CostItem("Cuota mensual (I trimestre)", "Q. 1,500.00")
                },
                NotaCostos: "Los pagos por enseñanza corresponden a la totalidad de los servicios que ofrece la Universidad en el ciclo lectivo, los cuales son divididos en cuotas. Costos sujetos a cambios."
            )
        ),
        new(
            Slug: "auditoria-desempeno",
            Title: "Maestría en Auditoría de Desempeño",
            Tagline: "Programa en modalidad online",
            CardImage: "/images/programs/auditoria-desempeno.avif",
            DetailImage: "/images/programs/auditoria-desempeno-detalle.avif",
            Paragraphs: new[]
            {
                "La auditoría de desempeño es de relevancia porque permite determinar el alcance de objetivos y metas con indicadores estratégicos y de gestión, para conocer los resultados de la aplicación de los recursos públicos y el impacto social que se genera a través de diversos programas, proyectos, obras, procesos, actividades, entre otros; por lo que promueve la gobernanza económica, eficaz y eficiente, contribuyendo a la rendición de cuentas y a la transparencia."
            },
            PensumUrl: "https://www.umes.edu.gt/_files/ugd/9726ef_a4f3bd66c17f4138a789a61c9a7bfb00.pdf",
            InterviewUrl: InterviewUrl,
            Plan: new StudyPlan(
                Duracion: "Un año y medio (6 trimestres)",
                Modalidad: "Modalidad online por medio de módulos de estudios.",
                Tutorias: "Tutorías sincrónicas.",
                Costos: new[]
                {
                    new CostItem("Inscripción trimestral", "Q. 1,100.00"),
                    new CostItem("Cuota mensual", "Q. 1,900.00")
                },
                NotaCostos: "Los pagos por enseñanza corresponden a la totalidad de los servicios que ofrece la Universidad en el ciclo lectivo, los cuales son divididos en cuotas. Costos sujetos a cambios."
            )
        )
    };
}
