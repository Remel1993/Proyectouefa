export type Slot = "FINDE" | "MITAD" | "UNICO";

export type Competicion = "LIGA" | "CHAMPIONS" | "EUROPA_LEAGUE";

export interface Fixture {
  id: string;
  competicion: Competicion;
  ronda: string;          // ej: "Jornada 5", "Octavos IDA", "Final"
  slot: Slot;
  esPartido: boolean;     // false para milestones (sorteo, cierre de mercado, fin de liga)
  title?: string;
  desc?: string;
  leagueMatchday?: number; // Número de jornada de liga si aplica (1..38)
  europeanRound?: string;  // Ronda europea si aplica ("GRUPOS_1", "OCTAVOS_IDA", etc.)
}

export interface SemanaCalendario {
  weekIndex: number;      // 1-42
  mes: string;
  fixtures: Fixture[];
}

export const SEASON_CALENDAR_42_WEEKS: SemanaCalendario[] = [
  {
    weekIndex: 1,
    mes: "Agosto",
    fixtures: [
      {
        id: "w1-preseason",
        competicion: "LIGA",
        ronda: "Pretemporada",
        slot: "FINDE",
        esPartido: false,
        title: "Puesta a Punto de Pretemporada",
        desc: "Preparación física, táctica y ensamblaje del plantel para la nueva temporada."
      }
    ]
  },
  {
    weekIndex: 2,
    mes: "Agosto",
    fixtures: [
      {
        id: "w2-uefa-draw",
        competicion: "CHAMPIONS",
        ronda: "Sorteo Europeo UEFA",
        slot: "MITAD",
        esPartido: false,
        title: "Sorteo Fase de Grupos UEFA",
        desc: "Definición de los grupos de Champions League y cruces continentales."
      }
    ]
  },
  {
    weekIndex: 3,
    mes: "Agosto",
    fixtures: [
      {
        id: "w3-league-j1",
        competicion: "LIGA",
        ronda: "Jornada 1",
        slot: "FINDE",
        esPartido: true,
        leagueMatchday: 1,
        title: "Debut Liguero · Jornada 1",
        desc: "Arranque oficial de la temporada en las ligas nacionales europeas."
      }
    ]
  },
  {
    weekIndex: 4,
    mes: "Agosto",
    fixtures: [
      {
        id: "w4-league-j2",
        competicion: "LIGA",
        ronda: "Jornada 2",
        slot: "FINDE",
        esPartido: true,
        leagueMatchday: 2,
        title: "Liga · Jornada 2",
        desc: "Segunda fecha del campeonato doméstico."
      }
    ]
  },
  {
    weekIndex: 5,
    mes: "Septiembre",
    fixtures: [
      {
        id: "w5-league-j3",
        competicion: "LIGA",
        ronda: "Jornada 3",
        slot: "FINDE",
        esPartido: true,
        leagueMatchday: 3,
        title: "Liga · Jornada 3",
        desc: "Tercera fecha de liga regular."
      },
      {
        id: "w5-rest-break",
        competicion: "LIGA",
        ronda: "Puesta a Punto y Descanso",
        slot: "MITAD",
        esPartido: false,
        title: "Puesta a Punto del Plantel",
        desc: "Ajustes tácticos, recuperación física y gestión interna del club."
      }
    ]
  },
  {
    weekIndex: 6,
    mes: "Septiembre",
    fixtures: [
      {
        id: "w6-league-j4",
        competicion: "LIGA",
        ronda: "Jornada 4",
        slot: "FINDE",
        esPartido: true,
        leagueMatchday: 4,
        title: "Liga · Jornada 4",
        desc: "Cuarta fecha de liga."
      }
    ]
  },
  {
    weekIndex: 7,
    mes: "Septiembre",
    fixtures: [
      {
        id: "w7-league-j5",
        competicion: "LIGA",
        ronda: "Jornada 5",
        slot: "FINDE",
        esPartido: true,
        leagueMatchday: 5,
        title: "Liga · Jornada 5",
        desc: "Quinta fecha de liga regular."
      },
      {
        id: "w7-cl-j1",
        competicion: "CHAMPIONS",
        ronda: "Fase de Grupos — J1",
        slot: "MITAD",
        esPartido: true,
        europeanRound: "GRUPOS_1",
        title: "Champions League · Grupos J1",
        desc: "Arranque de la fase de grupos de UEFA Champions League."
      },
      {
        id: "w7-el-info",
        competicion: "EUROPA_LEAGUE",
        ronda: "Seguimiento de Liga",
        slot: "MITAD",
        esPartido: false,
        title: "Europa League · Seguimiento Clasificación",
        desc: "Los puestos 5º al 8º de cada liga regular obtendrán billete a Dieciseisavos de UEL."
      }
    ]
  },
  {
    weekIndex: 8,
    mes: "Septiembre",
    fixtures: [
      {
        id: "w8-league-j6",
        competicion: "LIGA",
        ronda: "Jornada 6",
        slot: "FINDE",
        esPartido: true,
        leagueMatchday: 6,
        title: "Liga · Jornada 6",
        desc: "Sexta fecha de liga."
      }
    ]
  },
  {
    weekIndex: 9,
    mes: "Octubre",
    fixtures: [
      {
        id: "w9-league-j7",
        competicion: "LIGA",
        ronda: "Jornada 7",
        slot: "FINDE",
        esPartido: true,
        leagueMatchday: 7,
        title: "Liga · Jornada 7",
        desc: "Séptima fecha de liga."
      },
      {
        id: "w9-cl-j2",
        competicion: "CHAMPIONS",
        ronda: "Fase de Grupos — J2",
        slot: "MITAD",
        esPartido: true,
        europeanRound: "GRUPOS_2",
        title: "Champions League · Grupos J2",
        desc: "Segunda jornada de la fase de grupos de UCL."
      },
      {
        id: "w9-el-info",
        competicion: "EUROPA_LEAGUE",
        ronda: "Seguimiento de Liga",
        slot: "MITAD",
        esPartido: false,
        title: "Europa League · Seguimiento Clasificación",
        desc: "Seguimiento de las plazas de acceso 5º al 8º para la 1ª eliminatoria."
      }
    ]
  },
  {
    weekIndex: 10,
    mes: "Octubre",
    fixtures: [
      {
        id: "w10-league-j8",
        competicion: "LIGA",
        ronda: "Jornada 8",
        slot: "FINDE",
        esPartido: true,
        leagueMatchday: 8,
        title: "Liga · Jornada 8",
        desc: "Octava fecha de liga."
      }
    ]
  },
  {
    weekIndex: 11,
    mes: "Octubre",
    fixtures: [
      {
        id: "w11-league-j9",
        competicion: "LIGA",
        ronda: "Jornada 9",
        slot: "FINDE",
        esPartido: true,
        leagueMatchday: 9,
        title: "Liga · Jornada 9",
        desc: "Novena fecha de liga."
      },
      {
        id: "w11-cl-j3",
        competicion: "CHAMPIONS",
        ronda: "Fase de Grupos — J3",
        slot: "MITAD",
        esPartido: true,
        europeanRound: "GRUPOS_3",
        title: "Champions League · Grupos J3",
        desc: "Tercera jornada de la fase de grupos de UCL."
      },
      {
        id: "w11-el-info",
        competicion: "EUROPA_LEAGUE",
        ronda: "Seguimiento de Liga",
        slot: "MITAD",
        esPartido: false,
        title: "Europa League · Seguimiento Clasificación",
        desc: "Seguimiento de la carrera por los billetes a Dieciseisavos de UEL."
      }
    ]
  },
  {
    weekIndex: 12,
    mes: "Octubre",
    fixtures: [
      {
        id: "w12-league-j10",
        competicion: "LIGA",
        ronda: "Jornada 10",
        slot: "FINDE",
        esPartido: true,
        leagueMatchday: 10,
        title: "Liga · Jornada 10",
        desc: "Décima fecha de liga."
      }
    ]
  },
  {
    weekIndex: 13,
    mes: "Noviembre",
    fixtures: [
      {
        id: "w13-league-j11",
        competicion: "LIGA",
        ronda: "Jornada 11",
        slot: "FINDE",
        esPartido: true,
        leagueMatchday: 11,
        title: "Liga · Jornada 11",
        desc: "Undécima fecha de liga."
      },
      {
        id: "w13-rest-break",
        competicion: "LIGA",
        ronda: "Puesta a Punto de Otoño",
        slot: "MITAD",
        esPartido: false,
        title: "Descanso Táctico y Recuperación",
        desc: "Sesión intensiva de recuperación física y análisis táctico."
      }
    ]
  },
  {
    weekIndex: 14,
    mes: "Noviembre",
    fixtures: [
      {
        id: "w14-league-j12",
        competicion: "LIGA",
        ronda: "Jornada 12",
        slot: "FINDE",
        esPartido: true,
        leagueMatchday: 12,
        title: "Liga · Jornada 12",
        desc: "Duodécima fecha de liga."
      },
      {
        id: "w14-cl-j4",
        competicion: "CHAMPIONS",
        ronda: "Fase de Grupos — J4",
        slot: "MITAD",
        esPartido: true,
        europeanRound: "GRUPOS_4",
        title: "Champions League · Grupos J4",
        desc: "Cuarta fecha de fase de grupos UCL."
      },
      {
        id: "w14-el-info",
        competicion: "EUROPA_LEAGUE",
        ronda: "Seguimiento de Liga",
        slot: "MITAD",
        esPartido: false,
        title: "Europa League · Seguimiento Clasificación",
        desc: "Evolución de la tabla para las 16 plazas de liga europea."
      }
    ]
  },
  {
    weekIndex: 15,
    mes: "Noviembre",
    fixtures: [
      {
        id: "w15-league-j13",
        competicion: "LIGA",
        ronda: "Jornada 13",
        slot: "FINDE",
        esPartido: true,
        leagueMatchday: 13,
        title: "Liga · Jornada 13",
        desc: "Decimotercera fecha de liga."
      }
    ]
  },
  {
    weekIndex: 16,
    mes: "Noviembre",
    fixtures: [
      {
        id: "w16-league-j14",
        competicion: "LIGA",
        ronda: "Jornada 14",
        slot: "FINDE",
        esPartido: true,
        leagueMatchday: 14,
        title: "Liga · Jornada 14",
        desc: "Decimocuarta fecha de liga."
      },
      {
        id: "w16-cl-j5",
        competicion: "CHAMPIONS",
        ronda: "Fase de Grupos — J5",
        slot: "MITAD",
        esPartido: true,
        europeanRound: "GRUPOS_5",
        title: "Champions League · Grupos J5",
        desc: "Quinta fecha de fase de grupos UCL."
      },
      {
        id: "w16-el-info",
        competicion: "EUROPA_LEAGUE",
        ronda: "Seguimiento de Liga",
        slot: "MITAD",
        esPartido: false,
        title: "Europa League · Seguimiento Clasificación",
        desc: "Penúltima fecha previa a la resolución de grupos de Champions."
      }
    ]
  },
  {
    weekIndex: 17,
    mes: "Diciembre",
    fixtures: [
      {
        id: "w17-league-j15",
        competicion: "LIGA",
        ronda: "Jornada 15",
        slot: "FINDE",
        esPartido: true,
        leagueMatchday: 15,
        title: "Liga · Jornada 15",
        desc: "Decimoquinta fecha de liga."
      }
    ]
  },
  {
    weekIndex: 18,
    mes: "Diciembre",
    fixtures: [
      {
        id: "w18-league-j16",
        competicion: "LIGA",
        ronda: "Jornada 16",
        slot: "FINDE",
        esPartido: true,
        leagueMatchday: 16,
        title: "Liga · Jornada 16",
        desc: "Decimosexta fecha de liga."
      },
      {
        id: "w18-cl-j6",
        competicion: "CHAMPIONS",
        ronda: "Fase de Grupos — J6 (Cierre)",
        slot: "MITAD",
        esPartido: true,
        europeanRound: "GRUPOS_6",
        title: "Champions League · Grupos J6 (Cierre)",
        desc: "Última fecha de grupos: clasificados a octavos UCL y repescados a UEL."
      },
      {
        id: "w18-el-repesca-info",
        competicion: "EUROPA_LEAGUE",
        ronda: "Definición de Repescados UCL",
        slot: "MITAD",
        esPartido: false,
        title: "Europa League · Repescados de Champions",
        desc: "Los 8 terceros de Champions League aseguran plaza directa en Octavos de UEL."
      }
    ]
  },
  {
    weekIndex: 19,
    mes: "Diciembre",
    fixtures: [
      {
        id: "w19-league-j17",
        competicion: "LIGA",
        ronda: "Jornada 17",
        slot: "FINDE",
        esPartido: true,
        leagueMatchday: 17,
        title: "Liga · Jornada 17",
        desc: "Decimoséptima fecha de liga."
      }
    ]
  },
  {
    weekIndex: 20,
    mes: "Diciembre",
    fixtures: [
      {
        id: "w20-league-j18",
        competicion: "LIGA",
        ronda: "Jornada 18",
        slot: "FINDE",
        esPartido: true,
        leagueMatchday: 18,
        title: "Liga · Jornada 18",
        desc: "Decimoctava fecha de liga."
      },
      {
        id: "w20-uefa-knockout-draw",
        competicion: "CHAMPIONS",
        ronda: "Sorteo Eliminatorias UEFA",
        slot: "MITAD",
        esPartido: false,
        title: "Sorteo de Cruces Eliminatorios",
        desc: "Sorteo de Octavos de Champions League y Dieciseisavos de Europa League."
      }
    ]
  },
  {
    weekIndex: 21,
    mes: "Enero",
    fixtures: [
      {
        id: "w21-league-j19",
        competicion: "LIGA",
        ronda: "Jornada 19",
        slot: "FINDE",
        esPartido: true,
        leagueMatchday: 19,
        title: "Liga · Jornada 19 (Fin de 1ª Vuelta)",
        desc: "Cierre de la primera mitad del campeonato liguero."
      }
    ]
  },
  {
    weekIndex: 22,
    mes: "Enero",
    fixtures: [
      {
        id: "w22-league-j20",
        competicion: "LIGA",
        ronda: "Jornada 20",
        slot: "FINDE",
        esPartido: true,
        leagueMatchday: 20,
        title: "Liga · Jornada 20",
        desc: "Inicio de la segunda vuelta de liga."
      },
      {
        id: "w22-el-r32-ida",
        competicion: "EUROPA_LEAGUE",
        ronda: "Dieciseisavos (Ida)",
        slot: "MITAD",
        esPartido: true,
        europeanRound: "DIECISEISAVOS_IDA",
        title: "Europa League · Dieciseisavos IDA",
        desc: "Ida del play-off eliminatorio en UEL."
      }
    ]
  },
  {
    weekIndex: 23,
    mes: "Enero",
    fixtures: [
      {
        id: "w23-league-j21",
        competicion: "LIGA",
        ronda: "Jornada 21",
        slot: "FINDE",
        esPartido: true,
        leagueMatchday: 21,
        title: "Liga · Jornada 21",
        desc: "Vigésimo primera fecha de liga."
      },
      {
        id: "w23-el-r32-vta",
        competicion: "EUROPA_LEAGUE",
        ronda: "Dieciseisavos (Vuelta)",
        slot: "MITAD",
        esPartido: true,
        europeanRound: "DIECISEISAVOS_VUELTA",
        title: "Europa League · Dieciseisavos VUELTA",
        desc: "Definición de clasificados a octavos de final de UEL."
      }
    ]
  },
  {
    weekIndex: 24,
    mes: "Enero",
    fixtures: [
      {
        id: "w24-league-j22",
        competicion: "LIGA",
        ronda: "Jornada 22",
        slot: "FINDE",
        esPartido: true,
        leagueMatchday: 22,
        title: "Liga · Jornada 22",
        desc: "Vigésimo segunda fecha de liga."
      },
      {
        id: "w24-market-deadline",
        competicion: "LIGA",
        ronda: "Cierre de Mercado (31 enero)",
        slot: "MITAD",
        esPartido: false,
        title: "Deadline Day · Cierre de Mercado de Invierno",
        desc: "Último día del periodo de fichajes invernal."
      }
    ]
  },
  {
    weekIndex: 25,
    mes: "Febrero",
    fixtures: [
      {
        id: "w25-league-j23",
        competicion: "LIGA",
        ronda: "Jornada 23",
        slot: "FINDE",
        esPartido: true,
        leagueMatchday: 23,
        title: "Liga · Jornada 23",
        desc: "Vigésimo tercera fecha de liga."
      },
      {
        id: "w25-cl-r16-ida",
        competicion: "CHAMPIONS",
        ronda: "Octavos (Ida)",
        slot: "MITAD",
        esPartido: true,
        europeanRound: "OCTAVOS_IDA",
        title: "Champions League · Octavos IDA",
        desc: "Ida de octavos de final de UCL."
      },
      {
        id: "w25-el-r16-ida",
        competicion: "EUROPA_LEAGUE",
        ronda: "Octavos (Ida)",
        slot: "MITAD",
        esPartido: true,
        europeanRound: "OCTAVOS_IDA",
        title: "Europa League · Octavos IDA",
        desc: "Ida de octavos de final de UEL."
      }
    ]
  },
  {
    weekIndex: 26,
    mes: "Febrero",
    fixtures: [
      {
        id: "w26-league-j24",
        competicion: "LIGA",
        ronda: "Jornada 24",
        slot: "FINDE",
        esPartido: true,
        leagueMatchday: 24,
        title: "Liga · Jornada 24",
        desc: "Vigésimo cuarta fecha de liga."
      }
    ]
  },
  {
    weekIndex: 27,
    mes: "Febrero",
    fixtures: [
      {
        id: "w27-league-j25",
        competicion: "LIGA",
        ronda: "Jornada 25",
        slot: "FINDE",
        esPartido: true,
        leagueMatchday: 25,
        title: "Liga · Jornada 25",
        desc: "Vigésimo quinta fecha de liga."
      },
      {
        id: "w27-cl-r16-vta",
        competicion: "CHAMPIONS",
        ronda: "Octavos (Vuelta)",
        slot: "MITAD",
        esPartido: true,
        europeanRound: "OCTAVOS_VUELTA",
        title: "Champions League · Octavos VUELTA",
        desc: "Vuelta de octavos de final de UCL: pase a cuartos."
      },
      {
        id: "w27-el-r16-vta",
        competicion: "EUROPA_LEAGUE",
        ronda: "Octavos (Vuelta)",
        slot: "MITAD",
        esPartido: true,
        europeanRound: "OCTAVOS_VUELTA",
        title: "Europa League · Octavos VUELTA",
        desc: "Vuelta de octavos de final de UEL: pase a cuartos."
      }
    ]
  },
  {
    weekIndex: 28,
    mes: "Febrero",
    fixtures: [
      {
        id: "w28-league-j26",
        competicion: "LIGA",
        ronda: "Jornada 26",
        slot: "FINDE",
        esPartido: true,
        leagueMatchday: 26,
        title: "Liga · Jornada 26",
        desc: "Vigésimo sexta fecha de liga."
      }
    ]
  },
  {
    weekIndex: 29,
    mes: "Marzo",
    fixtures: [
      {
        id: "w29-league-j27",
        competicion: "LIGA",
        ronda: "Jornada 27",
        slot: "FINDE",
        esPartido: true,
        leagueMatchday: 27,
        title: "Liga · Jornada 27",
        desc: "Vigésimo séptima fecha de liga."
      }
    ]
  },
  {
    weekIndex: 30,
    mes: "Marzo",
    fixtures: [
      {
        id: "w30-league-j28",
        competicion: "LIGA",
        ronda: "Jornada 28",
        slot: "FINDE",
        esPartido: true,
        leagueMatchday: 28,
        title: "Liga · Jornada 28",
        desc: "Vigésimo octava fecha de liga."
      },
      {
        id: "w30-cl-qf-ida",
        competicion: "CHAMPIONS",
        ronda: "Cuartos (Ida)",
        slot: "MITAD",
        esPartido: true,
        europeanRound: "CUARTOS_IDA",
        title: "Champions League · Cuartos IDA",
        desc: "Ida de cuartos de final de UCL."
      },
      {
        id: "w30-el-qf-ida",
        competicion: "EUROPA_LEAGUE",
        ronda: "Cuartos (Ida)",
        slot: "MITAD",
        esPartido: true,
        europeanRound: "CUARTOS_IDA",
        title: "Europa League · Cuartos IDA",
        desc: "Ida de cuartos de final de UEL."
      }
    ]
  },
  {
    weekIndex: 31,
    mes: "Marzo",
    fixtures: [
      {
        id: "w31-league-j29",
        competicion: "LIGA",
        ronda: "Jornada 29",
        slot: "FINDE",
        esPartido: true,
        leagueMatchday: 29,
        title: "Liga · Jornada 29",
        desc: "Vigésimo novena fecha de liga."
      },
      {
        id: "w31-rest-break",
        competicion: "LIGA",
        ronda: "Puesta a Punto de Primavera",
        slot: "MITAD",
        esPartido: false,
        title: "Descanso y Preparación de Recta Final",
        desc: "Planificación de cara a la recta final y definición de títulos."
      }
    ]
  },
  {
    weekIndex: 32,
    mes: "Marzo",
    fixtures: [
      {
        id: "w32-league-j30",
        competicion: "LIGA",
        ronda: "Jornada 30",
        slot: "FINDE",
        esPartido: true,
        leagueMatchday: 30,
        title: "Liga · Jornada 30",
        desc: "Trigésima fecha de liga."
      },
      {
        id: "w32-cl-qf-vta",
        competicion: "CHAMPIONS",
        ronda: "Cuartos (Vuelta)",
        slot: "MITAD",
        esPartido: true,
        europeanRound: "CUARTOS_VUELTA",
        title: "Champions League · Cuartos VUELTA",
        desc: "Vuelta de cuartos de final de UCL: pase a semifinales."
      },
      {
        id: "w32-el-qf-vta",
        competicion: "EUROPA_LEAGUE",
        ronda: "Cuartos (Vuelta)",
        slot: "MITAD",
        esPartido: true,
        europeanRound: "CUARTOS_VUELTA",
        title: "Europa League · Cuartos VUELTA",
        desc: "Vuelta de cuartos de final de UEL: pase a semifinales."
      }
    ]
  },
  {
    weekIndex: 33,
    mes: "Abril",
    fixtures: [
      {
        id: "w33-league-j31",
        competicion: "LIGA",
        ronda: "Jornada 31",
        slot: "FINDE",
        esPartido: true,
        leagueMatchday: 31,
        title: "Liga · Jornada 31",
        desc: "Trigésimo primera fecha de liga."
      }
    ]
  },
  {
    weekIndex: 34,
    mes: "Abril",
    fixtures: [
      {
        id: "w34-league-j32",
        competicion: "LIGA",
        ronda: "Jornada 32",
        slot: "FINDE",
        esPartido: true,
        leagueMatchday: 32,
        title: "Liga · Jornada 32",
        desc: "Trigésimo segunda fecha de liga."
      },
      {
        id: "w34-cl-sf-ida",
        competicion: "CHAMPIONS",
        ronda: "Semifinal (Ida)",
        slot: "MITAD",
        esPartido: true,
        europeanRound: "SEMIFINAL_IDA",
        title: "Champions League · Semifinales IDA",
        desc: "Ida de semifinales de UCL."
      },
      {
        id: "w34-el-sf-ida",
        competicion: "EUROPA_LEAGUE",
        ronda: "Semifinal (Ida)",
        slot: "MITAD",
        esPartido: true,
        europeanRound: "SEMIFINAL_IDA",
        title: "Europa League · Semifinales IDA",
        desc: "Ida de semifinales de UEL."
      }
    ]
  },
  {
    weekIndex: 35,
    mes: "Abril",
    fixtures: [
      {
        id: "w35-league-j33",
        competicion: "LIGA",
        ronda: "Jornada 33",
        slot: "FINDE",
        esPartido: true,
        leagueMatchday: 33,
        title: "Liga · Jornada 33",
        desc: "Trigésimo tercera fecha de liga."
      }
    ]
  },
  {
    weekIndex: 36,
    mes: "Abril",
    fixtures: [
      {
        id: "w36-league-j34",
        competicion: "LIGA",
        ronda: "Jornada 34",
        slot: "FINDE",
        esPartido: true,
        leagueMatchday: 34,
        title: "Liga · Jornada 34",
        desc: "Trigésimo cuarta fecha de liga (definición en ligas de 18 clubes)."
      },
      {
        id: "w36-cl-sf-vta",
        competicion: "CHAMPIONS",
        ronda: "Semifinal (Vuelta)",
        slot: "MITAD",
        esPartido: true,
        europeanRound: "SEMIFINAL_VUELTA",
        title: "Champions League · Semifinales VUELTA",
        desc: "Vuelta de semifinales de UCL: pase a la gran final."
      },
      {
        id: "w36-el-sf-vta",
        competicion: "EUROPA_LEAGUE",
        ronda: "Semifinal (Vuelta)",
        slot: "MITAD",
        esPartido: true,
        europeanRound: "SEMIFINAL_VUELTA",
        title: "Europa League · Semifinales VUELTA",
        desc: "Vuelta de semifinales de UEL: pase a la gran final."
      }
    ]
  },
  {
    weekIndex: 37,
    mes: "Mayo",
    fixtures: [
      {
        id: "w37-league-j35",
        competicion: "LIGA",
        ronda: "Jornada 35",
        slot: "FINDE",
        esPartido: true,
        leagueMatchday: 35,
        title: "Liga · Jornada 35",
        desc: "Trigésimo quinta fecha de liga."
      }
    ]
  },
  {
    weekIndex: 38,
    mes: "Mayo",
    fixtures: [
      {
        id: "w38-league-j36",
        competicion: "LIGA",
        ronda: "Jornada 36",
        slot: "FINDE",
        esPartido: true,
        leagueMatchday: 36,
        title: "Liga · Jornada 36",
        desc: "Trigésimo sexta fecha de liga."
      }
    ]
  },
  {
    weekIndex: 39,
    mes: "Mayo",
    fixtures: [
      {
        id: "w39-league-j37",
        competicion: "LIGA",
        ronda: "Jornada 37",
        slot: "FINDE",
        esPartido: true,
        leagueMatchday: 37,
        title: "Liga · Jornada 37",
        desc: "Penúltima fecha del campeonato liguero."
      },
      {
        id: "w39-el-final",
        competicion: "EUROPA_LEAGUE",
        ronda: "Gran Final",
        slot: "UNICO",
        esPartido: true,
        europeanRound: "FINAL",
        title: "Gran Final de UEFA Europa League",
        desc: "Partido definitivo por el trofeo continental de la UEFA Europa League."
      }
    ]
  },
  {
    weekIndex: 40,
    mes: "Mayo",
    fixtures: [
      {
        id: "w40-league-j38",
        competicion: "LIGA",
        ronda: "Jornada 38",
        slot: "FINDE",
        esPartido: true,
        leagueMatchday: 38,
        title: "Liga · Jornada 38 (Clausura)",
        desc: "Última fecha del campeonato liguero y coronación de campeones domésticos."
      },
      {
        id: "w40-league-end",
        competicion: "LIGA",
        ronda: "Fin de Liga Doméstica",
        slot: "MITAD",
        esPartido: false,
        title: "Clausura de Ligas Nacionales",
        desc: "Balance final de ascensos, descensos y clasificados a torneos UEFA."
      }
    ]
  },
  {
    weekIndex: 41,
    mes: "Junio",
    fixtures: [
      {
        id: "w41-cl-final",
        competicion: "CHAMPIONS",
        ronda: "Gran Final",
        slot: "UNICO",
        esPartido: true,
        europeanRound: "FINAL",
        title: "Gran Final de UEFA Champions League",
        desc: "La máxima final continental europea por la 'Orejona'."
      }
    ]
  },
  {
    weekIndex: 42,
    mes: "Junio",
    fixtures: [
      {
        id: "w42-financial-close",
        competicion: "LIGA",
        ronda: "Cierre Financiero y Renovaciones",
        slot: "MITAD",
        esPartido: false,
        title: "Cierre Financiero y Renovaciones",
        desc: "Balance fiscal anual, evaluación de objetivos y planificación de fichajes para el nuevo curso."
      }
    ]
  }
];

