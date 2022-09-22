import { logic, mapping } from '@circleci/circleci-config-sdk';
import { errorParsing, parseGenerable } from '../../Config/exports/Parsing';

type ConditionSubtypeMap = {
  [key: string]: {
    generableType: mapping.GenerableType;
    parse: (args?: unknown) => logic.conditional.Condition;
  };
};

type TruthyValue = boolean | number | string;
type ConditionOrValue = logic.conditional.Condition | TruthyValue;

const logicParsers: ConditionSubtypeMap = {
  and: {
    parse: (condition) => {
      return new logic.conditional.And(condition as ConditionOrValue[]);
    },
    generableType: mapping.GenerableType.AND,
  },
  or: {
    parse: (condition) => {
      return new logic.conditional.Or(condition as ConditionOrValue[]);
    },
    generableType: mapping.GenerableType.OR,
  },
  equal: {
    parse: (condition) => {
      return new logic.conditional.Equal(condition as TruthyValue[]);
    },
    generableType: mapping.GenerableType.EQUAL,
  },
  not: {
    parse: (condition) => {
      return new logic.conditional.Not(condition as ConditionOrValue);
    },
    generableType: mapping.GenerableType.NOT,
  },
};

/**
 * Parse logical conditions
 * @param conditionIn - unknown condition object or truthy value
 * @returns Condition
 */
export function parseCondition(
  conditionIn: unknown,
): logic.conditional.Condition {
  if (typeof conditionIn === 'object') {
    const name = Object.keys(conditionIn as Record<string, unknown>)[0];

    if (!(name in logicParsers)) {
      throw errorParsing(`Unknown logic condition: ${name}`);
    }

    const parser = logicParsers[name];

    return parseGenerable<
      Record<string, unknown>,
      logic.conditional.Condition,
      { children: logic.conditional.Condition[] | logic.conditional.Condition }
    >(parser.generableType, conditionIn, parser.parse, (valueIn) => {
      const condition = valueIn[name];

      if (Array.isArray(condition)) {
        return { children: (condition as Array<unknown>).map(parseCondition) };
      }

      return { children: parseCondition(condition) };
    });
  }

  return parseGenerable<TruthyValue, logic.conditional.Truthy>(
    mapping.GenerableType.TRUTHY,
    conditionIn,
    (truthy) => {
      return new logic.conditional.Truthy(truthy);
    },
  );
}
