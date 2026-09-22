// Matriz Oficial Cuadro de Mando Integral 2026 (CMI)
// Fuente: CUADRO MANDO INTEGRAL 2026.xlsx (Hojas CMI y RESUMEN VENTAS 2025 y ppto)
import type { FiltrosBI } from "./ventas-api";

export type CMIMes = {
  mes: number;
  nombreMes: string;
  ppto2026: number;
  v2025: number;
  u2026: number;
  v2026: number;
  dev2026: number;
  cumplimientoPct: number;
  crecimientoYoYPct: number;
  tasaDevolucionPct: number;
};

export type CMIEntity = {
  nombre: string;
  row: number;
  acumulado: {
    ppto: number;
    v2025: number;
    v2026: number;
    unds: number;
    dev: number;
    cumplimientoPct: number;
    crecimientoYoYPct: number;
    tasaDevPct: number;
  };
  meses: CMIMes[];
  meses2025: number[];
};

export const CMI_ENTITIES: Record<string, CMIEntity> = {
  "CANAL MAYORISTA NACIONAL": {
    "nombre": "CANAL MAYORISTA NACIONAL",
    "row": 3,
    "acumulado": {
      "ppto": 8746086799,
      "v2025": 7639084013,
      "v2026": 9501177786,
      "unds": 113195,
      "dev": -1494203500,
      "cumplimientoPct": 108.6,
      "crecimientoYoYPct": 24.4,
      "tasaDevPct": 13.6
    },
    "meses": [
      {
        "mes": 1,
        "nombreMes": "Ene",
        "ppto2026": 353791600,
        "v2025": 189977967,
        "u2026": 5928,
        "v2026": 498783364,
        "dev2026": -97672648,
        "cumplimientoPct": 141,
        "crecimientoYoYPct": 162.5,
        "tasaDevolucionPct": 16.4
      },
      {
        "mes": 2,
        "nombreMes": "Feb",
        "ppto2026": 1207942284,
        "v2025": 1109846803,
        "u2026": 14026,
        "v2026": 1260899661,
        "dev2026": -171415646,
        "cumplimientoPct": 104.4,
        "crecimientoYoYPct": 13.6,
        "tasaDevolucionPct": 12
      },
      {
        "mes": 3,
        "nombreMes": "Mar",
        "ppto2026": 1489833958,
        "v2025": 1387960911,
        "u2026": 18581,
        "v2026": 1574871765,
        "dev2026": -248742902,
        "cumplimientoPct": 105.7,
        "crecimientoYoYPct": 13.5,
        "tasaDevolucionPct": 13.6
      },
      {
        "mes": 4,
        "nombreMes": "Abr",
        "ppto2026": 1764594055,
        "v2025": 1696874679,
        "u2026": 23675,
        "v2026": 2027853138,
        "dev2026": -252653421,
        "cumplimientoPct": 114.9,
        "crecimientoYoYPct": 19.5,
        "tasaDevolucionPct": 11.1
      },
      {
        "mes": 5,
        "nombreMes": "May",
        "ppto2026": 1462824052,
        "v2025": 1275984454,
        "u2026": 20654,
        "v2026": 1592644544,
        "dev2026": -314367986,
        "cumplimientoPct": 108.9,
        "crecimientoYoYPct": 24.8,
        "tasaDevolucionPct": 16.5
      },
      {
        "mes": 6,
        "nombreMes": "Jun",
        "ppto2026": 1227082901,
        "v2025": 1037385436,
        "u2026": 14520,
        "v2026": 1200003866,
        "dev2026": -330625684,
        "cumplimientoPct": 97.8,
        "crecimientoYoYPct": 15.7,
        "tasaDevolucionPct": 21.6
      },
      {
        "mes": 7,
        "nombreMes": "Jul",
        "ppto2026": 1240017949,
        "v2025": 941053763,
        "u2026": 15811,
        "v2026": 1346121448,
        "dev2026": -78725213,
        "cumplimientoPct": 108.6,
        "crecimientoYoYPct": 43,
        "tasaDevolucionPct": 5.5
      },
      {
        "mes": 8,
        "nombreMes": "Ago",
        "ppto2026": 1671139956,
        "v2025": 1599386322,
        "u2026": 10169,
        "v2026": 929098322,
        "dev2026": -291575187,
        "cumplimientoPct": 55.6,
        "crecimientoYoYPct": -41.9,
        "tasaDevolucionPct": 23.9
      },
      {
        "mes": 9,
        "nombreMes": "Sep",
        "ppto2026": 1692973190,
        "v2025": 0,
        "u2026": 0,
        "v2026": 0,
        "dev2026": 0,
        "cumplimientoPct": 0,
        "crecimientoYoYPct": 0,
        "tasaDevolucionPct": 0
      },
      {
        "mes": 10,
        "nombreMes": "Oct",
        "ppto2026": 2006491038,
        "v2025": 0,
        "u2026": 0,
        "v2026": 0,
        "dev2026": 0,
        "cumplimientoPct": 0,
        "crecimientoYoYPct": 0,
        "tasaDevolucionPct": 0
      },
      {
        "mes": 11,
        "nombreMes": "Nov",
        "ppto2026": 2705236775,
        "v2025": 0,
        "u2026": 0,
        "v2026": 0,
        "dev2026": 0,
        "cumplimientoPct": 0,
        "crecimientoYoYPct": 0,
        "tasaDevolucionPct": 0
      },
      {
        "mes": 12,
        "nombreMes": "Dic",
        "ppto2026": 2433410596,
        "v2025": 0,
        "u2026": 0,
        "v2026": 0,
        "dev2026": 0,
        "cumplimientoPct": 0,
        "crecimientoYoYPct": 0,
        "tasaDevolucionPct": 0
      }
    ],
    "meses2025": [
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0
    ]
  },
  "CANAL MAYORISTA INTERNACIONAL": {
    "nombre": "CANAL MAYORISTA INTERNACIONAL",
    "row": 4,
    "acumulado": {
      "ppto": 613936981,
      "v2025": 380471926,
      "v2026": 205627930,
      "unds": 2530,
      "dev": -50661863,
      "cumplimientoPct": 33.5,
      "crecimientoYoYPct": -46,
      "tasaDevPct": 19.8
    },
    "meses": [
      {
        "mes": 1,
        "nombreMes": "Ene",
        "ppto2026": 9835186,
        "v2025": 6196682,
        "u2026": 22,
        "v2026": 1457800,
        "dev2026": -8151525,
        "cumplimientoPct": 14.8,
        "crecimientoYoYPct": -76.5,
        "tasaDevolucionPct": 84.8
      },
      {
        "mes": 2,
        "nombreMes": "Feb",
        "ppto2026": 137854567,
        "v2025": 86851735,
        "u2026": 273,
        "v2026": 20630887,
        "dev2026": -9415544,
        "cumplimientoPct": 15,
        "crecimientoYoYPct": -76.2,
        "tasaDevolucionPct": 31.3
      },
      {
        "mes": 3,
        "nombreMes": "Mar",
        "ppto2026": 163903760,
        "v2025": 96931263,
        "u2026": 807,
        "v2026": 45445285,
        "dev2026": -2801303,
        "cumplimientoPct": 27.7,
        "crecimientoYoYPct": -53.1,
        "tasaDevolucionPct": 5.8
      },
      {
        "mes": 4,
        "nombreMes": "Abr",
        "ppto2026": 149275271,
        "v2025": 94051256,
        "u2026": 118,
        "v2026": 27412789,
        "dev2026": -3084765,
        "cumplimientoPct": 18.4,
        "crecimientoYoYPct": -70.9,
        "tasaDevolucionPct": 10.1
      },
      {
        "mes": 5,
        "nombreMes": "May",
        "ppto2026": 41695195,
        "v2025": 26270150,
        "u2026": 175,
        "v2026": 10446208,
        "dev2026": -9119243,
        "cumplimientoPct": 25.1,
        "crecimientoYoYPct": -60.2,
        "tasaDevolucionPct": 46.6
      },
      {
        "mes": 6,
        "nombreMes": "Jun",
        "ppto2026": 42993250,
        "v2025": 27088003,
        "u2026": 846,
        "v2026": 72251844,
        "dev2026": 0,
        "cumplimientoPct": 168.1,
        "crecimientoYoYPct": 166.7,
        "tasaDevolucionPct": 0
      },
      {
        "mes": 7,
        "nombreMes": "Jul",
        "ppto2026": 68379752,
        "v2025": 43082837,
        "u2026": 289,
        "v2026": 27983117,
        "dev2026": -18089483,
        "cumplimientoPct": 40.9,
        "crecimientoYoYPct": -35,
        "tasaDevolucionPct": 39.3
      },
      {
        "mes": 8,
        "nombreMes": "Ago",
        "ppto2026": 34165332,
        "v2025": 21525949,
        "u2026": 54,
        "v2026": 5347600,
        "dev2026": 0,
        "cumplimientoPct": 15.7,
        "crecimientoYoYPct": -75.2,
        "tasaDevolucionPct": 0
      },
      {
        "mes": 9,
        "nombreMes": "Sep",
        "ppto2026": 212543126,
        "v2025": 0,
        "u2026": 0,
        "v2026": 0,
        "dev2026": 0,
        "cumplimientoPct": 0,
        "crecimientoYoYPct": 0,
        "tasaDevolucionPct": 0
      },
      {
        "mes": 10,
        "nombreMes": "Oct",
        "ppto2026": 174195473,
        "v2025": 0,
        "u2026": 0,
        "v2026": 0,
        "dev2026": 0,
        "cumplimientoPct": 0,
        "crecimientoYoYPct": 0,
        "tasaDevolucionPct": 0
      },
      {
        "mes": 11,
        "nombreMes": "Nov",
        "ppto2026": 72437471,
        "v2025": 0,
        "u2026": 0,
        "v2026": 0,
        "dev2026": 0,
        "cumplimientoPct": 0,
        "crecimientoYoYPct": 0,
        "tasaDevolucionPct": 0
      },
      {
        "mes": 12,
        "nombreMes": "Dic",
        "ppto2026": 25388580,
        "v2025": 0,
        "u2026": 0,
        "v2026": 0,
        "dev2026": 0,
        "cumplimientoPct": 0,
        "crecimientoYoYPct": 0,
        "tasaDevolucionPct": 0
      }
    ],
    "meses2025": [
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0
    ]
  },
  "CANAL DETAL (TV - REDES - SHWR)": {
    "nombre": "CANAL DETAL (TV - REDES - SHWR)",
    "row": 5,
    "acumulado": {
      "ppto": 1214837113,
      "v2025": 631776083,
      "v2026": 882886500,
      "unds": 7471,
      "dev": -86263504,
      "cumplimientoPct": 72.7,
      "crecimientoYoYPct": 39.7,
      "tasaDevPct": 8.9
    },
    "meses": [
      {
        "mes": 1,
        "nombreMes": "Ene",
        "ppto2026": 162093847,
        "v2025": 70450537,
        "u2026": 1131,
        "v2026": 127558399,
        "dev2026": -14195729,
        "cumplimientoPct": 78.7,
        "crecimientoYoYPct": 81.1,
        "tasaDevolucionPct": 10
      },
      {
        "mes": 2,
        "nombreMes": "Feb",
        "ppto2026": 179188072,
        "v2025": 84256530,
        "u2026": 852,
        "v2026": 101183905,
        "dev2026": -13280292,
        "cumplimientoPct": 56.5,
        "crecimientoYoYPct": 20.1,
        "tasaDevolucionPct": 11.6
      },
      {
        "mes": 3,
        "nombreMes": "Mar",
        "ppto2026": 158166709,
        "v2025": 81433475,
        "u2026": 1136,
        "v2026": 141599322,
        "dev2026": -9874369,
        "cumplimientoPct": 89.5,
        "crecimientoYoYPct": 73.9,
        "tasaDevolucionPct": 6.5
      },
      {
        "mes": 4,
        "nombreMes": "Abr",
        "ppto2026": 130122506,
        "v2025": 62928260,
        "u2026": 828,
        "v2026": 105439773,
        "dev2026": -10056458,
        "cumplimientoPct": 81,
        "crecimientoYoYPct": 67.6,
        "tasaDevolucionPct": 8.7
      },
      {
        "mes": 5,
        "nombreMes": "May",
        "ppto2026": 156508814,
        "v2025": 75693314,
        "u2026": 616,
        "v2026": 83268212,
        "dev2026": -8827034,
        "cumplimientoPct": 53.2,
        "crecimientoYoYPct": 10,
        "tasaDevolucionPct": 9.6
      },
      {
        "mes": 6,
        "nombreMes": "Jun",
        "ppto2026": 188999447,
        "v2025": 88770893,
        "u2026": 686,
        "v2026": 85375421,
        "dev2026": -5063144,
        "cumplimientoPct": 45.2,
        "crecimientoYoYPct": -3.8,
        "tasaDevolucionPct": 5.6
      },
      {
        "mes": 7,
        "nombreMes": "Jul",
        "ppto2026": 239757718,
        "v2025": 127040476,
        "u2026": 798,
        "v2026": 99418505,
        "dev2026": -18537808,
        "cumplimientoPct": 41.5,
        "crecimientoYoYPct": -21.7,
        "tasaDevolucionPct": 15.7
      },
      {
        "mes": 8,
        "nombreMes": "Ago",
        "ppto2026": 203123434,
        "v2025": 89909645,
        "u2026": 186,
        "v2026": 26896892,
        "dev2026": -765914,
        "cumplimientoPct": 13.2,
        "crecimientoYoYPct": -70.1,
        "tasaDevolucionPct": 2.8
      },
      {
        "mes": 9,
        "nombreMes": "Sep",
        "ppto2026": 187717886,
        "v2025": 0,
        "u2026": 0,
        "v2026": 0,
        "dev2026": 0,
        "cumplimientoPct": 0,
        "crecimientoYoYPct": 0,
        "tasaDevolucionPct": 0
      },
      {
        "mes": 10,
        "nombreMes": "Oct",
        "ppto2026": 207718233,
        "v2025": 0,
        "u2026": 0,
        "v2026": 0,
        "dev2026": 0,
        "cumplimientoPct": 0,
        "crecimientoYoYPct": 0,
        "tasaDevolucionPct": 0
      },
      {
        "mes": 11,
        "nombreMes": "Nov",
        "ppto2026": 163498974,
        "v2025": 0,
        "u2026": 0,
        "v2026": 0,
        "dev2026": 0,
        "cumplimientoPct": 0,
        "crecimientoYoYPct": 0,
        "tasaDevolucionPct": 0
      },
      {
        "mes": 12,
        "nombreMes": "Dic",
        "ppto2026": 288438285,
        "v2025": 0,
        "u2026": 0,
        "v2026": 0,
        "dev2026": 0,
        "cumplimientoPct": 0,
        "crecimientoYoYPct": 0,
        "tasaDevolucionPct": 0
      }
    ],
    "meses2025": [
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0
    ]
  },
  "MAYORCA": {
    "nombre": "MAYORCA",
    "row": 6,
    "acumulado": {
      "ppto": 436728064,
      "v2025": 41202598,
      "v2026": 272795813,
      "unds": 2809,
      "dev": -14219689,
      "cumplimientoPct": 62.5,
      "crecimientoYoYPct": 562.1,
      "tasaDevPct": 5
    },
    "meses": [
      {
        "mes": 1,
        "nombreMes": "Ene",
        "ppto2026": 51026647,
        "v2025": 0,
        "u2026": 355,
        "v2026": 34057577,
        "dev2026": -2506759,
        "cumplimientoPct": 66.7,
        "crecimientoYoYPct": 0,
        "tasaDevolucionPct": 6.9
      },
      {
        "mes": 2,
        "nombreMes": "Feb",
        "ppto2026": 50026124,
        "v2025": 0,
        "u2026": 343,
        "v2026": 30769362,
        "dev2026": -2223983,
        "cumplimientoPct": 61.5,
        "crecimientoYoYPct": 0,
        "tasaDevolucionPct": 6.7
      },
      {
        "mes": 3,
        "nombreMes": "Mar",
        "ppto2026": 55528998,
        "v2025": 0,
        "u2026": 408,
        "v2026": 41393491,
        "dev2026": -1512928,
        "cumplimientoPct": 74.5,
        "crecimientoYoYPct": 0,
        "tasaDevolucionPct": 3.5
      },
      {
        "mes": 4,
        "nombreMes": "Abr",
        "ppto2026": 65033961,
        "v2025": 0,
        "u2026": 279,
        "v2026": 27532420,
        "dev2026": -1547349,
        "cumplimientoPct": 42.3,
        "crecimientoYoYPct": 0,
        "tasaDevolucionPct": 5.3
      },
      {
        "mes": 5,
        "nombreMes": "May",
        "ppto2026": 70036574,
        "v2025": 0,
        "u2026": 493,
        "v2026": 50285790,
        "dev2026": -2494329,
        "cumplimientoPct": 71.8,
        "crecimientoYoYPct": 0,
        "tasaDevolucionPct": 4.7
      },
      {
        "mes": 6,
        "nombreMes": "Jun",
        "ppto2026": 80041799,
        "v2025": 0,
        "u2026": 413,
        "v2026": 40472242,
        "dev2026": -2007820,
        "cumplimientoPct": 50.6,
        "crecimientoYoYPct": 0,
        "tasaDevolucionPct": 4.7
      },
      {
        "mes": 7,
        "nombreMes": "Jul",
        "ppto2026": 65033961,
        "v2025": 41202598,
        "u2026": 518,
        "v2026": 48284931,
        "dev2026": -1926521,
        "cumplimientoPct": 74.2,
        "crecimientoYoYPct": 17.2,
        "tasaDevolucionPct": 3.8
      },
      {
        "mes": 8,
        "nombreMes": "Ago",
        "ppto2026": 60031349,
        "v2025": 43070145,
        "u2026": 250,
        "v2026": 25282175,
        "dev2026": -1604104,
        "cumplimientoPct": 42.1,
        "crecimientoYoYPct": -41.3,
        "tasaDevolucionPct": 6
      },
      {
        "mes": 9,
        "nombreMes": "Sep",
        "ppto2026": 59531088,
        "v2025": 42987344,
        "u2026": 0,
        "v2026": 0,
        "dev2026": 0,
        "cumplimientoPct": 0,
        "crecimientoYoYPct": 0,
        "tasaDevolucionPct": 0
      },
      {
        "mes": 10,
        "nombreMes": "Oct",
        "ppto2026": 59531088,
        "v2025": 38955721,
        "u2026": 0,
        "v2026": 0,
        "dev2026": 0,
        "cumplimientoPct": 0,
        "crecimientoYoYPct": 0,
        "tasaDevolucionPct": 0
      },
      {
        "mes": 11,
        "nombreMes": "Nov",
        "ppto2026": 80041799,
        "v2025": 60772087,
        "u2026": 0,
        "v2026": 0,
        "dev2026": 0,
        "cumplimientoPct": 0,
        "crecimientoYoYPct": 0,
        "tasaDevolucionPct": 0
      },
      {
        "mes": 12,
        "nombreMes": "Dic",
        "ppto2026": 204606848,
        "v2025": 106344000,
        "u2026": 0,
        "v2026": 0,
        "dev2026": 0,
        "cumplimientoPct": 0,
        "crecimientoYoYPct": 0,
        "tasaDevolucionPct": 0
      }
    ],
    "meses2025": [
      0,
      0,
      0,
      0,
      0,
      0,
      41202598,
      43070145,
      42987344,
      38955721,
      60772087,
      106344000
    ]
  },
  "PUNTO DE VENTA": {
    "nombre": "PUNTO DE VENTA",
    "row": 7,
    "acumulado": {
      "ppto": 1090688471,
      "v2025": 933798786,
      "v2026": 895036586,
      "unds": 9957,
      "dev": -266907526,
      "cumplimientoPct": 82.1,
      "crecimientoYoYPct": -4.2,
      "tasaDevPct": 23
    },
    "meses": [
      {
        "mes": 1,
        "nombreMes": "Ene",
        "ppto2026": 44119894,
        "v2025": 52841653,
        "u2026": 566,
        "v2026": 49668722,
        "dev2026": -35496000,
        "cumplimientoPct": 112.6,
        "crecimientoYoYPct": -6,
        "tasaDevolucionPct": 41.7
      },
      {
        "mes": 2,
        "nombreMes": "Feb",
        "ppto2026": 150637509,
        "v2025": 120542609,
        "u2026": 1414,
        "v2026": 129049331,
        "dev2026": -25410867,
        "cumplimientoPct": 85.7,
        "crecimientoYoYPct": 7.1,
        "tasaDevolucionPct": 16.5
      },
      {
        "mes": 3,
        "nombreMes": "Mar",
        "ppto2026": 185791057,
        "v2025": 159299037,
        "u2026": 1689,
        "v2026": 150846991,
        "dev2026": -24786081,
        "cumplimientoPct": 81.2,
        "crecimientoYoYPct": -5.3,
        "tasaDevolucionPct": 14.1
      },
      {
        "mes": 4,
        "nombreMes": "Abr",
        "ppto2026": 220055258,
        "v2025": 151424923,
        "u2026": 1542,
        "v2026": 140255216,
        "dev2026": -93087602,
        "cumplimientoPct": 63.7,
        "crecimientoYoYPct": -7.4,
        "tasaDevolucionPct": 39.9
      },
      {
        "mes": 5,
        "nombreMes": "May",
        "ppto2026": 182422765,
        "v2025": 160079517,
        "u2026": 1662,
        "v2026": 151240993,
        "dev2026": -30832394,
        "cumplimientoPct": 82.9,
        "crecimientoYoYPct": -5.5,
        "tasaDevolucionPct": 16.9
      },
      {
        "mes": 6,
        "nombreMes": "Jun",
        "ppto2026": 153024456,
        "v2025": 0,
        "u2026": 0,
        "v2026": 0,
        "dev2026": 0,
        "cumplimientoPct": 0,
        "crecimientoYoYPct": 0,
        "tasaDevolucionPct": 0
      },
      {
        "mes": 7,
        "nombreMes": "Jul",
        "ppto2026": 154637532,
        "v2025": 0,
        "u2026": 0,
        "v2026": 0,
        "dev2026": 0,
        "cumplimientoPct": 0,
        "crecimientoYoYPct": 0,
        "tasaDevolucionPct": 0
      },
      {
        "mes": 8,
        "nombreMes": "Ago",
        "ppto2026": 208400982,
        "v2025": 0,
        "u2026": 0,
        "v2026": 0,
        "dev2026": 0,
        "cumplimientoPct": 0,
        "crecimientoYoYPct": 0,
        "tasaDevolucionPct": 0
      },
      {
        "mes": 9,
        "nombreMes": "Sep",
        "ppto2026": 211123715,
        "v2025": 0,
        "u2026": 0,
        "v2026": 0,
        "dev2026": 0,
        "cumplimientoPct": 0,
        "crecimientoYoYPct": 0,
        "tasaDevolucionPct": 0
      },
      {
        "mes": 10,
        "nombreMes": "Oct",
        "ppto2026": 250221236,
        "v2025": 0,
        "u2026": 0,
        "v2026": 0,
        "dev2026": 0,
        "cumplimientoPct": 0,
        "crecimientoYoYPct": 0,
        "tasaDevolucionPct": 0
      },
      {
        "mes": 11,
        "nombreMes": "Nov",
        "ppto2026": 337358938,
        "v2025": 0,
        "u2026": 0,
        "v2026": 0,
        "dev2026": 0,
        "cumplimientoPct": 0,
        "crecimientoYoYPct": 0,
        "tasaDevolucionPct": 0
      },
      {
        "mes": 12,
        "nombreMes": "Dic",
        "ppto2026": 303460616,
        "v2025": 0,
        "u2026": 0,
        "v2026": 0,
        "dev2026": 0,
        "cumplimientoPct": 0,
        "crecimientoYoYPct": 0,
        "tasaDevolucionPct": 0
      }
    ],
    "meses2025": [
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0
    ]
  },
  "ALEIDA GALLEGO": {
    "nombre": "ALEIDA GALLEGO",
    "row": 8,
    "acumulado": {
      "ppto": 411580555,
      "v2025": 369818026,
      "v2026": 438334046,
      "unds": 4875,
      "dev": -158766918,
      "cumplimientoPct": 106.5,
      "crecimientoYoYPct": 18.5,
      "tasaDevPct": 26.6
    },
    "meses": [
      {
        "mes": 1,
        "nombreMes": "Ene",
        "ppto2026": 16649016,
        "v2025": 12167552,
        "u2026": 280,
        "v2026": 25035650,
        "dev2026": -13916900,
        "cumplimientoPct": 150.4,
        "crecimientoYoYPct": 105.8,
        "tasaDevolucionPct": 35.7
      },
      {
        "mes": 2,
        "nombreMes": "Feb",
        "ppto2026": 56844343,
        "v2025": 43359957,
        "u2026": 786,
        "v2026": 71969223,
        "dev2026": -8230874,
        "cumplimientoPct": 126.6,
        "crecimientoYoYPct": 66,
        "tasaDevolucionPct": 10.3
      },
      {
        "mes": 3,
        "nombreMes": "Mar",
        "ppto2026": 70109833,
        "v2025": 67582993,
        "u2026": 914,
        "v2026": 80505239,
        "dev2026": -11867381,
        "cumplimientoPct": 114.8,
        "crecimientoYoYPct": 19.1,
        "tasaDevolucionPct": 12.8
      },
      {
        "mes": 4,
        "nombreMes": "Abr",
        "ppto2026": 83039720,
        "v2025": 63733064,
        "u2026": 833,
        "v2026": 75514701,
        "dev2026": -93087602,
        "cumplimientoPct": 90.9,
        "crecimientoYoYPct": 18.5,
        "tasaDevolucionPct": 55.2
      },
      {
        "mes": 5,
        "nombreMes": "May",
        "ppto2026": 68838779,
        "v2025": 56023104,
        "u2026": 680,
        "v2026": 62696754,
        "dev2026": -9269497,
        "cumplimientoPct": 91.1,
        "crecimientoYoYPct": 11.9,
        "tasaDevolucionPct": 12.9
      },
      {
        "mes": 6,
        "nombreMes": "Jun",
        "ppto2026": 57745078,
        "v2025": 69786533,
        "u2026": 890,
        "v2026": 77885382,
        "dev2026": -11390264,
        "cumplimientoPct": 134.9,
        "crecimientoYoYPct": 11.6,
        "tasaDevolucionPct": 12.8
      },
      {
        "mes": 7,
        "nombreMes": "Jul",
        "ppto2026": 58353786,
        "v2025": 57164823,
        "u2026": 492,
        "v2026": 44727097,
        "dev2026": -11004400,
        "cumplimientoPct": 76.6,
        "crecimientoYoYPct": -21.8,
        "tasaDevolucionPct": 19.7
      },
      {
        "mes": 8,
        "nombreMes": "Ago",
        "ppto2026": 78641880,
        "v2025": 55528841,
        "u2026": 329,
        "v2026": 31078112,
        "dev2026": -1915800,
        "cumplimientoPct": 39.5,
        "crecimientoYoYPct": -44,
        "tasaDevolucionPct": 5.8
      },
      {
        "mes": 9,
        "nombreMes": "Sep",
        "ppto2026": 79669327,
        "v2025": 36159601,
        "u2026": 0,
        "v2026": 0,
        "dev2026": 0,
        "cumplimientoPct": 0,
        "crecimientoYoYPct": 0,
        "tasaDevolucionPct": 0
      },
      {
        "mes": 10,
        "nombreMes": "Oct",
        "ppto2026": 94423108,
        "v2025": 19437962,
        "u2026": 0,
        "v2026": 0,
        "dev2026": 0,
        "cumplimientoPct": 0,
        "crecimientoYoYPct": 0,
        "tasaDevolucionPct": 0
      },
      {
        "mes": 11,
        "nombreMes": "Nov",
        "ppto2026": 127305260,
        "v2025": 78322770,
        "u2026": 0,
        "v2026": 0,
        "dev2026": 0,
        "cumplimientoPct": 0,
        "crecimientoYoYPct": 0,
        "tasaDevolucionPct": 0
      },
      {
        "mes": 12,
        "nombreMes": "Dic",
        "ppto2026": 114513440,
        "v2025": 153179422,
        "u2026": 0,
        "v2026": 0,
        "dev2026": 0,
        "cumplimientoPct": 0,
        "crecimientoYoYPct": 0,
        "tasaDevolucionPct": 0
      }
    ],
    "meses2025": [
      12167552,
      43359957,
      67582993,
      63733064,
      56023104,
      69786533,
      57164823,
      55528841,
      36159601,
      19437962,
      78322770,
      153179422
    ]
  },
  "ALEJANDRA HERRERA": {
    "nombre": "ALEJANDRA HERRERA",
    "row": 9,
    "acumulado": {
      "ppto": 339553958,
      "v2025": 312696923,
      "v2026": 401379884,
      "unds": 4484,
      "dev": -94287003,
      "cumplimientoPct": 118.2,
      "crecimientoYoYPct": 28.4,
      "tasaDevPct": 19
    },
    "meses": [
      {
        "mes": 1,
        "nombreMes": "Ene",
        "ppto2026": 13735439,
        "v2025": 30268256,
        "u2026": 167,
        "v2026": 13484466,
        "dev2026": -10224800,
        "cumplimientoPct": 98.2,
        "crecimientoYoYPct": -55.5,
        "tasaDevolucionPct": 43.1
      },
      {
        "mes": 2,
        "nombreMes": "Feb",
        "ppto2026": 46896583,
        "v2025": 37033402,
        "u2026": 628,
        "v2026": 57080108,
        "dev2026": -17179993,
        "cumplimientoPct": 121.7,
        "crecimientoYoYPct": 54.1,
        "tasaDevolucionPct": 23.1
      },
      {
        "mes": 3,
        "nombreMes": "Mar",
        "ppto2026": 57840612,
        "v2025": 60622664,
        "u2026": 775,
        "v2026": 70341752,
        "dev2026": -12918700,
        "cumplimientoPct": 121.6,
        "crecimientoYoYPct": 16,
        "tasaDevolucionPct": 15.5
      },
      {
        "mes": 4,
        "nombreMes": "Abr",
        "ppto2026": 68507769,
        "v2025": 46114784,
        "u2026": 709,
        "v2026": 64740515,
        "dev2026": 0,
        "cumplimientoPct": 94.5,
        "crecimientoYoYPct": 40.4,
        "tasaDevolucionPct": 0
      },
      {
        "mes": 5,
        "nombreMes": "May",
        "ppto2026": 56791993,
        "v2025": 52344427,
        "u2026": 809,
        "v2026": 71606283,
        "dev2026": -20003492,
        "cumplimientoPct": 126.1,
        "crecimientoYoYPct": 36.8,
        "tasaDevolucionPct": 21.8
      },
      {
        "mes": 6,
        "nombreMes": "Jun",
        "ppto2026": 47639689,
        "v2025": 40354673,
        "u2026": 732,
        "v2026": 64293693,
        "dev2026": -17188487,
        "cumplimientoPct": 135,
        "crecimientoYoYPct": 59.3,
        "tasaDevolucionPct": 21.1
      },
      {
        "mes": 7,
        "nombreMes": "Jul",
        "ppto2026": 48141873,
        "v2025": 45958717,
        "u2026": 664,
        "v2026": 59833067,
        "dev2026": -16771531,
        "cumplimientoPct": 124.3,
        "crecimientoYoYPct": 30.2,
        "tasaDevolucionPct": 21.9
      },
      {
        "mes": 8,
        "nombreMes": "Ago",
        "ppto2026": 64879551,
        "v2025": 49690658,
        "u2026": 479,
        "v2026": 44744722,
        "dev2026": -7984600,
        "cumplimientoPct": 69,
        "crecimientoYoYPct": -10,
        "tasaDevolucionPct": 15.1
      },
      {
        "mes": 9,
        "nombreMes": "Sep",
        "ppto2026": 65727194,
        "v2025": 71802400,
        "u2026": 0,
        "v2026": 0,
        "dev2026": 0,
        "cumplimientoPct": 0,
        "crecimientoYoYPct": 0,
        "tasaDevolucionPct": 0
      },
      {
        "mes": 10,
        "nombreMes": "Oct",
        "ppto2026": 77899064,
        "v2025": 61985618,
        "u2026": 0,
        "v2026": 0,
        "dev2026": 0,
        "cumplimientoPct": 0,
        "crecimientoYoYPct": 0,
        "tasaDevolucionPct": 0
      },
      {
        "mes": 11,
        "nombreMes": "Nov",
        "ppto2026": 105026839,
        "v2025": 103685624,
        "u2026": 0,
        "v2026": 0,
        "dev2026": 0,
        "cumplimientoPct": 0,
        "crecimientoYoYPct": 0,
        "tasaDevolucionPct": 0
      },
      {
        "mes": 12,
        "nombreMes": "Dic",
        "ppto2026": 94473588,
        "v2025": 82364160,
        "u2026": 0,
        "v2026": 0,
        "dev2026": 0,
        "cumplimientoPct": 0,
        "crecimientoYoYPct": 0,
        "tasaDevolucionPct": 0
      }
    ],
    "meses2025": [
      30268256,
      37033402,
      60622664,
      46114784,
      52344427,
      40354673,
      45958717,
      49690658,
      71802400,
      61985618,
      103685624,
      82364160
    ]
  },
  "MAYORISTA DIGITAL": {
    "nombre": "MAYORISTA DIGITAL",
    "row": 10,
    "acumulado": {
      "ppto": 339553958,
      "v2025": 0,
      "v2026": 44075150,
      "unds": 478,
      "dev": -2499305,
      "cumplimientoPct": 13,
      "crecimientoYoYPct": 0,
      "tasaDevPct": 5.4
    },
    "meses": [
      {
        "mes": 1,
        "nombreMes": "Ene",
        "ppto2026": 13735439,
        "v2025": 0,
        "u2026": 0,
        "v2026": 0,
        "dev2026": 0,
        "cumplimientoPct": 0,
        "crecimientoYoYPct": 0,
        "tasaDevolucionPct": 0
      },
      {
        "mes": 2,
        "nombreMes": "Feb",
        "ppto2026": 46896583,
        "v2025": 0,
        "u2026": 0,
        "v2026": 0,
        "dev2026": 0,
        "cumplimientoPct": 0,
        "crecimientoYoYPct": 0,
        "tasaDevolucionPct": 0
      },
      {
        "mes": 3,
        "nombreMes": "Mar",
        "ppto2026": 57840612,
        "v2025": 0,
        "u2026": 0,
        "v2026": 0,
        "dev2026": 0,
        "cumplimientoPct": 0,
        "crecimientoYoYPct": 0,
        "tasaDevolucionPct": 0
      },
      {
        "mes": 4,
        "nombreMes": "Abr",
        "ppto2026": 68507769,
        "v2025": 0,
        "u2026": 0,
        "v2026": 0,
        "dev2026": 0,
        "cumplimientoPct": 0,
        "crecimientoYoYPct": 0,
        "tasaDevolucionPct": 0
      },
      {
        "mes": 5,
        "nombreMes": "May",
        "ppto2026": 56791993,
        "v2025": 0,
        "u2026": 173,
        "v2026": 16937956,
        "dev2026": -1559405,
        "cumplimientoPct": 29.8,
        "crecimientoYoYPct": 0,
        "tasaDevolucionPct": 8.4
      },
      {
        "mes": 6,
        "nombreMes": "Jun",
        "ppto2026": 47639689,
        "v2025": 0,
        "u2026": 79,
        "v2026": 7265100,
        "dev2026": -939900,
        "cumplimientoPct": 15.3,
        "crecimientoYoYPct": 0,
        "tasaDevolucionPct": 11.5
      },
      {
        "mes": 7,
        "nombreMes": "Jul",
        "ppto2026": 48141873,
        "v2025": 0,
        "u2026": 226,
        "v2026": 19872094,
        "dev2026": 0,
        "cumplimientoPct": 41.3,
        "crecimientoYoYPct": 0,
        "tasaDevolucionPct": 0
      },
      {
        "mes": 8,
        "nombreMes": "Ago",
        "ppto2026": 64879551,
        "v2025": 0,
        "u2026": 207,
        "v2026": 19481751,
        "dev2026": -943900,
        "cumplimientoPct": 30,
        "crecimientoYoYPct": 0,
        "tasaDevolucionPct": 4.6
      },
      {
        "mes": 9,
        "nombreMes": "Sep",
        "ppto2026": 65727194,
        "v2025": 0,
        "u2026": 0,
        "v2026": 0,
        "dev2026": 0,
        "cumplimientoPct": 0,
        "crecimientoYoYPct": 0,
        "tasaDevolucionPct": 0
      },
      {
        "mes": 10,
        "nombreMes": "Oct",
        "ppto2026": 77899064,
        "v2025": 0,
        "u2026": 0,
        "v2026": 0,
        "dev2026": 0,
        "cumplimientoPct": 0,
        "crecimientoYoYPct": 0,
        "tasaDevolucionPct": 0
      },
      {
        "mes": 11,
        "nombreMes": "Nov",
        "ppto2026": 105026839,
        "v2025": 0,
        "u2026": 0,
        "v2026": 0,
        "dev2026": 0,
        "cumplimientoPct": 0,
        "crecimientoYoYPct": 0,
        "tasaDevolucionPct": 0
      },
      {
        "mes": 12,
        "nombreMes": "Dic",
        "ppto2026": 94473588,
        "v2025": 0,
        "u2026": 0,
        "v2026": 0,
        "dev2026": 0,
        "cumplimientoPct": 0,
        "crecimientoYoYPct": 0,
        "tasaDevolucionPct": 0
      }
    ],
    "meses2025": [
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0
    ]
  },
  "BEATRIZ SANCHEZ": {
    "nombre": "BEATRIZ SANCHEZ",
    "row": 11,
    "acumulado": {
      "ppto": 0,
      "v2025": 8694914,
      "v2026": 0,
      "unds": 0,
      "dev": 0,
      "cumplimientoPct": 0,
      "crecimientoYoYPct": -100,
      "tasaDevPct": 0
    },
    "meses": [
      {
        "mes": 1,
        "nombreMes": "Ene",
        "ppto2026": 0,
        "v2025": 0,
        "u2026": 0,
        "v2026": 0,
        "dev2026": 0,
        "cumplimientoPct": 0,
        "crecimientoYoYPct": 0,
        "tasaDevolucionPct": 0
      },
      {
        "mes": 2,
        "nombreMes": "Feb",
        "ppto2026": 0,
        "v2025": 0,
        "u2026": 0,
        "v2026": 0,
        "dev2026": 0,
        "cumplimientoPct": 0,
        "crecimientoYoYPct": 0,
        "tasaDevolucionPct": 0
      },
      {
        "mes": 3,
        "nombreMes": "Mar",
        "ppto2026": 0,
        "v2025": 0,
        "u2026": 0,
        "v2026": 0,
        "dev2026": 0,
        "cumplimientoPct": 0,
        "crecimientoYoYPct": 0,
        "tasaDevolucionPct": 0
      },
      {
        "mes": 4,
        "nombreMes": "Abr",
        "ppto2026": 0,
        "v2025": 0,
        "u2026": 0,
        "v2026": 0,
        "dev2026": 0,
        "cumplimientoPct": 0,
        "crecimientoYoYPct": 0,
        "tasaDevolucionPct": 0
      },
      {
        "mes": 5,
        "nombreMes": "May",
        "ppto2026": 0,
        "v2025": 0,
        "u2026": 0,
        "v2026": 0,
        "dev2026": 0,
        "cumplimientoPct": 0,
        "crecimientoYoYPct": 0,
        "tasaDevolucionPct": 0
      },
      {
        "mes": 6,
        "nombreMes": "Jun",
        "ppto2026": 0,
        "v2025": 0,
        "u2026": 0,
        "v2026": 0,
        "dev2026": 0,
        "cumplimientoPct": 0,
        "crecimientoYoYPct": 0,
        "tasaDevolucionPct": 0
      },
      {
        "mes": 7,
        "nombreMes": "Jul",
        "ppto2026": 0,
        "v2025": 8694914,
        "u2026": 0,
        "v2026": 0,
        "dev2026": 0,
        "cumplimientoPct": 0,
        "crecimientoYoYPct": -100,
        "tasaDevolucionPct": 0
      },
      {
        "mes": 8,
        "nombreMes": "Ago",
        "ppto2026": 0,
        "v2025": 954607,
        "u2026": 0,
        "v2026": 0,
        "dev2026": 0,
        "cumplimientoPct": 0,
        "crecimientoYoYPct": -100,
        "tasaDevolucionPct": 0
      },
      {
        "mes": 9,
        "nombreMes": "Sep",
        "ppto2026": 0,
        "v2025": 726387,
        "u2026": 0,
        "v2026": 0,
        "dev2026": 0,
        "cumplimientoPct": 0,
        "crecimientoYoYPct": 0,
        "tasaDevolucionPct": 0
      },
      {
        "mes": 10,
        "nombreMes": "Oct",
        "ppto2026": 0,
        "v2025": 12813939,
        "u2026": 0,
        "v2026": 0,
        "dev2026": 0,
        "cumplimientoPct": 0,
        "crecimientoYoYPct": 0,
        "tasaDevolucionPct": 0
      },
      {
        "mes": 11,
        "nombreMes": "Nov",
        "ppto2026": 0,
        "v2025": 17616660,
        "u2026": 0,
        "v2026": 0,
        "dev2026": 0,
        "cumplimientoPct": 0,
        "crecimientoYoYPct": 0,
        "tasaDevolucionPct": 0
      },
      {
        "mes": 12,
        "nombreMes": "Dic",
        "ppto2026": 0,
        "v2025": 26336303,
        "u2026": 0,
        "v2026": 0,
        "dev2026": 0,
        "cumplimientoPct": 0,
        "crecimientoYoYPct": 0,
        "tasaDevolucionPct": 0
      }
    ],
    "meses2025": [
      0,
      0,
      0,
      0,
      0,
      0,
      8694914,
      954607,
      726387,
      12813939,
      17616660,
      26336303
    ]
  },
  "SARA GOMEZ": {
    "nombre": "SARA GOMEZ",
    "row": 12,
    "acumulado": {
      "ppto": 0,
      "v2025": 238647038,
      "v2026": 11148606,
      "unds": 119,
      "dev": -11354300,
      "cumplimientoPct": 0,
      "crecimientoYoYPct": -95.3,
      "tasaDevPct": 50.5
    },
    "meses": [
      {
        "mes": 1,
        "nombreMes": "Ene",
        "ppto2026": 0,
        "v2025": 1126645,
        "u2026": 119,
        "v2026": 11148606,
        "dev2026": -11354300,
        "cumplimientoPct": 0,
        "crecimientoYoYPct": 889.5,
        "tasaDevolucionPct": 50.5
      },
      {
        "mes": 2,
        "nombreMes": "Feb",
        "ppto2026": 0,
        "v2025": 39663650,
        "u2026": 0,
        "v2026": 0,
        "dev2026": 0,
        "cumplimientoPct": 0,
        "crecimientoYoYPct": -100,
        "tasaDevolucionPct": 0
      },
      {
        "mes": 3,
        "nombreMes": "Mar",
        "ppto2026": 0,
        "v2025": 31093380,
        "u2026": 0,
        "v2026": 0,
        "dev2026": 0,
        "cumplimientoPct": 0,
        "crecimientoYoYPct": -100,
        "tasaDevolucionPct": 0
      },
      {
        "mes": 4,
        "nombreMes": "Abr",
        "ppto2026": 0,
        "v2025": 41577075,
        "u2026": 0,
        "v2026": 0,
        "dev2026": 0,
        "cumplimientoPct": 0,
        "crecimientoYoYPct": -100,
        "tasaDevolucionPct": 0
      },
      {
        "mes": 5,
        "nombreMes": "May",
        "ppto2026": 0,
        "v2025": 51711986,
        "u2026": 0,
        "v2026": 0,
        "dev2026": 0,
        "cumplimientoPct": 0,
        "crecimientoYoYPct": -100,
        "tasaDevolucionPct": 0
      },
      {
        "mes": 6,
        "nombreMes": "Jun",
        "ppto2026": 0,
        "v2025": 35416040,
        "u2026": 0,
        "v2026": 0,
        "dev2026": 0,
        "cumplimientoPct": 0,
        "crecimientoYoYPct": -100,
        "tasaDevolucionPct": 0
      },
      {
        "mes": 7,
        "nombreMes": "Jul",
        "ppto2026": 0,
        "v2025": 38058262,
        "u2026": 0,
        "v2026": 0,
        "dev2026": 0,
        "cumplimientoPct": 0,
        "crecimientoYoYPct": -100,
        "tasaDevolucionPct": 0
      },
      {
        "mes": 8,
        "nombreMes": "Ago",
        "ppto2026": 0,
        "v2025": 48158400,
        "u2026": 0,
        "v2026": 0,
        "dev2026": 0,
        "cumplimientoPct": 0,
        "crecimientoYoYPct": -100,
        "tasaDevolucionPct": 0
      },
      {
        "mes": 9,
        "nombreMes": "Sep",
        "ppto2026": 0,
        "v2025": 69905571,
        "u2026": 0,
        "v2026": 0,
        "dev2026": 0,
        "cumplimientoPct": 0,
        "crecimientoYoYPct": 0,
        "tasaDevolucionPct": 0
      },
      {
        "mes": 10,
        "nombreMes": "Oct",
        "ppto2026": 0,
        "v2025": 59627358,
        "u2026": 0,
        "v2026": 0,
        "dev2026": 0,
        "cumplimientoPct": 0,
        "crecimientoYoYPct": 0,
        "tasaDevolucionPct": 0
      },
      {
        "mes": 11,
        "nombreMes": "Nov",
        "ppto2026": 0,
        "v2025": 99543702,
        "u2026": 0,
        "v2026": 0,
        "dev2026": 0,
        "cumplimientoPct": 0,
        "crecimientoYoYPct": 0,
        "tasaDevolucionPct": 0
      },
      {
        "mes": 12,
        "nombreMes": "Dic",
        "ppto2026": 0,
        "v2025": 109729536,
        "u2026": 0,
        "v2026": 0,
        "dev2026": 0,
        "cumplimientoPct": 0,
        "crecimientoYoYPct": 0,
        "tasaDevolucionPct": 0
      }
    ],
    "meses2025": [
      1126645,
      39663650,
      31093380,
      41577075,
      51711986,
      35416040,
      38058262,
      48158400,
      69905571,
      59627358,
      99543702,
      109729536
    ]
  },
  "PAOLA CARVAJAL JIMENEZ": {
    "nombre": "PAOLA CARVAJAL JIMENEZ",
    "row": 13,
    "acumulado": {
      "ppto": 0,
      "v2025": 12636799,
      "v2026": 98900,
      "unds": 1,
      "dev": 0,
      "cumplimientoPct": 0,
      "crecimientoYoYPct": -99.2,
      "tasaDevPct": 0
    },
    "meses": [
      {
        "mes": 1,
        "nombreMes": "Ene",
        "ppto2026": 0,
        "v2025": 9279200,
        "u2026": 0,
        "v2026": 0,
        "dev2026": 0,
        "cumplimientoPct": 0,
        "crecimientoYoYPct": -100,
        "tasaDevolucionPct": 0
      },
      {
        "mes": 2,
        "nombreMes": "Feb",
        "ppto2026": 0,
        "v2025": 485600,
        "u2026": 0,
        "v2026": 0,
        "dev2026": 0,
        "cumplimientoPct": 0,
        "crecimientoYoYPct": -100,
        "tasaDevolucionPct": 0
      },
      {
        "mes": 3,
        "nombreMes": "Mar",
        "ppto2026": 0,
        "v2025": 0,
        "u2026": 0,
        "v2026": 0,
        "dev2026": 0,
        "cumplimientoPct": 0,
        "crecimientoYoYPct": 0,
        "tasaDevolucionPct": 0
      },
      {
        "mes": 4,
        "nombreMes": "Abr",
        "ppto2026": 0,
        "v2025": 0,
        "u2026": 0,
        "v2026": 0,
        "dev2026": 0,
        "cumplimientoPct": 0,
        "crecimientoYoYPct": 0,
        "tasaDevolucionPct": 0
      },
      {
        "mes": 5,
        "nombreMes": "May",
        "ppto2026": 0,
        "v2025": 0,
        "u2026": 0,
        "v2026": 0,
        "dev2026": 0,
        "cumplimientoPct": 0,
        "crecimientoYoYPct": 0,
        "tasaDevolucionPct": 0
      },
      {
        "mes": 6,
        "nombreMes": "Jun",
        "ppto2026": 0,
        "v2025": 0,
        "u2026": 0,
        "v2026": 0,
        "dev2026": 0,
        "cumplimientoPct": 0,
        "crecimientoYoYPct": 0,
        "tasaDevolucionPct": 0
      },
      {
        "mes": 7,
        "nombreMes": "Jul",
        "ppto2026": 0,
        "v2025": 2871999,
        "u2026": 1,
        "v2026": 98900,
        "dev2026": 0,
        "cumplimientoPct": 0,
        "crecimientoYoYPct": -96.6,
        "tasaDevolucionPct": 0
      },
      {
        "mes": 8,
        "nombreMes": "Ago",
        "ppto2026": 0,
        "v2025": 0,
        "u2026": 0,
        "v2026": 0,
        "dev2026": 0,
        "cumplimientoPct": 0,
        "crecimientoYoYPct": 0,
        "tasaDevolucionPct": 0
      },
      {
        "mes": 9,
        "nombreMes": "Sep",
        "ppto2026": 0,
        "v2025": 0,
        "u2026": 0,
        "v2026": 0,
        "dev2026": 0,
        "cumplimientoPct": 0,
        "crecimientoYoYPct": 0,
        "tasaDevolucionPct": 0
      },
      {
        "mes": 10,
        "nombreMes": "Oct",
        "ppto2026": 0,
        "v2025": 106035,
        "u2026": 0,
        "v2026": 0,
        "dev2026": 0,
        "cumplimientoPct": 0,
        "crecimientoYoYPct": 0,
        "tasaDevolucionPct": 0
      },
      {
        "mes": 11,
        "nombreMes": "Nov",
        "ppto2026": 0,
        "v2025": 0,
        "u2026": 0,
        "v2026": 0,
        "dev2026": 0,
        "cumplimientoPct": 0,
        "crecimientoYoYPct": 0,
        "tasaDevolucionPct": 0
      },
      {
        "mes": 12,
        "nombreMes": "Dic",
        "ppto2026": 0,
        "v2025": 64210,
        "u2026": 0,
        "v2026": 0,
        "dev2026": 0,
        "cumplimientoPct": 0,
        "crecimientoYoYPct": 0,
        "tasaDevolucionPct": 0
      }
    ],
    "meses2025": [
      9279200,
      485600,
      0,
      0,
      0,
      0,
      2871999,
      0,
      0,
      106035,
      0,
      64210
    ]
  },
  "CLAUDIA GIRALDO": {
    "nombre": "Claudia Giraldo",
    "row": 14,
    "acumulado": {
      "ppto": 668818402,
      "v2025": 654847959,
      "v2026": 433631025,
      "unds": 4814,
      "dev": -54280789,
      "cumplimientoPct": 64.8,
      "crecimientoYoYPct": -33.8,
      "tasaDevPct": 11.1
    },
    "meses": [
      {
        "mes": 1,
        "nombreMes": "Ene",
        "ppto2026": 27054652,
        "v2025": -4083600,
        "u2026": 89,
        "v2026": 7502100,
        "dev2026": -2775600,
        "cumplimientoPct": 27.7,
        "crecimientoYoYPct": 0,
        "tasaDevolucionPct": 27
      },
      {
        "mes": 2,
        "nombreMes": "Feb",
        "ppto2026": 92372057,
        "v2025": 76182200,
        "u2026": 403,
        "v2026": 43001763,
        "dev2026": -3781400,
        "cumplimientoPct": 46.6,
        "crecimientoYoYPct": -43.6,
        "tasaDevolucionPct": 8.1
      },
      {
        "mes": 3,
        "nombreMes": "Mar",
        "ppto2026": 113928479,
        "v2025": 167307500,
        "u2026": 1069,
        "v2026": 99483262,
        "dev2026": -3444300,
        "cumplimientoPct": 87.3,
        "crecimientoYoYPct": -40.5,
        "tasaDevolucionPct": 3.3
      },
      {
        "mes": 4,
        "nombreMes": "Abr",
        "ppto2026": 134939545,
        "v2025": 140530159,
        "u2026": 1576,
        "v2026": 125358400,
        "dev2026": -995300,
        "cumplimientoPct": 92.9,
        "crecimientoYoYPct": -10.8,
        "tasaDevolucionPct": 0.8
      },
      {
        "mes": 5,
        "nombreMes": "May",
        "ppto2026": 111863016,
        "v2025": 128811400,
        "u2026": 808,
        "v2026": 73777400,
        "dev2026": -18920789,
        "cumplimientoPct": 66,
        "crecimientoYoYPct": -42.7,
        "tasaDevolucionPct": 20.4
      },
      {
        "mes": 6,
        "nombreMes": "Jun",
        "ppto2026": 93835751,
        "v2025": 55308800,
        "u2026": 308,
        "v2026": 28590200,
        "dev2026": -24363400,
        "cumplimientoPct": 30.5,
        "crecimientoYoYPct": -48.3,
        "tasaDevolucionPct": 46
      },
      {
        "mes": 7,
        "nombreMes": "Jul",
        "ppto2026": 94824902,
        "v2025": 90791500,
        "u2026": 561,
        "v2026": 55917900,
        "dev2026": 0,
        "cumplimientoPct": 59,
        "crecimientoYoYPct": -38.4,
        "tasaDevolucionPct": 0
      },
      {
        "mes": 8,
        "nombreMes": "Ago",
        "ppto2026": 127793055,
        "v2025": 113871300,
        "u2026": 317,
        "v2026": 13681900,
        "dev2026": 0,
        "cumplimientoPct": 10.7,
        "crecimientoYoYPct": -88,
        "tasaDevolucionPct": 0
      },
      {
        "mes": 9,
        "nombreMes": "Sep",
        "ppto2026": 129462656,
        "v2025": 113720100,
        "u2026": 0,
        "v2026": 0,
        "dev2026": 0,
        "cumplimientoPct": 0,
        "crecimientoYoYPct": 0,
        "tasaDevolucionPct": 0
      },
      {
        "mes": 10,
        "nombreMes": "Oct",
        "ppto2026": 153437550,
        "v2025": 157298100,
        "u2026": 0,
        "v2026": 0,
        "dev2026": 0,
        "cumplimientoPct": 0,
        "crecimientoYoYPct": 0,
        "tasaDevolucionPct": 0
      },
      {
        "mes": 11,
        "nombreMes": "Nov",
        "ppto2026": 206871047,
        "v2025": 150678894,
        "u2026": 0,
        "v2026": 0,
        "dev2026": 0,
        "cumplimientoPct": 0,
        "crecimientoYoYPct": 0,
        "tasaDevolucionPct": 0
      },
      {
        "mes": 12,
        "nombreMes": "Dic",
        "ppto2026": 186084340,
        "v2025": 65477300,
        "u2026": 0,
        "v2026": 0,
        "dev2026": 0,
        "cumplimientoPct": 0,
        "crecimientoYoYPct": 0,
        "tasaDevolucionPct": 0
      }
    ],
    "meses2025": [
      -4083600,
      76182200,
      167307500,
      140530159,
      128811400,
      55308800,
      90791500,
      113871300,
      113720100,
      157298100,
      150678894,
      65477300
    ]
  },
  "DIANA AGUDELO": {
    "nombre": "DIANA AGUDELO",
    "row": 15,
    "acumulado": {
      "ppto": 0,
      "v2025": 0,
      "v2026": 56484100,
      "unds": 615,
      "dev": -8607700,
      "cumplimientoPct": 0,
      "crecimientoYoYPct": 0,
      "tasaDevPct": 13.2
    },
    "meses": [
      {
        "mes": 1,
        "nombreMes": "Ene",
        "ppto2026": 0,
        "v2025": 0,
        "u2026": 0,
        "v2026": 0,
        "dev2026": 0,
        "cumplimientoPct": 0,
        "crecimientoYoYPct": 0,
        "tasaDevolucionPct": 0
      },
      {
        "mes": 2,
        "nombreMes": "Feb",
        "ppto2026": 0,
        "v2025": 0,
        "u2026": 0,
        "v2026": 0,
        "dev2026": 0,
        "cumplimientoPct": 0,
        "crecimientoYoYPct": 0,
        "tasaDevolucionPct": 0
      },
      {
        "mes": 3,
        "nombreMes": "Mar",
        "ppto2026": 0,
        "v2025": 0,
        "u2026": 0,
        "v2026": 0,
        "dev2026": 0,
        "cumplimientoPct": 0,
        "crecimientoYoYPct": 0,
        "tasaDevolucionPct": 0
      },
      {
        "mes": 4,
        "nombreMes": "Abr",
        "ppto2026": 0,
        "v2025": 0,
        "u2026": 0,
        "v2026": 0,
        "dev2026": 0,
        "cumplimientoPct": 0,
        "crecimientoYoYPct": 0,
        "tasaDevolucionPct": 0
      },
      {
        "mes": 5,
        "nombreMes": "May",
        "ppto2026": 0,
        "v2025": 0,
        "u2026": 98,
        "v2026": 9110200,
        "dev2026": 0,
        "cumplimientoPct": 0,
        "crecimientoYoYPct": 0,
        "tasaDevolucionPct": 0
      },
      {
        "mes": 6,
        "nombreMes": "Jun",
        "ppto2026": 0,
        "v2025": 0,
        "u2026": 188,
        "v2026": 18049500,
        "dev2026": -4204500,
        "cumplimientoPct": 0,
        "crecimientoYoYPct": 0,
        "tasaDevolucionPct": 18.9
      },
      {
        "mes": 7,
        "nombreMes": "Jul",
        "ppto2026": 0,
        "v2025": 0,
        "u2026": 329,
        "v2026": 29324400,
        "dev2026": -4403200,
        "cumplimientoPct": 0,
        "crecimientoYoYPct": 0,
        "tasaDevolucionPct": 13.1
      },
      {
        "mes": 8,
        "nombreMes": "Ago",
        "ppto2026": 0,
        "v2025": 0,
        "u2026": 103,
        "v2026": 9325700,
        "dev2026": -98900,
        "cumplimientoPct": 0,
        "crecimientoYoYPct": 0,
        "tasaDevolucionPct": 1
      },
      {
        "mes": 9,
        "nombreMes": "Sep",
        "ppto2026": 0,
        "v2025": 0,
        "u2026": 0,
        "v2026": 0,
        "dev2026": 0,
        "cumplimientoPct": 0,
        "crecimientoYoYPct": 0,
        "tasaDevolucionPct": 0
      },
      {
        "mes": 10,
        "nombreMes": "Oct",
        "ppto2026": 0,
        "v2025": 0,
        "u2026": 0,
        "v2026": 0,
        "dev2026": 0,
        "cumplimientoPct": 0,
        "crecimientoYoYPct": 0,
        "tasaDevolucionPct": 0
      },
      {
        "mes": 11,
        "nombreMes": "Nov",
        "ppto2026": 0,
        "v2025": 0,
        "u2026": 0,
        "v2026": 0,
        "dev2026": 0,
        "cumplimientoPct": 0,
        "crecimientoYoYPct": 0,
        "tasaDevolucionPct": 0
      },
      {
        "mes": 12,
        "nombreMes": "Dic",
        "ppto2026": 0,
        "v2025": 0,
        "u2026": 0,
        "v2026": 0,
        "dev2026": 0,
        "cumplimientoPct": 0,
        "crecimientoYoYPct": 0,
        "tasaDevolucionPct": 0
      }
    ],
    "meses2025": [
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0
    ]
  },
  "DIEGO GIRALDO CORRERIA": {
    "nombre": "Diego Giraldo Correria",
    "row": 16,
    "acumulado": {
      "ppto": 1131846528,
      "v2025": 943877608,
      "v2026": 1112903844,
      "unds": 12527,
      "dev": -77898964,
      "cumplimientoPct": 98.3,
      "crecimientoYoYPct": 17.9,
      "tasaDevPct": 6.5
    },
    "meses": [
      {
        "mes": 1,
        "nombreMes": "Ene",
        "ppto2026": 45784795,
        "v2025": 10806400,
        "u2026": 685,
        "v2026": 58872500,
        "dev2026": -13897000,
        "cumplimientoPct": 128.6,
        "crecimientoYoYPct": 444.8,
        "tasaDevolucionPct": 19.1
      },
      {
        "mes": 2,
        "nombreMes": "Feb",
        "ppto2026": 156321943,
        "v2025": 189579029,
        "u2026": 1817,
        "v2026": 166587300,
        "dev2026": -13236000,
        "cumplimientoPct": 106.6,
        "crecimientoYoYPct": -12.1,
        "tasaDevolucionPct": 7.4
      },
      {
        "mes": 3,
        "nombreMes": "Mar",
        "ppto2026": 192802042,
        "v2025": 140272280,
        "u2026": 2433,
        "v2026": 213139428,
        "dev2026": -10327900,
        "cumplimientoPct": 110.5,
        "crecimientoYoYPct": 51.9,
        "tasaDevolucionPct": 4.6
      },
      {
        "mes": 4,
        "nombreMes": "Abr",
        "ppto2026": 228359231,
        "v2025": 247968023,
        "u2026": 2546,
        "v2026": 213884796,
        "dev2026": -5585300,
        "cumplimientoPct": 93.7,
        "crecimientoYoYPct": -13.7,
        "tasaDevolucionPct": 2.5
      },
      {
        "mes": 5,
        "nombreMes": "May",
        "ppto2026": 189306642,
        "v2025": 134184116,
        "u2026": 2046,
        "v2026": 188185632,
        "dev2026": -12493900,
        "cumplimientoPct": 99.4,
        "crecimientoYoYPct": 40.2,
        "tasaDevolucionPct": 6.2
      },
      {
        "mes": 6,
        "nombreMes": "Jun",
        "ppto2026": 158798964,
        "v2025": 88012600,
        "u2026": 1109,
        "v2026": 101094900,
        "dev2026": -13908800,
        "cumplimientoPct": 63.7,
        "crecimientoYoYPct": 14.9,
        "tasaDevolucionPct": 12.1
      },
      {
        "mes": 7,
        "nombreMes": "Jul",
        "ppto2026": 160472911,
        "v2025": 133055160,
        "u2026": 1891,
        "v2026": 171139288,
        "dev2026": -8450064,
        "cumplimientoPct": 106.6,
        "crecimientoYoYPct": 28.6,
        "tasaDevolucionPct": 4.7
      },
      {
        "mes": 8,
        "nombreMes": "Ago",
        "ppto2026": 216265171,
        "v2025": 225313196,
        "u2026": 2091,
        "v2026": 200374624,
        "dev2026": -173769955,
        "cumplimientoPct": 92.7,
        "crecimientoYoYPct": -11.1,
        "tasaDevolucionPct": 46.4
      },
      {
        "mes": 9,
        "nombreMes": "Sep",
        "ppto2026": 219090648,
        "v2025": 253915212,
        "u2026": 0,
        "v2026": 0,
        "dev2026": 0,
        "cumplimientoPct": 0,
        "crecimientoYoYPct": 0,
        "tasaDevolucionPct": 0
      },
      {
        "mes": 10,
        "nombreMes": "Oct",
        "ppto2026": 259663546,
        "v2025": 343323674,
        "u2026": 0,
        "v2026": 0,
        "dev2026": 0,
        "cumplimientoPct": 0,
        "crecimientoYoYPct": 0,
        "tasaDevolucionPct": 0
      },
      {
        "mes": 11,
        "nombreMes": "Nov",
        "ppto2026": 350089465,
        "v2025": 241385110,
        "u2026": 0,
        "v2026": 0,
        "dev2026": 0,
        "cumplimientoPct": 0,
        "crecimientoYoYPct": 0,
        "tasaDevolucionPct": 0
      },
      {
        "mes": 12,
        "nombreMes": "Dic",
        "ppto2026": 314911959,
        "v2025": 184744438,
        "u2026": 0,
        "v2026": 0,
        "dev2026": 0,
        "cumplimientoPct": 0,
        "crecimientoYoYPct": 0,
        "tasaDevolucionPct": 0
      }
    ],
    "meses2025": [
      10806400,
      189579029,
      140272280,
      247968023,
      134184116,
      88012600,
      133055160,
      225313196,
      253915212,
      343323674,
      241385110,
      184744438
    ]
  },
  "DIEGO GIRALDO-MEDELLIN": {
    "nombre": "DIEGO GIRALDO-MEDELLIN",
    "row": 17,
    "acumulado": {
      "ppto": 411580555,
      "v2025": 254053372,
      "v2026": 545447846,
      "unds": 6738,
      "dev": -20821100,
      "cumplimientoPct": 132.5,
      "crecimientoYoYPct": 114.7,
      "tasaDevPct": 3.7
    },
    "meses": [
      {
        "mes": 1,
        "nombreMes": "Ene",
        "ppto2026": 16649016,
        "v2025": 3982400,
        "u2026": 667,
        "v2026": 53236382,
        "dev2026": -2801800,
        "cumplimientoPct": 319.8,
        "crecimientoYoYPct": 1236.8,
        "tasaDevolucionPct": 5
      },
      {
        "mes": 2,
        "nombreMes": "Feb",
        "ppto2026": 56844343,
        "v2025": 30669300,
        "u2026": 1382,
        "v2026": 106374303,
        "dev2026": -1961800,
        "cumplimientoPct": 187.1,
        "crecimientoYoYPct": 246.8,
        "tasaDevolucionPct": 1.8
      },
      {
        "mes": 3,
        "nombreMes": "Mar",
        "ppto2026": 70109833,
        "v2025": 35989444,
        "u2026": 572,
        "v2026": 49980090,
        "dev2026": -3750000,
        "cumplimientoPct": 71.3,
        "crecimientoYoYPct": 38.9,
        "tasaDevolucionPct": 7
      },
      {
        "mes": 4,
        "nombreMes": "Abr",
        "ppto2026": 83039720,
        "v2025": 63671420,
        "u2026": 2975,
        "v2026": 233009111,
        "dev2026": -933900,
        "cumplimientoPct": 280.6,
        "crecimientoYoYPct": 266,
        "tasaDevolucionPct": 0.4
      },
      {
        "mes": 5,
        "nombreMes": "May",
        "ppto2026": 68838779,
        "v2025": 40609160,
        "u2026": 494,
        "v2026": 43761760,
        "dev2026": -3432400,
        "cumplimientoPct": 63.6,
        "crecimientoYoYPct": 7.8,
        "tasaDevolucionPct": 7.3
      },
      {
        "mes": 6,
        "nombreMes": "Jun",
        "ppto2026": 57745078,
        "v2025": 44815203,
        "u2026": 376,
        "v2026": 34589400,
        "dev2026": -4961200,
        "cumplimientoPct": 59.9,
        "crecimientoYoYPct": -22.8,
        "tasaDevolucionPct": 12.5
      },
      {
        "mes": 7,
        "nombreMes": "Jul",
        "ppto2026": 58353786,
        "v2025": 34316445,
        "u2026": 272,
        "v2026": 24496800,
        "dev2026": -2980000,
        "cumplimientoPct": 42,
        "crecimientoYoYPct": -28.6,
        "tasaDevolucionPct": 10.8
      },
      {
        "mes": 8,
        "nombreMes": "Ago",
        "ppto2026": 78641880,
        "v2025": 30545950,
        "u2026": 85,
        "v2026": 8183500,
        "dev2026": 0,
        "cumplimientoPct": 10.4,
        "crecimientoYoYPct": -73.2,
        "tasaDevolucionPct": 0
      },
      {
        "mes": 9,
        "nombreMes": "Sep",
        "ppto2026": 79669327,
        "v2025": 40148022,
        "u2026": 0,
        "v2026": 0,
        "dev2026": 0,
        "cumplimientoPct": 0,
        "crecimientoYoYPct": 0,
        "tasaDevolucionPct": 0
      },
      {
        "mes": 10,
        "nombreMes": "Oct",
        "ppto2026": 94423108,
        "v2025": 100991895,
        "u2026": 0,
        "v2026": 0,
        "dev2026": 0,
        "cumplimientoPct": 0,
        "crecimientoYoYPct": 0,
        "tasaDevolucionPct": 0
      },
      {
        "mes": 11,
        "nombreMes": "Nov",
        "ppto2026": 127305260,
        "v2025": 197222506,
        "u2026": 0,
        "v2026": 0,
        "dev2026": 0,
        "cumplimientoPct": 0,
        "crecimientoYoYPct": 0,
        "tasaDevolucionPct": 0
      },
      {
        "mes": 12,
        "nombreMes": "Dic",
        "ppto2026": 114513440,
        "v2025": 96755018,
        "u2026": 0,
        "v2026": 0,
        "dev2026": 0,
        "cumplimientoPct": 0,
        "crecimientoYoYPct": 0,
        "tasaDevolucionPct": 0
      }
    ],
    "meses2025": [
      3982400,
      30669300,
      35989444,
      63671420,
      40609160,
      44815203,
      34316445,
      30545950,
      40148022,
      100991895,
      197222506,
      96755018
    ]
  },
  "DIEGO GIRALDO RAPPAZ": {
    "nombre": "DIEGO GIRALDO RAPPAZ",
    "row": 18,
    "acumulado": {
      "ppto": 185211250,
      "v2025": 136005246,
      "v2026": 172225313,
      "unds": 2319,
      "dev": -4315878,
      "cumplimientoPct": 93,
      "crecimientoYoYPct": 26.6,
      "tasaDevPct": 2.4
    },
    "meses": [
      {
        "mes": 1,
        "nombreMes": "Ene",
        "ppto2026": 7492057,
        "v2025": 3227500,
        "u2026": 26,
        "v2026": 2027097,
        "dev2026": 0,
        "cumplimientoPct": 27.1,
        "crecimientoYoYPct": -37.2,
        "tasaDevolucionPct": 0
      },
      {
        "mes": 2,
        "nombreMes": "Feb",
        "ppto2026": 25579954,
        "v2025": 1720400,
        "u2026": 226,
        "v2026": 17833400,
        "dev2026": -210178,
        "cumplimientoPct": 69.7,
        "crecimientoYoYPct": 936.6,
        "tasaDevolucionPct": 1.2
      },
      {
        "mes": 3,
        "nombreMes": "Mar",
        "ppto2026": 31549425,
        "v2025": 20959552,
        "u2026": 361,
        "v2026": 27207504,
        "dev2026": -2963100,
        "cumplimientoPct": 86.2,
        "crecimientoYoYPct": 29.8,
        "tasaDevolucionPct": 9.8
      },
      {
        "mes": 4,
        "nombreMes": "Abr",
        "ppto2026": 37367874,
        "v2025": 32400700,
        "u2026": 413,
        "v2026": 33114540,
        "dev2026": -728100,
        "cumplimientoPct": 88.6,
        "crecimientoYoYPct": 2.2,
        "tasaDevolucionPct": 2.2
      },
      {
        "mes": 5,
        "nombreMes": "May",
        "ppto2026": 30977451,
        "v2025": 18713768,
        "u2026": 317,
        "v2026": 23446484,
        "dev2026": -414500,
        "cumplimientoPct": 75.7,
        "crecimientoYoYPct": 25.3,
        "tasaDevolucionPct": 1.7
      },
      {
        "mes": 6,
        "nombreMes": "Jun",
        "ppto2026": 25985285,
        "v2025": 46172956,
        "u2026": 137,
        "v2026": 9088300,
        "dev2026": 0,
        "cumplimientoPct": 35,
        "crecimientoYoYPct": -80.3,
        "tasaDevolucionPct": 0
      },
      {
        "mes": 7,
        "nombreMes": "Jul",
        "ppto2026": 26259204,
        "v2025": 12810370,
        "u2026": 839,
        "v2026": 59507988,
        "dev2026": 0,
        "cumplimientoPct": 226.6,
        "crecimientoYoYPct": 364.5,
        "tasaDevolucionPct": 0
      },
      {
        "mes": 8,
        "nombreMes": "Ago",
        "ppto2026": 35388846,
        "v2025": 57327620,
        "u2026": 148,
        "v2026": 11505200,
        "dev2026": 0,
        "cumplimientoPct": 32.5,
        "crecimientoYoYPct": -79.9,
        "tasaDevolucionPct": 0
      },
      {
        "mes": 9,
        "nombreMes": "Sep",
        "ppto2026": 35851197,
        "v2025": 22257328,
        "u2026": 0,
        "v2026": 0,
        "dev2026": 0,
        "cumplimientoPct": 0,
        "crecimientoYoYPct": 0,
        "tasaDevolucionPct": 0
      },
      {
        "mes": 10,
        "nombreMes": "Oct",
        "ppto2026": 42490398,
        "v2025": 51955928,
        "u2026": 0,
        "v2026": 0,
        "dev2026": 0,
        "cumplimientoPct": 0,
        "crecimientoYoYPct": 0,
        "tasaDevolucionPct": 0
      },
      {
        "mes": 11,
        "nombreMes": "Nov",
        "ppto2026": 57287367,
        "v2025": 51870760,
        "u2026": 0,
        "v2026": 0,
        "dev2026": 0,
        "cumplimientoPct": 0,
        "crecimientoYoYPct": 0,
        "tasaDevolucionPct": 0
      },
      {
        "mes": 12,
        "nombreMes": "Dic",
        "ppto2026": 51531048,
        "v2025": 27600100,
        "u2026": 0,
        "v2026": 0,
        "dev2026": 0,
        "cumplimientoPct": 0,
        "crecimientoYoYPct": 0,
        "tasaDevolucionPct": 0
      }
    ],
    "meses2025": [
      3227500,
      1720400,
      20959552,
      32400700,
      18713768,
      46172956,
      12810370,
      57327620,
      22257328,
      51955928,
      51870760,
      27600100
    ]
  },
  "CAMILO ZULUAGA": {
    "nombre": "CAMILO ZULUAGA",
    "row": 19,
    "acumulado": {
      "ppto": 391001527,
      "v2025": 0,
      "v2026": 87947256,
      "unds": 1002,
      "dev": -20438166,
      "cumplimientoPct": 22.5,
      "crecimientoYoYPct": 0,
      "tasaDevPct": 18.9
    },
    "meses": [
      {
        "mes": 1,
        "nombreMes": "Ene",
        "ppto2026": 15816566,
        "v2025": 0,
        "u2026": 0,
        "v2026": 0,
        "dev2026": 0,
        "cumplimientoPct": 0,
        "crecimientoYoYPct": 0,
        "tasaDevolucionPct": 0
      },
      {
        "mes": 2,
        "nombreMes": "Feb",
        "ppto2026": 54002126,
        "v2025": 0,
        "u2026": 0,
        "v2026": 0,
        "dev2026": 0,
        "cumplimientoPct": 0,
        "crecimientoYoYPct": 0,
        "tasaDevolucionPct": 0
      },
      {
        "mes": 3,
        "nombreMes": "Mar",
        "ppto2026": 66604341,
        "v2025": 0,
        "u2026": 0,
        "v2026": 0,
        "dev2026": 0,
        "cumplimientoPct": 0,
        "crecimientoYoYPct": 0,
        "tasaDevolucionPct": 0
      },
      {
        "mes": 4,
        "nombreMes": "Abr",
        "ppto2026": 78887734,
        "v2025": 0,
        "u2026": 0,
        "v2026": 0,
        "dev2026": 0,
        "cumplimientoPct": 0,
        "crecimientoYoYPct": 0,
        "tasaDevolucionPct": 0
      },
      {
        "mes": 5,
        "nombreMes": "May",
        "ppto2026": 65396840,
        "v2025": 0,
        "u2026": 239,
        "v2026": 21764842,
        "dev2026": 0,
        "cumplimientoPct": 33.3,
        "crecimientoYoYPct": 0,
        "tasaDevolucionPct": 0
      },
      {
        "mes": 6,
        "nombreMes": "Jun",
        "ppto2026": 54857824,
        "v2025": 0,
        "u2026": 311,
        "v2026": 24088894,
        "dev2026": -20438166,
        "cumplimientoPct": 43.9,
        "crecimientoYoYPct": 0,
        "tasaDevolucionPct": 45.9
      },
      {
        "mes": 7,
        "nombreMes": "Jul",
        "ppto2026": 55436096,
        "v2025": 0,
        "u2026": 452,
        "v2026": 42093520,
        "dev2026": 0,
        "cumplimientoPct": 75.9,
        "crecimientoYoYPct": 0,
        "tasaDevolucionPct": 0
      },
      {
        "mes": 8,
        "nombreMes": "Ago",
        "ppto2026": 74709786,
        "v2025": 0,
        "u2026": 302,
        "v2026": 29412472,
        "dev2026": 0,
        "cumplimientoPct": 39.4,
        "crecimientoYoYPct": 0,
        "tasaDevolucionPct": 0
      },
      {
        "mes": 9,
        "nombreMes": "Sep",
        "ppto2026": 75685860,
        "v2025": 0,
        "u2026": 0,
        "v2026": 0,
        "dev2026": 0,
        "cumplimientoPct": 0,
        "crecimientoYoYPct": 0,
        "tasaDevolucionPct": 0
      },
      {
        "mes": 10,
        "nombreMes": "Oct",
        "ppto2026": 89701952,
        "v2025": 0,
        "u2026": 0,
        "v2026": 0,
        "dev2026": 0,
        "cumplimientoPct": 0,
        "crecimientoYoYPct": 0,
        "tasaDevolucionPct": 0
      },
      {
        "mes": 11,
        "nombreMes": "Nov",
        "ppto2026": 120939996,
        "v2025": 0,
        "u2026": 0,
        "v2026": 0,
        "dev2026": 0,
        "cumplimientoPct": 0,
        "crecimientoYoYPct": 0,
        "tasaDevolucionPct": 0
      },
      {
        "mes": 12,
        "nombreMes": "Dic",
        "ppto2026": 108787768,
        "v2025": 0,
        "u2026": 0,
        "v2026": 0,
        "dev2026": 0,
        "cumplimientoPct": 0,
        "crecimientoYoYPct": 0,
        "tasaDevolucionPct": 0
      }
    ],
    "meses2025": [
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0
    ]
  },
  "JONATHAN LOPEZ": {
    "nombre": "JONATHAN LOPEZ",
    "row": 20,
    "acumulado": {
      "ppto": 339553958,
      "v2025": 262061897,
      "v2026": 168976376,
      "unds": 1939,
      "dev": -20572037,
      "cumplimientoPct": 49.8,
      "crecimientoYoYPct": -35.5,
      "tasaDevPct": 10.9
    },
    "meses": [
      {
        "mes": 1,
        "nombreMes": "Ene",
        "ppto2026": 13735439,
        "v2025": -2913188,
        "u2026": -54,
        "v2026": -4866384,
        "dev2026": -4866384,
        "cumplimientoPct": -35.4,
        "crecimientoYoYPct": 0,
        "tasaDevolucionPct": 0
      },
      {
        "mes": 2,
        "nombreMes": "Feb",
        "ppto2026": 46896583,
        "v2025": 61515932,
        "u2026": 411,
        "v2026": 34647900,
        "dev2026": -1214800,
        "cumplimientoPct": 73.9,
        "crecimientoYoYPct": -43.7,
        "tasaDevolucionPct": 3.4
      },
      {
        "mes": 3,
        "nombreMes": "Mar",
        "ppto2026": 57840612,
        "v2025": 50382044,
        "u2026": 261,
        "v2026": 23129620,
        "dev2026": -3264692,
        "cumplimientoPct": 40,
        "crecimientoYoYPct": -54.1,
        "tasaDevolucionPct": 12.4
      },
      {
        "mes": 4,
        "nombreMes": "Abr",
        "ppto2026": 68507769,
        "v2025": 74596689,
        "u2026": 898,
        "v2026": 77604600,
        "dev2026": 0,
        "cumplimientoPct": 113.3,
        "crecimientoYoYPct": 4,
        "tasaDevolucionPct": 0
      },
      {
        "mes": 5,
        "nombreMes": "May",
        "ppto2026": 56791993,
        "v2025": 53224708,
        "u2026": 381,
        "v2026": 36167424,
        "dev2026": -5079461,
        "cumplimientoPct": 63.7,
        "crecimientoYoYPct": -32,
        "tasaDevolucionPct": 12.3
      },
      {
        "mes": 6,
        "nombreMes": "Jun",
        "ppto2026": 47639689,
        "v2025": 11351401,
        "u2026": 39,
        "v2026": 2209516,
        "dev2026": -5679200,
        "cumplimientoPct": 4.6,
        "crecimientoYoYPct": -80.5,
        "tasaDevolucionPct": 72
      },
      {
        "mes": 7,
        "nombreMes": "Jul",
        "ppto2026": 48141873,
        "v2025": 13904311,
        "u2026": 3,
        "v2026": 83700,
        "dev2026": -467500,
        "cumplimientoPct": 0.2,
        "crecimientoYoYPct": -99.4,
        "tasaDevolucionPct": 84.8
      },
      {
        "mes": 8,
        "nombreMes": "Ago",
        "ppto2026": 64879551,
        "v2025": 76863640,
        "u2026": -22,
        "v2026": -2295800,
        "dev2026": -2295800,
        "cumplimientoPct": -3.5,
        "crecimientoYoYPct": -103,
        "tasaDevolucionPct": 0
      },
      {
        "mes": 9,
        "nombreMes": "Sep",
        "ppto2026": 65727194,
        "v2025": 62987553,
        "u2026": 0,
        "v2026": 0,
        "dev2026": 0,
        "cumplimientoPct": 0,
        "crecimientoYoYPct": 0,
        "tasaDevolucionPct": 0
      },
      {
        "mes": 10,
        "nombreMes": "Oct",
        "ppto2026": 77899064,
        "v2025": 68835688,
        "u2026": 0,
        "v2026": 0,
        "dev2026": 0,
        "cumplimientoPct": 0,
        "crecimientoYoYPct": 0,
        "tasaDevolucionPct": 0
      },
      {
        "mes": 11,
        "nombreMes": "Nov",
        "ppto2026": 105026839,
        "v2025": 89341200,
        "u2026": 0,
        "v2026": 0,
        "dev2026": 0,
        "cumplimientoPct": 0,
        "crecimientoYoYPct": 0,
        "tasaDevolucionPct": 0
      },
      {
        "mes": 12,
        "nombreMes": "Dic",
        "ppto2026": 94473588,
        "v2025": 46425408,
        "u2026": 0,
        "v2026": 0,
        "dev2026": 0,
        "cumplimientoPct": 0,
        "crecimientoYoYPct": 0,
        "tasaDevolucionPct": 0
      }
    ],
    "meses2025": [
      -2913188,
      61515932,
      50382044,
      74596689,
      53224708,
      11351401,
      13904311,
      76863640,
      62987553,
      68835688,
      89341200,
      46425408
    ]
  },
  "JONATHAN LOPEZ RAPPAZ": {
    "nombre": "JONATHAN LOPEZ RAPPAZ",
    "row": 21,
    "acumulado": {
      "ppto": 51447569,
      "v2025": 0,
      "v2026": 10505000,
      "unds": 130,
      "dev": 0,
      "cumplimientoPct": 20.4,
      "crecimientoYoYPct": 0,
      "tasaDevPct": 0
    },
    "meses": [
      {
        "mes": 1,
        "nombreMes": "Ene",
        "ppto2026": 2081127,
        "v2025": 0,
        "u2026": 0,
        "v2026": 0,
        "dev2026": 0,
        "cumplimientoPct": 0,
        "crecimientoYoYPct": 0,
        "tasaDevolucionPct": 0
      },
      {
        "mes": 2,
        "nombreMes": "Feb",
        "ppto2026": 7105543,
        "v2025": 0,
        "u2026": 55,
        "v2026": 4495500,
        "dev2026": 0,
        "cumplimientoPct": 63.3,
        "crecimientoYoYPct": 0,
        "tasaDevolucionPct": 0
      },
      {
        "mes": 3,
        "nombreMes": "Mar",
        "ppto2026": 8763729,
        "v2025": 0,
        "u2026": 0,
        "v2026": 0,
        "dev2026": 0,
        "cumplimientoPct": 0,
        "crecimientoYoYPct": 0,
        "tasaDevolucionPct": 0
      },
      {
        "mes": 4,
        "nombreMes": "Abr",
        "ppto2026": 10379965,
        "v2025": 0,
        "u2026": 9,
        "v2026": 723100,
        "dev2026": 0,
        "cumplimientoPct": 7,
        "crecimientoYoYPct": 0,
        "tasaDevolucionPct": 0
      },
      {
        "mes": 5,
        "nombreMes": "May",
        "ppto2026": 8604847,
        "v2025": 0,
        "u2026": 42,
        "v2026": 3356800,
        "dev2026": 0,
        "cumplimientoPct": 39,
        "crecimientoYoYPct": 0,
        "tasaDevolucionPct": 0
      },
      {
        "mes": 6,
        "nombreMes": "Jun",
        "ppto2026": 7218135,
        "v2025": 0,
        "u2026": 24,
        "v2026": 1929600,
        "dev2026": 0,
        "cumplimientoPct": 26.7,
        "crecimientoYoYPct": 0,
        "tasaDevolucionPct": 0
      },
      {
        "mes": 7,
        "nombreMes": "Jul",
        "ppto2026": 7294223,
        "v2025": 0,
        "u2026": 0,
        "v2026": 0,
        "dev2026": 0,
        "cumplimientoPct": 0,
        "crecimientoYoYPct": 0,
        "tasaDevolucionPct": 0
      },
      {
        "mes": 8,
        "nombreMes": "Ago",
        "ppto2026": 9830235,
        "v2025": 0,
        "u2026": 0,
        "v2026": 0,
        "dev2026": 0,
        "cumplimientoPct": 0,
        "crecimientoYoYPct": 0,
        "tasaDevolucionPct": 0
      },
      {
        "mes": 9,
        "nombreMes": "Sep",
        "ppto2026": 9958666,
        "v2025": 0,
        "u2026": 0,
        "v2026": 0,
        "dev2026": 0,
        "cumplimientoPct": 0,
        "crecimientoYoYPct": 0,
        "tasaDevolucionPct": 0
      },
      {
        "mes": 10,
        "nombreMes": "Oct",
        "ppto2026": 11802888,
        "v2025": 0,
        "u2026": 0,
        "v2026": 0,
        "dev2026": 0,
        "cumplimientoPct": 0,
        "crecimientoYoYPct": 0,
        "tasaDevolucionPct": 0
      },
      {
        "mes": 11,
        "nombreMes": "Nov",
        "ppto2026": 15913157,
        "v2025": 2485900,
        "u2026": 0,
        "v2026": 0,
        "dev2026": 0,
        "cumplimientoPct": 0,
        "crecimientoYoYPct": 0,
        "tasaDevolucionPct": 0
      },
      {
        "mes": 12,
        "nombreMes": "Dic",
        "ppto2026": 14314180,
        "v2025": 1528100,
        "u2026": 0,
        "v2026": 0,
        "dev2026": 0,
        "cumplimientoPct": 0,
        "crecimientoYoYPct": 0,
        "tasaDevolucionPct": 0
      }
    ],
    "meses2025": [
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      2485900,
      1528100
    ]
  },
  "CAROLINA GIL": {
    "nombre": "CAROLINA GIL",
    "row": 22,
    "acumulado": {
      "ppto": 51447569,
      "v2025": 46267222,
      "v2026": 0,
      "unds": 0,
      "dev": 0,
      "cumplimientoPct": 0,
      "crecimientoYoYPct": -100,
      "tasaDevPct": 0
    },
    "meses": [
      {
        "mes": 1,
        "nombreMes": "Ene",
        "ppto2026": 2081127,
        "v2025": 0,
        "u2026": 0,
        "v2026": 0,
        "dev2026": 0,
        "cumplimientoPct": 0,
        "crecimientoYoYPct": 0,
        "tasaDevolucionPct": 0
      },
      {
        "mes": 2,
        "nombreMes": "Feb",
        "ppto2026": 7105543,
        "v2025": 6071000,
        "u2026": 0,
        "v2026": 0,
        "dev2026": 0,
        "cumplimientoPct": 0,
        "crecimientoYoYPct": -100,
        "tasaDevolucionPct": 0
      },
      {
        "mes": 3,
        "nombreMes": "Mar",
        "ppto2026": 8763729,
        "v2025": 19503400,
        "u2026": 0,
        "v2026": 0,
        "dev2026": 0,
        "cumplimientoPct": 0,
        "crecimientoYoYPct": -100,
        "tasaDevolucionPct": 0
      },
      {
        "mes": 4,
        "nombreMes": "Abr",
        "ppto2026": 10379965,
        "v2025": 5671100,
        "u2026": 0,
        "v2026": 0,
        "dev2026": 0,
        "cumplimientoPct": 0,
        "crecimientoYoYPct": -100,
        "tasaDevolucionPct": 0
      },
      {
        "mes": 5,
        "nombreMes": "May",
        "ppto2026": 8604847,
        "v2025": 1960600,
        "u2026": 0,
        "v2026": 0,
        "dev2026": 0,
        "cumplimientoPct": 0,
        "crecimientoYoYPct": -100,
        "tasaDevolucionPct": 0
      },
      {
        "mes": 6,
        "nombreMes": "Jun",
        "ppto2026": 7218135,
        "v2025": 11460522,
        "u2026": 0,
        "v2026": 0,
        "dev2026": 0,
        "cumplimientoPct": 0,
        "crecimientoYoYPct": -100,
        "tasaDevolucionPct": 0
      },
      {
        "mes": 7,
        "nombreMes": "Jul",
        "ppto2026": 7294223,
        "v2025": 1600600,
        "u2026": 0,
        "v2026": 0,
        "dev2026": 0,
        "cumplimientoPct": 0,
        "crecimientoYoYPct": -100,
        "tasaDevolucionPct": 0
      },
      {
        "mes": 8,
        "nombreMes": "Ago",
        "ppto2026": 9830235,
        "v2025": 6085000,
        "u2026": 0,
        "v2026": 0,
        "dev2026": 0,
        "cumplimientoPct": 0,
        "crecimientoYoYPct": -100,
        "tasaDevolucionPct": 0
      },
      {
        "mes": 9,
        "nombreMes": "Sep",
        "ppto2026": 9958666,
        "v2025": 7584700,
        "u2026": 0,
        "v2026": 0,
        "dev2026": 0,
        "cumplimientoPct": 0,
        "crecimientoYoYPct": 0,
        "tasaDevolucionPct": 0
      },
      {
        "mes": 10,
        "nombreMes": "Oct",
        "ppto2026": 11802888,
        "v2025": 7532500,
        "u2026": 0,
        "v2026": 0,
        "dev2026": 0,
        "cumplimientoPct": 0,
        "crecimientoYoYPct": 0,
        "tasaDevolucionPct": 0
      },
      {
        "mes": 11,
        "nombreMes": "Nov",
        "ppto2026": 15913157,
        "v2025": 3909500,
        "u2026": 0,
        "v2026": 0,
        "dev2026": 0,
        "cumplimientoPct": 0,
        "crecimientoYoYPct": 0,
        "tasaDevolucionPct": 0
      },
      {
        "mes": 12,
        "nombreMes": "Dic",
        "ppto2026": 14314180,
        "v2025": 0,
        "u2026": 0,
        "v2026": 0,
        "dev2026": 0,
        "cumplimientoPct": 0,
        "crecimientoYoYPct": 0,
        "tasaDevolucionPct": 0
      }
    ],
    "meses2025": [
      0,
      6071000,
      19503400,
      5671100,
      1960600,
      11460522,
      1600600,
      6085000,
      7584700,
      7532500,
      3909500,
      0
    ]
  },
  "ALBA LIGEYA QUINTERO": {
    "nombre": "ALBA LIGEYA QUINTERO",
    "row": 23,
    "acumulado": {
      "ppto": 0,
      "v2025": 0,
      "v2026": 0,
      "unds": 0,
      "dev": 0,
      "cumplimientoPct": 0,
      "crecimientoYoYPct": 0,
      "tasaDevPct": 0
    },
    "meses": [
      {
        "mes": 1,
        "nombreMes": "Ene",
        "ppto2026": 0,
        "v2025": 0,
        "u2026": 0,
        "v2026": 0,
        "dev2026": 0,
        "cumplimientoPct": 0,
        "crecimientoYoYPct": 0,
        "tasaDevolucionPct": 0
      },
      {
        "mes": 2,
        "nombreMes": "Feb",
        "ppto2026": 0,
        "v2025": 0,
        "u2026": 0,
        "v2026": 0,
        "dev2026": 0,
        "cumplimientoPct": 0,
        "crecimientoYoYPct": 0,
        "tasaDevolucionPct": 0
      },
      {
        "mes": 3,
        "nombreMes": "Mar",
        "ppto2026": 0,
        "v2025": 0,
        "u2026": 0,
        "v2026": 0,
        "dev2026": 0,
        "cumplimientoPct": 0,
        "crecimientoYoYPct": 0,
        "tasaDevolucionPct": 0
      },
      {
        "mes": 4,
        "nombreMes": "Abr",
        "ppto2026": 0,
        "v2025": 0,
        "u2026": 0,
        "v2026": 0,
        "dev2026": 0,
        "cumplimientoPct": 0,
        "crecimientoYoYPct": 0,
        "tasaDevolucionPct": 0
      },
      {
        "mes": 5,
        "nombreMes": "May",
        "ppto2026": 0,
        "v2025": 0,
        "u2026": 0,
        "v2026": 0,
        "dev2026": 0,
        "cumplimientoPct": 0,
        "crecimientoYoYPct": 0,
        "tasaDevolucionPct": 0
      },
      {
        "mes": 6,
        "nombreMes": "Jun",
        "ppto2026": 0,
        "v2025": 0,
        "u2026": 0,
        "v2026": 0,
        "dev2026": 0,
        "cumplimientoPct": 0,
        "crecimientoYoYPct": 0,
        "tasaDevolucionPct": 0
      },
      {
        "mes": 7,
        "nombreMes": "Jul",
        "ppto2026": 0,
        "v2025": 0,
        "u2026": 0,
        "v2026": 0,
        "dev2026": 0,
        "cumplimientoPct": 0,
        "crecimientoYoYPct": 0,
        "tasaDevolucionPct": 0
      },
      {
        "mes": 8,
        "nombreMes": "Ago",
        "ppto2026": 0,
        "v2025": 0,
        "u2026": 0,
        "v2026": 0,
        "dev2026": 0,
        "cumplimientoPct": 0,
        "crecimientoYoYPct": 0,
        "tasaDevolucionPct": 0
      },
      {
        "mes": 9,
        "nombreMes": "Sep",
        "ppto2026": 0,
        "v2025": 0,
        "u2026": 0,
        "v2026": 0,
        "dev2026": 0,
        "cumplimientoPct": 0,
        "crecimientoYoYPct": 0,
        "tasaDevolucionPct": 0
      },
      {
        "mes": 10,
        "nombreMes": "Oct",
        "ppto2026": 0,
        "v2025": 0,
        "u2026": 0,
        "v2026": 0,
        "dev2026": 0,
        "cumplimientoPct": 0,
        "crecimientoYoYPct": 0,
        "tasaDevolucionPct": 0
      },
      {
        "mes": 11,
        "nombreMes": "Nov",
        "ppto2026": 0,
        "v2025": 0,
        "u2026": 0,
        "v2026": 0,
        "dev2026": 0,
        "cumplimientoPct": 0,
        "crecimientoYoYPct": 0,
        "tasaDevolucionPct": 0
      },
      {
        "mes": 12,
        "nombreMes": "Dic",
        "ppto2026": 0,
        "v2025": 0,
        "u2026": 0,
        "v2026": 0,
        "dev2026": 0,
        "cumplimientoPct": 0,
        "crecimientoYoYPct": 0,
        "tasaDevolucionPct": 0
      }
    ],
    "meses2025": [
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0
    ]
  },
  "JUAN DAVID QUINTANA": {
    "nombre": "JUAN DAVID QUINTANA",
    "row": 24,
    "acumulado": {
      "ppto": 771713540,
      "v2025": 646602895,
      "v2026": 788185451,
      "unds": 9223,
      "dev": -43038502,
      "cumplimientoPct": 102.1,
      "crecimientoYoYPct": 21.9,
      "tasaDevPct": 5.2
    },
    "meses": [
      {
        "mes": 1,
        "nombreMes": "Ene",
        "ppto2026": 31216906,
        "v2025": -7844200,
        "u2026": 177,
        "v2026": 12409300,
        "dev2026": -3995700,
        "cumplimientoPct": 39.8,
        "crecimientoYoYPct": 0,
        "tasaDevolucionPct": 24.4
      },
      {
        "mes": 2,
        "nombreMes": "Feb",
        "ppto2026": 106583143,
        "v2025": 113902400,
        "u2026": 1012,
        "v2026": 87045901,
        "dev2026": -4613400,
        "cumplimientoPct": 81.7,
        "crecimientoYoYPct": -23.6,
        "tasaDevolucionPct": 5
      },
      {
        "mes": 3,
        "nombreMes": "Mar",
        "ppto2026": 131455937,
        "v2025": 78762595,
        "u2026": 1069,
        "v2026": 90236100,
        "dev2026": -15514702,
        "cumplimientoPct": 68.6,
        "crecimientoYoYPct": 14.6,
        "tasaDevolucionPct": 14.7
      },
      {
        "mes": 4,
        "nombreMes": "Abr",
        "ppto2026": 155699475,
        "v2025": 192213300,
        "u2026": 2239,
        "v2026": 185145100,
        "dev2026": -4365900,
        "cumplimientoPct": 118.9,
        "crecimientoYoYPct": -3.7,
        "tasaDevolucionPct": 2.3
      },
      {
        "mes": 5,
        "nombreMes": "May",
        "ppto2026": 129072710,
        "v2025": 100458300,
        "u2026": 2144,
        "v2026": 186007750,
        "dev2026": -8538700,
        "cumplimientoPct": 144.1,
        "crecimientoYoYPct": 85.2,
        "tasaDevolucionPct": 4.4
      },
      {
        "mes": 6,
        "nombreMes": "Jun",
        "ppto2026": 108272021,
        "v2025": 114226700,
        "u2026": 1277,
        "v2026": 111512800,
        "dev2026": -4286800,
        "cumplimientoPct": 103,
        "crecimientoYoYPct": -2.4,
        "tasaDevolucionPct": 3.7
      },
      {
        "mes": 7,
        "nombreMes": "Jul",
        "ppto2026": 109413348,
        "v2025": 54883800,
        "u2026": 1305,
        "v2026": 115828500,
        "dev2026": -1723300,
        "cumplimientoPct": 105.9,
        "crecimientoYoYPct": 111,
        "tasaDevolucionPct": 1.5
      },
      {
        "mes": 8,
        "nombreMes": "Ago",
        "ppto2026": 147453526,
        "v2025": 168663700,
        "u2026": 1751,
        "v2026": 159442900,
        "dev2026": -100838732,
        "cumplimientoPct": 108.1,
        "crecimientoYoYPct": -5.5,
        "tasaDevolucionPct": 38.7
      },
      {
        "mes": 9,
        "nombreMes": "Sep",
        "ppto2026": 149379987,
        "v2025": 149681600,
        "u2026": 0,
        "v2026": 0,
        "dev2026": 0,
        "cumplimientoPct": 0,
        "crecimientoYoYPct": 0,
        "tasaDevolucionPct": 0
      },
      {
        "mes": 10,
        "nombreMes": "Oct",
        "ppto2026": 177043327,
        "v2025": 222579400,
        "u2026": 0,
        "v2026": 0,
        "dev2026": 0,
        "cumplimientoPct": 0,
        "crecimientoYoYPct": 0,
        "tasaDevolucionPct": 0
      },
      {
        "mes": 11,
        "nombreMes": "Nov",
        "ppto2026": 238697362,
        "v2025": 233697606,
        "u2026": 0,
        "v2026": 0,
        "dev2026": 0,
        "cumplimientoPct": 0,
        "crecimientoYoYPct": 0,
        "tasaDevolucionPct": 0
      },
      {
        "mes": 12,
        "nombreMes": "Dic",
        "ppto2026": 214712700,
        "v2025": 143451800,
        "u2026": 0,
        "v2026": 0,
        "dev2026": 0,
        "cumplimientoPct": 0,
        "crecimientoYoYPct": 0,
        "tasaDevolucionPct": 0
      }
    ],
    "meses2025": [
      -7844200,
      113902400,
      78762595,
      192213300,
      100458300,
      114226700,
      54883800,
      168663700,
      149681600,
      222579400,
      233697606,
      143451800
    ]
  },
  "LINA GARCIA": {
    "nombre": "LINA GARCIA",
    "row": 25,
    "acumulado": {
      "ppto": 1553716595,
      "v2025": 1534921583,
      "v2026": 2019562782,
      "unds": 22995,
      "dev": -527915216,
      "cumplimientoPct": 130,
      "crecimientoYoYPct": 31.6,
      "tasaDevPct": 20.7
    },
    "meses": [
      {
        "mes": 1,
        "nombreMes": "Ene",
        "ppto2026": 62850037,
        "v2025": 58158978,
        "u2026": 1701,
        "v2026": 152613532,
        "dev2026": -10713680,
        "cumplimientoPct": 242.8,
        "crecimientoYoYPct": 162.4,
        "tasaDevolucionPct": 6.6
      },
      {
        "mes": 2,
        "nombreMes": "Feb",
        "ppto2026": 214587394,
        "v2025": 216551295,
        "u2026": 3532,
        "v2026": 361890795,
        "dev2026": -112013856,
        "cumplimientoPct": 168.6,
        "crecimientoYoYPct": 67.1,
        "tasaDevolucionPct": 23.6
      },
      {
        "mes": 3,
        "nombreMes": "Mar",
        "ppto2026": 264664621,
        "v2025": 317939658,
        "u2026": 5225,
        "v2026": 450034305,
        "dev2026": -157845786,
        "cumplimientoPct": 170,
        "crecimientoYoYPct": 41.5,
        "tasaDevolucionPct": 26
      },
      {
        "mes": 4,
        "nombreMes": "Abr",
        "ppto2026": 313474944,
        "v2025": 370710523,
        "u2026": 4491,
        "v2026": 454935877,
        "dev2026": -100219785,
        "cumplimientoPct": 145.1,
        "crecimientoYoYPct": 22.7,
        "tasaDevolucionPct": 18.1
      },
      {
        "mes": 5,
        "nombreMes": "May",
        "ppto2026": 259866390,
        "v2025": 207896162,
        "u2026": 2096,
        "v2026": 109016181,
        "dev2026": -113653547,
        "cumplimientoPct": 42,
        "crecimientoYoYPct": -47.6,
        "tasaDevolucionPct": 51
      },
      {
        "mes": 6,
        "nombreMes": "Jun",
        "ppto2026": 217987668,
        "v2025": 143817840,
        "u2026": 1642,
        "v2026": 150878176,
        "dev2026": -16400648,
        "cumplimientoPct": 69.2,
        "crecimientoYoYPct": 4.9,
        "tasaDevolucionPct": 9.8
      },
      {
        "mes": 7,
        "nombreMes": "Jul",
        "ppto2026": 220285541,
        "v2025": 219847127,
        "u2026": 4308,
        "v2026": 340193916,
        "dev2026": -17067914,
        "cumplimientoPct": 154.4,
        "crecimientoYoYPct": 54.7,
        "tasaDevolucionPct": 4.8
      },
      {
        "mes": 8,
        "nombreMes": "Ago",
        "ppto2026": 296873098,
        "v2025": 254453739,
        "u2026": 2236,
        "v2026": 202126504,
        "dev2026": -132800,
        "cumplimientoPct": 68.1,
        "crecimientoYoYPct": -20.6,
        "tasaDevolucionPct": 0.1
      },
      {
        "mes": 9,
        "nombreMes": "Sep",
        "ppto2026": 300751708,
        "v2025": 357954913,
        "u2026": 0,
        "v2026": 0,
        "dev2026": 0,
        "cumplimientoPct": 0,
        "crecimientoYoYPct": 0,
        "tasaDevolucionPct": 0
      },
      {
        "mes": 10,
        "nombreMes": "Oct",
        "ppto2026": 356447232,
        "v2025": 325224468,
        "u2026": 0,
        "v2026": 0,
        "dev2026": 0,
        "cumplimientoPct": 0,
        "crecimientoYoYPct": 0,
        "tasaDevolucionPct": 0
      },
      {
        "mes": 11,
        "nombreMes": "Nov",
        "ppto2026": 480577356,
        "v2025": 536250259,
        "u2026": 0,
        "v2026": 0,
        "dev2026": 0,
        "cumplimientoPct": 0,
        "crecimientoYoYPct": 0,
        "tasaDevolucionPct": 0
      },
      {
        "mes": 12,
        "nombreMes": "Dic",
        "ppto2026": 432288235,
        "v2025": 271314296,
        "u2026": 0,
        "v2026": 0,
        "dev2026": 0,
        "cumplimientoPct": 0,
        "crecimientoYoYPct": 0,
        "tasaDevolucionPct": 0
      }
    ],
    "meses2025": [
      58158978,
      216551295,
      317939658,
      370710523,
      207896162,
      143817840,
      219847127,
      254453739,
      357954913,
      325224468,
      536250259,
      271314296
    ]
  },
  "LINA PLUSS": {
    "nombre": "LINA PLUSS",
    "row": 26,
    "acumulado": {
      "ppto": 0,
      "v2025": 0,
      "v2026": 0,
      "unds": 0,
      "dev": 0,
      "cumplimientoPct": 0,
      "crecimientoYoYPct": 0,
      "tasaDevPct": 0
    },
    "meses": [
      {
        "mes": 1,
        "nombreMes": "Ene",
        "ppto2026": 0,
        "v2025": 0,
        "u2026": 0,
        "v2026": 0,
        "dev2026": 0,
        "cumplimientoPct": 0,
        "crecimientoYoYPct": 0,
        "tasaDevolucionPct": 0
      },
      {
        "mes": 2,
        "nombreMes": "Feb",
        "ppto2026": 0,
        "v2025": 0,
        "u2026": 0,
        "v2026": 0,
        "dev2026": 0,
        "cumplimientoPct": 0,
        "crecimientoYoYPct": 0,
        "tasaDevolucionPct": 0
      },
      {
        "mes": 3,
        "nombreMes": "Mar",
        "ppto2026": 0,
        "v2025": 0,
        "u2026": 0,
        "v2026": 0,
        "dev2026": 0,
        "cumplimientoPct": 0,
        "crecimientoYoYPct": 0,
        "tasaDevolucionPct": 0
      },
      {
        "mes": 4,
        "nombreMes": "Abr",
        "ppto2026": 0,
        "v2025": 0,
        "u2026": 0,
        "v2026": 0,
        "dev2026": 0,
        "cumplimientoPct": 0,
        "crecimientoYoYPct": 0,
        "tasaDevolucionPct": 0
      },
      {
        "mes": 5,
        "nombreMes": "May",
        "ppto2026": 0,
        "v2025": 0,
        "u2026": 0,
        "v2026": 0,
        "dev2026": 0,
        "cumplimientoPct": 0,
        "crecimientoYoYPct": 0,
        "tasaDevolucionPct": 0
      },
      {
        "mes": 6,
        "nombreMes": "Jun",
        "ppto2026": 0,
        "v2025": 0,
        "u2026": 0,
        "v2026": 0,
        "dev2026": 0,
        "cumplimientoPct": 0,
        "crecimientoYoYPct": 0,
        "tasaDevolucionPct": 0
      },
      {
        "mes": 7,
        "nombreMes": "Jul",
        "ppto2026": 0,
        "v2025": 0,
        "u2026": 0,
        "v2026": 0,
        "dev2026": 0,
        "cumplimientoPct": 0,
        "crecimientoYoYPct": 0,
        "tasaDevolucionPct": 0
      },
      {
        "mes": 8,
        "nombreMes": "Ago",
        "ppto2026": 0,
        "v2025": 0,
        "u2026": 0,
        "v2026": 0,
        "dev2026": 0,
        "cumplimientoPct": 0,
        "crecimientoYoYPct": 0,
        "tasaDevolucionPct": 0
      },
      {
        "mes": 9,
        "nombreMes": "Sep",
        "ppto2026": 0,
        "v2025": 0,
        "u2026": 0,
        "v2026": 0,
        "dev2026": 0,
        "cumplimientoPct": 0,
        "crecimientoYoYPct": 0,
        "tasaDevolucionPct": 0
      },
      {
        "mes": 10,
        "nombreMes": "Oct",
        "ppto2026": 0,
        "v2025": 0,
        "u2026": 0,
        "v2026": 0,
        "dev2026": 0,
        "cumplimientoPct": 0,
        "crecimientoYoYPct": 0,
        "tasaDevolucionPct": 0
      },
      {
        "mes": 11,
        "nombreMes": "Nov",
        "ppto2026": 0,
        "v2025": 0,
        "u2026": 0,
        "v2026": 0,
        "dev2026": 0,
        "cumplimientoPct": 0,
        "crecimientoYoYPct": 0,
        "tasaDevolucionPct": 0
      },
      {
        "mes": 12,
        "nombreMes": "Dic",
        "ppto2026": 0,
        "v2025": 0,
        "u2026": 0,
        "v2026": 0,
        "dev2026": 0,
        "cumplimientoPct": 0,
        "crecimientoYoYPct": 0,
        "tasaDevolucionPct": 0
      }
    ],
    "meses2025": [
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0
    ]
  },
  "LUIS VILLA": {
    "nombre": "Luis Villa",
    "row": 27,
    "acumulado": {
      "ppto": 936345764,
      "v2025": 907071924,
      "v2026": 1063514803,
      "unds": 12776,
      "dev": -205712769,
      "cumplimientoPct": 113.6,
      "crecimientoYoYPct": 17.2,
      "tasaDevPct": 16.2
    },
    "meses": [
      {
        "mes": 1,
        "nombreMes": "Ene",
        "ppto2026": 37876512,
        "v2025": 38585025,
        "u2026": 1372,
        "v2026": 105453816,
        "dev2026": -13500064,
        "cumplimientoPct": 278.4,
        "crecimientoYoYPct": 173.3,
        "tasaDevolucionPct": 11.3
      },
      {
        "mes": 2,
        "nombreMes": "Feb",
        "ppto2026": 129320880,
        "v2025": 147165065,
        "u2026": 1508,
        "v2026": 127342136,
        "dev2026": -4832463,
        "cumplimientoPct": 98.5,
        "crecimientoYoYPct": -13.5,
        "tasaDevolucionPct": 3.7
      },
      {
        "mes": 3,
        "nombreMes": "Mar",
        "ppto2026": 159499871,
        "v2025": 230378577,
        "u2026": 2158,
        "v2026": 173388330,
        "dev2026": -9383188,
        "cumplimientoPct": 108.7,
        "crecimientoYoYPct": -24.7,
        "tasaDevolucionPct": 5.1
      },
      {
        "mes": 4,
        "nombreMes": "Abr",
        "ppto2026": 188915364,
        "v2025": 210298273,
        "u2026": 2598,
        "v2026": 221538067,
        "dev2026": -5593248,
        "cumplimientoPct": 117.3,
        "crecimientoYoYPct": 5.3,
        "tasaDevolucionPct": 2.5
      },
      {
        "mes": 5,
        "nombreMes": "May",
        "ppto2026": 156608222,
        "v2025": 114992368,
        "u2026": 1378,
        "v2026": 122450985,
        "dev2026": -21998571,
        "cumplimientoPct": 78.2,
        "crecimientoYoYPct": 6.5,
        "tasaDevolucionPct": 15.2
      },
      {
        "mes": 6,
        "nombreMes": "Jun",
        "ppto2026": 131370052,
        "v2025": 65741032,
        "u2026": 2607,
        "v2026": 211417282,
        "dev2026": -144290778,
        "cumplimientoPct": 160.9,
        "crecimientoYoYPct": 221.6,
        "tasaDevolucionPct": 40.6
      },
      {
        "mes": 7,
        "nombreMes": "Jul",
        "ppto2026": 132754863,
        "v2025": 99911584,
        "u2026": 1155,
        "v2026": 101924187,
        "dev2026": -6114457,
        "cumplimientoPct": 76.8,
        "crecimientoYoYPct": 2,
        "tasaDevolucionPct": 5.7
      },
      {
        "mes": 8,
        "nombreMes": "Ago",
        "ppto2026": 178910278,
        "v2025": 157729009,
        "u2026": 1021,
        "v2026": 93799500,
        "dev2026": -449500,
        "cumplimientoPct": 52.4,
        "crecimientoYoYPct": -40.5,
        "tasaDevolucionPct": 0.5
      },
      {
        "mes": 9,
        "nombreMes": "Sep",
        "ppto2026": 181247718,
        "v2025": 208635995,
        "u2026": 0,
        "v2026": 0,
        "dev2026": 0,
        "cumplimientoPct": 0,
        "crecimientoYoYPct": 0,
        "tasaDevolucionPct": 0
      },
      {
        "mes": 10,
        "nombreMes": "Oct",
        "ppto2026": 214812570,
        "v2025": 151677003,
        "u2026": 0,
        "v2026": 0,
        "dev2026": 0,
        "cumplimientoPct": 0,
        "crecimientoYoYPct": 0,
        "tasaDevolucionPct": 0
      },
      {
        "mes": 11,
        "nombreMes": "Nov",
        "ppto2026": 289619466,
        "v2025": 320506383,
        "u2026": 0,
        "v2026": 0,
        "dev2026": 0,
        "cumplimientoPct": 0,
        "crecimientoYoYPct": 0,
        "tasaDevolucionPct": 0
      },
      {
        "mes": 12,
        "nombreMes": "Dic",
        "ppto2026": 260518076,
        "v2025": 223478440,
        "u2026": 0,
        "v2026": 0,
        "dev2026": 0,
        "cumplimientoPct": 0,
        "crecimientoYoYPct": 0,
        "tasaDevolucionPct": 0
      }
    ],
    "meses2025": [
      38585025,
      147165065,
      230378577,
      210298273,
      114992368,
      65741032,
      99911584,
      157729009,
      208635995,
      151677003,
      320506383,
      223478440
    ]
  },
  "JOHN FREDY MEDELLIN": {
    "nombre": "JOHN FREDY MEDELLIN",
    "row": 28,
    "acumulado": {
      "ppto": 298395903,
      "v2025": 269273593,
      "v2026": 245455522,
      "unds": 3109,
      "dev": -11886110,
      "cumplimientoPct": 82.3,
      "crecimientoYoYPct": -8.8,
      "tasaDevPct": 4.6
    },
    "meses": [
      {
        "mes": 1,
        "nombreMes": "Ene",
        "ppto2026": 12070537,
        "v2025": 6286452,
        "u2026": -12,
        "v2026": -948800,
        "dev2026": -2841600,
        "cumplimientoPct": -7.9,
        "crecimientoYoYPct": -115.1,
        "tasaDevolucionPct": 150.1
      },
      {
        "mes": 2,
        "nombreMes": "Feb",
        "ppto2026": 41212149,
        "v2025": 53551743,
        "u2026": 93,
        "v2026": 7669281,
        "dev2026": -165800,
        "cumplimientoPct": 18.6,
        "crecimientoYoYPct": -85.7,
        "tasaDevolucionPct": 2.1
      },
      {
        "mes": 3,
        "nombreMes": "Mar",
        "ppto2026": 50829629,
        "v2025": 54323658,
        "u2026": 323,
        "v2026": 27247425,
        "dev2026": -569300,
        "cumplimientoPct": 53.6,
        "crecimientoYoYPct": -49.8,
        "tasaDevolucionPct": 2
      },
      {
        "mes": 4,
        "nombreMes": "Abr",
        "ppto2026": 60203797,
        "v2025": 29306844,
        "u2026": 283,
        "v2026": 22078292,
        "dev2026": -552724,
        "cumplimientoPct": 36.7,
        "crecimientoYoYPct": -24.7,
        "tasaDevolucionPct": 2.4
      },
      {
        "mes": 5,
        "nombreMes": "May",
        "ppto2026": 49908115,
        "v2025": 64682684,
        "u2026": 1459,
        "v2026": 114617842,
        "dev2026": -1754904,
        "cumplimientoPct": 229.7,
        "crecimientoYoYPct": 77.2,
        "tasaDevolucionPct": 1.5
      },
      {
        "mes": 6,
        "nombreMes": "Jun",
        "ppto2026": 41865181,
        "v2025": 40489038,
        "u2026": 791,
        "v2026": 61195768,
        "dev2026": -3839300,
        "cumplimientoPct": 146.2,
        "crecimientoYoYPct": 51.1,
        "tasaDevolucionPct": 5.9
      },
      {
        "mes": 7,
        "nombreMes": "Jul",
        "ppto2026": 42306495,
        "v2025": 20633174,
        "u2026": 172,
        "v2026": 13595714,
        "dev2026": -2162482,
        "cumplimientoPct": 32.1,
        "crecimientoYoYPct": -34.1,
        "tasaDevolucionPct": 13.7
      },
      {
        "mes": 8,
        "nombreMes": "Ago",
        "ppto2026": 57015363,
        "v2025": 40154206,
        "u2026": 124,
        "v2026": 10233728,
        "dev2026": -72900,
        "cumplimientoPct": 17.9,
        "crecimientoYoYPct": -74.5,
        "tasaDevolucionPct": 0.7
      },
      {
        "mes": 9,
        "nombreMes": "Sep",
        "ppto2026": 57760262,
        "v2025": 38636974,
        "u2026": 0,
        "v2026": 0,
        "dev2026": 0,
        "cumplimientoPct": 0,
        "crecimientoYoYPct": 0,
        "tasaDevolucionPct": 0
      },
      {
        "mes": 10,
        "nombreMes": "Oct",
        "ppto2026": 68456753,
        "v2025": 50158744,
        "u2026": 0,
        "v2026": 0,
        "dev2026": 0,
        "cumplimientoPct": 0,
        "crecimientoYoYPct": 0,
        "tasaDevolucionPct": 0
      },
      {
        "mes": 11,
        "nombreMes": "Nov",
        "ppto2026": 92296313,
        "v2025": 67958460,
        "u2026": 0,
        "v2026": 0,
        "dev2026": 0,
        "cumplimientoPct": 0,
        "crecimientoYoYPct": 0,
        "tasaDevolucionPct": 0
      },
      {
        "mes": 12,
        "nombreMes": "Dic",
        "ppto2026": 83022244,
        "v2025": 90790493,
        "u2026": 0,
        "v2026": 0,
        "dev2026": 0,
        "cumplimientoPct": 0,
        "crecimientoYoYPct": 0,
        "tasaDevolucionPct": 0
      }
    ],
    "meses2025": [
      6286452,
      53551743,
      54323658,
      29306844,
      64682684,
      40489038,
      20633174,
      40154206,
      38636974,
      50158744,
      67958460,
      90790493
    ]
  },
  "JOHN FREDY CORRERIA": {
    "nombre": "JOHN FREDY CORRERIA",
    "row": 29,
    "acumulado": {
      "ppto": 457883369,
      "v2025": 369456020,
      "v2026": 335413536,
      "unds": 4227,
      "dev": -68688657,
      "cumplimientoPct": 73.3,
      "crecimientoYoYPct": -9.2,
      "tasaDevPct": 17
    },
    "meses": [
      {
        "mes": 1,
        "nombreMes": "Ene",
        "ppto2026": 18522031,
        "v2025": 8493700,
        "u2026": 52,
        "v2026": 3267612,
        "dev2026": -6062700,
        "cumplimientoPct": 17.6,
        "crecimientoYoYPct": -61.5,
        "tasaDevolucionPct": 65
      },
      {
        "mes": 2,
        "nombreMes": "Feb",
        "ppto2026": 63239331,
        "v2025": 33232600,
        "u2026": 617,
        "v2026": 50942016,
        "dev2026": -573300,
        "cumplimientoPct": 80.6,
        "crecimientoYoYPct": 53.3,
        "tasaDevolucionPct": 1.1
      },
      {
        "mes": 3,
        "nombreMes": "Mar",
        "ppto2026": 77997190,
        "v2025": 24443484,
        "u2026": 611,
        "v2026": 48825200,
        "dev2026": -2146540,
        "cumplimientoPct": 62.6,
        "crecimientoYoYPct": 99.7,
        "tasaDevolucionPct": 4.2
      },
      {
        "mes": 4,
        "nombreMes": "Abr",
        "ppto2026": 92381689,
        "v2025": 61905168,
        "u2026": 703,
        "v2026": 56362356,
        "dev2026": -3152400,
        "cumplimientoPct": 61,
        "crecimientoYoYPct": -9,
        "tasaDevolucionPct": 5.3
      },
      {
        "mes": 5,
        "nombreMes": "May",
        "ppto2026": 76583142,
        "v2025": 119543036,
        "u2026": 1498,
        "v2026": 124881661,
        "dev2026": -5493200,
        "cumplimientoPct": 163.1,
        "crecimientoYoYPct": 4.5,
        "tasaDevolucionPct": 4.2
      },
      {
        "mes": 6,
        "nombreMes": "Jun",
        "ppto2026": 64241399,
        "v2025": 86949782,
        "u2026": 584,
        "v2026": 37796095,
        "dev2026": -50568417,
        "cumplimientoPct": 58.8,
        "crecimientoYoYPct": -56.5,
        "tasaDevolucionPct": 57.2
      },
      {
        "mes": 7,
        "nombreMes": "Jul",
        "ppto2026": 64918587,
        "v2025": 34888250,
        "u2026": 162,
        "v2026": 13338596,
        "dev2026": -692100,
        "cumplimientoPct": 20.5,
        "crecimientoYoYPct": -61.8,
        "tasaDevolucionPct": 4.9
      },
      {
        "mes": 8,
        "nombreMes": "Ago",
        "ppto2026": 87489092,
        "v2025": 133206228,
        "u2026": 273,
        "v2026": 23471956,
        "dev2026": -2854700,
        "cumplimientoPct": 26.8,
        "crecimientoYoYPct": -82.4,
        "tasaDevolucionPct": 10.8
      },
      {
        "mes": 9,
        "nombreMes": "Sep",
        "ppto2026": 88632126,
        "v2025": 69486176,
        "u2026": 0,
        "v2026": 0,
        "dev2026": 0,
        "cumplimientoPct": 0,
        "crecimientoYoYPct": 0,
        "tasaDevolucionPct": 0
      },
      {
        "mes": 10,
        "nombreMes": "Oct",
        "ppto2026": 105045707,
        "v2025": 69298216,
        "u2026": 0,
        "v2026": 0,
        "dev2026": 0,
        "cumplimientoPct": 0,
        "crecimientoYoYPct": 0,
        "tasaDevolucionPct": 0
      },
      {
        "mes": 11,
        "nombreMes": "Nov",
        "ppto2026": 141627102,
        "v2025": 225323010,
        "u2026": 0,
        "v2026": 0,
        "dev2026": 0,
        "cumplimientoPct": 0,
        "crecimientoYoYPct": 0,
        "tasaDevolucionPct": 0
      },
      {
        "mes": 12,
        "nombreMes": "Dic",
        "ppto2026": 127396202,
        "v2025": 97778500,
        "u2026": 0,
        "v2026": 0,
        "dev2026": 0,
        "cumplimientoPct": 0,
        "crecimientoYoYPct": 0,
        "tasaDevolucionPct": 0
      }
    ],
    "meses2025": [
      8493700,
      33232600,
      24443484,
      61905168,
      119543036,
      86949782,
      34888250,
      133206228,
      69486176,
      69298216,
      225323010,
      97778500
    ]
  },
  "TRUCCO'S EXPORTACION": {
    "nombre": "TRUCCO'S EXPORTACION",
    "row": 30,
    "acumulado": {
      "ppto": 613936981,
      "v2025": 380471926,
      "v2026": 205924630,
      "unds": 2533,
      "dev": -48225663,
      "cumplimientoPct": 33.5,
      "crecimientoYoYPct": -45.9,
      "tasaDevPct": 19
    },
    "meses": [
      {
        "mes": 1,
        "nombreMes": "Ene",
        "ppto2026": 9835186,
        "v2025": 6196682,
        "u2026": 25,
        "v2026": 1754500,
        "dev2026": -7854825,
        "cumplimientoPct": 17.8,
        "crecimientoYoYPct": -71.7,
        "tasaDevolucionPct": 81.7
      },
      {
        "mes": 2,
        "nombreMes": "Feb",
        "ppto2026": 137854567,
        "v2025": 86851735,
        "u2026": 273,
        "v2026": 20630887,
        "dev2026": -9415544,
        "cumplimientoPct": 15,
        "crecimientoYoYPct": -76.2,
        "tasaDevolucionPct": 31.3
      },
      {
        "mes": 3,
        "nombreMes": "Mar",
        "ppto2026": 163903760,
        "v2025": 96931263,
        "u2026": 807,
        "v2026": 45445285,
        "dev2026": -661803,
        "cumplimientoPct": 27.7,
        "crecimientoYoYPct": -53.1,
        "tasaDevolucionPct": 1.4
      },
      {
        "mes": 4,
        "nombreMes": "Abr",
        "ppto2026": 149275271,
        "v2025": 94051256,
        "u2026": 118,
        "v2026": 27412789,
        "dev2026": -3084765,
        "cumplimientoPct": 18.4,
        "crecimientoYoYPct": -70.9,
        "tasaDevolucionPct": 10.1
      },
      {
        "mes": 5,
        "nombreMes": "May",
        "ppto2026": 41695195,
        "v2025": 26270150,
        "u2026": 175,
        "v2026": 10446208,
        "dev2026": -9119243,
        "cumplimientoPct": 25.1,
        "crecimientoYoYPct": -60.2,
        "tasaDevolucionPct": 46.6
      },
      {
        "mes": 6,
        "nombreMes": "Jun",
        "ppto2026": 42993250,
        "v2025": 27088003,
        "u2026": 846,
        "v2026": 72251844,
        "dev2026": 0,
        "cumplimientoPct": 168.1,
        "crecimientoYoYPct": 166.7,
        "tasaDevolucionPct": 0
      },
      {
        "mes": 7,
        "nombreMes": "Jul",
        "ppto2026": 68379752,
        "v2025": 43082837,
        "u2026": 289,
        "v2026": 27983117,
        "dev2026": -18089483,
        "cumplimientoPct": 40.9,
        "crecimientoYoYPct": -35,
        "tasaDevolucionPct": 39.3
      },
      {
        "mes": 8,
        "nombreMes": "Ago",
        "ppto2026": 34165332,
        "v2025": 21525949,
        "u2026": 54,
        "v2026": 5347600,
        "dev2026": 0,
        "cumplimientoPct": 15.7,
        "crecimientoYoYPct": -75.2,
        "tasaDevolucionPct": 0
      },
      {
        "mes": 9,
        "nombreMes": "Sep",
        "ppto2026": 212543126,
        "v2025": 133913335,
        "u2026": 0,
        "v2026": 0,
        "dev2026": 0,
        "cumplimientoPct": 0,
        "crecimientoYoYPct": 0,
        "tasaDevolucionPct": 0
      },
      {
        "mes": 10,
        "nombreMes": "Oct",
        "ppto2026": 174195473,
        "v2025": 109740247,
        "u2026": 0,
        "v2026": 0,
        "dev2026": 0,
        "cumplimientoPct": 0,
        "crecimientoYoYPct": 0,
        "tasaDevolucionPct": 0
      },
      {
        "mes": 11,
        "nombreMes": "Nov",
        "ppto2026": 72437471,
        "v2025": 45636310,
        "u2026": 0,
        "v2026": 0,
        "dev2026": 0,
        "cumplimientoPct": 0,
        "crecimientoYoYPct": 0,
        "tasaDevolucionPct": 0
      },
      {
        "mes": 12,
        "nombreMes": "Dic",
        "ppto2026": 25388580,
        "v2025": 15996124,
        "u2026": 0,
        "v2026": 0,
        "dev2026": 0,
        "cumplimientoPct": 0,
        "crecimientoYoYPct": 0,
        "tasaDevolucionPct": 0
      }
    ],
    "meses2025": [
      6196682,
      86851735,
      96931263,
      94051256,
      26270150,
      27088003,
      43082837,
      21525949,
      133913335,
      109740247,
      45636310,
      15996124
    ]
  },
  "OLGA ZULUAGA": {
    "nombre": "Olga Zuluaga",
    "row": 31,
    "acumulado": {
      "ppto": 0,
      "v2025": 0,
      "v2026": -296700,
      "unds": -3,
      "dev": -2436200,
      "cumplimientoPct": 0,
      "crecimientoYoYPct": 0,
      "tasaDevPct": 113.9
    },
    "meses": [
      {
        "mes": 1,
        "nombreMes": "Ene",
        "ppto2026": 0,
        "v2025": 0,
        "u2026": -3,
        "v2026": -296700,
        "dev2026": -296700,
        "cumplimientoPct": 0,
        "crecimientoYoYPct": 0,
        "tasaDevolucionPct": 0
      },
      {
        "mes": 2,
        "nombreMes": "Feb",
        "ppto2026": 0,
        "v2025": 0,
        "u2026": 0,
        "v2026": 0,
        "dev2026": 0,
        "cumplimientoPct": 0,
        "crecimientoYoYPct": 0,
        "tasaDevolucionPct": 0
      },
      {
        "mes": 3,
        "nombreMes": "Mar",
        "ppto2026": 0,
        "v2025": 0,
        "u2026": 0,
        "v2026": 0,
        "dev2026": -2139500,
        "cumplimientoPct": 0,
        "crecimientoYoYPct": 0,
        "tasaDevolucionPct": 100
      },
      {
        "mes": 4,
        "nombreMes": "Abr",
        "ppto2026": 0,
        "v2025": 0,
        "u2026": 0,
        "v2026": 0,
        "dev2026": 0,
        "cumplimientoPct": 0,
        "crecimientoYoYPct": 0,
        "tasaDevolucionPct": 0
      },
      {
        "mes": 5,
        "nombreMes": "May",
        "ppto2026": 0,
        "v2025": 0,
        "u2026": 0,
        "v2026": 0,
        "dev2026": 0,
        "cumplimientoPct": 0,
        "crecimientoYoYPct": 0,
        "tasaDevolucionPct": 0
      },
      {
        "mes": 6,
        "nombreMes": "Jun",
        "ppto2026": 0,
        "v2025": 0,
        "u2026": 0,
        "v2026": 0,
        "dev2026": 0,
        "cumplimientoPct": 0,
        "crecimientoYoYPct": 0,
        "tasaDevolucionPct": 0
      },
      {
        "mes": 7,
        "nombreMes": "Jul",
        "ppto2026": 0,
        "v2025": 0,
        "u2026": 0,
        "v2026": 0,
        "dev2026": 0,
        "cumplimientoPct": 0,
        "crecimientoYoYPct": 0,
        "tasaDevolucionPct": 0
      },
      {
        "mes": 8,
        "nombreMes": "Ago",
        "ppto2026": 0,
        "v2025": 0,
        "u2026": 0,
        "v2026": 0,
        "dev2026": 0,
        "cumplimientoPct": 0,
        "crecimientoYoYPct": 0,
        "tasaDevolucionPct": 0
      },
      {
        "mes": 9,
        "nombreMes": "Sep",
        "ppto2026": 0,
        "v2025": 0,
        "u2026": 0,
        "v2026": 0,
        "dev2026": 0,
        "cumplimientoPct": 0,
        "crecimientoYoYPct": 0,
        "tasaDevolucionPct": 0
      },
      {
        "mes": 10,
        "nombreMes": "Oct",
        "ppto2026": 0,
        "v2025": 0,
        "u2026": 0,
        "v2026": 0,
        "dev2026": 0,
        "cumplimientoPct": 0,
        "crecimientoYoYPct": 0,
        "tasaDevolucionPct": 0
      },
      {
        "mes": 11,
        "nombreMes": "Nov",
        "ppto2026": 0,
        "v2025": 0,
        "u2026": 0,
        "v2026": 0,
        "dev2026": 0,
        "cumplimientoPct": 0,
        "crecimientoYoYPct": 0,
        "tasaDevolucionPct": 0
      },
      {
        "mes": 12,
        "nombreMes": "Dic",
        "ppto2026": 0,
        "v2025": 0,
        "u2026": 0,
        "v2026": 0,
        "dev2026": 0,
        "cumplimientoPct": 0,
        "crecimientoYoYPct": 0,
        "tasaDevolucionPct": 0
      }
    ],
    "meses2025": [
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0
    ]
  },
  "LEADS MAYORISTAS": {
    "nombre": "LEADS MAYORISTAS",
    "row": 32,
    "acumulado": {
      "ppto": 41158056,
      "v2025": 36006700,
      "v2026": 19783518,
      "unds": 219,
      "dev": -2588000,
      "cumplimientoPct": 48.1,
      "crecimientoYoYPct": -45.1,
      "tasaDevPct": 11.6
    },
    "meses": [
      {
        "mes": 1,
        "nombreMes": "Ene",
        "ppto2026": 1664902,
        "v2025": 9164000,
        "u2026": 27,
        "v2026": 3042300,
        "dev2026": 0,
        "cumplimientoPct": 182.7,
        "crecimientoYoYPct": -66.8,
        "tasaDevolucionPct": 0
      },
      {
        "mes": 2,
        "nombreMes": "Feb",
        "ppto2026": 5684434,
        "v2025": 1977600,
        "u2026": 50,
        "v2026": 4939000,
        "dev2026": 0,
        "cumplimientoPct": 86.9,
        "crecimientoYoYPct": 149.7,
        "tasaDevolucionPct": 0
      },
      {
        "mes": 3,
        "nombreMes": "Mar",
        "ppto2026": 7010983,
        "v2025": 6179200,
        "u2026": 45,
        "v2026": 3989918,
        "dev2026": 0,
        "cumplimientoPct": 56.9,
        "crecimientoYoYPct": -35.4,
        "tasaDevolucionPct": 0
      },
      {
        "mes": 4,
        "nombreMes": "Abr",
        "ppto2026": 8303972,
        "v2025": 4374000,
        "u2026": 58,
        "v2026": 4902200,
        "dev2026": -2588000,
        "cumplimientoPct": 59,
        "crecimientoYoYPct": 12.1,
        "tasaDevolucionPct": 34.6
      },
      {
        "mes": 5,
        "nombreMes": "May",
        "ppto2026": 6883878,
        "v2025": 5822700,
        "u2026": 0,
        "v2026": 0,
        "dev2026": 0,
        "cumplimientoPct": 0,
        "crecimientoYoYPct": -100,
        "tasaDevolucionPct": 0
      },
      {
        "mes": 6,
        "nombreMes": "Jun",
        "ppto2026": 5774508,
        "v2025": 4049200,
        "u2026": 0,
        "v2026": 0,
        "dev2026": 0,
        "cumplimientoPct": 0,
        "crecimientoYoYPct": -100,
        "tasaDevolucionPct": 0
      },
      {
        "mes": 7,
        "nombreMes": "Jul",
        "ppto2026": 5835379,
        "v2025": 4440000,
        "u2026": 39,
        "v2026": 2910100,
        "dev2026": 0,
        "cumplimientoPct": 49.9,
        "crecimientoYoYPct": -34.5,
        "tasaDevolucionPct": 0
      },
      {
        "mes": 8,
        "nombreMes": "Ago",
        "ppto2026": 7864188,
        "v2025": 8407500,
        "u2026": 0,
        "v2026": 0,
        "dev2026": 0,
        "cumplimientoPct": 0,
        "crecimientoYoYPct": -100,
        "tasaDevolucionPct": 0
      },
      {
        "mes": 9,
        "nombreMes": "Sep",
        "ppto2026": 7966933,
        "v2025": 3408900,
        "u2026": 0,
        "v2026": 0,
        "dev2026": 0,
        "cumplimientoPct": 0,
        "crecimientoYoYPct": 0,
        "tasaDevolucionPct": 0
      },
      {
        "mes": 10,
        "nombreMes": "Oct",
        "ppto2026": 9442311,
        "v2025": 6671300,
        "u2026": 0,
        "v2026": 0,
        "dev2026": 0,
        "cumplimientoPct": 0,
        "crecimientoYoYPct": 0,
        "tasaDevolucionPct": 0
      },
      {
        "mes": 11,
        "nombreMes": "Nov",
        "ppto2026": 12730526,
        "v2025": 5916900,
        "u2026": 0,
        "v2026": 0,
        "dev2026": 0,
        "cumplimientoPct": 0,
        "crecimientoYoYPct": 0,
        "tasaDevolucionPct": 0
      },
      {
        "mes": 12,
        "nombreMes": "Dic",
        "ppto2026": 11451344,
        "v2025": 1568700,
        "u2026": 0,
        "v2026": 0,
        "dev2026": 0,
        "cumplimientoPct": 0,
        "crecimientoYoYPct": 0,
        "tasaDevolucionPct": 0
      }
    ],
    "meses2025": [
      9164000,
      1977600,
      6179200,
      4374000,
      5822700,
      4049200,
      4440000,
      8407500,
      3408900,
      6671300,
      5916900,
      1568700
    ]
  },
  "TIENDA VIRTUAL": {
    "nombre": "TIENDA VIRTUAL",
    "row": 33,
    "acumulado": {
      "ppto": 510231588,
      "v2025": 389663367,
      "v2026": 477083125,
      "unds": 3644,
      "dev": -51665869,
      "cumplimientoPct": 93.5,
      "crecimientoYoYPct": 22.4,
      "tasaDevPct": 9.8
    },
    "meses": [
      {
        "mes": 1,
        "nombreMes": "Ene",
        "ppto2026": 68079416,
        "v2025": 49731762,
        "u2026": 651,
        "v2026": 77057640,
        "dev2026": -9804046,
        "cumplimientoPct": 113.2,
        "crecimientoYoYPct": 54.9,
        "tasaDevolucionPct": 11.3
      },
      {
        "mes": 2,
        "nombreMes": "Feb",
        "ppto2026": 75258990,
        "v2025": 56537387,
        "u2026": 380,
        "v2026": 51844232,
        "dev2026": -8785847,
        "cumplimientoPct": 68.9,
        "crecimientoYoYPct": -8.3,
        "tasaDevolucionPct": 14.5
      },
      {
        "mes": 3,
        "nombreMes": "Mar",
        "ppto2026": 66430018,
        "v2025": 49599118,
        "u2026": 593,
        "v2026": 80652060,
        "dev2026": -7051391,
        "cumplimientoPct": 121.4,
        "crecimientoYoYPct": 62.6,
        "tasaDevolucionPct": 8
      },
      {
        "mes": 4,
        "nombreMes": "Abr",
        "ppto2026": 54651452,
        "v2025": 38237945,
        "u2026": 434,
        "v2026": 61374449,
        "dev2026": -6019168,
        "cumplimientoPct": 112.3,
        "crecimientoYoYPct": 60.5,
        "tasaDevolucionPct": 8.9
      },
      {
        "mes": 5,
        "nombreMes": "May",
        "ppto2026": 65733702,
        "v2025": 50427198,
        "u2026": 508,
        "v2026": 67481980,
        "dev2026": -6569962,
        "cumplimientoPct": 102.7,
        "crecimientoYoYPct": 33.8,
        "tasaDevolucionPct": 8.9
      },
      {
        "mes": 6,
        "nombreMes": "Jun",
        "ppto2026": 79379768,
        "v2025": 62523656,
        "u2026": 545,
        "v2026": 67701223,
        "dev2026": -4270774,
        "cumplimientoPct": 85.3,
        "crecimientoYoYPct": 8.3,
        "tasaDevolucionPct": 5.9
      },
      {
        "mes": 7,
        "nombreMes": "Jul",
        "ppto2026": 100698242,
        "v2025": 82606301,
        "u2026": 533,
        "v2026": 70971541,
        "dev2026": -9164681,
        "cumplimientoPct": 70.5,
        "crecimientoYoYPct": -14.1,
        "tasaDevolucionPct": 11.4
      },
      {
        "mes": 8,
        "nombreMes": "Ago",
        "ppto2026": 85311842,
        "v2025": 64650550,
        "u2026": 150,
        "v2026": 21970652,
        "dev2026": -442445,
        "cumplimientoPct": 25.8,
        "crecimientoYoYPct": -66,
        "tasaDevolucionPct": 2
      },
      {
        "mes": 9,
        "nombreMes": "Sep",
        "ppto2026": 78841512,
        "v2025": 60268229,
        "u2026": 0,
        "v2026": 0,
        "dev2026": 0,
        "cumplimientoPct": 0,
        "crecimientoYoYPct": 0,
        "tasaDevolucionPct": 0
      },
      {
        "mes": 10,
        "nombreMes": "Oct",
        "ppto2026": 87241658,
        "v2025": 70674661,
        "u2026": 0,
        "v2026": 0,
        "dev2026": 0,
        "cumplimientoPct": 0,
        "crecimientoYoYPct": 0,
        "tasaDevolucionPct": 0
      },
      {
        "mes": 11,
        "nombreMes": "Nov",
        "ppto2026": 68669569,
        "v2025": 57764738,
        "u2026": 0,
        "v2026": 0,
        "dev2026": 0,
        "cumplimientoPct": 0,
        "crecimientoYoYPct": 0,
        "tasaDevolucionPct": 0
      },
      {
        "mes": 12,
        "nombreMes": "Dic",
        "ppto2026": 121144080,
        "v2025": 101602177,
        "u2026": 0,
        "v2026": 0,
        "dev2026": 0,
        "cumplimientoPct": 0,
        "crecimientoYoYPct": 0,
        "tasaDevolucionPct": 0
      }
    ],
    "meses2025": [
      49731762,
      56537387,
      49599118,
      38237945,
      50427198,
      62523656,
      82606301,
      64650550,
      60268229,
      70674661,
      57764738,
      101602177
    ]
  },
  "REDES SOCIALES": {
    "nombre": "REDES SOCIALES",
    "row": 34,
    "acumulado": {
      "ppto": 121483712,
      "v2025": 95933880,
      "v2026": 120985623,
      "unds": 879,
      "dev": -12887764,
      "cumplimientoPct": 99.6,
      "crecimientoYoYPct": 26.1,
      "tasaDevPct": 9.6
    },
    "meses": [
      {
        "mes": 1,
        "nombreMes": "Ene",
        "ppto2026": 16209385,
        "v2025": 15030547,
        "u2026": 118,
        "v2026": 15381021,
        "dev2026": -1679042,
        "cumplimientoPct": 94.9,
        "crecimientoYoYPct": 2.3,
        "tasaDevolucionPct": 9.8
      },
      {
        "mes": 2,
        "nombreMes": "Feb",
        "ppto2026": 17918807,
        "v2025": 15054714,
        "u2026": 125,
        "v2026": 18011706,
        "dev2026": -2270462,
        "cumplimientoPct": 100.5,
        "crecimientoYoYPct": 19.6,
        "tasaDevolucionPct": 11.2
      },
      {
        "mes": 3,
        "nombreMes": "Mar",
        "ppto2026": 15816671,
        "v2025": 13594181,
        "u2026": 132,
        "v2026": 19298064,
        "dev2026": -1310050,
        "cumplimientoPct": 122,
        "crecimientoYoYPct": 42,
        "tasaDevolucionPct": 6.4
      },
      {
        "mes": 4,
        "nombreMes": "Abr",
        "ppto2026": 13012251,
        "v2025": 13750681,
        "u2026": 115,
        "v2026": 16532904,
        "dev2026": -2489941,
        "cumplimientoPct": 127.1,
        "crecimientoYoYPct": 20.2,
        "tasaDevolucionPct": 13.1
      },
      {
        "mes": 5,
        "nombreMes": "May",
        "ppto2026": 15650881,
        "v2025": 12103723,
        "u2026": 107,
        "v2026": 15741332,
        "dev2026": -2136172,
        "cumplimientoPct": 100.6,
        "crecimientoYoYPct": 30.1,
        "tasaDevolucionPct": 11.9
      },
      {
        "mes": 6,
        "nombreMes": "Jun",
        "ppto2026": 18899945,
        "v2025": 12988420,
        "u2026": 140,
        "v2026": 17553298,
        "dev2026": -792370,
        "cumplimientoPct": 92.9,
        "crecimientoYoYPct": 35.1,
        "tasaDevolucionPct": 4.3
      },
      {
        "mes": 7,
        "nombreMes": "Jul",
        "ppto2026": 23975772,
        "v2025": 13411614,
        "u2026": 142,
        "v2026": 18467298,
        "dev2026": -2209727,
        "cumplimientoPct": 77,
        "crecimientoYoYPct": 37.7,
        "tasaDevolucionPct": 10.7
      },
      {
        "mes": 8,
        "nombreMes": "Ago",
        "ppto2026": 20312343,
        "v2025": 16639886,
        "u2026": 36,
        "v2026": 5089274,
        "dev2026": -160420,
        "cumplimientoPct": 25.1,
        "crecimientoYoYPct": -69.4,
        "tasaDevolucionPct": 3.1
      },
      {
        "mes": 9,
        "nombreMes": "Sep",
        "ppto2026": 18771789,
        "v2025": 14731832,
        "u2026": 0,
        "v2026": 0,
        "dev2026": 0,
        "cumplimientoPct": 0,
        "crecimientoYoYPct": 0,
        "tasaDevolucionPct": 0
      },
      {
        "mes": 10,
        "nombreMes": "Oct",
        "ppto2026": 20771823,
        "v2025": 12316256,
        "u2026": 0,
        "v2026": 0,
        "dev2026": 0,
        "cumplimientoPct": 0,
        "crecimientoYoYPct": 0,
        "tasaDevolucionPct": 0
      },
      {
        "mes": 11,
        "nombreMes": "Nov",
        "ppto2026": 16349897,
        "v2025": 7743491,
        "u2026": 0,
        "v2026": 0,
        "dev2026": 0,
        "cumplimientoPct": 0,
        "crecimientoYoYPct": 0,
        "tasaDevolucionPct": 0
      },
      {
        "mes": 12,
        "nombreMes": "Dic",
        "ppto2026": 28843829,
        "v2025": 13639302,
        "u2026": 0,
        "v2026": 0,
        "dev2026": 0,
        "cumplimientoPct": 0,
        "crecimientoYoYPct": 0,
        "tasaDevolucionPct": 0
      }
    ],
    "meses2025": [
      15030547,
      15054714,
      13594181,
      13750681,
      12103723,
      12988420,
      13411614,
      16639886,
      14731832,
      12316256,
      7743491,
      13639302
    ]
  },
  "SHOWROOM": {
    "nombre": "SHOWROOM",
    "row": 35,
    "acumulado": {
      "ppto": 102895138,
      "v2025": 86604816,
      "v2026": 1992448,
      "unds": 17,
      "dev": -120900,
      "cumplimientoPct": 1.9,
      "crecimientoYoYPct": -97.7,
      "tasaDevPct": 5.7
    },
    "meses": [
      {
        "mes": 1,
        "nombreMes": "Ene",
        "ppto2026": 4162254,
        "v2025": 5704194,
        "u2026": 11,
        "v2026": 1268043,
        "dev2026": 0,
        "cumplimientoPct": 30.5,
        "crecimientoYoYPct": -77.8,
        "tasaDevolucionPct": 0
      },
      {
        "mes": 2,
        "nombreMes": "Feb",
        "ppto2026": 14211086,
        "v2025": 12664429,
        "u2026": 4,
        "v2026": 558605,
        "dev2026": 0,
        "cumplimientoPct": 3.9,
        "crecimientoYoYPct": -95.6,
        "tasaDevolucionPct": 0
      },
      {
        "mes": 3,
        "nombreMes": "Mar",
        "ppto2026": 17527458,
        "v2025": 18240176,
        "u2026": 0,
        "v2026": 0,
        "dev2026": 0,
        "cumplimientoPct": 0,
        "crecimientoYoYPct": -100,
        "tasaDevolucionPct": 0
      },
      {
        "mes": 4,
        "nombreMes": "Abr",
        "ppto2026": 20759930,
        "v2025": 10939634,
        "u2026": 0,
        "v2026": 0,
        "dev2026": 0,
        "cumplimientoPct": 0,
        "crecimientoYoYPct": -100,
        "tasaDevolucionPct": 0
      },
      {
        "mes": 5,
        "nombreMes": "May",
        "ppto2026": 17209695,
        "v2025": 13162393,
        "u2026": 1,
        "v2026": 44900,
        "dev2026": -120900,
        "cumplimientoPct": 0.3,
        "crecimientoYoYPct": -99.7,
        "tasaDevolucionPct": 72.9
      },
      {
        "mes": 6,
        "nombreMes": "Jun",
        "ppto2026": 14436269,
        "v2025": 13032917,
        "u2026": 1,
        "v2026": 120900,
        "dev2026": 0,
        "cumplimientoPct": 0.8,
        "crecimientoYoYPct": -99.1,
        "tasaDevolucionPct": 0
      },
      {
        "mes": 7,
        "nombreMes": "Jul",
        "ppto2026": 14588446,
        "v2025": 12861073,
        "u2026": 0,
        "v2026": 0,
        "dev2026": 0,
        "cumplimientoPct": 0,
        "crecimientoYoYPct": -100,
        "tasaDevolucionPct": 0
      },
      {
        "mes": 8,
        "nombreMes": "Ago",
        "ppto2026": 19660470,
        "v2025": 8619209,
        "u2026": 0,
        "v2026": 0,
        "dev2026": 0,
        "cumplimientoPct": 0,
        "crecimientoYoYPct": -100,
        "tasaDevolucionPct": 0
      },
      {
        "mes": 9,
        "nombreMes": "Sep",
        "ppto2026": 19917332,
        "v2025": 8804065,
        "u2026": 0,
        "v2026": 0,
        "dev2026": 0,
        "cumplimientoPct": 0,
        "crecimientoYoYPct": 0,
        "tasaDevolucionPct": 0
      },
      {
        "mes": 10,
        "nombreMes": "Oct",
        "ppto2026": 23605777,
        "v2025": 13173674,
        "u2026": 0,
        "v2026": 0,
        "dev2026": 0,
        "cumplimientoPct": 0,
        "crecimientoYoYPct": 0,
        "tasaDevolucionPct": 0
      },
      {
        "mes": 11,
        "nombreMes": "Nov",
        "ppto2026": 31826315,
        "v2025": 18667172,
        "u2026": 0,
        "v2026": 0,
        "dev2026": 0,
        "cumplimientoPct": 0,
        "crecimientoYoYPct": 0,
        "tasaDevolucionPct": 0
      },
      {
        "mes": 12,
        "nombreMes": "Dic",
        "ppto2026": 28628360,
        "v2025": 27949404,
        "u2026": 0,
        "v2026": 0,
        "dev2026": 0,
        "cumplimientoPct": 0,
        "crecimientoYoYPct": 0,
        "tasaDevolucionPct": 0
      }
    ],
    "meses2025": [
      5704194,
      12664429,
      18240176,
      10939634,
      13162393,
      13032917,
      12861073,
      8619209,
      8804065,
      13173674,
      18667172,
      27949404
    ]
  },
  "FERIAS": {
    "nombre": "FERIAS",
    "row": 36,
    "acumulado": {
      "ppto": 22200272,
      "v2025": 18145522,
      "v2026": 9773784,
      "unds": 119,
      "dev": -205882,
      "cumplimientoPct": 44,
      "crecimientoYoYPct": -46.1,
      "tasaDevPct": 2.1
    },
    "meses": [
      {
        "mes": 1,
        "nombreMes": "Ene",
        "ppto2026": 0,
        "v2025": -15966,
        "u2026": -4,
        "v2026": -205882,
        "dev2026": -205882,
        "cumplimientoPct": 0,
        "crecimientoYoYPct": 0,
        "tasaDevolucionPct": 0
      },
      {
        "mes": 2,
        "nombreMes": "Feb",
        "ppto2026": 0,
        "v2025": 0,
        "u2026": 0,
        "v2026": 0,
        "dev2026": 0,
        "cumplimientoPct": 0,
        "crecimientoYoYPct": 0,
        "tasaDevolucionPct": 0
      },
      {
        "mes": 3,
        "nombreMes": "Mar",
        "ppto2026": 0,
        "v2025": 0,
        "u2026": 0,
        "v2026": 0,
        "dev2026": 0,
        "cumplimientoPct": 0,
        "crecimientoYoYPct": 0,
        "tasaDevolucionPct": 0
      },
      {
        "mes": 4,
        "nombreMes": "Abr",
        "ppto2026": 0,
        "v2025": 0,
        "u2026": 0,
        "v2026": 0,
        "dev2026": 0,
        "cumplimientoPct": 0,
        "crecimientoYoYPct": 0,
        "tasaDevolucionPct": 0
      },
      {
        "mes": 5,
        "nombreMes": "May",
        "ppto2026": 0,
        "v2025": 0,
        "u2026": 0,
        "v2026": 0,
        "dev2026": 0,
        "cumplimientoPct": 0,
        "crecimientoYoYPct": 0,
        "tasaDevolucionPct": 0
      },
      {
        "mes": 6,
        "nombreMes": "Jun",
        "ppto2026": 0,
        "v2025": 0,
        "u2026": 0,
        "v2026": 0,
        "dev2026": 0,
        "cumplimientoPct": 0,
        "crecimientoYoYPct": 0,
        "tasaDevolucionPct": 0
      },
      {
        "mes": 7,
        "nombreMes": "Jul",
        "ppto2026": 22200272,
        "v2025": 18161488,
        "u2026": 123,
        "v2026": 9979666,
        "dev2026": 0,
        "cumplimientoPct": 45,
        "crecimientoYoYPct": -45.1,
        "tasaDevolucionPct": 0
      },
      {
        "mes": 8,
        "nombreMes": "Ago",
        "ppto2026": 0,
        "v2025": 0,
        "u2026": -1,
        "v2026": -163049,
        "dev2026": -163049,
        "cumplimientoPct": 0,
        "crecimientoYoYPct": 0,
        "tasaDevolucionPct": 0
      },
      {
        "mes": 9,
        "nombreMes": "Sep",
        "ppto2026": 0,
        "v2025": 160420,
        "u2026": 0,
        "v2026": 0,
        "dev2026": 0,
        "cumplimientoPct": 0,
        "crecimientoYoYPct": 0,
        "tasaDevolucionPct": 0
      },
      {
        "mes": 10,
        "nombreMes": "Oct",
        "ppto2026": 0,
        "v2025": 0,
        "u2026": 0,
        "v2026": 0,
        "dev2026": 0,
        "cumplimientoPct": 0,
        "crecimientoYoYPct": 0,
        "tasaDevolucionPct": 0
      },
      {
        "mes": 11,
        "nombreMes": "Nov",
        "ppto2026": 0,
        "v2025": 0,
        "u2026": 0,
        "v2026": 0,
        "dev2026": 0,
        "cumplimientoPct": 0,
        "crecimientoYoYPct": 0,
        "tasaDevolucionPct": 0
      },
      {
        "mes": 12,
        "nombreMes": "Dic",
        "ppto2026": 136373102,
        "v2025": 109790825,
        "u2026": 0,
        "v2026": 0,
        "dev2026": 0,
        "cumplimientoPct": 0,
        "crecimientoYoYPct": 0,
        "tasaDevolucionPct": 0
      }
    ],
    "meses2025": [
      -15966,
      0,
      0,
      0,
      0,
      0,
      18161488,
      0,
      160420,
      0,
      0,
      109790825
    ]
  },
  "TRJUSA WEB": {
    "nombre": "TRJUSA WEB",
    "row": 37,
    "acumulado": {
      "ppto": 22710811,
      "v2025": 225900,
      "v2026": 255707,
      "unds": 3,
      "dev": 0,
      "cumplimientoPct": 1.1,
      "crecimientoYoYPct": 13.2,
      "tasaDevPct": 0
    },
    "meses": [
      {
        "mes": 1,
        "nombreMes": "Ene",
        "ppto2026": 918684,
        "v2025": 0,
        "u2026": 0,
        "v2026": 0,
        "dev2026": 0,
        "cumplimientoPct": 0,
        "crecimientoYoYPct": 0,
        "tasaDevolucionPct": 0
      },
      {
        "mes": 2,
        "nombreMes": "Feb",
        "ppto2026": 3136643,
        "v2025": 0,
        "u2026": 0,
        "v2026": 0,
        "dev2026": 0,
        "cumplimientoPct": 0,
        "crecimientoYoYPct": 0,
        "tasaDevolucionPct": 0
      },
      {
        "mes": 3,
        "nombreMes": "Mar",
        "ppto2026": 3868626,
        "v2025": 0,
        "u2026": 3,
        "v2026": 255707,
        "dev2026": 0,
        "cumplimientoPct": 6.6,
        "crecimientoYoYPct": 0,
        "tasaDevolucionPct": 0
      },
      {
        "mes": 4,
        "nombreMes": "Abr",
        "ppto2026": 4582090,
        "v2025": 0,
        "u2026": 0,
        "v2026": 0,
        "dev2026": 0,
        "cumplimientoPct": 0,
        "crecimientoYoYPct": 0,
        "tasaDevolucionPct": 0
      },
      {
        "mes": 5,
        "nombreMes": "May",
        "ppto2026": 3798490,
        "v2025": 0,
        "u2026": 0,
        "v2026": 0,
        "dev2026": 0,
        "cumplimientoPct": 0,
        "crecimientoYoYPct": 0,
        "tasaDevolucionPct": 0
      },
      {
        "mes": 6,
        "nombreMes": "Jun",
        "ppto2026": 3186345,
        "v2025": 225900,
        "u2026": 0,
        "v2026": 0,
        "dev2026": 0,
        "cumplimientoPct": 0,
        "crecimientoYoYPct": -100,
        "tasaDevolucionPct": 0
      },
      {
        "mes": 7,
        "nombreMes": "Jul",
        "ppto2026": 3219933,
        "v2025": 0,
        "u2026": 0,
        "v2026": 0,
        "dev2026": 0,
        "cumplimientoPct": 0,
        "crecimientoYoYPct": 0,
        "tasaDevolucionPct": 0
      },
      {
        "mes": 8,
        "nombreMes": "Ago",
        "ppto2026": 4339420,
        "v2025": 0,
        "u2026": 1,
        "v2026": 15,
        "dev2026": 0,
        "cumplimientoPct": 0,
        "crecimientoYoYPct": 0,
        "tasaDevolucionPct": 0
      },
      {
        "mes": 9,
        "nombreMes": "Sep",
        "ppto2026": 4396114,
        "v2025": 0,
        "u2026": 0,
        "v2026": 0,
        "dev2026": 0,
        "cumplimientoPct": 0,
        "crecimientoYoYPct": 0,
        "tasaDevolucionPct": 0
      },
      {
        "mes": 10,
        "nombreMes": "Oct",
        "ppto2026": 5210220,
        "v2025": 0,
        "u2026": 0,
        "v2026": 0,
        "dev2026": 0,
        "cumplimientoPct": 0,
        "crecimientoYoYPct": 0,
        "tasaDevolucionPct": 0
      },
      {
        "mes": 11,
        "nombreMes": "Nov",
        "ppto2026": 7024641,
        "v2025": 0,
        "u2026": 0,
        "v2026": 0,
        "dev2026": 0,
        "cumplimientoPct": 0,
        "crecimientoYoYPct": 0,
        "tasaDevolucionPct": 0
      },
      {
        "mes": 12,
        "nombreMes": "Dic",
        "ppto2026": 6318795,
        "v2025": 0,
        "u2026": 0,
        "v2026": 0,
        "dev2026": 0,
        "cumplimientoPct": 0,
        "crecimientoYoYPct": 0,
        "tasaDevolucionPct": 0
      }
    ],
    "meses2025": [
      0,
      0,
      0,
      0,
      0,
      225900,
      0,
      0,
      0,
      0,
      0,
      0
    ]
  },
  "MERCADO LIBRE": {
    "nombre": "MERCADO LIBRE",
    "row": 38,
    "acumulado": {
      "ppto": 0,
      "v2025": 0,
      "v2026": 0,
      "unds": 0,
      "dev": 0,
      "cumplimientoPct": 0,
      "crecimientoYoYPct": 0,
      "tasaDevPct": 0
    },
    "meses": [
      {
        "mes": 1,
        "nombreMes": "Ene",
        "ppto2026": 0,
        "v2025": 0,
        "u2026": 0,
        "v2026": 0,
        "dev2026": 0,
        "cumplimientoPct": 0,
        "crecimientoYoYPct": 0,
        "tasaDevolucionPct": 0
      },
      {
        "mes": 2,
        "nombreMes": "Feb",
        "ppto2026": 0,
        "v2025": 0,
        "u2026": 0,
        "v2026": 0,
        "dev2026": 0,
        "cumplimientoPct": 0,
        "crecimientoYoYPct": 0,
        "tasaDevolucionPct": 0
      },
      {
        "mes": 3,
        "nombreMes": "Mar",
        "ppto2026": 0,
        "v2025": 0,
        "u2026": 0,
        "v2026": 0,
        "dev2026": 0,
        "cumplimientoPct": 0,
        "crecimientoYoYPct": 0,
        "tasaDevolucionPct": 0
      },
      {
        "mes": 4,
        "nombreMes": "Abr",
        "ppto2026": 0,
        "v2025": 0,
        "u2026": 0,
        "v2026": 0,
        "dev2026": 0,
        "cumplimientoPct": 0,
        "crecimientoYoYPct": 0,
        "tasaDevolucionPct": 0
      },
      {
        "mes": 5,
        "nombreMes": "May",
        "ppto2026": 0,
        "v2025": 0,
        "u2026": 0,
        "v2026": 0,
        "dev2026": 0,
        "cumplimientoPct": 0,
        "crecimientoYoYPct": 0,
        "tasaDevolucionPct": 0
      },
      {
        "mes": 6,
        "nombreMes": "Jun",
        "ppto2026": 0,
        "v2025": 0,
        "u2026": 0,
        "v2026": 0,
        "dev2026": 0,
        "cumplimientoPct": 0,
        "crecimientoYoYPct": 0,
        "tasaDevolucionPct": 0
      },
      {
        "mes": 7,
        "nombreMes": "Jul",
        "ppto2026": 0,
        "v2025": 0,
        "u2026": 0,
        "v2026": 0,
        "dev2026": 0,
        "cumplimientoPct": 0,
        "crecimientoYoYPct": 0,
        "tasaDevolucionPct": 0
      },
      {
        "mes": 8,
        "nombreMes": "Ago",
        "ppto2026": 0,
        "v2025": 0,
        "u2026": 0,
        "v2026": 0,
        "dev2026": 0,
        "cumplimientoPct": 0,
        "crecimientoYoYPct": 0,
        "tasaDevolucionPct": 0
      },
      {
        "mes": 9,
        "nombreMes": "Sep",
        "ppto2026": 0,
        "v2025": 0,
        "u2026": 0,
        "v2026": 0,
        "dev2026": 0,
        "cumplimientoPct": 0,
        "crecimientoYoYPct": 0,
        "tasaDevolucionPct": 0
      },
      {
        "mes": 10,
        "nombreMes": "Oct",
        "ppto2026": 0,
        "v2025": 0,
        "u2026": 0,
        "v2026": 0,
        "dev2026": 0,
        "cumplimientoPct": 0,
        "crecimientoYoYPct": 0,
        "tasaDevolucionPct": 0
      },
      {
        "mes": 11,
        "nombreMes": "Nov",
        "ppto2026": 0,
        "v2025": 0,
        "u2026": 0,
        "v2026": 0,
        "dev2026": 0,
        "cumplimientoPct": 0,
        "crecimientoYoYPct": 0,
        "tasaDevolucionPct": 0
      },
      {
        "mes": 12,
        "nombreMes": "Dic",
        "ppto2026": 0,
        "v2025": 0,
        "u2026": 0,
        "v2026": 0,
        "dev2026": 0,
        "cumplimientoPct": 0,
        "crecimientoYoYPct": 0,
        "tasaDevolucionPct": 0
      }
    ],
    "meses2025": [
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0
    ]
  },
  "DAFITI": {
    "nombre": "DAFITI",
    "row": 39,
    "acumulado": {
      "ppto": 0,
      "v2025": 0,
      "v2026": 0,
      "unds": 0,
      "dev": -7163400,
      "cumplimientoPct": 0,
      "crecimientoYoYPct": 0,
      "tasaDevPct": 100
    },
    "meses": [
      {
        "mes": 1,
        "nombreMes": "Ene",
        "ppto2026": 0,
        "v2025": 0,
        "u2026": 0,
        "v2026": 0,
        "dev2026": 0,
        "cumplimientoPct": 0,
        "crecimientoYoYPct": 0,
        "tasaDevolucionPct": 0
      },
      {
        "mes": 2,
        "nombreMes": "Feb",
        "ppto2026": 0,
        "v2025": 0,
        "u2026": 0,
        "v2026": 0,
        "dev2026": 0,
        "cumplimientoPct": 0,
        "crecimientoYoYPct": 0,
        "tasaDevolucionPct": 0
      },
      {
        "mes": 3,
        "nombreMes": "Mar",
        "ppto2026": 0,
        "v2025": 0,
        "u2026": 0,
        "v2026": 0,
        "dev2026": 0,
        "cumplimientoPct": 0,
        "crecimientoYoYPct": 0,
        "tasaDevolucionPct": 0
      },
      {
        "mes": 4,
        "nombreMes": "Abr",
        "ppto2026": 0,
        "v2025": 0,
        "u2026": 0,
        "v2026": 0,
        "dev2026": 0,
        "cumplimientoPct": 0,
        "crecimientoYoYPct": 0,
        "tasaDevolucionPct": 0
      },
      {
        "mes": 5,
        "nombreMes": "May",
        "ppto2026": 0,
        "v2025": 0,
        "u2026": 0,
        "v2026": 0,
        "dev2026": 0,
        "cumplimientoPct": 0,
        "crecimientoYoYPct": 0,
        "tasaDevolucionPct": 0
      },
      {
        "mes": 6,
        "nombreMes": "Jun",
        "ppto2026": 0,
        "v2025": 0,
        "u2026": 0,
        "v2026": 0,
        "dev2026": 0,
        "cumplimientoPct": 0,
        "crecimientoYoYPct": 0,
        "tasaDevolucionPct": 0
      },
      {
        "mes": 7,
        "nombreMes": "Jul",
        "ppto2026": 0,
        "v2025": 0,
        "u2026": 0,
        "v2026": 0,
        "dev2026": -7163400,
        "cumplimientoPct": 0,
        "crecimientoYoYPct": 0,
        "tasaDevolucionPct": 100
      },
      {
        "mes": 8,
        "nombreMes": "Ago",
        "ppto2026": 0,
        "v2025": 0,
        "u2026": 0,
        "v2026": 0,
        "dev2026": 0,
        "cumplimientoPct": 0,
        "crecimientoYoYPct": 0,
        "tasaDevolucionPct": 0
      },
      {
        "mes": 9,
        "nombreMes": "Sep",
        "ppto2026": 0,
        "v2025": 0,
        "u2026": 0,
        "v2026": 0,
        "dev2026": 0,
        "cumplimientoPct": 0,
        "crecimientoYoYPct": 0,
        "tasaDevolucionPct": 0
      },
      {
        "mes": 10,
        "nombreMes": "Oct",
        "ppto2026": 0,
        "v2025": 0,
        "u2026": 0,
        "v2026": 0,
        "dev2026": 0,
        "cumplimientoPct": 0,
        "crecimientoYoYPct": 0,
        "tasaDevolucionPct": 0
      },
      {
        "mes": 11,
        "nombreMes": "Nov",
        "ppto2026": 0,
        "v2025": 0,
        "u2026": 0,
        "v2026": 0,
        "dev2026": 0,
        "cumplimientoPct": 0,
        "crecimientoYoYPct": 0,
        "tasaDevolucionPct": 0
      },
      {
        "mes": 12,
        "nombreMes": "Dic",
        "ppto2026": 0,
        "v2025": 0,
        "u2026": 0,
        "v2026": 0,
        "dev2026": 0,
        "cumplimientoPct": 0,
        "crecimientoYoYPct": 0,
        "tasaDevolucionPct": 0
      }
    ],
    "meses2025": [
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0
    ]
  },
  "MARKETPLACE": {
    "nombre": "MARKETPLACE",
    "row": 40,
    "acumulado": {
      "ppto": 26123361,
      "v2025": 0,
      "v2026": 0,
      "unds": 0,
      "dev": 0,
      "cumplimientoPct": 0,
      "crecimientoYoYPct": 0,
      "tasaDevPct": 0
    },
    "meses": [
      {
        "mes": 1,
        "nombreMes": "Ene",
        "ppto2026": 1056727,
        "v2025": 0,
        "u2026": 0,
        "v2026": 0,
        "dev2026": 0,
        "cumplimientoPct": 0,
        "crecimientoYoYPct": 0,
        "tasaDevolucionPct": 0
      },
      {
        "mes": 2,
        "nombreMes": "Feb",
        "ppto2026": 3607958,
        "v2025": 0,
        "u2026": 0,
        "v2026": 0,
        "dev2026": 0,
        "cumplimientoPct": 0,
        "crecimientoYoYPct": 0,
        "tasaDevolucionPct": 0
      },
      {
        "mes": 3,
        "nombreMes": "Mar",
        "ppto2026": 4449930,
        "v2025": 0,
        "u2026": 0,
        "v2026": 0,
        "dev2026": 0,
        "cumplimientoPct": 0,
        "crecimientoYoYPct": 0,
        "tasaDevolucionPct": 0
      },
      {
        "mes": 4,
        "nombreMes": "Abr",
        "ppto2026": 5270600,
        "v2025": 0,
        "u2026": 0,
        "v2026": 0,
        "dev2026": 0,
        "cumplimientoPct": 0,
        "crecimientoYoYPct": 0,
        "tasaDevolucionPct": 0
      },
      {
        "mes": 5,
        "nombreMes": "May",
        "ppto2026": 4369255,
        "v2025": 0,
        "u2026": 0,
        "v2026": 0,
        "dev2026": 0,
        "cumplimientoPct": 0,
        "crecimientoYoYPct": 0,
        "tasaDevolucionPct": 0
      },
      {
        "mes": 6,
        "nombreMes": "Jun",
        "ppto2026": 3665128,
        "v2025": 0,
        "u2026": 0,
        "v2026": 0,
        "dev2026": 0,
        "cumplimientoPct": 0,
        "crecimientoYoYPct": 0,
        "tasaDevolucionPct": 0
      },
      {
        "mes": 7,
        "nombreMes": "Jul",
        "ppto2026": 3703763,
        "v2025": 0,
        "u2026": 0,
        "v2026": 0,
        "dev2026": 0,
        "cumplimientoPct": 0,
        "crecimientoYoYPct": 0,
        "tasaDevolucionPct": 0
      },
      {
        "mes": 8,
        "nombreMes": "Ago",
        "ppto2026": 4991466,
        "v2025": 0,
        "u2026": 0,
        "v2026": 0,
        "dev2026": 0,
        "cumplimientoPct": 0,
        "crecimientoYoYPct": 0,
        "tasaDevolucionPct": 0
      },
      {
        "mes": 9,
        "nombreMes": "Sep",
        "ppto2026": 5056679,
        "v2025": 0,
        "u2026": 0,
        "v2026": 0,
        "dev2026": 0,
        "cumplimientoPct": 0,
        "crecimientoYoYPct": 0,
        "tasaDevolucionPct": 0
      },
      {
        "mes": 10,
        "nombreMes": "Oct",
        "ppto2026": 5993113,
        "v2025": 0,
        "u2026": 0,
        "v2026": 0,
        "dev2026": 0,
        "cumplimientoPct": 0,
        "crecimientoYoYPct": 0,
        "tasaDevolucionPct": 0
      },
      {
        "mes": 11,
        "nombreMes": "Nov",
        "ppto2026": 8080171,
        "v2025": 0,
        "u2026": 0,
        "v2026": 0,
        "dev2026": 0,
        "cumplimientoPct": 0,
        "crecimientoYoYPct": 0,
        "tasaDevolucionPct": 0
      },
      {
        "mes": 12,
        "nombreMes": "Dic",
        "ppto2026": 7268263,
        "v2025": 0,
        "u2026": 0,
        "v2026": 0,
        "dev2026": 0,
        "cumplimientoPct": 0,
        "crecimientoYoYPct": 0,
        "tasaDevolucionPct": 0
      }
    ],
    "meses2025": [
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0
    ]
  },
  "COMERGAIN": {
    "nombre": "COMERGAIN",
    "row": 41,
    "acumulado": {
      "ppto": 0,
      "v2025": 0,
      "v2026": 0,
      "unds": 0,
      "dev": 0,
      "cumplimientoPct": 0,
      "crecimientoYoYPct": 0,
      "tasaDevPct": 0
    },
    "meses": [
      {
        "mes": 1,
        "nombreMes": "Ene",
        "ppto2026": 0,
        "v2025": 0,
        "u2026": 0,
        "v2026": 0,
        "dev2026": 0,
        "cumplimientoPct": 0,
        "crecimientoYoYPct": 0,
        "tasaDevolucionPct": 0
      },
      {
        "mes": 2,
        "nombreMes": "Feb",
        "ppto2026": 0,
        "v2025": 0,
        "u2026": 0,
        "v2026": 0,
        "dev2026": 0,
        "cumplimientoPct": 0,
        "crecimientoYoYPct": 0,
        "tasaDevolucionPct": 0
      },
      {
        "mes": 3,
        "nombreMes": "Mar",
        "ppto2026": 0,
        "v2025": 0,
        "u2026": 0,
        "v2026": 0,
        "dev2026": 0,
        "cumplimientoPct": 0,
        "crecimientoYoYPct": 0,
        "tasaDevolucionPct": 0
      },
      {
        "mes": 4,
        "nombreMes": "Abr",
        "ppto2026": 0,
        "v2025": 0,
        "u2026": 0,
        "v2026": 0,
        "dev2026": 0,
        "cumplimientoPct": 0,
        "crecimientoYoYPct": 0,
        "tasaDevolucionPct": 0
      },
      {
        "mes": 5,
        "nombreMes": "May",
        "ppto2026": 0,
        "v2025": 0,
        "u2026": 0,
        "v2026": 0,
        "dev2026": 0,
        "cumplimientoPct": 0,
        "crecimientoYoYPct": 0,
        "tasaDevolucionPct": 0
      },
      {
        "mes": 6,
        "nombreMes": "Jun",
        "ppto2026": 0,
        "v2025": 0,
        "u2026": 0,
        "v2026": 0,
        "dev2026": 0,
        "cumplimientoPct": 0,
        "crecimientoYoYPct": 0,
        "tasaDevolucionPct": 0
      },
      {
        "mes": 7,
        "nombreMes": "Jul",
        "ppto2026": 0,
        "v2025": 0,
        "u2026": 0,
        "v2026": 0,
        "dev2026": 0,
        "cumplimientoPct": 0,
        "crecimientoYoYPct": 0,
        "tasaDevolucionPct": 0
      },
      {
        "mes": 8,
        "nombreMes": "Ago",
        "ppto2026": 0,
        "v2025": 0,
        "u2026": 0,
        "v2026": 0,
        "dev2026": 0,
        "cumplimientoPct": 0,
        "crecimientoYoYPct": 0,
        "tasaDevolucionPct": 0
      },
      {
        "mes": 9,
        "nombreMes": "Sep",
        "ppto2026": 0,
        "v2025": 0,
        "u2026": 0,
        "v2026": 0,
        "dev2026": 0,
        "cumplimientoPct": 0,
        "crecimientoYoYPct": 0,
        "tasaDevolucionPct": 0
      },
      {
        "mes": 10,
        "nombreMes": "Oct",
        "ppto2026": 0,
        "v2025": 0,
        "u2026": 0,
        "v2026": 0,
        "dev2026": 0,
        "cumplimientoPct": 0,
        "crecimientoYoYPct": 0,
        "tasaDevolucionPct": 0
      },
      {
        "mes": 11,
        "nombreMes": "Nov",
        "ppto2026": 0,
        "v2025": 0,
        "u2026": 0,
        "v2026": 0,
        "dev2026": 0,
        "cumplimientoPct": 0,
        "crecimientoYoYPct": 0,
        "tasaDevolucionPct": 0
      },
      {
        "mes": 12,
        "nombreMes": "Dic",
        "ppto2026": 0,
        "v2025": 0,
        "u2026": 0,
        "v2026": 0,
        "dev2026": 0,
        "cumplimientoPct": 0,
        "crecimientoYoYPct": 0,
        "tasaDevolucionPct": 0
      }
    ],
    "meses2025": [
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0
    ]
  },
  "EMPLEADOS": {
    "nombre": "EMPLEADOS",
    "row": 42,
    "acumulado": {
      "ppto": 16463222,
      "v2025": 42303159,
      "v2026": 61945258,
      "unds": 837,
      "dev": -10232160,
      "cumplimientoPct": 376.3,
      "crecimientoYoYPct": 46.4,
      "tasaDevPct": 14.2
    },
    "meses": [
      {
        "mes": 1,
        "nombreMes": "Ene",
        "ppto2026": 665961,
        "v2025": 2070800,
        "u2026": 36,
        "v2026": 3028400,
        "dev2026": -474500,
        "cumplimientoPct": 454.7,
        "crecimientoYoYPct": 46.2,
        "tasaDevolucionPct": 13.5
      },
      {
        "mes": 2,
        "nombreMes": "Feb",
        "ppto2026": 2273774,
        "v2025": 2011400,
        "u2026": 62,
        "v2026": 5197320,
        "dev2026": -2231760,
        "cumplimientoPct": 228.6,
        "crecimientoYoYPct": 158.4,
        "tasaDevolucionPct": 30
      },
      {
        "mes": 3,
        "nombreMes": "Mar",
        "ppto2026": 2804393,
        "v2025": 2072000,
        "u2026": 89,
        "v2026": 7657205,
        "dev2026": -2297800,
        "cumplimientoPct": 273,
        "crecimientoYoYPct": 269.6,
        "tasaDevolucionPct": 23.1
      },
      {
        "mes": 4,
        "nombreMes": "Abr",
        "ppto2026": 3321589,
        "v2025": 3482800,
        "u2026": 113,
        "v2026": 9081200,
        "dev2026": -644300,
        "cumplimientoPct": 273.4,
        "crecimientoYoYPct": 160.7,
        "tasaDevolucionPct": 6.6
      },
      {
        "mes": 5,
        "nombreMes": "May",
        "ppto2026": 2753551,
        "v2025": 13888173,
        "u2026": 217,
        "v2026": 14160990,
        "dev2026": -1264700,
        "cumplimientoPct": 514.3,
        "crecimientoYoYPct": 2,
        "tasaDevolucionPct": 8.2
      },
      {
        "mes": 6,
        "nombreMes": "Jun",
        "ppto2026": 2309803,
        "v2025": 4292100,
        "u2026": 152,
        "v2026": 10496992,
        "dev2026": -1409500,
        "cumplimientoPct": 454.5,
        "crecimientoYoYPct": 144.6,
        "tasaDevolucionPct": 11.8
      },
      {
        "mes": 7,
        "nombreMes": "Jul",
        "ppto2026": 2334151,
        "v2025": 14485886,
        "u2026": 168,
        "v2026": 12323151,
        "dev2026": -1909600,
        "cumplimientoPct": 528,
        "crecimientoYoYPct": -14.9,
        "tasaDevolucionPct": 13.4
      },
      {
        "mes": 8,
        "nombreMes": "Ago",
        "ppto2026": 3145675,
        "v2025": 12628138,
        "u2026": 48,
        "v2026": 3856550,
        "dev2026": -217600,
        "cumplimientoPct": 122.6,
        "crecimientoYoYPct": -69.5,
        "tasaDevolucionPct": 5.3
      },
      {
        "mes": 9,
        "nombreMes": "Sep",
        "ppto2026": 3186773,
        "v2025": 10134330,
        "u2026": 0,
        "v2026": 0,
        "dev2026": 0,
        "cumplimientoPct": 0,
        "crecimientoYoYPct": 0,
        "tasaDevolucionPct": 0
      },
      {
        "mes": 10,
        "nombreMes": "Oct",
        "ppto2026": 3776924,
        "v2025": 8343400,
        "u2026": 0,
        "v2026": 0,
        "dev2026": 0,
        "cumplimientoPct": 0,
        "crecimientoYoYPct": 0,
        "tasaDevolucionPct": 0
      },
      {
        "mes": 11,
        "nombreMes": "Nov",
        "ppto2026": 5092210,
        "v2025": 11453800,
        "u2026": 0,
        "v2026": 0,
        "dev2026": 0,
        "cumplimientoPct": 0,
        "crecimientoYoYPct": 0,
        "tasaDevolucionPct": 0
      },
      {
        "mes": 12,
        "nombreMes": "Dic",
        "ppto2026": 4580538,
        "v2025": 30556100,
        "u2026": 0,
        "v2026": 0,
        "dev2026": 0,
        "cumplimientoPct": 0,
        "crecimientoYoYPct": 0,
        "tasaDevolucionPct": 0
      }
    ],
    "meses2025": [
      2070800,
      2011400,
      2072000,
      3482800,
      13888173,
      4292100,
      14485886,
      12628138,
      10134330,
      8343400,
      11453800,
      30556100
    ]
  },
  "GENERAL": {
    "nombre": "GENERAL",
    "row": 43,
    "acumulado": {
      "ppto": 442449097,
      "v2025": 231677632,
      "v2026": 1346370734,
      "unds": 17147,
      "dev": -136119858,
      "cumplimientoPct": 304.3,
      "crecimientoYoYPct": 481.1,
      "tasaDevPct": 9.2
    },
    "meses": [
      {
        "mes": 1,
        "nombreMes": "Ene",
        "ppto2026": 17897693,
        "v2025": 2345413,
        "u2026": 581,
        "v2026": 52260307,
        "dev2026": -170720,
        "cumplimientoPct": 292,
        "crecimientoYoYPct": 2128.2,
        "tasaDevolucionPct": 0.3
      },
      {
        "mes": 2,
        "nombreMes": "Feb",
        "ppto2026": 61107668,
        "v2025": 40757177,
        "u2026": 1418,
        "v2026": 111579814,
        "dev2026": -895322,
        "cumplimientoPct": 182.6,
        "crecimientoYoYPct": 173.8,
        "tasaDevolucionPct": 0.8
      },
      {
        "mes": 3,
        "nombreMes": "Mar",
        "ppto2026": 75368071,
        "v2025": 64030507,
        "u2026": 2577,
        "v2026": 202596620,
        "dev2026": -417191,
        "cumplimientoPct": 268.8,
        "crecimientoYoYPct": 216.4,
        "tasaDevolucionPct": 0.2
      },
      {
        "mes": 4,
        "nombreMes": "Abr",
        "ppto2026": 89267699,
        "v2025": 78335676,
        "u2026": 3165,
        "v2026": 245624732,
        "dev2026": -33897000,
        "cumplimientoPct": 275.2,
        "crecimientoYoYPct": 213.6,
        "tasaDevolucionPct": 12.1
      },
      {
        "mes": 5,
        "nombreMes": "May",
        "ppto2026": 74001687,
        "v2025": 1710279,
        "u2026": 3563,
        "v2026": 263374337,
        "dev2026": -89829720,
        "cumplimientoPct": 355.9,
        "crecimientoYoYPct": 15299.5,
        "tasaDevolucionPct": 25.4
      },
      {
        "mes": 6,
        "nombreMes": "Jun",
        "ppto2026": 62075959,
        "v2025": 13194010,
        "u2026": 3181,
        "v2026": 238628890,
        "dev2026": -6074040,
        "cumplimientoPct": 384.4,
        "crecimientoYoYPct": 1708.6,
        "tasaDevolucionPct": 2.5
      },
      {
        "mes": 7,
        "nombreMes": "Jul",
        "ppto2026": 62730320,
        "v2025": 31304570,
        "u2026": 2662,
        "v2026": 232306034,
        "dev2026": -4835865,
        "cumplimientoPct": 370.3,
        "crecimientoYoYPct": 642.1,
        "tasaDevolucionPct": 2
      },
      {
        "mes": 8,
        "nombreMes": "Ago",
        "ppto2026": 84540021,
        "v2025": 97111481,
        "u2026": 661,
        "v2026": 68999427,
        "dev2026": 0,
        "cumplimientoPct": 81.6,
        "crecimientoYoYPct": -28.9,
        "tasaDevolucionPct": 0
      },
      {
        "mes": 9,
        "nombreMes": "Sep",
        "ppto2026": 85644526,
        "v2025": 104783054,
        "u2026": 0,
        "v2026": 0,
        "dev2026": 0,
        "cumplimientoPct": 0,
        "crecimientoYoYPct": 0,
        "tasaDevolucionPct": 0
      },
      {
        "mes": 10,
        "nombreMes": "Oct",
        "ppto2026": 101504841,
        "v2025": 2156464,
        "u2026": 0,
        "v2026": 0,
        "dev2026": 0,
        "cumplimientoPct": 0,
        "crecimientoYoYPct": 0,
        "tasaDevolucionPct": 0
      },
      {
        "mes": 11,
        "nombreMes": "Nov",
        "ppto2026": 136853154,
        "v2025": 3824171,
        "u2026": 0,
        "v2026": 0,
        "dev2026": 0,
        "cumplimientoPct": 0,
        "crecimientoYoYPct": 0,
        "tasaDevolucionPct": 0
      },
      {
        "mes": 12,
        "nombreMes": "Dic",
        "ppto2026": 123101948,
        "v2025": 14977037,
        "u2026": 0,
        "v2026": 0,
        "dev2026": 0,
        "cumplimientoPct": 0,
        "crecimientoYoYPct": 0,
        "tasaDevolucionPct": 0
      }
    ],
    "meses2025": [
      2345413,
      40757177,
      64030507,
      78335676,
      1710279,
      13194010,
      31304570,
      97111481,
      104783054,
      2156464,
      3824171,
      14977037
    ]
  },
  "BODEGA": {
    "nombre": "BODEGA",
    "row": 44,
    "acumulado": {
      "ppto": 257237847,
      "v2025": 362163503,
      "v2026": 137788836,
      "unds": 2621,
      "dev": -14180068,
      "cumplimientoPct": 53.6,
      "crecimientoYoYPct": -62,
      "tasaDevPct": 9.3
    },
    "meses": [
      {
        "mes": 1,
        "nombreMes": "Ene",
        "ppto2026": 10405635,
        "v2025": 8856634,
        "u2026": 15,
        "v2026": 1216480,
        "dev2026": -76900,
        "cumplimientoPct": 11.7,
        "crecimientoYoYPct": -86.3,
        "tasaDevolucionPct": 5.9
      },
      {
        "mes": 2,
        "nombreMes": "Feb",
        "ppto2026": 35527714,
        "v2025": 14417053,
        "u2026": 26,
        "v2026": 2303901,
        "dev2026": -274700,
        "cumplimientoPct": 6.5,
        "crecimientoYoYPct": -84,
        "tasaDevolucionPct": 10.7
      },
      {
        "mes": 3,
        "nombreMes": "Mar",
        "ppto2026": 43818646,
        "v2025": 16117975,
        "u2026": 99,
        "v2026": 7109767,
        "dev2026": -12032322,
        "cumplimientoPct": 16.2,
        "crecimientoYoYPct": -55.9,
        "tasaDevolucionPct": 62.9
      },
      {
        "mes": 4,
        "nombreMes": "Abr",
        "ppto2026": 51899825,
        "v2025": 29985081,
        "u2026": 66,
        "v2026": 4235551,
        "dev2026": -309862,
        "cumplimientoPct": 8.2,
        "crecimientoYoYPct": -85.9,
        "tasaDevolucionPct": 6.8
      },
      {
        "mes": 5,
        "nombreMes": "May",
        "ppto2026": 43024237,
        "v2025": 109407483,
        "u2026": 2212,
        "v2026": 107323263,
        "dev2026": -661200,
        "cumplimientoPct": 249.4,
        "crecimientoYoYPct": -1.9,
        "tasaDevolucionPct": 0.6
      },
      {
        "mes": 6,
        "nombreMes": "Jun",
        "ppto2026": 36090674,
        "v2025": 161947006,
        "u2026": 93,
        "v2026": 8993378,
        "dev2026": -682284,
        "cumplimientoPct": 24.9,
        "crecimientoYoYPct": -94.4,
        "tasaDevolucionPct": 7.1
      },
      {
        "mes": 7,
        "nombreMes": "Jul",
        "ppto2026": 36471116,
        "v2025": 21432271,
        "u2026": 110,
        "v2026": 6606496,
        "dev2026": -142800,
        "cumplimientoPct": 18.1,
        "crecimientoYoYPct": -69.2,
        "tasaDevolucionPct": 2.1
      },
      {
        "mes": 8,
        "nombreMes": "Ago",
        "ppto2026": 49151175,
        "v2025": 62693109,
        "u2026": 16,
        "v2026": 1675576,
        "dev2026": 0,
        "cumplimientoPct": 3.4,
        "crecimientoYoYPct": -97.3,
        "tasaDevolucionPct": 0
      },
      {
        "mes": 9,
        "nombreMes": "Sep",
        "ppto2026": 49793329,
        "v2025": 104113484,
        "u2026": 0,
        "v2026": 0,
        "dev2026": 0,
        "cumplimientoPct": 0,
        "crecimientoYoYPct": 0,
        "tasaDevolucionPct": 0
      },
      {
        "mes": 10,
        "nombreMes": "Oct",
        "ppto2026": 59014442,
        "v2025": 24575018,
        "u2026": 0,
        "v2026": 0,
        "dev2026": 0,
        "cumplimientoPct": 0,
        "crecimientoYoYPct": 0,
        "tasaDevolucionPct": 0
      },
      {
        "mes": 11,
        "nombreMes": "Nov",
        "ppto2026": 79565787,
        "v2025": 145398904,
        "u2026": 0,
        "v2026": 0,
        "dev2026": 0,
        "cumplimientoPct": 0,
        "crecimientoYoYPct": 0,
        "tasaDevolucionPct": 0
      },
      {
        "mes": 12,
        "nombreMes": "Dic",
        "ppto2026": 71570900,
        "v2025": 300809333,
        "u2026": 0,
        "v2026": 0,
        "dev2026": 0,
        "cumplimientoPct": 0,
        "crecimientoYoYPct": 0,
        "tasaDevolucionPct": 0
      }
    ],
    "meses2025": [
      8856634,
      14417053,
      16117975,
      29985081,
      109407483,
      161947006,
      21432271,
      62693109,
      104113484,
      24575018,
      145398904,
      300809333
    ]
  },
  "PUBLICIDAD": {
    "nombre": "PUBLICIDAD",
    "row": 45,
    "acumulado": {
      "ppto": 0,
      "v2025": 18116003,
      "v2026": 21672354,
      "unds": 196,
      "dev": -777025,
      "cumplimientoPct": 0,
      "crecimientoYoYPct": 19.6,
      "tasaDevPct": 3.5
    },
    "meses": [
      {
        "mes": 1,
        "nombreMes": "Ene",
        "ppto2026": 0,
        "v2025": 1263661,
        "u2026": 0,
        "v2026": 0,
        "dev2026": 0,
        "cumplimientoPct": 0,
        "crecimientoYoYPct": -100,
        "tasaDevolucionPct": 0
      },
      {
        "mes": 2,
        "nombreMes": "Feb",
        "ppto2026": 0,
        "v2025": 1431094,
        "u2026": 0,
        "v2026": 0,
        "dev2026": 0,
        "cumplimientoPct": 0,
        "crecimientoYoYPct": -100,
        "tasaDevolucionPct": 0
      },
      {
        "mes": 3,
        "nombreMes": "Mar",
        "ppto2026": 0,
        "v2025": 4288560,
        "u2026": 27,
        "v2026": 2936087,
        "dev2026": -230622,
        "cumplimientoPct": 0,
        "crecimientoYoYPct": -31.5,
        "tasaDevolucionPct": 7.3
      },
      {
        "mes": 4,
        "nombreMes": "Abr",
        "ppto2026": 0,
        "v2025": 797776,
        "u2026": 41,
        "v2026": 4275551,
        "dev2026": -112931,
        "cumplimientoPct": 0,
        "crecimientoYoYPct": 435.9,
        "tasaDevolucionPct": 2.6
      },
      {
        "mes": 5,
        "nombreMes": "May",
        "ppto2026": 0,
        "v2025": 3394832,
        "u2026": 48,
        "v2026": 5546426,
        "dev2026": -196900,
        "cumplimientoPct": 0,
        "crecimientoYoYPct": 63.4,
        "tasaDevolucionPct": 3.4
      },
      {
        "mes": 6,
        "nombreMes": "Jun",
        "ppto2026": 0,
        "v2025": 1776194,
        "u2026": 41,
        "v2026": 4583761,
        "dev2026": -236572,
        "cumplimientoPct": 0,
        "crecimientoYoYPct": 158.1,
        "tasaDevolucionPct": 4.9
      },
      {
        "mes": 7,
        "nombreMes": "Jul",
        "ppto2026": 0,
        "v2025": 5163886,
        "u2026": 39,
        "v2026": 4330529,
        "dev2026": 0,
        "cumplimientoPct": 0,
        "crecimientoYoYPct": -16.1,
        "tasaDevolucionPct": 0
      },
      {
        "mes": 8,
        "nombreMes": "Ago",
        "ppto2026": 0,
        "v2025": 2465328,
        "u2026": 13,
        "v2026": 1607333,
        "dev2026": 0,
        "cumplimientoPct": 0,
        "crecimientoYoYPct": -34.8,
        "tasaDevolucionPct": 0
      },
      {
        "mes": 9,
        "nombreMes": "Sep",
        "ppto2026": 0,
        "v2025": 1535933,
        "u2026": 0,
        "v2026": 0,
        "dev2026": 0,
        "cumplimientoPct": 0,
        "crecimientoYoYPct": 0,
        "tasaDevolucionPct": 0
      },
      {
        "mes": 10,
        "nombreMes": "Oct",
        "ppto2026": 0,
        "v2025": 3249057,
        "u2026": 0,
        "v2026": 0,
        "dev2026": 0,
        "cumplimientoPct": 0,
        "crecimientoYoYPct": 0,
        "tasaDevolucionPct": 0
      },
      {
        "mes": 11,
        "nombreMes": "Nov",
        "ppto2026": 0,
        "v2025": 2700348,
        "u2026": 0,
        "v2026": 0,
        "dev2026": 0,
        "cumplimientoPct": 0,
        "crecimientoYoYPct": 0,
        "tasaDevolucionPct": 0
      },
      {
        "mes": 12,
        "nombreMes": "Dic",
        "ppto2026": 0,
        "v2025": 3160640,
        "u2026": 0,
        "v2026": 0,
        "dev2026": 0,
        "cumplimientoPct": 0,
        "crecimientoYoYPct": 0,
        "tasaDevolucionPct": 0
      }
    ],
    "meses2025": [
      1263661,
      1431094,
      4288560,
      797776,
      3394832,
      1776194,
      5163886,
      2465328,
      1535933,
      3249057,
      2700348,
      3160640
    ]
  },
  "DESFACE": {
    "nombre": "DESFACE",
    "row": 46,
    "acumulado": {
      "ppto": 0,
      "v2025": 0,
      "v2026": 0,
      "unds": 0,
      "dev": 0,
      "cumplimientoPct": 0,
      "crecimientoYoYPct": 0,
      "tasaDevPct": 0
    },
    "meses": [
      {
        "mes": 1,
        "nombreMes": "Ene",
        "ppto2026": 0,
        "v2025": 0,
        "u2026": 0,
        "v2026": 0,
        "dev2026": 0,
        "cumplimientoPct": 0,
        "crecimientoYoYPct": 0,
        "tasaDevolucionPct": 0
      },
      {
        "mes": 2,
        "nombreMes": "Feb",
        "ppto2026": 0,
        "v2025": 0,
        "u2026": 0,
        "v2026": 0,
        "dev2026": 0,
        "cumplimientoPct": 0,
        "crecimientoYoYPct": 0,
        "tasaDevolucionPct": 0
      },
      {
        "mes": 3,
        "nombreMes": "Mar",
        "ppto2026": 0,
        "v2025": 0,
        "u2026": 0,
        "v2026": 0,
        "dev2026": 0,
        "cumplimientoPct": 0,
        "crecimientoYoYPct": 0,
        "tasaDevolucionPct": 0
      },
      {
        "mes": 4,
        "nombreMes": "Abr",
        "ppto2026": 0,
        "v2025": 0,
        "u2026": 0,
        "v2026": 0,
        "dev2026": 0,
        "cumplimientoPct": 0,
        "crecimientoYoYPct": 0,
        "tasaDevolucionPct": 0
      },
      {
        "mes": 5,
        "nombreMes": "May",
        "ppto2026": 0,
        "v2025": 0,
        "u2026": 0,
        "v2026": 0,
        "dev2026": 0,
        "cumplimientoPct": 0,
        "crecimientoYoYPct": 0,
        "tasaDevolucionPct": 0
      },
      {
        "mes": 6,
        "nombreMes": "Jun",
        "ppto2026": 0,
        "v2025": 0,
        "u2026": 0,
        "v2026": 0,
        "dev2026": 0,
        "cumplimientoPct": 0,
        "crecimientoYoYPct": 0,
        "tasaDevolucionPct": 0
      },
      {
        "mes": 7,
        "nombreMes": "Jul",
        "ppto2026": 0,
        "v2025": 0,
        "u2026": 0,
        "v2026": 0,
        "dev2026": 0,
        "cumplimientoPct": 0,
        "crecimientoYoYPct": 0,
        "tasaDevolucionPct": 0
      },
      {
        "mes": 8,
        "nombreMes": "Ago",
        "ppto2026": 0,
        "v2025": 0,
        "u2026": 0,
        "v2026": 0,
        "dev2026": 0,
        "cumplimientoPct": 0,
        "crecimientoYoYPct": 0,
        "tasaDevolucionPct": 0
      },
      {
        "mes": 9,
        "nombreMes": "Sep",
        "ppto2026": 0,
        "v2025": 0,
        "u2026": 0,
        "v2026": 0,
        "dev2026": 0,
        "cumplimientoPct": 0,
        "crecimientoYoYPct": 0,
        "tasaDevolucionPct": 0
      },
      {
        "mes": 10,
        "nombreMes": "Oct",
        "ppto2026": 0,
        "v2025": 0,
        "u2026": 0,
        "v2026": 0,
        "dev2026": 0,
        "cumplimientoPct": 0,
        "crecimientoYoYPct": 0,
        "tasaDevolucionPct": 0
      },
      {
        "mes": 11,
        "nombreMes": "Nov",
        "ppto2026": 0,
        "v2025": 0,
        "u2026": 0,
        "v2026": 0,
        "dev2026": 0,
        "cumplimientoPct": 0,
        "crecimientoYoYPct": 0,
        "tasaDevolucionPct": 0
      },
      {
        "mes": 12,
        "nombreMes": "Dic",
        "ppto2026": 0,
        "v2025": 0,
        "u2026": 0,
        "v2026": 0,
        "dev2026": 0,
        "cumplimientoPct": 0,
        "crecimientoYoYPct": 0,
        "tasaDevolucionPct": 0
      }
    ],
    "meses2025": [
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0
    ]
  },
  "TOTAL GENERAL": {
    "nombre": "TOTAL GENERAL",
    "row": 48,
    "acumulado": {
      "ppto": 10289513879,
      "v2025": 8669448025,
      "v2026": 10611364570,
      "unds": 123392,
      "dev": -1631905892,
      "cumplimientoPct": 103.1,
      "crecimientoYoYPct": 22.4,
      "tasaDevPct": 13.3
    },
    "meses": [
      {
        "mes": 1,
        "nombreMes": "Ene",
        "ppto2026": 416225411,
        "v2025": 267888847,
        "u2026": 7081,
        "v2026": 627799563,
        "dev2026": -120019902,
        "cumplimientoPct": 150.8,
        "crecimientoYoYPct": 134.4,
        "tasaDevolucionPct": 16
      },
      {
        "mes": 2,
        "nombreMes": "Feb",
        "ppto2026": 1421108569,
        "v2025": 1282386162,
        "u2026": 15151,
        "v2026": 1382714453,
        "dev2026": -191887499,
        "cumplimientoPct": 97.3,
        "crecimientoYoYPct": 7.8,
        "tasaDevolucionPct": 12.2
      },
      {
        "mes": 3,
        "nombreMes": "Mar",
        "ppto2026": 1752745833,
        "v2025": 1570614209,
        "u2026": 20551,
        "v2026": 1764852459,
        "dev2026": -260136268,
        "cumplimientoPct": 100.7,
        "crecimientoYoYPct": 12.4,
        "tasaDevolucionPct": 12.8
      },
      {
        "mes": 4,
        "nombreMes": "Abr",
        "ppto2026": 2075993006,
        "v2025": 1854651971,
        "u2026": 24662,
        "v2026": 2164981251,
        "dev2026": -264360226,
        "cumplimientoPct": 104.3,
        "crecimientoYoYPct": 16.7,
        "tasaDevolucionPct": 10.9
      },
      {
        "mes": 5,
        "nombreMes": "May",
        "ppto2026": 1720969473,
        "v2025": 1381342750,
        "u2026": 21493,
        "v2026": 1742191180,
        "dev2026": -332511163,
        "cumplimientoPct": 101.2,
        "crecimientoYoYPct": 26.1,
        "tasaDevolucionPct": 16
      },
      {
        "mes": 6,
        "nombreMes": "Jun",
        "ppto2026": 1443626942,
        "v2025": 1155020526,
        "u2026": 16093,
        "v2026": 1402687134,
        "dev2026": -340988544,
        "cumplimientoPct": 97.2,
        "crecimientoYoYPct": 21.4,
        "tasaDevolucionPct": 19.6
      },
      {
        "mes": 7,
        "nombreMes": "Jul",
        "ppto2026": 1458844645,
        "v2025": 1116340962,
        "u2026": 16937,
        "v2026": 1526138530,
        "dev2026": -133890312,
        "cumplimientoPct": 104.6,
        "crecimientoYoYPct": 36.7,
        "tasaDevolucionPct": 8.1
      },
      {
        "mes": 8,
        "nombreMes": "Ago",
        "ppto2026": 1966047007,
        "v2025": 1713287244,
        "u2026": 10422,
        "v2026": 988232322,
        "dev2026": -293107015,
        "cumplimientoPct": 50.3,
        "crecimientoYoYPct": -42.3,
        "tasaDevolucionPct": 22.9
      },
      {
        "mes": 9,
        "nombreMes": "Sep",
        "ppto2026": 1991733165,
        "v2025": 1987717071,
        "u2026": 0,
        "v2026": 0,
        "dev2026": 0,
        "cumplimientoPct": 0,
        "crecimientoYoYPct": 0,
        "tasaDevolucionPct": 0
      },
      {
        "mes": 10,
        "nombreMes": "Oct",
        "ppto2026": 2360577692,
        "v2025": 2211049947,
        "u2026": 0,
        "v2026": 0,
        "dev2026": 0,
        "cumplimientoPct": 0,
        "crecimientoYoYPct": 0,
        "tasaDevolucionPct": 0
      },
      {
        "mes": 11,
        "nombreMes": "Nov",
        "ppto2026": 3182631500,
        "v2025": 2889771465,
        "u2026": 0,
        "v2026": 0,
        "dev2026": 0,
        "cumplimientoPct": 0,
        "crecimientoYoYPct": 0,
        "tasaDevolucionPct": 0
      },
      {
        "mes": 12,
        "nombreMes": "Dic",
        "ppto2026": 2862835995,
        "v2025": 2569949423,
        "u2026": 0,
        "v2026": 0,
        "dev2026": 0,
        "cumplimientoPct": 0,
        "crecimientoYoYPct": 0,
        "tasaDevolucionPct": 0
      }
    ],
    "meses2025": [
      267784246,
      1282386162,
      1570614209,
      1854651971,
      1478686510,
      1155020526,
      1268484867,
      1754804482,
      1987717071,
      2211049947,
      2889771465,
      2569949423
    ]
  },
  "TOTAL DIEGO": {
    "nombre": "TOTAL DIEGO",
    "row": 53,
    "acumulado": {
      "ppto": 1728638333,
      "v2025": 1333936226,
      "v2026": 1830577003,
      "unds": 21584,
      "dev": -103035942,
      "cumplimientoPct": 105.9,
      "crecimientoYoYPct": 37.2,
      "tasaDevPct": 5.3
    },
    "meses": [
      {
        "mes": 1,
        "nombreMes": "Ene",
        "ppto2026": 69925868,
        "v2025": 18016300,
        "u2026": 1378,
        "v2026": 114135979,
        "dev2026": -16698800,
        "cumplimientoPct": 163.2,
        "crecimientoYoYPct": 533.5,
        "tasaDevolucionPct": 12.8
      },
      {
        "mes": 2,
        "nombreMes": "Feb",
        "ppto2026": 238746240,
        "v2025": 221968729,
        "u2026": 3425,
        "v2026": 290795003,
        "dev2026": -15407978,
        "cumplimientoPct": 121.8,
        "crecimientoYoYPct": 31,
        "tasaDevolucionPct": 5
      },
      {
        "mes": 3,
        "nombreMes": "Mar",
        "ppto2026": 294461300,
        "v2025": 197221276,
        "u2026": 3366,
        "v2026": 290327022,
        "dev2026": -17041000,
        "cumplimientoPct": 98.6,
        "crecimientoYoYPct": 47.2,
        "tasaDevolucionPct": 5.5
      },
      {
        "mes": 4,
        "nombreMes": "Abr",
        "ppto2026": 348766825,
        "v2025": 344040143,
        "u2026": 5934,
        "v2026": 480008447,
        "dev2026": -7247300,
        "cumplimientoPct": 137.6,
        "crecimientoYoYPct": 39.5,
        "tasaDevolucionPct": 1.5
      },
      {
        "mes": 5,
        "nombreMes": "May",
        "ppto2026": 289122872,
        "v2025": 193507044,
        "u2026": 2857,
        "v2026": 255393876,
        "dev2026": -16340800,
        "cumplimientoPct": 88.3,
        "crecimientoYoYPct": 32,
        "tasaDevolucionPct": 6
      },
      {
        "mes": 6,
        "nombreMes": "Jun",
        "ppto2026": 242529327,
        "v2025": 179000759,
        "u2026": 1622,
        "v2026": 144772600,
        "dev2026": -18870000,
        "cumplimientoPct": 59.7,
        "crecimientoYoYPct": -19.1,
        "tasaDevolucionPct": 11.5
      },
      {
        "mes": 7,
        "nombreMes": "Jul",
        "ppto2026": 245085901,
        "v2025": 180181975,
        "u2026": 3002,
        "v2026": 255144076,
        "dev2026": -11430064,
        "cumplimientoPct": 104.1,
        "crecimientoYoYPct": 41.6,
        "tasaDevolucionPct": 4.3
      },
      {
        "mes": 8,
        "nombreMes": "Ago",
        "ppto2026": 330295897,
        "v2025": 313186766,
        "u2026": 2324,
        "v2026": 220063324,
        "dev2026": -173769955,
        "cumplimientoPct": 66.6,
        "crecimientoYoYPct": -29.7,
        "tasaDevolucionPct": 44.1
      },
      {
        "mes": 9,
        "nombreMes": "Sep",
        "ppto2026": 0,
        "v2025": 0,
        "u2026": 0,
        "v2026": 0,
        "dev2026": 0,
        "cumplimientoPct": 0,
        "crecimientoYoYPct": 0,
        "tasaDevolucionPct": 0
      },
      {
        "mes": 10,
        "nombreMes": "Oct",
        "ppto2026": 0,
        "v2025": 0,
        "u2026": 0,
        "v2026": 0,
        "dev2026": 0,
        "cumplimientoPct": 0,
        "crecimientoYoYPct": 0,
        "tasaDevolucionPct": 0
      },
      {
        "mes": 11,
        "nombreMes": "Nov",
        "ppto2026": 0,
        "v2025": 0,
        "u2026": 0,
        "v2026": 0,
        "dev2026": 0,
        "cumplimientoPct": 0,
        "crecimientoYoYPct": 0,
        "tasaDevolucionPct": 0
      },
      {
        "mes": 12,
        "nombreMes": "Dic",
        "ppto2026": 0,
        "v2025": 0,
        "u2026": 0,
        "v2026": 0,
        "dev2026": 0,
        "cumplimientoPct": 0,
        "crecimientoYoYPct": 0,
        "tasaDevolucionPct": 0
      }
    ],
    "meses2025": [
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0
    ]
  },
  "TOTAL FREDY": {
    "nombre": "TOTAL FREDY",
    "row": 55,
    "acumulado": {
      "ppto": 756279272,
      "v2025": 638729613,
      "v2026": 580869058,
      "unds": 7336,
      "dev": -80574767,
      "cumplimientoPct": 76.8,
      "crecimientoYoYPct": -9.1,
      "tasaDevPct": 12.2
    },
    "meses": [
      {
        "mes": 1,
        "nombreMes": "Ene",
        "ppto2026": 30592568,
        "v2025": 14780152,
        "u2026": 40,
        "v2026": 2318812,
        "dev2026": -8904300,
        "cumplimientoPct": 7.6,
        "crecimientoYoYPct": -84.3,
        "tasaDevolucionPct": 79.3
      },
      {
        "mes": 2,
        "nombreMes": "Feb",
        "ppto2026": 104451480,
        "v2025": 86784343,
        "u2026": 710,
        "v2026": 58611297,
        "dev2026": -739100,
        "cumplimientoPct": 56.1,
        "crecimientoYoYPct": -32.5,
        "tasaDevolucionPct": 1.2
      },
      {
        "mes": 3,
        "nombreMes": "Mar",
        "ppto2026": 128826819,
        "v2025": 78767142,
        "u2026": 934,
        "v2026": 76072625,
        "dev2026": -2715840,
        "cumplimientoPct": 59.1,
        "crecimientoYoYPct": -3.4,
        "tasaDevolucionPct": 3.4
      },
      {
        "mes": 4,
        "nombreMes": "Abr",
        "ppto2026": 152585486,
        "v2025": 91212012,
        "u2026": 986,
        "v2026": 78440648,
        "dev2026": -3705124,
        "cumplimientoPct": 51.4,
        "crecimientoYoYPct": -14,
        "tasaDevolucionPct": 4.5
      },
      {
        "mes": 5,
        "nombreMes": "May",
        "ppto2026": 126491257,
        "v2025": 184225720,
        "u2026": 2957,
        "v2026": 239499503,
        "dev2026": -7248104,
        "cumplimientoPct": 189.3,
        "crecimientoYoYPct": 30,
        "tasaDevolucionPct": 2.9
      },
      {
        "mes": 6,
        "nombreMes": "Jun",
        "ppto2026": 106106580,
        "v2025": 127438820,
        "u2026": 1375,
        "v2026": 98991863,
        "dev2026": -54407717,
        "cumplimientoPct": 93.3,
        "crecimientoYoYPct": -22.3,
        "tasaDevolucionPct": 35.5
      },
      {
        "mes": 7,
        "nombreMes": "Jul",
        "ppto2026": 107225082,
        "v2025": 55521424,
        "u2026": 334,
        "v2026": 26934310,
        "dev2026": -2854582,
        "cumplimientoPct": 25.1,
        "crecimientoYoYPct": -51.5,
        "tasaDevolucionPct": 9.6
      },
      {
        "mes": 8,
        "nombreMes": "Ago",
        "ppto2026": 144504455,
        "v2025": 173360434,
        "u2026": 397,
        "v2026": 33705684,
        "dev2026": -2927600,
        "cumplimientoPct": 23.3,
        "crecimientoYoYPct": -80.6,
        "tasaDevolucionPct": 8
      },
      {
        "mes": 9,
        "nombreMes": "Sep",
        "ppto2026": 0,
        "v2025": 0,
        "u2026": 0,
        "v2026": 0,
        "dev2026": 0,
        "cumplimientoPct": 0,
        "crecimientoYoYPct": 0,
        "tasaDevolucionPct": 0
      },
      {
        "mes": 10,
        "nombreMes": "Oct",
        "ppto2026": 0,
        "v2025": 0,
        "u2026": 0,
        "v2026": 0,
        "dev2026": 0,
        "cumplimientoPct": 0,
        "crecimientoYoYPct": 0,
        "tasaDevolucionPct": 0
      },
      {
        "mes": 11,
        "nombreMes": "Nov",
        "ppto2026": 0,
        "v2025": 0,
        "u2026": 0,
        "v2026": 0,
        "dev2026": 0,
        "cumplimientoPct": 0,
        "crecimientoYoYPct": 0,
        "tasaDevolucionPct": 0
      },
      {
        "mes": 12,
        "nombreMes": "Dic",
        "ppto2026": 0,
        "v2025": 0,
        "u2026": 0,
        "v2026": 0,
        "dev2026": 0,
        "cumplimientoPct": 0,
        "crecimientoYoYPct": 0,
        "tasaDevolucionPct": 0
      }
    ],
    "meses2025": [
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0
    ]
  },
  "TOTAL SANTANDERES": {
    "nombre": "TOTAL SANTANDERES",
    "row": 57,
    "acumulado": {
      "ppto": 782003054,
      "v2025": 262061897,
      "v2026": 267428632,
      "unds": 3071,
      "dev": -41010203,
      "cumplimientoPct": 34.2,
      "crecimientoYoYPct": 2,
      "tasaDevPct": 13.3
    },
    "meses": [
      {
        "mes": 1,
        "nombreMes": "Ene",
        "ppto2026": 0,
        "v2025": 0,
        "u2026": 0,
        "v2026": 0,
        "dev2026": 0,
        "cumplimientoPct": 0,
        "crecimientoYoYPct": 0,
        "tasaDevolucionPct": 0
      },
      {
        "mes": 2,
        "nombreMes": "Feb",
        "ppto2026": 0,
        "v2025": 0,
        "u2026": 0,
        "v2026": 0,
        "dev2026": 0,
        "cumplimientoPct": 0,
        "crecimientoYoYPct": 0,
        "tasaDevolucionPct": 0
      },
      {
        "mes": 3,
        "nombreMes": "Mar",
        "ppto2026": 0,
        "v2025": 0,
        "u2026": 0,
        "v2026": 0,
        "dev2026": 0,
        "cumplimientoPct": 0,
        "crecimientoYoYPct": 0,
        "tasaDevolucionPct": 0
      },
      {
        "mes": 4,
        "nombreMes": "Abr",
        "ppto2026": 0,
        "v2025": 0,
        "u2026": 0,
        "v2026": 0,
        "dev2026": 0,
        "cumplimientoPct": 0,
        "crecimientoYoYPct": 0,
        "tasaDevolucionPct": 0
      },
      {
        "mes": 5,
        "nombreMes": "May",
        "ppto2026": 0,
        "v2025": 0,
        "u2026": 0,
        "v2026": 0,
        "dev2026": 0,
        "cumplimientoPct": 0,
        "crecimientoYoYPct": 0,
        "tasaDevolucionPct": 0
      },
      {
        "mes": 6,
        "nombreMes": "Jun",
        "ppto2026": 0,
        "v2025": 0,
        "u2026": 0,
        "v2026": 0,
        "dev2026": 0,
        "cumplimientoPct": 0,
        "crecimientoYoYPct": 0,
        "tasaDevolucionPct": 0
      },
      {
        "mes": 7,
        "nombreMes": "Jul",
        "ppto2026": 0,
        "v2025": 0,
        "u2026": 0,
        "v2026": 0,
        "dev2026": 0,
        "cumplimientoPct": 0,
        "crecimientoYoYPct": 0,
        "tasaDevolucionPct": 0
      },
      {
        "mes": 8,
        "nombreMes": "Ago",
        "ppto2026": 0,
        "v2025": 0,
        "u2026": 0,
        "v2026": 0,
        "dev2026": 0,
        "cumplimientoPct": 0,
        "crecimientoYoYPct": 0,
        "tasaDevolucionPct": 0
      },
      {
        "mes": 9,
        "nombreMes": "Sep",
        "ppto2026": 0,
        "v2025": 0,
        "u2026": 0,
        "v2026": 0,
        "dev2026": 0,
        "cumplimientoPct": 0,
        "crecimientoYoYPct": 0,
        "tasaDevolucionPct": 0
      },
      {
        "mes": 10,
        "nombreMes": "Oct",
        "ppto2026": 0,
        "v2025": 0,
        "u2026": 0,
        "v2026": 0,
        "dev2026": 0,
        "cumplimientoPct": 0,
        "crecimientoYoYPct": 0,
        "tasaDevolucionPct": 0
      },
      {
        "mes": 11,
        "nombreMes": "Nov",
        "ppto2026": 0,
        "v2025": 0,
        "u2026": 0,
        "v2026": 0,
        "dev2026": 0,
        "cumplimientoPct": 0,
        "crecimientoYoYPct": 0,
        "tasaDevolucionPct": 0
      },
      {
        "mes": 12,
        "nombreMes": "Dic",
        "ppto2026": 0,
        "v2025": 0,
        "u2026": 0,
        "v2026": 0,
        "dev2026": 0,
        "cumplimientoPct": 0,
        "crecimientoYoYPct": 0,
        "tasaDevolucionPct": 0
      }
    ],
    "meses2025": [
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0
    ]
  }
};

