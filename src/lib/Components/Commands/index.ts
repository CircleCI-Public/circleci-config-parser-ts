import {
  commands,
  mapping,
  orb,
  parameters,
  reusable,
  types,
} from '@circleci/circleci-config-sdk';
import { OrbImport } from '@circleci/circleci-config-sdk/dist/src/lib/Orb';
import { parseGenerable, errorParsing } from '../../Config/exports/Parsing';
import { parseOrbRef } from '../../Orb';
import { parseParameterList } from '../Parameters';

const nativeSubtypes: types.command.CommandSubtypeMap = {
  restore_cache: {
    generableType: mapping.GenerableType.RESTORE,
    parse: (args) =>
      new commands.cache.Restore(args as commands.cache.RestoreCacheParameters),
  },
  save_cache: {
    generableType: mapping.GenerableType.SAVE,
    parse: (args) =>
      new commands.cache.Save(args as commands.cache.SaveCacheParameters),
  },
  attach_workspace: {
    generableType: mapping.GenerableType.ATTACH,
    parse: (args) =>
      new commands.workspace.Attach(
        args as commands.workspace.AttachParameters,
      ),
  },
  persist_to_workspace: {
    generableType: mapping.GenerableType.PERSIST,
    parse: (args) =>
      new commands.workspace.Persist(
        args as commands.workspace.PersistParameters,
      ),
  },
  add_ssh_keys: {
    generableType: mapping.GenerableType.ADD_SSH_KEYS,
    parse: (args) =>
      new commands.AddSSHKeys(args as commands.AddSSHKeysParameters),
  },
  checkout: {
    generableType: mapping.GenerableType.CHECKOUT,
    parse: (args) => new commands.Checkout(args as commands.CheckoutParameters),
  },
  run: {
    generableType: mapping.GenerableType.RUN,
    parse: (args) => {
      if (typeof args === 'string') {
        return new commands.Run({ command: args as string });
      }

      return new commands.Run(args as commands.RunParameters);
    },
  },
  setup_remote_docker: {
    generableType: mapping.GenerableType.SETUP_REMOTE_DOCKER,
    parse: (args) =>
      new commands.SetupRemoteDocker(
        args as commands.SetupRemoteDockerParameters,
      ),
  },
  store_artifacts: {
    generableType: mapping.GenerableType.STORE_ARTIFACTS,
    parse: (args) =>
      new commands.StoreArtifacts(args as commands.StoreArtifactsParameters),
  },
  store_test_results: {
    generableType: mapping.GenerableType.STORE_TEST_RESULTS,
    parse: (args) =>
      new commands.StoreTestResults(
        args as commands.StoreTestResultsParameters,
      ),
  },
};

/**
 * Parses a list of steps into a list of commands.
 * @param stepsListIn - The steps from a job or custom command.
 * @param commands - The custom command list to refer to when a step is a reusable command.
 * @returns A list of parsed commands.
 */
export function parseSteps(
  stepsListIn: unknown,
  commands?: reusable.ReusableCommand[],
  orbs?: orb.OrbImport[],
): types.command.Command[] {
  return parseGenerable<
    Record<string, unknown>[],
    types.command.Command[],
    { steps: types.command.Command[] }
  >(
    mapping.GenerableType.STEP_LIST,
    stepsListIn,
    (_, { steps }) => steps,
    (stepsListIn) => {
      return {
        steps: stepsListIn.map((subtype) => {
          if (typeof subtype === 'string') {
            return parseStep(subtype, undefined, commands, orbs);
          }

          const commandName = Object.keys(subtype)[0];

          return parseStep(commandName, subtype[commandName], commands, orbs);
        }),
      };
    },
  );
}

/**
 * Parse an unknown step into a native or reusable command.
 * If the step name is a not a native command, the
 * @param name - The name of the command.
 * @param args - The arguments to the command.
 * @param commands - Only required when parsing reusable commands
 * @returns Command or ReusedCommand
 */
export function parseStep(
  name: string,
  args?: unknown,
  commands?: reusable.ReusableCommand[],
  orbs?: orb.OrbImport[],
): types.command.Command {
  if (name in nativeSubtypes) {
    const commandMapping =
      nativeSubtypes[name as types.command.NativeCommandLiteral];

    return parseGenerable<
      types.command.CommandParameters | undefined,
      types.command.Command
    >(commandMapping.generableType, args, commandMapping.parse);
  }

  if (commands || orbs) {
    return parseGenerable<
      types.command.CommandParameters,
      reusable.ReusedCommand
    >(
      mapping.GenerableType.REUSED_COMMAND,
      args ?? name,
      (parameterArgs) => {
        const command =
          parseOrbRef<types.parameter.literals.CommandParameterLiteral>(
            typeof name === 'string' ? name : { [name]: args },
            'commands',
            orbs,
          ) || commands?.find((c) => c.name === name);

        if (!command) {
          throw errorParsing(
            `Custom Command ${name} not found in command list.`,
          );
        }

        return new reusable.ReusedCommand(
          command,
          args ? parameterArgs : undefined,
        );
      },
      undefined,
      name,
    );
  }

  throw errorParsing(`Unknown native command: ${name}`);
}

/**
 * Parse a config's list of custom commands, to later be referenced by ReusedCommands.
 * @param commandListIn - The list of custom commands to parse.ReusableCommand
 * @param orbs - The list of orbs which custom commands reference
 * @returns A list of custom commands.
 */
export function parseReusableCommands(
  commandListIn: { [key: string]: unknown },
  orbs?: OrbImport[],
): reusable.ReusableCommand[] {
  const parsed: reusable.ReusableCommand[] = [];

  Object.entries(commandListIn).forEach(([name, args]) => {
    const command = parseReusableCommand(name, args, parsed, orbs);
    parsed.push(command);
  });

  return parsed;
}

/**
 * Parse a single custom command.
 * @param name - The name of the command.
 * @param args - The arguments of the command.
 * @param custom_commands - A reference list of custom commands to use for nested custom commands.
 * @returns A custom command.
 * @throws Error if the custom command is not valid.
 */
export function parseReusableCommand(
  name: string,
  args: unknown,
  custom_commands?: reusable.ReusableCommand[],
  orbs?: OrbImport[],
): reusable.ReusableCommand {
  return parseGenerable<
    types.command.ReusableCommandBodyShape,
    reusable.ReusableCommand,
    types.command.ReusableCommandDependencies
  >(
    mapping.GenerableType.REUSABLE_COMMAND,
    args,
    (commandArgs, { parametersList, steps }) => {
      return new reusable.ReusableCommand(
        name,
        steps,
        parametersList,
        commandArgs.description,
      );
    },
    (commandArgs) => {
      const parametersList =
        commandArgs.parameters &&
        (parseParameterList(
          commandArgs.parameters,
          mapping.ParameterizedComponent.COMMAND,
        ) as parameters.CustomParametersList<types.parameter.literals.CommandParameterLiteral>);

      const steps = parseSteps(commandArgs.steps, custom_commands, orbs);

      return { parametersList, steps };
    },
    name,
  );
}
