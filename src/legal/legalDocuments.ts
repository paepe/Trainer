export type LegalDocumentKey = 'terms_of_use_ai' | 'fair_use_policy';
export type LegalDocumentSlug = 'terms' | 'fair-use';
export type LegalLocale = 'en' | 'pt' | 'es' | 'de';

type LegalSection = {
  heading: string;
  paragraphs: readonly string[];
  bullets?: readonly string[];
};

type LegalDocumentContent = {
  title: string;
  subtitle: string;
  sections: readonly LegalSection[];
};

export interface LegalDocument {
  key: LegalDocumentKey;
  slug: LegalDocumentSlug;
  version: string;
  publishedAt: string;
  translations: Readonly<Record<LegalLocale, LegalDocumentContent>>;
}

export interface LocalizedLegalDocument extends Omit<LegalDocument, 'translations'>, LegalDocumentContent {
  locale: LegalLocale;
}

export interface LegalUiCopy {
  legalUpdate: string;
  consentTitle: string;
  consentBody: string;
  readTerms: string;
  readFairUse: string;
  consentLabel: string;
  accepting: string;
  acceptAndContinue: string;
  version: string;
  publishedOn: string;
  back: string;
  navigationLabel: string;
  termsTab: string;
  fairUseTab: string;
  publicTextNotice: string;
}

export const LEGAL_LOCALES: readonly LegalLocale[] = ['en', 'pt', 'es', 'de'];