export const VENDEDOR_ID_TO_CMI_KEY: Record<number, string> = {
  14: "ALEIDA GALLEGO",
  3: "ALEJANDRA HERRERA",
  58326: "MAYORISTA DIGITAL",
  4957: "BEATRIZ SANCHEZ",
  6: "SARA GOMEZ",
  1: "PAOLA CARVAJAL JIMENEZ",
  131: "CLAUDIA GIRALDO",
  157: "CLAUDIA GIRALDO",
  58819: "DIANA AGUDELO",
  12: "DIEGO GIRALDO CORRERIA",
  16: "DIEGO GIRALDO-MEDELLIN",
  18: "DIEGO GIRALDO RAPPAZ",
  34: "TOTAL DIEGO",
  58592: "CAMILO ZULUAGA",
  113: "JONATHAN LOPEZ",
  7968: "JONATHAN LOPEZ RAPPAZ",
  200: "CAROLINA GIL",
  13: "JUAN DAVID QUINTANA",
  11: "LINA GARCIA",
  10554: "LINA PLUSS",
  15: "LUIS VILLA",
  10: "JOHN FREDY MEDELLIN",
  7: "JOHN FREDY CORRERIA",
  25: "TOTAL FREDY",
  51: "TRUCCO'S EXPORTACION",
  57255: "OLGA ZULUAGA",
  5: "LEADS MAYORISTAS",
  108: "TIENDA VIRTUAL",
  226: "REDES SOCIALES",
  2: "SHOWROOM",
  740: "FERIAS",
  3333: "TRJUSA WEB",
  59392: "DAFITI",
  9: "EMPLEADOS",
  8: "GENERAL",
  10148: "GENERAL",
  4: "BODEGA",
  17: "PUBLICIDAD",
  4541: "MAYORCA",
  4936: "MAYORCA",
  9935: "MAYORCA",
  8974: "MAYORCA",
  59048: "MAYORCA",
  4793: "MAYORCA",
};

