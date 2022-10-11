import { SchemaObject } from 'ajv';

/*
 * Schema for logical conditions.
 */
const ConditionsSchema: SchemaObject = {
  $id: '#/logic/condition',
  type: ['object', 'string', 'number', 'boolean'],
  minProperties: 1,
  maxProperties: 1,
  properties: {
    and: {
      $ref: '#/logic/and',
    },
    or: { $ref: '#/logic/or' },
    equal: { $ref: '#/logic/equal' },
    not: { $ref: '#/logic/not' },
    truthy: { $ref: '#/logic/truthy' },
  },
  additionalProperties: false,
};

const AndConditionSchema: SchemaObject = {
  $id: '#/logic/and',
  type: 'array',
  items: { $ref: '#/logic/condition' },
};

const OrConditionSchema: SchemaObject = {
  $id: '#/logic/or',
  type: 'array',
  items: { $ref: '#/logic/condition' },
};

const EqualConditionSchema: SchemaObject = {
  $id: '#/logic/equal',
  oneOf: [
    {
      type: ['array'],
      items: { $ref: '#/logic/truthy' },
    },
    { type: ['string', 'number', 'boolean'] },
  ],
};

const NotConditionSchema: SchemaObject = {
  $id: '#/logic/not',
  $ref: '#/logic/condition',
};

const TruthyConditionSchema: SchemaObject = {
  $id: '#/logic/truthy',
  type: ['string', 'number', 'boolean'],
};

export {
  ConditionsSchema,
  AndConditionSchema,
  OrConditionSchema,
  EqualConditionSchema,
  NotConditionSchema,
  TruthyConditionSchema,
};
