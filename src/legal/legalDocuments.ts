export type LegalDocumentKey = 'terms_of_use_ai' | 'fair_use_policy';

export interface LegalDocument {
  key: LegalDocumentKey;
  slug: 'terms' | 'fair-use';
  version: string;
  title: string;
  subtitle: string;
  publishedAt: string;
  sections: ReadonlyArray<{ heading: string; paragraphs: readonly string[]; bullets?: readonly string[] }>;
}

export const LEGAL_DOCUMENTS: Record<LegalDocumentKey, LegalDocument> = {
  terms_of_use_ai: {
    key: 'terms_of_use_ai',
    slug: 'terms',
    version: '1.0',
    title: 'Termos de Uso — Adendo de Uso Justo de IA',
    subtitle: 'Aplicável aos recursos de IA incluídos no plano contratado.',
    publishedAt: '2026-08-06',
    sections: [
      {
        heading: 'Uso incluído no plano',
        paragraphs: [
          'Os recursos de inteligência artificial incluídos no plano aplicável são disponibilizados para utilização pessoal normal, sem franquia comercial visível de sessões, exercícios, check-ins ou análises.',
          'O uso permanece sujeito à Política de Uso Justo do TrAIner e a mecanismos proporcionais de proteção contra automação, fraude, uso abusivo, credenciais comprometidas e risco de disponibilidade ou custo anormal.',
        ],
      },
      {
        heading: 'Medidas proporcionais e continuidade',
        paragraphs: [
          'O TrAIner poderá aplicar limitação temporária de um recurso de IA, solicitar esclarecimentos ou realizar revisão humana quando houver indício razoável de uso incompatível com estes Termos.',
          'Esses mecanismos não alteram a licença contratada para uso pessoal normal, não divulgam thresholds internos e não devem interromper treino já iniciado, registro offline de séries ou outros fluxos críticos.',
        ],
      },
      {
        heading: 'Revisão e suporte',
        paragraphs: [
          'Suspensão prolongada ou encerramento de conta exige revisão humana, fundamento consistente com estes Termos e comunicação pelos canais aplicáveis.',
          'O assinante pode solicitar revisão de uma limitação temporária pelo suporte.',
        ],
      },
      {
        heading: 'Privacidade operacional',
        paragraphs: [
          'Os mecanismos operacionais de consumo não registram prompts, transcrições, respostas de IA, dados de saúde, ciclo, endereços IP ou identificadores brutos. A telemetria é minimizada, pseudonimizada, de acesso administrativo restrito e retida somente pelo período necessário definido pela política aplicável.',
        ],
      },
    ],
  },
  fair_use_policy: {
    key: 'fair_use_policy',
    slug: 'fair-use',
    version: '1.0',
    title: 'Política de Uso Justo de Recursos de IA',
    subtitle: 'Uso ilimitado para utilização pessoal normal, sujeito a proteção contra abuso.',
    publishedAt: '2026-08-06',
    sections: [
      {
        heading: 'Princípio comercial',
        paragraphs: [
          'Os recursos elegíveis são oferecidos como ilimitados para uso pessoal normal. A oferta não estabelece uma franquia comercial visível de sessões, exercícios, check-ins ou análises para o uso humano legítimo do assinante.',
          'Esse uso permanece sujeito a mecanismos necessários para proteger disponibilidade, segurança, privacidade e sustentabilidade do serviço.',
        ],
      },
      {
        heading: 'Uso pessoal normal',
        paragraphs: ['Exemplos de utilização compatível com esta política:'],
        bullets: [
          'gerar ou adaptar treinos para a própria rotina;',
          'registrar check-ins, inclusive por voz quando o recurso estiver contratado;',
          'pedir nova sugestão quando houver alteração real de tempo, energia, dor, equipamento ou objetivo;',
          'consultar análises e recomendações dentro do fluxo normal do TrAIner.',
        ],
      },
      {
        heading: 'Uso não permitido',
        paragraphs: ['Não é permitido, diretamente ou por terceiros:'],
        bullets: [
          'automatizar, programar ou simular chamadas ao serviço;',
          'enviar solicitações em volume ou cadência incompatíveis com uso humano normal;',
          'compartilhar, revender, alugar ou explorar comercialmente o acesso à IA;',
          'contornar controles técnicos, autenticação, licenciamento ou limites de segurança;',
          'usar contas múltiplas para evitar medidas de proteção;',
          'submeter conteúdo malicioso, ilegítimo ou destinado a degradar o serviço.',
        ],
      },
      {
        heading: 'Proteção, contenção e suporte',
        paragraphs: [
          'O TrAIner pode aplicar proteção contra automação, limitação temporária de rajadas, prevenção de duplicidade, monitoramento agregado de consumo e revisão humana de padrões anormais.',
          'Esses mecanismos não transformam o produto em plano de créditos e não devem interromper treino já iniciado, registro offline de séries ou outros fluxos críticos. O assinante pode contestar uma limitação temporária pelo suporte.',
        ],
      },
      {
        heading: 'Relação com TRAINER',
        paragraphs: [
          'O uso de um TRAINER em benefício de aluno vinculado segue as permissões da licença aplicável e não amplia os direitos de IA patrocinados do aluno.',
        ],
      },
    ],
  },
};

export const REQUIRED_LEGAL_DOCUMENTS = Object.values(LEGAL_DOCUMENTS);

export function getLegalDocumentBySlug(slug: string | undefined): LegalDocument {
  return REQUIRED_LEGAL_DOCUMENTS.find(document => document.slug === slug) ?? LEGAL_DOCUMENTS.terms_of_use_ai;
}