export const getSemanaCalendario = (weekIndex: number): SemanaCalendario | undefined => {
  return SEASON_CALENDAR_42_WEEKS.find(w => w.weekIndex === weekIndex);
};

export const getTotalCalendarWeeks = (): number => 42;

export const getLeagueMatchdayForWeek = (weekIndex: number): number | null => {
  const week = getSemanaCalendario(weekIndex);
  if (!week) return null;
  const leagueFix = week.fixtures.find(f => f.competicion === "LIGA" && f.esPartido && f.leagueMatchday !== undefined);
  return leagueFix?.leagueMatchday ?? null;
};

export const getWeekForLeagueMatchday = (matchday: number): number => {
  if (matchday <= 0) return 1;
  if (matchday > 38) return 42;
  const week = SEASON_CALENDAR_42_WEEKS.find(w => 
    w.fixtures.some(f => f.competicion === "LIGA" && f.esPartido && f.leagueMatchday === matchday)
  );
  return week ? week.weekIndex : Math.min(42, Math.max(1, matchday));
};

// Semanas oficiales con fechas de UEFA Champions League (Sorteos y Rondas)
export const CHAMPIONS_DRAW_WEEKS = [2, 20];
export const CHAMPIONS_MATCH_WEEKS = [7, 9, 11, 14, 16, 18, 25, 27, 30, 32, 34, 36, 41];
export const CHAMPIONS_CALENDAR_WEEKS = [2, 7, 9, 11, 14, 16, 18, 20, 25, 27, 30, 32, 34, 36, 41];

