import { SchemaObject } from 'ajv';

const SetupRemoteDockerSchema: SchemaObject = {
  $id: '#/commands/native/setup_remote_docker',
  type: ['object', 'null'],
  additionalProperties: false,
  properties: {
    docker_layer_caching: {
      type: 'boolean',
    },
    version: {
      type: 'string',
    },
  },
};

export default SetupRemoteDockerSchema;