export const LEGAL_DOCUMENTS: Record<LegalDocumentKey, LegalDocument> = {
  terms_of_use_ai: {
    key: 'terms_of_use_ai',
    slug: 'terms',
    version: '1.0',
    publishedAt: '2026-08-06',
    translations: {
      pt: {
        title: 'Termos de Uso — Adendo de Uso Justo de IA',
        subtitle: 'Aplicável aos recursos de IA incluídos no plano contratado.',
        sections: [
          { heading: 'Uso incluído no plano', paragraphs: [
            'Os recursos de inteligência artificial incluídos no plano aplicável são disponibilizados para utilização pessoal normal, sem franquia comercial visível de sessões, exercícios, check-ins ou análises.',
            'O uso permanece sujeito à Política de Uso Justo do TrAIner e a mecanismos proporcionais de proteção contra automação, fraude, uso abusivo, credenciais comprometidas e risco de disponibilidade ou custo anormal.',
          ] },
          { heading: 'Medidas proporcionais e continuidade', paragraphs: [
            'O TrAIner poderá aplicar limitação temporária de um recurso de IA, solicitar esclarecimentos ou realizar revisão humana quando houver indício razoável de uso incompatível com estes Termos.',
            'Esses mecanismos não alteram a licença contratada para uso pessoal normal, não divulgam thresholds internos e não devem interromper treino já iniciado, registro offline de séries ou outros fluxos críticos.',
          ] },
          { heading: 'Revisão e suporte', paragraphs: [
            'Suspensão prolongada ou encerramento de conta exige revisão humana, fundamento consistente com estes Termos e comunicação pelos canais aplicáveis.',
            'O assinante pode solicitar revisão de uma limitação temporária pelo suporte.',
          ] },
          { heading: 'Privacidade operacional', paragraphs: [
            'Os mecanismos operacionais de consumo não registram prompts, transcrições, respostas de IA, dados de saúde, ciclo, endereços IP ou identificadores brutos. A telemetria é minimizada, pseudonimizada, de acesso administrativo restrito e retida somente pelo período necessário definido pela política aplicável.',
          ] },
        ],
      },
      en: {
        title: 'Terms of Use — AI Fair Use Addendum',
        subtitle: 'Applicable to AI features included in the contracted plan.',
        sections: [
          { heading: 'Use included in the plan', paragraphs: [
            'The artificial intelligence features included in the applicable plan are made available for normal personal use, without a visible commercial allowance for sessions, exercises, check-ins or analyses.',
            'Use remains subject to the TrAIner Fair Use Policy and to proportionate measures against automation, fraud, misuse, compromised credentials, and abnormal availability or cost risk.',
          ] },
          { heading: 'Proportionate measures and continuity', paragraphs: [
            'TrAIner may temporarily limit an AI feature, request clarification, or conduct human review where there is a reasonable indication of use incompatible with these Terms.',
            'These measures do not alter the licence contracted for normal personal use, do not disclose internal thresholds, and must not interrupt a workout already in progress, offline set logging, or other critical flows.',
          ] },
          { heading: 'Review and support', paragraphs: [
            'Extended suspension or account termination requires human review, grounds consistent with these Terms, and communication through the applicable channels.',
            'The subscriber may request a review of a temporary limitation through support.',
          ] },
          { heading: 'Operational privacy', paragraphs: [
            'Operational consumption mechanisms do not record prompts, transcripts, AI responses, health data, cycle data, IP addresses, or raw identifiers. Telemetry is minimised, pseudonymised, restricted to administrative access, and retained only for the period required by the applicable policy.',
          ] },
        ],
      },
      es: {
        title: 'Términos de Uso — Anexo de Uso Justo de IA',
        subtitle: 'Aplicable a las funciones de IA incluidas en el plan contratado.',
        sections: [
          { heading: 'Uso incluido en el plan', paragraphs: [
            'Las funciones de inteligencia artificial incluidas en el plan aplicable se ponen a disposición para uso personal normal, sin una franquicia comercial visible de sesiones, ejercicios, check-ins o análisis.',
            'El uso sigue sujeto a la Política de Uso Justo de TrAIner y a mecanismos proporcionales de protección contra automatización, fraude, uso indebido, credenciales comprometidas y riesgo anormal de disponibilidad o coste.',
          ] },
          { heading: 'Medidas proporcionales y continuidad', paragraphs: [
            'TrAIner podrá limitar temporalmente una función de IA, solicitar aclaraciones o realizar una revisión humana cuando exista un indicio razonable de uso incompatible con estos Términos.',
            'Estas medidas no alteran la licencia contratada para el uso personal normal, no revelan umbrales internos y no deben interrumpir un entrenamiento ya iniciado, el registro offline de series u otros flujos críticos.',
          ] },
          { heading: 'Revisión y soporte', paragraphs: [
            'La suspensión prolongada o el cierre de una cuenta requieren revisión humana, una justificación coherente con estos Términos y comunicación por los canales aplicables.',
            'El suscriptor puede solicitar al soporte la revisión de una limitación temporal.',
          ] },
          { heading: 'Privacidad operativa', paragraphs: [
            'Los mecanismos operativos de consumo no registran prompts, transcripciones, respuestas de IA, datos de salud, datos del ciclo, direcciones IP ni identificadores brutos. La telemetría se minimiza, seudonimiza, se restringe al acceso administrativo y se conserva solo durante el período requerido por la política aplicable.',
          ] },
        ],
      },
      de: {
        title: 'Nutzungsbedingungen — Nachtrag zur fairen Nutzung von KI',
        subtitle: 'Gilt für die im gebuchten Tarif enthaltenen KI-Funktionen.',
        sections: [
          { heading: 'Im Tarif enthaltene Nutzung', paragraphs: [
            'Die im jeweils geltenden Tarif enthaltenen Funktionen künstlicher Intelligenz werden für die normale persönliche Nutzung bereitgestellt, ohne ein sichtbares kommerzielles Kontingent für Trainingseinheiten, Übungen, Check-ins oder Analysen.',
            'Die Nutzung unterliegt weiterhin der Richtlinie zur fairen Nutzung von TrAIner sowie angemessenen Schutzmechanismen gegen Automatisierung, Betrug, Missbrauch, kompromittierte Zugangsdaten und ungewöhnliche Verfügbarkeits- oder Kostenrisiken.',
          ] },
          { heading: 'Angemessene Maßnahmen und Kontinuität', paragraphs: [
            'TrAIner kann eine KI-Funktion vorübergehend beschränken, um Erläuterungen bitten oder eine menschliche Prüfung durchführen, wenn ein begründeter Hinweis auf eine mit diesen Bedingungen unvereinbare Nutzung vorliegt.',
            'Diese Maßnahmen ändern die für die normale persönliche Nutzung erworbene Lizenz nicht, legen keine internen Schwellenwerte offen und dürfen ein bereits begonnenes Training, die Offline-Erfassung von Sätzen oder andere kritische Abläufe nicht unterbrechen.',
          ] },
          { heading: 'Prüfung und Support', paragraphs: [
            'Eine längerfristige Sperrung oder Kontokündigung erfordert eine menschliche Prüfung, eine mit diesen Bedingungen vereinbare Begründung und Kommunikation über die anwendbaren Kanäle.',
            'Abonnenten können über den Support eine Überprüfung einer vorübergehenden Einschränkung beantragen.',
          ] },
          { heading: 'Operativer Datenschutz', paragraphs: [
            'Operative Verbrauchsmechanismen speichern keine Prompts, Transkripte, KI-Antworten, Gesundheitsdaten, Zyklusdaten, IP-Adressen oder Rohidentifikatoren. Die Telemetrie wird minimiert, pseudonymisiert, auf administrativen Zugriff beschränkt und nur für den in der anwendbaren Richtlinie festgelegten Zeitraum aufbewahrt.',
          ] },
        ],
      },
    },
  },
  fair_use_policy: {
    key: 'fair_use_policy',
    slug: 'fair-use',
    version: '1.0',
    publishedAt: '2026-08-06',
    translations: {
      pt: {
        title: 'Política de Uso Justo de Recursos de IA',
        subtitle: 'Uso ilimitado para utilização pessoal normal, sujeito a proteção contra abuso.',
        sections: [
          { heading: 'Princípio comercial', paragraphs: [
            'Os recursos elegíveis são oferecidos como ilimitados para uso pessoal normal. A oferta não estabelece uma franquia comercial visível de sessões, exercícios, check-ins ou análises para o uso humano legítimo do assinante.',
            'Esse uso permanece sujeito a mecanismos necessários para proteger disponibilidade, segurança, privacidade e sustentabilidade do serviço.',
          ] },
          { heading: 'Uso pessoal normal', paragraphs: ['Exemplos de utilização compatível com esta política:'], bullets: [
            'gerar ou adaptar treinos para a própria rotina;', 'registrar check-ins, inclusive por voz quando o recurso estiver contratado;', 'pedir nova sugestão quando houver alteração real de tempo, energia, dor, equipamento ou objetivo;', 'consultar análises e recomendações dentro do fluxo normal do TrAIner.',
          ] },
          { heading: 'Uso não permitido', paragraphs: ['Não é permitido, diretamente ou por terceiros:'], bullets: [
            'automatizar, programar ou simular chamadas ao serviço;', 'enviar solicitações em volume ou cadência incompatíveis com uso humano normal;', 'compartilhar, revender, alugar ou explorar comercialmente o acesso à IA;', 'contornar controles técnicos, autenticação, licenciamento ou limites de segurança;', 'usar contas múltiplas para evitar medidas de proteção;', 'submeter conteúdo malicioso, ilegítimo ou destinado a degradar o serviço.',
          ] },
          { heading: 'Proteção, contenção e suporte', paragraphs: [
            'O TrAIner pode aplicar proteção contra automação, limitação temporária de rajadas, prevenção de duplicidade, monitoramento agregado de consumo e revisão humana de padrões anormais.',
            'Esses mecanismos não transformam o produto em plano de créditos e não devem interromper treino já iniciado, registro offline de séries ou outros fluxos críticos. O assinante pode contestar uma limitação temporária pelo suporte.',
          ] },
          { heading: 'Relação com TRAINER', paragraphs: ['O uso de um TRAINER em benefício de aluno vinculado segue as permissões da licença aplicável e não amplia os direitos de IA patrocinados do aluno.'] },
        ],
      },
      en: {
        title: 'Fair Use Policy for AI Features',
        subtitle: 'Unlimited use for normal personal use, subject to protection against abuse.',
        sections: [
          { heading: 'Commercial principle', paragraphs: [
            'Eligible features are offered as unlimited for normal personal use. The offer does not establish a visible commercial allowance for sessions, exercises, check-ins or analyses for the subscriber’s legitimate human use.',
            'That use remains subject to the mechanisms needed to protect the availability, security, privacy and sustainability of the service.',
          ] },
          { heading: 'Normal personal use', paragraphs: ['Examples of use compatible with this policy include:'], bullets: [
            'generating or adapting workouts for your own routine;', 'recording check-ins, including voice check-ins when the feature is contracted;', 'requesting a new suggestion when there is a real change in time, energy, pain, equipment or goal;', 'consulting analyses and recommendations within the normal TrAIner flow.',
          ] },
          { heading: 'Prohibited use', paragraphs: ['The following are not permitted, directly or through third parties:'], bullets: [
            'automating, programming or simulating calls to the service;', 'sending requests at a volume or frequency incompatible with normal human use;', 'sharing, reselling, renting or commercially exploiting access to AI;', 'circumventing technical controls, authentication, licensing or security limits;', 'using multiple accounts to evade protective measures;', 'submitting malicious, unlawful or service-degrading content.',
          ] },
          { heading: 'Protection, containment and support', paragraphs: [
            'TrAIner may apply protection against automation, temporary burst limiting, duplicate prevention, aggregated usage monitoring and human review of abnormal patterns.',
            'These mechanisms do not turn the product into a credit plan and must not interrupt a workout already in progress, offline set logging, or other critical flows. The subscriber may challenge a temporary limitation through support.',
          ] },
          { heading: 'Relationship with a TRAINER', paragraphs: ['A TRAINER’s use for the benefit of a linked student follows the permissions of the applicable licence and does not expand the student’s sponsored AI rights.'] },
        ],
      },
      es: {
        title: 'Política de Uso Justo de Funciones de IA',
        subtitle: 'Uso ilimitado para uso personal normal, sujeto a protección contra abusos.',
        sections: [
          { heading: 'Principio comercial', paragraphs: [
            'Las funciones elegibles se ofrecen como ilimitadas para uso personal normal. La oferta no establece una franquicia comercial visible de sesiones, ejercicios, check-ins o análisis para el uso humano legítimo del suscriptor.',
            'Ese uso sigue sujeto a los mecanismos necesarios para proteger la disponibilidad, la seguridad, la privacidad y la sostenibilidad del servicio.',
          ] },
          { heading: 'Uso personal normal', paragraphs: ['Ejemplos de uso compatible con esta política:'], bullets: [
            'generar o adaptar entrenamientos para la propia rutina;', 'registrar check-ins, incluso por voz cuando la función esté contratada;', 'pedir una nueva sugerencia cuando exista un cambio real de tiempo, energía, dolor, equipo u objetivo;', 'consultar análisis y recomendaciones dentro del flujo normal de TrAIner.',
          ] },
          { heading: 'Uso no permitido', paragraphs: ['No está permitido, directamente ni a través de terceros:'], bullets: [
            'automatizar, programar o simular llamadas al servicio;', 'enviar solicitudes con un volumen o frecuencia incompatibles con el uso humano normal;', 'compartir, revender, alquilar o explotar comercialmente el acceso a la IA;', 'eludir controles técnicos, autenticación, licencias o límites de seguridad;', 'usar varias cuentas para evitar medidas de protección;', 'enviar contenido malicioso, ilegítimo o destinado a degradar el servicio.',
          ] },
          { heading: 'Protección, contención y soporte', paragraphs: [
            'TrAIner puede aplicar protección contra automatización, limitación temporal de ráfagas, prevención de duplicados, monitoreo agregado de consumo y revisión humana de patrones anormales.',
            'Estos mecanismos no convierten el producto en un plan de créditos y no deben interrumpir un entrenamiento ya iniciado, el registro offline de series u otros flujos críticos. El suscriptor puede impugnar una limitación temporal a través del soporte.',
          ] },
          { heading: 'Relación con TRAINER', paragraphs: ['El uso de un TRAINER en beneficio de un alumno vinculado sigue los permisos de la licencia aplicable y no amplía los derechos de IA patrocinados del alumno.'] },
        ],
      },
      de: {
        title: 'Richtlinie zur fairen Nutzung von KI-Funktionen',
        subtitle: 'Unbegrenzte Nutzung für die normale persönliche Verwendung, vorbehaltlich Schutz vor Missbrauch.',
        sections: [
          { heading: 'Geschäftlicher Grundsatz', paragraphs: [
            'Berechtigte Funktionen werden für die normale persönliche Nutzung als unbegrenzt angeboten. Das Angebot enthält kein sichtbares kommerzielles Kontingent für Trainingseinheiten, Übungen, Check-ins oder Analysen für die rechtmäßige menschliche Nutzung durch Abonnenten.',
            'Diese Nutzung unterliegt weiterhin den Mechanismen, die für den Schutz der Verfügbarkeit, Sicherheit, Privatsphäre und Nachhaltigkeit des Dienstes erforderlich sind.',
          ] },
          { heading: 'Normale persönliche Nutzung', paragraphs: ['Beispiele für mit dieser Richtlinie vereinbare Nutzung:'], bullets: [
            'Trainingspläne für die eigene Routine erstellen oder anpassen;', 'Check-ins erfassen, auch per Sprache, wenn die Funktion gebucht wurde;', 'eine neue Empfehlung anfordern, wenn sich Zeit, Energie, Schmerzen, Ausrüstung oder Ziel tatsächlich geändert haben;', 'Analysen und Empfehlungen im normalen TrAIner-Ablauf abrufen.',
          ] },
          { heading: 'Unzulässige Nutzung', paragraphs: ['Folgendes ist weder direkt noch durch Dritte zulässig:'], bullets: [
            'Aufrufe an den Dienst automatisieren, programmieren oder simulieren;', 'Anfragen in einem Umfang oder einer Häufigkeit senden, die mit normaler menschlicher Nutzung nicht vereinbar sind;', 'den Zugang zu KI teilen, weiterverkaufen, vermieten oder kommerziell verwerten;', 'technische Kontrollen, Authentifizierung, Lizenzierung oder Sicherheitsgrenzen umgehen;', 'mehrere Konten nutzen, um Schutzmaßnahmen zu umgehen;', 'bösartige, rechtswidrige oder zur Beeinträchtigung des Dienstes bestimmte Inhalte übermitteln.',
          ] },
          { heading: 'Schutz, Eindämmung und Support', paragraphs: [
            'TrAIner kann Schutz vor Automatisierung, eine vorübergehende Begrenzung von Lastspitzen, Duplikatvermeidung, aggregierte Nutzungsüberwachung und menschliche Prüfung ungewöhnlicher Muster anwenden.',
            'Diese Mechanismen machen das Produkt nicht zu einem Kreditmodell und dürfen ein bereits begonnenes Training, die Offline-Erfassung von Sätzen oder andere kritische Abläufe nicht unterbrechen. Abonnenten können eine vorübergehende Einschränkung über den Support anfechten.',
          ] },
          { heading: 'Beziehung zu TRAINER', paragraphs: ['Die Nutzung eines TRAINER zugunsten eines verbundenen Schülers richtet sich nach den Berechtigungen der anwendbaren Lizenz und erweitert nicht die gesponserten KI-Rechte des Schülers.'] },
        ],
      },
    },
  },
};

