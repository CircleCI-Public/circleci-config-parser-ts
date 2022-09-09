import {
  executors,
  mapping,
  orb,
  parameters,
  reusable,
  types,
} from '@circleci/circleci-config-sdk';
import { DockerImageShape } from '@circleci/circleci-config-sdk/dist/src/lib/Components/Executors/exports/DockerImage';
import { errorParsing, parseGenerable } from '../../Config/exports/Parsing';
import { parseOrbRef } from '../../Orb';
import { parseParameterList } from '../Parameters';

export type UnknownParameterized = {
  parameters?: {
    [key: string]: unknown;
  };
};

export type ReusableExecutorDefinition = {
  [key: string]: UnknownExecutableShape & UnknownParameterized;
};

export type ReusableExecutorDependencies = {
  parametersList?: parameters.CustomParametersList<types.parameter.literals.ExecutorParameterLiteral>;
  executor: executors.Executor;
};

export type ExecutorSubtypeMap = {
  [key in types.executors.executor.ExecutorUsageLiteral | 'windows']: {
    generableType: mapping.GenerableType;
    parse: ExecutorSubtypeParser;
  };
};

export type UnknownExecutableShape = {
  resource_class: types.executors.executor.AnyResourceClass;
  [key: string]: unknown;
};

export type ExecutorSubtypeParser = (
  args: unknown,
  resourceClass: types.executors.executor.AnyResourceClass,
  reusableExecutors?: reusable.ReusableExecutor[],
  orb?: orb.OrbImport[],
) => types.job.AnyExecutor;

const subtypeParsers: ExecutorSubtypeMap = {
  docker: {
    generableType: mapping.GenerableType.DOCKER_EXECUTOR,
    parse: (args, resourceClass) => {
      const dockerArgs = args as [DockerImageShape];
      const [mainImage, ...serviceImages] = dockerArgs;
      const { image, ...properties } = mainImage;

      return new executors.DockerExecutor(
        image,
        resourceClass as types.executors.docker.DockerResourceClass,
        properties as Exclude<DockerImageShape, 'image'>,
        serviceImages,
      );
    },
  },
  machine: {
    generableType: mapping.GenerableType.MACHINE_EXECUTOR,
    parse: (args, resourceClass) => {
      const machineArgs = args as Partial<executors.MachineExecutor>;

      return new executors.MachineExecutor(
        resourceClass as types.executors.machine.MachineResourceClass,
        machineArgs.image,
      );
    },
  },
  windows: {
    generableType: mapping.GenerableType.WINDOWS_EXECUTOR,
    parse: (args, resourceClass) => {
      const machineArgs = args as Partial<executors.WindowsExecutor>;

      return new executors.WindowsExecutor(
        resourceClass as types.executors.windows.WindowsResourceClass,
        machineArgs.image,
      );
    },
  },
  macos: {
    generableType: mapping.GenerableType.MACOS_EXECUTOR,
    parse: (args, resourceClass) => {
      const macOSArgs = args as { xcode: string };

      return new executors.MacOSExecutor(
        macOSArgs.xcode,
        resourceClass as types.executors.macos.MacOSResourceClass,
      );
    },
  },
  // Parses a reusable executor by it's name
  executor: {
    generableType: mapping.GenerableType.REUSED_EXECUTOR,
    parse: (args, _, reusableExecutors, orbs) => {
      const executorArgs = args as
        | { name: string; [key: string]: unknown }
        | string;

      const isFlat = typeof executorArgs === 'string';
      const name = isFlat ? executorArgs : executorArgs.name;

      const executor = reusableExecutors?.find(
        (executor) => executor.name === name,
      );

      type ParameterParsingResult =
        | Record<string, types.parameter.components.ExecutorParameterTypes>
        | undefined;

      let parameters: ParameterParsingResult = undefined;

      if (!isFlat) {
        // destructure and ignore the name.
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { name, ...parsedParameters } = executorArgs;

        if (Object.values(parsedParameters).length > 0) {
          parameters = parsedParameters as
            | Record<string, types.parameter.components.ExecutorParameterTypes>
            | undefined;
        }
      }

      if (!executor) {
        const orbImport =
          parseOrbRef<types.parameter.literals.ExecutorParameterLiteral>(
            { [name]: parameters },
            'executors',
            orbs,
          );

        if (!orbImport) {
          throw errorParsing(
            `Reusable executor ${name} not found in config or any orb`,
          );
        }

        return new reusable.ReusedExecutor(orbImport, parameters);
      }

      return executor.reuse(parameters);
    },
  },
};

