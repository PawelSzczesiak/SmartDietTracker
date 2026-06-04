export interface ParserContractCase {
  expected: {
    calories: number;
    carbs: number;
    fat: number;
    protein: number;
  };
  name: string;
  providerResponse: unknown;
}

export const parserContractCases: ParserContractCase[] = [
  {
    name: "structured meal maps to rounded nutrition",
    providerResponse: {
      choices: [
        {
          message: {
            content: JSON.stringify({
              status: "success",
              calories: 742.6,
              protein: 42.127,
              carbs: 71.654,
              fat: 22.301,
            }),
          },
        },
      ],
    },
    expected: {
      calories: 743,
      protein: 42.13,
      carbs: 71.65,
      fat: 22.3,
    },
  },
  {
    name: "adversarial noisy response with markdown fence still parses",
    providerResponse: {
      choices: [
        {
          message: {
            content:
              '```json\n{"status":"success","calories":"510","protein":"33.333","carbs":"49.994","fat":"18.001"}\n```',
          },
        },
      ],
    },
    expected: {
      calories: 510,
      protein: 33.33,
      carbs: 49.99,
      fat: 18,
    },
  },
];