export const CANAL_ID_TO_CMI_KEY: Record<number, string> = {
  1: "CANAL MAYORISTA NACIONAL",
  2: "CANAL DETAL (TV - REDES - SHWR)",
  3: "PUBLICIDAD",
  4: "CANAL MAYORISTA INTERNACIONAL",
};

/**
 * Resuelve la entidad CMI oficial según los filtros activos.
 */
export function obtenerRegistroCMI(filtros: FiltrosBI): CMIEntity | null {
  // 1. Vendedor específico por ID individual
  if (filtros.vendedor_id) {
    const key = VENDEDOR_ID_TO_CMI_KEY[Number(filtros.vendedor_id)];
    if (key && CMI_ENTITIES[key]) return CMI_ENTITIES[key];
  }

  // 2. Grupo de vendedores asignados a la cuenta del comercial
  if (filtros.vendedor_ids && filtros.vendedor_ids.length > 0) {
    const ids = filtros.vendedor_ids.map(Number);
    // Juan Diego Giraldo
    if (ids.includes(16) && ids.includes(12)) {
      return CMI_ENTITIES["TOTAL DIEGO"] || null;
    }
    // Fredy Sanchez
    if (ids.includes(10) && ids.includes(7)) {
      return CMI_ENTITIES["TOTAL FREDY"] || null;
    }
    // Diana Agudelo (Santanderes)
    if (ids.includes(58819) && (ids.includes(113) || ids.includes(58592))) {
      return CMI_ENTITIES["TOTAL SANTANDERES"] || null;
    }
    // Lina Garcia
    if (ids.includes(11)) {
      return CMI_ENTITIES["LINA GARCIA"] || null;
    }
    // Claudia Giraldo
    if (ids.includes(131) || ids.includes(157)) {
      return CMI_ENTITIES["CLAUDIA GIRALDO"] || null;
    }
    // Mayorca
    if (ids.includes(4541) || ids.includes(4936) || ids.includes(9935)) {
      return CMI_ENTITIES["MAYORCA"] || null;
    }
    // Tienda Virtual / Redes
    if (ids.includes(108) && ids.includes(226)) {
      return CMI_ENTITIES["CANAL DETAL (TV - REDES - SHWR)"] || CMI_ENTITIES["TIENDA VIRTUAL"] || null;
    }
    // Si solo tiene 1 ID en la lista
    if (ids.length === 1 && VENDEDOR_ID_TO_CMI_KEY[ids[0]]) {
      const key = VENDEDOR_ID_TO_CMI_KEY[ids[0]];
      if (CMI_ENTITIES[key]) return CMI_ENTITIES[key];
    }
  }

  // 3. Canal
  if (filtros.canal_id && CANAL_ID_TO_CMI_KEY[Number(filtros.canal_id)]) {
    const cKey = CANAL_ID_TO_CMI_KEY[Number(filtros.canal_id)];
    if (CMI_ENTITIES[cKey]) return CMI_ENTITIES[cKey];
  }

  // 4. Si no hay filtros de vendedor ni canal -> TOTAL GENERAL
  if (!filtros.marca_id && !filtros.zona_id && !filtros.ciudad_id) {
    return CMI_ENTITIES["TOTAL GENERAL"] || null;
  }

  return null;
}