/**
 * Helper function to extract ExecutableProperties from an executable.
 */
export function extractExecutableProps(
  executable: UnknownExecutableShape,
): types.executors.executor.ExecutableProperties {
  const keys = ['description', 'shell', 'working_directory', 'environment'];
  let notNull = false;
  const values = Object.assign(
    {},
    ...keys.map((key) => {
      const value = executable[key];

      if (value) {
        notNull = true;
      }

      return { [key]: value };
    }),
  );

  return notNull ? values : undefined;
}

/**
 * Parse executor from an executable object, such as a job.
 * @param executableIn - The executable object to parse.
 * @param reusableExecutors - The reusable executors reference to use.
 * @returns An executor instance of the determined type.
 * @throws Error if a valid executor type is not found on the object.
 */
export function parseExecutor(
  executableIn: unknown,
  reusableExecutors?: reusable.ReusableExecutor[],
  orbs?: orb.OrbImport[],
): types.job.AnyExecutor {
  const executableArgs = executableIn as UnknownExecutableShape;
  let resourceClass = executableArgs.resource_class;
  let executorType:
    | types.executors.executor.ExecutorUsageLiteral
    | 'windows'
    | undefined;
  let executorKey: types.executors.executor.ExecutorUsageLiteral | undefined;
  const winPrefix = 'windows.';

  if (resourceClass?.startsWith(winPrefix)) {
    resourceClass = resourceClass.substring(
      winPrefix.length,
    ) as types.executors.windows.WindowsResourceClass;
    executorType = 'windows';
    executorKey = 'machine';
  } else {
    executorKey = Object.keys(executableArgs).find(
      (subtype) => subtype in subtypeParsers,
    ) as types.executors.executor.ExecutorLiteral | undefined;
  }

  if (!executorKey) {
    throw errorParsing(`No executor found.`);
  }

  const { generableType, parse } = subtypeParsers[executorType || executorKey];

  return parseGenerable<UnknownExecutableShape, types.job.AnyExecutor>(
    generableType,
    executableArgs,
    (args) => {
      return parse(
        args[executorKey as types.executors.executor.ExecutorUsageLiteral],
        resourceClass,
        reusableExecutors,
        orbs,
      );
    },
  );
}
/**
 * Parses a config's list of reusable executors.
 * @param executorListIn - The executor list to parse.
 * @returns An array of reusable executors.
 * @throws Error if a reusable executor is not able to be parsed.
 */
export function parseReusableExecutors(
  executorListIn: unknown,
): reusable.ReusableExecutor[] {
  const executorListArgs = executorListIn as ReusableExecutorDefinition[];

  const parsedList = Object.entries(executorListArgs).map(([name, executor]) =>
    parseReusableExecutor(name, executor),
  );

  return parsedList;
}

export function parseReusableExecutor(
  name: string,
  executableIn: unknown,
): reusable.ReusableExecutor {
  return parseGenerable<
    ReusableExecutorDefinition,
    reusable.ReusableExecutor,
    types.executors.reusable.ReusableExecutorDependencies
  >(
    mapping.GenerableType.REUSABLE_EXECUTOR,
    executableIn,
    (_, { parametersList, executor }) => {
      return new reusable.ReusableExecutor(name, executor, parametersList);
    },
    ({ parameters, ...executorArgs }) => {
      const parametersList =
        parameters &&
        (parseParameterList(
          parameters,
          mapping.ParameterizedComponent.EXECUTOR,
        ) as
          | parameters.CustomParametersList<types.parameter.literals.ExecutorParameterLiteral>
          | undefined);

      const executor = parseExecutor(
        executorArgs,
        undefined,
      ) as executors.Executor;

      return {
        parametersList,
        executor,
      };
    },
    name,
  );
}
