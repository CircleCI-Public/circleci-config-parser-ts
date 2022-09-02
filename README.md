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

Parsing a 

```
const jobIn = {
    docker: [{ image: 'cimg/node:lts' }],
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
}

ConfigParser.parseJob

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