/**
 * Retorna los 12 meses cronológicos de cumplimiento calibrados con la verdad oficial de CMI.
 */
export function obtenerMesesCalibradosCMI(
  filtros: FiltrosBI
): import("./ventas-api").CumplimientoMes[] | null {
  const entidad = obtenerRegistroCMI(filtros);
  if (!entidad) return null;

  const anio = filtros.anio || 2026;
  const es2025 = anio === 2025;

  return entidad.meses.map((m) => {
    if (es2025) {
      const v2025 = entidad.meses2025[m.mes - 1] ?? m.v2025;
      return {
        anio: 2025,
        mes: m.mes,
        nombreMes: m.nombreMes,
        periodo: `${m.nombreMes} 2025`,
        ventaReal: v2025,
        ventaAnterior: 0,
        ppto: 0,
        cumplimientoPct: 100,
        crecimientoYoY: 0,
        devolucionesMonto: 0,
        tasaDevolucionPct: 0,
        unidades: m.mes <= 8 && m.v2026 > 0 ? Math.round(v2025 / (m.v2026 / m.u2026 || 100000)) : 0,
        unidadesAnterior: 0,
      };
    }

    // 2026
    return {
      anio: 2026,
      mes: m.mes,
      nombreMes: m.nombreMes,
      periodo: `${m.nombreMes} 2026`,
      ventaReal: m.v2026,
      ventaAnterior: m.v2025,
      ppto: m.ppto2026,
      cumplimientoPct: m.cumplimientoPct,
      crecimientoYoY: m.crecimientoYoYPct,
      devolucionesMonto: Math.abs(m.dev2026),
      tasaDevolucionPct: m.tasaDevolucionPct,
      unidades: m.u2026,
      unidadesAnterior: m.v2025 > 0 && m.u2026 > 0 && m.v2026 > 0 ? Math.round(m.v2025 / (m.v2026 / m.u2026)) : 0,
    };
  });
}

