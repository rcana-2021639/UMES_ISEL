using UmesIsel.Api.Models.Entities;

namespace UmesIsel.Api.Data;

/// <summary>
/// Official pensum of every ISEL maestría, transcribed from each program's
/// published pensum PDF (umes.edu.gt / the ISEL microsite). Carrera strings
/// match exactly what's already in Data/Seed/students.seed.json so a
/// student's own carrera cascades straight into their pensum. "Inglés"
/// isn't a maestría — it's the standalone Inglés I–IV courses some
/// students take alongside their program (see the roster's "INGLÉS I Y
/// III" cohort), grouped the same way so "Cursos adicionales" can find them.
/// </summary>
public static class CourseCatalogSeedData
{
    private const string TalentoHumano = "Maestría en Gestión Estratégica del Talento Humano";
    private const string DocenciaSuperior = "Maestria de Innovación de los Aprendizajes en la Educación Superior";
    private const string Fintech = "Maestría en Administración de Empresas con Especialidad en Finanzas y Tecnología (FINTECH)";
    private const string InteligenciaNegocios = "Maestría en Administración de Empresas e Inteligencia de Negocios";
    private const string MarketingDigital = "Maestría en Marketing Digital y Comercio Electrónico";
    private const string AuditoriaDesempeno = "Maestría en Auditoria de desempeño";
    private const string Ingles = "Inglés";

    public static readonly IReadOnlyList<Course> Courses = Build();

