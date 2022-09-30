import { logic, mapping } from '@circleci/circleci-config-sdk';
import { errorParsing, parseGenerable } from '../../Config/exports/Parsing';

type ConditionSubtypeMap = {
  [key: string]: {
    generableType: mapping.GenerableType;
    parse: (
      _: unknown,
      deps: { children: unknown },
    ) => logic.conditional.Condition;
  };
};

type TruthyValue = boolean | number | string;
type ConditionOrValue = logic.conditional.Condition | TruthyValue;

const conditionParsers: ConditionSubtypeMap = {
  and: {
    parse: (_, { children }) => {
      return new logic.conditional.And(children as ConditionOrValue[]);
    },
    generableType: mapping.GenerableType.AND,
  },
  or: {
    parse: (_, { children }) => {
      return new logic.conditional.Or(children as ConditionOrValue[]);
    },
    generableType: mapping.GenerableType.OR,
  },
  equal: {
    parse: (_, { children }) => {
      return new logic.conditional.Equal(children as TruthyValue[]);
    },
    generableType: mapping.GenerableType.EQUAL,
  },
  not: {
    parse: (_, { children }) => {
      return new logic.conditional.Not(children as ConditionOrValue);
    },
    generableType: mapping.GenerableType.NOT,
  },
};

/**
 * Parse logical condition
 * @param type - type of condition
 * @param conditionIn - unknown logic to parse
 * @returns Condition
 */
export function parseCondition(
  type: keyof typeof conditionParsers,
  conditionIn: unknown,
): logic.conditional.Condition {
  const parser = conditionParsers[type];

  return parseGenerable<
    Record<string, unknown>,
    logic.conditional.Condition,
    {
      children:
        | logic.conditional.Condition[]
        | logic.conditional.Condition
        | unknown;
    }
  >(parser.generableType, conditionIn, parser.parse, (condition) => {
    const isArray = Array.isArray(condition);

    if (type === 'equal') {
      const values = isArray ? condition : [condition];

      return { children: values };
    }

    if (isArray) {
      return { children: (condition as Array<unknown>).map(parseLogic) };
    }

    return { children: parseLogic(condition) };
  });
}

/**
 * Parse logical condition or truthy value
 * @param logicIn - unknown condition object or truthy value
 * @returns Condition
 */
export function parseLogic(logicIn: unknown): logic.conditional.Condition {
  if (typeof logicIn === 'object') {
    const condition = logicIn as Record<string, unknown>;
    const name = Object.keys(condition)[0];

    if (!(name in conditionParsers)) {
      throw errorParsing(`Unknown logic condition: ${name}`);
    }

    return parseCondition(name, condition[name]);
  }

  return parseGenerable<TruthyValue, logic.conditional.Truthy>(
    mapping.GenerableType.TRUTHY,
    logicIn,
    (truthy) => {
      return new logic.conditional.Truthy(truthy);
    },
  );
}
