import { SchemaObject } from 'ajv';

/*
 * Schema for both parameterized and static jobs.
 */
const JobSchema: SchemaObject = {
  $id: '#/definitions/Job',
  required: ['steps'],
  additionalProperties: {
    steps: {
      $ref: '#/definitions/Steps',
    },
    parameters: {
      type: 'object',
      $ref: '#/parameters/JobParameterList',
    },
    parallelism: {
      type: 'integer',
      minimum: 1,
    },
  },
  anyOf: [
    {
      $ref: '#/executor/ReusableExecutorUsage',
    },
    {
      $ref: '#/executor/Executor',
    },
  ],
};

export default JobSchema;