/**
 * Retorna los KPIs de cabecera calibrados con la verdad oficial de CMI.
 */
export function obtenerKpisCalibradosCMI(
  filtros: FiltrosBI
): import("./ventas-api").DataDashboard1["kpis"] | null {
  const entidad = obtenerRegistroCMI(filtros);
  if (!entidad) return null;

  const anio = filtros.anio || 2026;
  const es2025 = anio === 2025;

  // Si hay un mes específico seleccionado (ej: Enero, Febrero, etc.)
  if (filtros.mes && filtros.mes >= 1 && filtros.mes <= 12) {
    const m = entidad.meses[filtros.mes - 1];
    if (es2025) {
      const v2025 = entidad.meses2025[filtros.mes - 1] ?? m.v2025;
      const uEst = m.v2026 > 0 && m.u2026 > 0 ? Math.round(v2025 / (m.v2026 / m.u2026)) : 0;
      return {
        ventaYTD: v2025,
        ventaBrutaTotal: v2025,
        ventaAnteriorTotal: 0,
        pptoYTD: 0,
        cumplimientoGlobalPct: 100,
        crecimientoYoYPct: 0,
        devolucionesTotal: 0,
        tasaDevolucionGlobalPct: 0,
        volumenUnidades: uEst,
        unidadesAnteriorTotal: 0,
        ticketPromedio: uEst > 0 ? Math.round(v2025 / uEst) : 0,
        precioPromedioPrenda: uEst > 0 ? Math.round(v2025 / uEst) : 0,
        totalTransacciones: uEst,
      };
    }

    // Mes específico de 2026
    const ventaReal = m.v2026;
    const ventaAnt = m.v2025;
    const ppto = m.ppto2026;
    const unds = m.u2026;
    const dev = Math.abs(m.dev2026);
    const ventaBruta = ventaReal + dev;
    const undsAnt = ventaAnt > 0 && unds > 0 && ventaReal > 0 ? Math.round(ventaAnt / (ventaReal / unds)) : 0;

    return {
      ventaYTD: ventaReal,
      ventaBrutaTotal: ventaBruta,
      ventaAnteriorTotal: ventaAnt,
      pptoYTD: ppto,
      cumplimientoGlobalPct: m.cumplimientoPct,
      crecimientoYoYPct: m.crecimientoYoYPct,
      devolucionesTotal: dev,
      tasaDevolucionGlobalPct: m.tasaDevolucionPct,
      volumenUnidades: unds,
      unidadesAnteriorTotal: undsAnt,
      ticketPromedio: unds > 0 ? Math.round(ventaReal / unds) : 0,
      precioPromedioPrenda: unds > 0 ? Math.round(ventaReal / unds) : 0,
      totalTransacciones: unds,
    };
  }

  // Vista anual / YTD
  if (es2025) {
    const total2025 = entidad.meses2025.reduce((a, b) => a + b, 0);
    const undsEst = entidad.acumulado.unds;
    return {
      ventaYTD: total2025,
      ventaBrutaTotal: total2025,
      ventaAnteriorTotal: 0,
      pptoYTD: 0,
      cumplimientoGlobalPct: 100,
      crecimientoYoYPct: 0,
      devolucionesTotal: 0,
      tasaDevolucionGlobalPct: 0,
      volumenUnidades: undsEst,
      unidadesAnteriorTotal: 0,
      ticketPromedio: undsEst > 0 ? Math.round(total2025 / undsEst) : 0,
      precioPromedioPrenda: undsEst > 0 ? Math.round(total2025 / undsEst) : 0,
      totalTransacciones: undsEst,
    };
  }

  // 2026 YTD Acumulado
  const ac = entidad.acumulado;
  const devAbs = Math.abs(ac.dev);
  const ventaBruta = ac.v2026 + devAbs;
  const undsAnt = ac.v2025 > 0 && ac.unds > 0 && ac.v2026 > 0 ? Math.round(ac.v2025 / (ac.v2026 / ac.unds)) : 0;

  return {
    ventaYTD: ac.v2026,
    ventaBrutaTotal: ventaBruta,
    ventaAnteriorTotal: ac.v2025,
    pptoYTD: ac.ppto,
    cumplimientoGlobalPct: ac.cumplimientoPct,
    crecimientoYoYPct: ac.crecimientoYoYPct,
    devolucionesTotal: devAbs,
    tasaDevolucionGlobalPct: ac.tasaDevPct,
    volumenUnidades: ac.unds,
    unidadesAnteriorTotal: undsAnt,
    ticketPromedio: ac.unds > 0 ? Math.round(ac.v2026 / ac.unds) : 0,
    precioPromedioPrenda: ac.unds > 0 ? Math.round(ac.v2026 / ac.unds) : 0,
    totalTransacciones: ac.unds,
  };
}

/**
 * Retorna las matrices multianuales para el Dashboard Histórico Multianual calibradas con CMI.
 */
export function obtenerMatrizMesAnioCalibradaCMI(
  filtros: FiltrosBI
): import("./ventas-api").MatrizMesAnio[] | null {
  const entidad = obtenerRegistroCMI(filtros);
  if (!entidad) return null;

  const meses2026 = entidad.meses.map((m) => m.v2026);
  const total2026 = entidad.acumulado.v2026;
  const unds2026 = entidad.acumulado.unds;

  const meses2025 = entidad.meses2025;
  const total2025 = meses2025.reduce((a, b) => a + b, 0);

  return [
    {
      anio: 2026,
      meses: meses2026,
      totalAnio: total2026,
      unidadesAnio: unds2026,
    },
    {
      anio: 2025,
      meses: meses2025,
      totalAnio: total2025,
      unidadesAnio: Math.round(unds2026 * (total2025 / (total2026 || 1))),
    },
  ];
}