// Semanas oficiales con fechas de UEFA Europa League (Sorteo, Dieciseisavos, Octavos, Cuartos, Semis, Final)
export const EUROPA_LEAGUE_DRAW_WEEKS = [20];
export const EUROPA_LEAGUE_MATCH_WEEKS = [22, 23, 25, 27, 30, 32, 34, 36, 39];
export const EUROPA_LEAGUE_CALENDAR_WEEKS = [20, 22, 23, 25, 27, 30, 32, 34, 36, 39];

export const isChampionsWeek = (weekIndex: number): boolean => {
  return CHAMPIONS_CALENDAR_WEEKS.includes(weekIndex);
};

export const isChampionsDrawWeek = (weekIndex: number): boolean => {
  return CHAMPIONS_DRAW_WEEKS.includes(weekIndex);
};

export const isChampionsMatchWeek = (weekIndex: number): boolean => {
  return CHAMPIONS_MATCH_WEEKS.includes(weekIndex);
};

export const isEuropaLeagueWeek = (weekIndex: number): boolean => {
  return EUROPA_LEAGUE_CALENDAR_WEEKS.includes(weekIndex);
};

export const isEuropaLeagueDrawWeek = (weekIndex: number): boolean => {
  return EUROPA_LEAGUE_DRAW_WEEKS.includes(weekIndex);
};

