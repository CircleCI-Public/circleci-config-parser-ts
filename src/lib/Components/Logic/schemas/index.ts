import { SchemaObject } from 'ajv';

/*
 * Schema for logical conditions.
 */
const ConditionsSchema: SchemaObject = {
  $id: '#/logic/condition',
  type: ['object', 'string', 'number', 'boolean'],
  oneOf: [
    { $ref: '#/logic/and' },
    { $ref: '#/logic/or' },
    { $ref: '#/logic/equal' },
    { $ref: '#/logic/and' },
    { $ref: '#/logic/truthy' },
  ],
};

const AndConditionSchema: SchemaObject = {
  $id: '#/logic/and',
  type: 'object',
  properties: {
    and: {
      type: 'array',
      items: { $ref: '#/logic/condition' },
    },
  },
};

const OrConditionSchema: SchemaObject = {
  $id: '#/logic/or',
  type: 'object',
  properties: {
    or: {
      type: 'array',
      items: { $ref: '#/logic/condition' },
    },
  },
};

const EqualConditionSchema: SchemaObject = {
  $id: '#/logic/equal',
  type: 'object',
  properties: {
    equal: {
      oneOf: [
        {
          type: ['array'],
          items: { $ref: '#/logic/truthy' },
        },
        { type: ['string', 'number', 'boolean'] },
      ],
    },
  },
};

const NotConditionSchema: SchemaObject = {
  $id: '#/logic/not',
  type: 'object',
  properties: {
    not: { $ref: '#/logic/condition' },
  },
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
