import * as CircleCI from '@circleci/circleci-config-sdk';
import { parse } from 'yaml';
import * as ConfigParser from '../src';
import nodeInputManifest from './nodeManifest.json';

describe('Use an OrbImport within a config', () => {
  const orbName = 'my-orb';
  const orbNamespace = 'circleci';
  const orbVersion = '1.0.0';
  const manifest: CircleCI.types.orb.OrbImportManifest =
    ConfigParser.parseOrbManifest({
      jobs: {
        say_hello: {
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
    });

  it('Should parse manifest', () => {
    expect(manifest.executors['python'].parameters.length).toBe(1);
    expect(manifest.jobs['say_hello'].parameters.length).toBe(1);
    expect(manifest.commands['say_it'].parameters.length).toBe(1);
  });

  const exampleOrb = new CircleCI.orb.OrbImport(
    orbName,
    orbNamespace,
    orbName,
    orbVersion,
    undefined,
    manifest,
  );

  const exampleOrb2 = new CircleCI.orb.OrbImport(
    'my-orb-aliased',
    orbNamespace,
    orbName,
    '1.1.1',
    undefined,
    manifest,
  );

  it('Should match expected shape', () => {
    expect(exampleOrb.generate()).toEqual({
      [orbName]: `${orbNamespace}/${orbName}@${orbVersion}`,
    });
  });

  it('OrbImport should have static properties', () => {
    expect(exampleOrb.generableType).toBe(
      CircleCI.mapping.GenerableType.ORB_IMPORT,
    );
  });

  const orbImport = ConfigParser.parseOrbImport(
    {
      'my-orb': `${orbNamespace}/${'my-orb'}@${orbVersion}`,
    },
    manifest,
  );

  it('Should match expected shape', () => {
    // needs to be compared generatively, as the OrbRef circularly imports OrbImport
    expect(orbImport?.generate()).toEqual(exampleOrb.generate());
  });

  it('Should be able to load refs from import', () => {
    const jobName = 'my-orb/say_hello';
    const jobParameters = { greeting: 'hi %user%' };
    const refShape = { [jobName]: jobParameters };
    const orbJobRef = ConfigParser.parseOrbRef(refShape, 'jobs', [exampleOrb]);

    expect(
      orbJobRef
        ? new CircleCI.workflow.WorkflowJob(orbJobRef, jobParameters).generate()
        : undefined,
    ).toEqual(refShape);
  });

  it('Should not parse a regular job as an orb ref', () => {
    const jobName = 'say_hello';
    const jobParameters = { greeting: 'hi %user%' };
    const badJobRef = ConfigParser.parseOrbRef(
      { [jobName]: jobParameters },
      'jobs',
    );

    expect(badJobRef).toEqual(undefined);
  });

  const sayHelloJob = exampleOrb.jobs['say_hello'];
  const pythonExecutor = exampleOrb.executors['python'];
  const sayItCommand = exampleOrb.commands['say_it'];

  it('OrbRef should have static properties', () => {
    expect(sayHelloJob instanceof CircleCI.orb.OrbRef).toBe(true);
    expect(sayHelloJob.parameters.parameters.length).toBe(1);
    expect(sayHelloJob.orb.name).toBe(orbName);
    expect(sayHelloJob.generableType).toBe(
      CircleCI.mapping.GenerableType.ORB_REF,
    );
  });

  const config = new CircleCI.Config();

  config.importOrb(exampleOrb);
  config.importOrb(exampleOrb2);

  const orbRefExecutor = new CircleCI.reusable.ReusedExecutor(pythonExecutor, {
    version: '1.2.3',
  });
  const orbRefCommand = new CircleCI.reusable.ReusedCommand(sayItCommand, {
    what: 'cheese',
  });
  const job = new CircleCI.Job('test', orbRefExecutor, [orbRefCommand]);

  const wfName = 'default';
  const workflow = new CircleCI.Workflow(wfName, [
    new CircleCI.workflow.WorkflowJob(exampleOrb.jobs['say_hello'], {
      greeting: 'hello',
    }),
  ]);

  const contents = workflow.generateContents();

  it('Should parse orb ref job in workflow', () => {
    expect(
      ConfigParser.parseWorkflow(
        wfName,
        contents,
        [],
        [exampleOrb],
      ).generateContents(),
    ).toEqual(contents);
  });

  it('Should parse reused orb ref executor', () => {
    expect(
      ConfigParser.parseExecutor(
        orbRefExecutor.generate(),
        [],
        [exampleOrb],
      ).generate(),
    ).toEqual(orbRefExecutor.generate());
  });

  it('Should parse reused orb ref command', () => {
    expect(
      ConfigParser.parseStep(
        'my-orb/say_it',
        orbRefCommand.generateContents(),
        [],
        [exampleOrb],
      ).generate(),
    ).toEqual(orbRefCommand.generate());
  });

  workflow.addJob(job);
  config.addJob(job);
  config.addWorkflow(workflow);

  it('Should produce a config with Orb import and usages', () => {
    const expected = {
      version: 2.1,
      setup: false,
      jobs: {
        test: {
          executor: {
            name: 'my-orb/python',
            version: '1.2.3',
          },
          steps: [
            {
              'my-orb/say_it': { what: 'cheese' },
            },
          ],
        },
      },
      workflows: {
        default: {
          jobs: [
            {
              'my-orb/say_hello': { greeting: 'hello' },
            },
            'test',
          ],
        },
      },
      orbs: {
        [orbName]: `${orbNamespace}/${orbName}@${orbVersion}`,
        'my-orb-aliased': `${orbNamespace}/${orbName}@1.1.1`,
      },
    };

    const regenerated = parse(config.stringify());

    expect(regenerated).toEqual(expected);
    expect(
      parse(
        ConfigParser.parseConfig(regenerated, {
          'my-orb': manifest,
        }).stringify(),
      ),
    ).toEqual(regenerated);
  });
});

const nodeManifest = ConfigParser.parseOrbManifest(nodeInputManifest);

describe('Use a Node orb within a config', () => {
  const orbName = 'node';
  const orbNamespace = 'circleci';
  const orbVersion = '5';

  const nodeOrb = new CircleCI.orb.OrbImport(
    orbName,
    orbNamespace,
    orbName,
    orbVersion,
    undefined,
    nodeManifest,
  );

  it('Should match expected shape', () => {
    expect(nodeOrb.generate()).toEqual({
      [orbName]: `${orbNamespace}/${orbName}@${orbVersion}`,
    });
  });

  it('OrbImport should have static properties', () => {
    expect(nodeOrb.generableType).toBe(
      CircleCI.mapping.GenerableType.ORB_IMPORT,
    );
  });

  const orbImport = ConfigParser.parseOrbImport(
    {
      node: `${orbNamespace}/${'node'}@${orbVersion}`,
    },
    nodeManifest,
  );

  it('Should match expected shape', () => {
    // needs to be compared generatively, as the OrbRef circularly imports OrbImport
    expect(orbImport?.generate()).toEqual(nodeOrb.generate());
  });

  it('Should be able to load refs from import', () => {
    const jobName = 'node/test';
    const jobParameters = { greeting: 'hi %user%' };
    const refShape = { [jobName]: jobParameters };
    const orbJobRef = ConfigParser.parseOrbRef(refShape, 'jobs', [nodeOrb]);

    expect(
      orbJobRef
        ? new CircleCI.workflow.WorkflowJob(orbJobRef, jobParameters).generate()
        : undefined,
    ).toEqual(refShape);
  });

  it('Should not parse a regular job as an orb ref', () => {
    const jobName = 'test';
    const jobParameters = { greeting: 'hi %user%' };
    const badJobRef = ConfigParser.parseOrbRef(
      { [jobName]: jobParameters },
      'jobs',
    );

    expect(badJobRef).toEqual(undefined);
  });

  const nodeTest = nodeOrb.jobs['test'];
  const nodeDefault = nodeOrb.executors['default'];
  const installPackages = nodeOrb.commands['install-packages'];
  const installYarn = nodeOrb.commands['install-yarn'];

  const config = new CircleCI.Config();

  config.importOrb(nodeOrb);

  const orbRefExecutor = new CircleCI.reusable.ReusedExecutor(nodeDefault, {
    tag: '16.16',
  });
  const orbRefCommand = new CircleCI.reusable.ReusedCommand(installPackages, {
    'cache-version': 'v1',
  });
  const orbRefCommand2 = new CircleCI.reusable.ReusedCommand(installYarn);
  const job = new CircleCI.Job('test', orbRefExecutor, [
    orbRefCommand,
    orbRefCommand2,
  ]);

  const wfName = 'default';
  const workflow = new CircleCI.Workflow(wfName, [
    new CircleCI.workflow.WorkflowJob(nodeTest, {
      'pkg-manager': 'yarn',
    }),
    new CircleCI.workflow.WorkflowJob(nodeTest),
  ]);

  const contents = workflow.generateContents();

  it('Should parse orb ref job in workflow', () => {
    expect(
      ConfigParser.parseWorkflow(
        wfName,
        contents,
        [],
        [nodeOrb],
      ).generateContents(),
    ).toEqual(contents);
  });

  it('Should parse reused orb ref executor', () => {
    expect(
      ConfigParser.parseExecutor(
        orbRefExecutor.generate(),
        [],
        [nodeOrb],
      ).generate(),
    ).toEqual(orbRefExecutor.generate());
  });

  it('Should parse reused orb ref command', () => {
    expect(
      ConfigParser.parseStep(
        'node/install-packages',
        orbRefCommand.generateContents(),
        [],
        [nodeOrb],
      ).generate(),
    ).toEqual(orbRefCommand.generate());
  });

  it('Should parse reused orb ref command without body', () => {
    expect(
      ConfigParser.parseStep(
        'node/install-packages',
        undefined,
        [],
        [nodeOrb],
      ).generate(),
    ).toEqual('node/install-packages');
  });

  workflow.addJob(job);
  config.addJob(job);
  config.addWorkflow(workflow);

  it('Should produce a config with Orb import and usages', () => {
    const expected = {
      version: 2.1,
      setup: false,
      jobs: {
        test: {
          executor: {
            name: 'node/default',
            tag: '16.16',
          },
          steps: [
            {
              'node/install-packages': { 'cache-version': 'v1' },
            },
            'node/install-yarn',
          ],
        },
      },
      workflows: {
        default: {
          jobs: [
            {
              'node/test': { 'pkg-manager': 'yarn' },
            },
            'node/test',
            'test',
          ],
        },
      },
      orbs: {
        [orbName]: `${orbNamespace}/${orbName}@${orbVersion}`,
      },
    };

    const regenerated = parse(config.stringify());

    expect(regenerated).toEqual(expected);
    expect(
      parse(
        ConfigParser.parseConfig(regenerated, {
          node: nodeManifest,
        }).stringify(),
      ),
    ).toEqual(regenerated);
  });
});
