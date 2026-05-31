import { BRAND } from '../theme/tokens';

// ─── Block 2 — Certifications ─────────────────────────────────────────────────

export const CERTS = [
  { key: 'pt',       label: 'Personal Trainer',                        icon: 'trophy'    },
  { key: 'fitness',  label: 'Treinador Fitness',                       icon: 'dumbbell'  },
  { key: 'edfis',    label: 'Graduação Ed. Física / Ciências do Esporte', icon: 'grad'   },
  { key: 'physio',   label: 'Fisioterapeuta',                          icon: 'heart'     },
  { key: 'snc',      label: 'Strength & Conditioning',                 icon: 'bolt'      },
  { key: 'other',    label: 'Outra',                                   icon: 'plus'      },
] as const;

// ─── Block 3 — Fitness Levels ─────────────────────────────────────────────────

export const FITNESS_LEVELS = [
  { value: 1, label: 'Atleta de elite',        sub: 'Competição ou alto rendimento'          },
  { value: 2, label: 'Muito condicionado',      sub: 'Treinamento avançado consistente'       },
  { value: 3, label: 'Condicionado',            sub: 'Treinamento regular e progressivo'      },
  { value: 4, label: 'Mediano',                 sub: 'Ativo com treinos esporádicos intensos' },
  { value: 5, label: 'Moderadamente ativo',     sub: 'Foco em saúde e bem-estar'              },
] as const;

// ─── Block 4 — Training Methods ───────────────────────────────────────────────

export const METHODS = [
  'CrossFit', 'Treino Funcional', 'HIIT', 'Circuito',
  'Musculação / Bodybuilding', 'Treino de Força', 'Corrida',
  'Mobilidade', 'Performance Atlética', 'Calistenia',
  'Treino em Máquinas', 'Outro',
] as const;

// ─── Block 4 — Training Environments ─────────────────────────────────────────

export const ENVIRONMENTS = [
  'CrossFit Box', 'Academia comercial', 'Parque de calistenia',
  'Ar livre s/ equip.', 'Ar livre c/ elásticos',
  'Indoor s/ equip.', 'Indoor c/ elásticos',
] as const;

// ─── Block 4 — General Intensity ─────────────────────────────────────────────

export const INTENSITY = [
  'Moderada', 'Desafiadora', 'Variável', 'Altamente exigente',
] as const;

// ─── Block 5 — Coaching Styles ───────────────────────────────────────────────

export const STYLES = [
  { key: 'motiv',  label: 'Motivacional',               icon: 'flame'    },
  { key: 'prof',   label: 'Profissional',                icon: 'shield'   },
  { key: 'tech',   label: 'Técnico',                     icon: 'gauge'    },
  { key: 'perf',   label: 'Orientado a performance',     icon: 'zap'      },
  { key: 'humor',  label: 'Descontraído / Bem-humorado', icon: 'sparkle'  },
  { key: 'emp',    label: 'Empático',                    icon: 'heart'    },
  { key: 'direct', label: 'Direto',                      icon: 'target'   },
  { key: 'disc',   label: 'Disciplinado',                icon: 'shieldCheck' },
] as const;

// ─── Block 6 — Core Principles ───────────────────────────────────────────────

export const PRINCIPLES = [
  { key: 'quality',    label: 'Qualidade antes da intensidade'    },
  { key: 'intensity',  label: 'Intensidade antes da perfeição'    },
  { key: 'health',     label: 'Saúde primeiro'                    },
  { key: 'strength',   label: 'Força primeiro'                    },
  { key: 'athletics',  label: 'Atletismo primeiro'                },
  { key: 'mobility',   label: 'Mobilidade primeiro'               },
  { key: 'fun',        label: 'Prazer e motivação primeiro'        },
  { key: 'function',   label: 'Função acima da estética'          },
  { key: 'progress',   label: 'Progresso sustentável'             },
] as const;

// ─── Phase 2 constants (reserved) ────────────────────────────────────────────

export const FOCUS_ITEMS = [
  { key: 'strength',  label: 'Força',                  color: BRAND.primary     },
  { key: 'endurance', label: 'Resistência',             color: BRAND.accent      },
  { key: 'mobility',  label: 'Mobilidade',              color: BRAND.lavender    },
  { key: 'athletic',  label: 'Performance atlética',    color: BRAND.amber       },
  { key: 'coord',     label: 'Coordenação',             color: BRAND.primarySoft },
  { key: 'balance',   label: 'Estabilidade / Equilíbrio', color: BRAND.success  },
] as const;

export const FORMATS = [
  'EMOM', 'AMRAP', 'For Time', 'Intervalado', 'Circuito',
  'Super-séries', 'Força + MetCon', 'Apenas Força', 'Apenas Condicionamento', 'Tabata',
] as const;

export const STRUCTURE_BLOCKS = [
  { key: 'mobility',      label: 'Mobilidade',            sub: 'Ativação articular',       icon: 'wave',    color: BRAND.lavender    },
  { key: 'warmup',        label: 'Aquecimento',           sub: 'Elevação de temperatura',  icon: 'flame',   color: BRAND.amber       },
  { key: 'technique',     label: 'Técnica',               sub: 'Foco em padrão motor',     icon: 'target',  color: BRAND.primarySoft },
  { key: 'strength',      label: 'Força',                 sub: 'Bloco principal',          icon: 'dumbbell',color: BRAND.primary     },
  { key: 'conditioning',  label: 'Condicionamento / WOD', sub: 'Metabolismo e resistência',icon: 'run',     color: BRAND.accent      },
  { key: 'cooldown',      label: 'Volta à calma',         sub: 'Recuperação e flexibilidade', icon: 'heart', color: BRAND.success    },
] as const;

export const CURVES = [
  { key: 'progressive', label: 'Crescente progressiva', sub: 'Intensidade sobe ao longo da sessão' },
  { key: 'wave',        label: 'Ondulatória',           sub: 'Alterna picos e vales'               },
  { key: 'peak_early',  label: 'Pico inicial',          sub: 'Mais intenso no começo'               },
  { key: 'peak_late',   label: 'Pico tardio',           sub: 'Mais intenso perto do fim'            },
  { key: 'constant',    label: 'Constante',             sub: 'Intensidade uniforme'                 },
] as const;

export const TONES  = ['Profissional', 'Motivacional', 'Descontraído', 'Atlético', 'Direto', 'Técnico'] as const;

export const CLIENTS = [
  'Iniciantes', 'Intermediários', 'Atletas avançados',
  'Mulheres', 'Homens', 'Idosos', 'Trabalho de escritório',
  'Emagrecimento', 'Ganho de massa', 'Reabilitação',
  'Entusiastas de funcional', 'Atletas de CrossFit',
] as const;

export const MOTTO_EXAMPLES = [
  '"Treine com propósito, recover com inteligência."',
  '"Cada rep conta. Cada sessão importa."',
  '"Performance é consequência de método."',
  '"Mova-se melhor. Mova-se mais forte."',
] as const;

export const TOTAL_STEPS = 12;