export const isEuropaLeagueMatchWeek = (weekIndex: number): boolean => {
  return EUROPA_LEAGUE_MATCH_WEEKS.includes(weekIndex);
};

export const getNextChampionsWeek = (currentWeek: number): number | null => {
  const next = CHAMPIONS_CALENDAR_WEEKS.find(w => w > currentWeek);
  return next || (currentWeek >= 41 ? null : 41);
};

export const getNextChampionsMatchWeek = (currentWeek: number): number | null => {
  const next = CHAMPIONS_MATCH_WEEKS.find(w => w >= currentWeek);
  return next || (currentWeek >= 41 ? null : 41);
};

export const getNextEuropaLeagueWeek = (currentWeek: number): number | null => {
  const next = EUROPA_LEAGUE_CALENDAR_WEEKS.find(w => w > currentWeek);
  return next || (currentWeek >= 39 ? null : 39);
};

export const getNextEuropaLeagueMatchWeek = (currentWeek: number): number | null => {
  const next = EUROPA_LEAGUE_MATCH_WEEKS.find(w => w >= currentWeek);
  return next || (currentWeek >= 39 ? null : 39);
};

export const getExpectedCupMatchdayForWeek = (compId: string, week: number): number | null => {
  if (compId === 'C1') {
    const clMap: Record<number, number> = {
      7: 1, 9: 2, 11: 3, 14: 4, 16: 5, 18: 6,
      25: 7, 27: 8, 30: 9, 32: 10, 34: 11, 36: 12, 41: 13
    };
    return clMap[week] ?? null;
  }
  if (compId === 'C3') {
    const uelMap: Record<number, number> = {
      22: 1, 23: 2, 25: 3, 27: 4, 30: 5, 32: 6, 34: 7, 36: 8, 39: 9
    };
    return uelMap[week] ?? null;
  }
  return null;
};
