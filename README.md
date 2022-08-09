# CircleCI Config Parser

Parse your existing CircleCI YAML file into TypeScript with the
[CircleCI-Config-SDK](https://github.com/CircleCI-Public/circleci-config-sdk-ts).
Easily translate back and forth between YAML and a CircleCI-Config-SDK Config
object.

Used by the
[CircleCI Visual Config Editor](https://github.com/CircleCI-Public/visual-config-editor)
to generate an interactive and editable visual representation of your CircleCI
config.

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
import CircleCI from '@circleci/circleci-config-parser';
```

In Browser:

```javascript
const CircleCI = require('@circleci/circleci-config-parser');
```