    private static IReadOnlyList<Course> Build()
    {
        var list = new List<Course>();

        void Add(string carrera, int trimestre, params string[] nombres)
        {
            foreach (var nombre in nombres)
            {
                list.Add(new Course { Carrera = carrera, Trimestre = trimestre, Nombre = nombre });
            }
        }

        // Maestría en Gestión Estratégica del Talento Humano
        Add(TalentoHumano, 1, "Gestión estratégica del talento humano", "Liderazgo estratégico y transformación organizacional", "Analítica del talento y gestión empresarial");
        Add(TalentoHumano, 2, "Desarrollo del talento humano integral", "Gestión de la cultura y el clima organizacional", "Comunicación organizacional estratégica");
        Add(TalentoHumano, 3, "Legislación laboral en la gestión del talento", "Atracción y selección estratégica del talento humano", "Gestión para incentivar el talento");
        Add(TalentoHumano, 4, "Ética profesional, inclusión y responsabilidad social", "Sistemas de información en recursos humanos");
        Add(TalentoHumano, 5, "Gestión del talento: competencias y desempeño", "Gestión del talento en la era digital: IA y automatización");
        Add(TalentoHumano, 6, "Gestión estratégica de la seguridad y el bienestar laboral", "Proyecto profesional");

        // Maestría en Innovación de los Aprendizajes en la Educación Superior
        Add(DocenciaSuperior, 1, "Tecnología para el Aprendizaje I", "Acompañamiento Salesiano en la Educación Superior", "Sociología de la Educación Superior");
        Add(DocenciaSuperior, 2, "Desarrollo psicológico del adulto", "Neuroaprendizaje I", "Investigación científica");
        Add(DocenciaSuperior, 3, "Neuroaprendizaje II", "Evaluación de los aprendizajes", "Tecnología para el aprendizaje II");
        Add(DocenciaSuperior, 4, "Laboratorio de Aprendizaje e innovación", "Gestión de la inteligencia artificial en la Educación Superior", "Investigación Educativa");
        Add(DocenciaSuperior, 5, "Práctica profesional", "Ética profesional");
        Add(DocenciaSuperior, 6, "Proyecto Final");

        // Maestría en Administración de Empresas con Especialidad en Finanzas y Tecnología (FINTECH)
        Add(Fintech, 1, "Economía Circular y Sostenible", "Liderazgo y Negociación", "Administración y Dirección de Empresas");
        Add(Fintech, 2, "Gestión Estratégica Empresarial", "Experiencia de Usuario y Viaje del Cliente", "Contabilidad Gerencial");
        Add(Fintech, 3, "Gestión de la Innovación y Cambios", "Finanzas Corporativas Internacionales", "Diseño Centrado en el Usuario (Design Thinking)");
        Add(Fintech, 4, "Introducción a las Finanzas y Tecnología (FINTECH)", "Tecnologías Básicas de las Finanzas (FINTECH)", "Introducción al Big Data");
        Add(Fintech, 5, "Criptografía, Seguridad e Identidad Digital", "Modelos de Negocios y Tecnologías Lean", "Tecnología del Libro Mayor Distribuido y Contrato Inteligente");
        Add(Fintech, 6, "Tecnologías de Soporte de los Servicios al Sector Financiero", "Financiación e Inversores", "Proyecto Final");

        // Maestría en Administración de Empresas e Inteligencia de Negocios (MBAIN)
        Add(InteligenciaNegocios, 1, "Economía Circular y Sostenible", "Liderazgo y Negociación", "Administración y Dirección de Empresas");
        Add(InteligenciaNegocios, 2, "Gestión Estratégica Empresarial", "Experiencia de Usuario y Viaje del Cliente", "Contabilidad Gerencial");
        Add(InteligenciaNegocios, 3, "Gestión de la Innovación y Cambios", "Finanzas Corporativas Internacionales", "Diseño Centrado en el Usuario (Design Thinking)");
        Add(InteligenciaNegocios, 4, "Gestión de Proyectos y Metodologías Ágiles", "Inteligencia de Negocios", "Transformación Digital");
        Add(InteligenciaNegocios, 5, "Análisis de datos y Visualización", "Gestión del Talento Humano y la Responsabilidad Social Empresarial", "Toma de Decisiones con Datos");
        Add(InteligenciaNegocios, 6, "Gestión de la Información y la Seguridad", "Integración de los Sistemas de Gestión Empresarial", "Proyecto Final");

        // Maestría en Marketing Digital y Comercio Electrónico (MMDCE)
        Add(MarketingDigital, 1, "Economía Circular y Sostenible", "Liderazgo y Negociación", "Administración y Dirección de Empresas");
        Add(MarketingDigital, 2, "Comercio Electrónico y Plan de Marketing Digital", "Costos, Presupuestos y Finanzas para Empresas Digitales", "Herramientas Tecnológicas en la Investigación de Mercados");
        Add(MarketingDigital, 3, "Emprendimiento y Administración de Empresas Digitales", "Social Media, Marketing y Comercio Electrónico", "Métricas de Análisis Web, Marketing y Comunicación Digital");
        Add(MarketingDigital, 4, "Campañas, Estrategias Publicitarias Digitales y Motores de búsqueda (SEM)", "Gestión Aduanera de Procesos Fiscales en Exportación e Importación", "E-logística y Tecnología en la Cadena de Suministros");
        Add(MarketingDigital, 5, "Marketing Móvil y Comercio Electrónico", "Legislación Aplicada al Marketing Digital y Comercio Electrónico", "Fidelización de Clientes y Optimización de Motores de búsqueda (Performance, Inbound y SEO)");
        Add(MarketingDigital, 6, "Abastecimiento, Logística y Gestión de Envíos", "Diseño de Marca y Desarrollo de Productos o Servicios Digitales", "Proyecto Final");

        // Maestría en Auditoría del Desempeño
        Add(AuditoriaDesempeno, 1, "Planeación estratégica", "Gestión de riesgos", "Estadística general");
        Add(AuditoriaDesempeno, 2, "Auditoría de desempeño I", "Políticas públicas", "Macroeconomía");
        Add(AuditoriaDesempeno, 3, "Auditoría de desempeño II", "Tecnología de información y comunicación", "Legislación");
        Add(AuditoriaDesempeno, 4, "Auditoría de desempeño III", "Formulación y evaluación de proyectos", "Comunicación oral y escrita");
        Add(AuditoriaDesempeno, 5, "Habilidades directivas", "Proyecto académico I");
        Add(AuditoriaDesempeno, 6, "Ética", "Proyecto académico II");

        // Inglés I–IV — not a maestría; standalone courses offered alongside any program.
        Add(Ingles, 1, "Inglés I");
        Add(Ingles, 2, "Inglés II");
        Add(Ingles, 3, "Inglés III");
        Add(Ingles, 4, "Inglés IV");

        return list;
    }
}
