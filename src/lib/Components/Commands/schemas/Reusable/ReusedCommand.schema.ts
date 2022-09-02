import { SchemaObject } from 'ajv';

const ReusedCommandSchema: SchemaObject = {
  $id: '#/command/ReusableCommand',
  type: ['object', 'string'],
};

export default ReusedCommandSchema;