export const LEGAL_UI: Readonly<Record<LegalLocale, LegalUiCopy>> = {
  pt: { legalUpdate: 'ATUALIZAÇÃO LEGAL', consentTitle: 'Confirme os documentos de Uso Justo', consentBody: 'Para continuar, confirme que leu e aceita os Termos de Uso aplicáveis aos recursos de IA e a Política de Uso Justo.', readTerms: 'Ler Termos de Uso', readFairUse: 'Ler Política de Uso Justo', consentLabel: 'Li e aceito os Termos de Uso — Adendo de Uso Justo de IA e a Política de Uso Justo, versão 1.0.', accepting: 'Registrando aceite…', acceptAndContinue: 'Aceitar e continuar', version: 'Versão', publishedOn: 'publicada em', back: 'Voltar', navigationLabel: 'Documentos legais', termsTab: 'Termos', fairUseTab: 'Uso Justo', publicTextNotice: 'Este é o texto público vigente. Versões anteriores e registros de aceite são mantidos para fins de governança e suporte.' },
  en: { legalUpdate: 'LEGAL UPDATE', consentTitle: 'Confirm the Fair Use documents', consentBody: 'To continue, confirm that you have read and accept the Terms of Use applicable to AI features and the Fair Use Policy.', readTerms: 'Read Terms of Use', readFairUse: 'Read Fair Use Policy', consentLabel: 'I have read and accept the Terms of Use — AI Fair Use Addendum and the Fair Use Policy, version 1.0.', accepting: 'Recording acceptance…', acceptAndContinue: 'Accept and continue', version: 'Version', publishedOn: 'published on', back: 'Back', navigationLabel: 'Legal documents', termsTab: 'Terms', fairUseTab: 'Fair Use', publicTextNotice: 'This is the current public text. Previous versions and acceptance records are retained for governance and support purposes.' },
  es: { legalUpdate: 'ACTUALIZACIÓN LEGAL', consentTitle: 'Confirma los documentos de Uso Justo', consentBody: 'Para continuar, confirma que has leído y aceptas los Términos de Uso aplicables a las funciones de IA y la Política de Uso Justo.', readTerms: 'Leer Términos de Uso', readFairUse: 'Leer Política de Uso Justo', consentLabel: 'He leído y acepto los Términos de Uso — Anexo de Uso Justo de IA y la Política de Uso Justo, versión 1.0.', accepting: 'Registrando aceptación…', acceptAndContinue: 'Aceptar y continuar', version: 'Versión', publishedOn: 'publicada el', back: 'Volver', navigationLabel: 'Documentos legales', termsTab: 'Términos', fairUseTab: 'Uso Justo', publicTextNotice: 'Este es el texto público vigente. Las versiones anteriores y los registros de aceptación se conservan para fines de gobernanza y soporte.' },
  de: { legalUpdate: 'RECHTLICHE AKTUALISIERUNG', consentTitle: 'Bestätigen Sie die Fair-Use-Dokumente', consentBody: 'Um fortzufahren, bestätigen Sie bitte, dass Sie die für KI-Funktionen geltenden Nutzungsbedingungen und die Richtlinie zur fairen Nutzung gelesen haben und akzeptieren.', readTerms: 'Nutzungsbedingungen lesen', readFairUse: 'Fair-Use-Richtlinie lesen', consentLabel: 'Ich habe die Nutzungsbedingungen — Nachtrag zur fairen Nutzung von KI — und die Fair-Use-Richtlinie, Version 1.0, gelesen und akzeptiere sie.', accepting: 'Annahme wird erfasst…', acceptAndContinue: 'Akzeptieren und fortfahren', version: 'Version', publishedOn: 'veröffentlicht am', back: 'Zurück', navigationLabel: 'Rechtliche Dokumente', termsTab: 'Bedingungen', fairUseTab: 'Faire Nutzung', publicTextNotice: 'Dies ist der aktuell gültige öffentliche Text. Frühere Versionen und Annahmeaufzeichnungen werden für Governance- und Supportzwecke aufbewahrt.' },
};

export const REQUIRED_LEGAL_DOCUMENTS = Object.values(LEGAL_DOCUMENTS);

export function resolveLegalLocale(locale: string | undefined): LegalLocale {
  const candidate = locale?.slice(0, 2).toLowerCase();
  return LEGAL_LOCALES.includes(candidate as LegalLocale) ? candidate as LegalLocale : 'en';
}

export function getLegalUi(locale: string | undefined): LegalUiCopy {
  return LEGAL_UI[resolveLegalLocale(locale)];
}

export function localizeLegalDocument(document: LegalDocument, locale: string | undefined): LocalizedLegalDocument {
  const resolvedLocale = resolveLegalLocale(locale);
  return { ...document, ...document.translations[resolvedLocale], locale: resolvedLocale };
}

export function getLegalDocumentBySlug(slug: string | undefined, locale?: string): LocalizedLegalDocument {
  const document = REQUIRED_LEGAL_DOCUMENTS.find(candidate => candidate.slug === slug) ?? LEGAL_DOCUMENTS.terms_of_use_ai;
  return localizeLegalDocument(document, locale);
}
