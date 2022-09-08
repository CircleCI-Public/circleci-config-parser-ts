# CircleCI Config Parser

A parsing library for CircleCI configuration files, powered by the
[CircleCI Config SDK](https://github.com/CircleCI-Public/circleci-config-sdk-ts)

> Used by the
> [CircleCI Visual Config Editor](https://github.com/CircleCI-Public/visual-config-editor)
> to generate an interactive and editable visual representation of your CircleCI
> config.

## Getting Started

- [View the Parser API Docs](#)

### Installation

Using npm:

```shell
$ npm i @circleci/circleci-config-parser
```

Using yarn:

```shell
$ yarn add @circleci/circleci-config-parser
```

#### Usage

In Node.js:

```typescript
import ConfigParser from '@circleci/circleci-config-parser';
```

In Browser:

```javascript
const ConfigParser = require('@circleci/circleci-config-parser');
```

Loading a Config instance from a config file

```typescript
import fs from 'fs';

const configSrc = fs.readFileSync('./config.yml', 'utf8');
const config = ConfigParser.parseConfig(configSrc);
```

Parsing a job config equivalent object, into a CircleCI Config SDK `Job`
instance.

```typescript
const jobIn = {
  docker: [{ image: 'cimg/base:2022.08' }],
  resource_class: 'medium',
  steps: [
    {
      run: {
        command: 'echo << parameters.greeting >>',
      },
    },
  ],
  parameters: {
    greeting: {
      type: 'string',
    },
  },
};

// Parsing function
ConfigParser.parseJob('Job Name', jobIn);
```

The equivalent config-sdk instantiation for that object:

```typescript
new CircleCI.reusable.ParameterizedJob(
  'my_job',
  new CircleCI.executors.DockerExecutor('cimg/node:lts'),
  new CircleCI.parameters.CustomParametersList([
    new CircleCI.parameters.CustomParameter('greeting', 'string'),
  ]),
  [
    new CircleCI.commands.Run({
      command: 'echo << parameters.greeting >>',
    }),
  ],
);
```

Parsing Orb references requires an OrbManifest, which is a representation of
Orbs outward facing properties.

```typescript
import fs from 'fs';

const customOrbProps = {
  // component type
  jobs: {
    // name of component
    say_hello: {
      // component parameters
      greeting: {
        type: 'string',
      },
    },
  },
  commands: {
    say_it: {
      what: {
        type: 'string',
      },
    },
  },
  executors: {
    python: {
      version: {
        type: 'string',
        default: '1.0.0',
      },
    },
  },
};

const customOrbManifest = ConfigParser.parseOrbManifest(customOrbProps);

const configSrc = fs.readFileSync('./config.yml', 'utf8');
const config = ConfigParser.parseConfig(configSrc, {
  'custom-orb': customOrbManifest,
});
```
