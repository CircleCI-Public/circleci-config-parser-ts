import * as CircleCI from '@circleci/circleci-config-sdk';
import { parseReusableCommands } from '../Components/Commands';
import { parseReusableExecutors } from '../Components/Executors';
import { parseJobList } from '../Components/Job';
import { parseParameterList } from '../Components/Parameters';
import { parseWorkflowList } from '../Components/Workflow';
import { parseGenerable } from './exports/Parsing';
import { ConfigDependencies, UnknownConfigShape } from './types';
import { parse } from 'yaml';
import { parseOrbImports } from '../Orb';

/**
 * Parse a whole CircleCI config into a Config instance.
 * If input is a string, it will be passed through YAML parsing.
 * @param configIn - The config to be parsed
 * @returns A complete config
 * @throws Error if any config component not valid
 */
export function parseConfig(
  configIn: unknown,
  orbImportManifests?: Record<string, CircleCI.types.orb.OrbImportManifest>,
): CircleCI.Config {
  const configProps = (
    typeof configIn == 'string' ? parse(configIn) : configIn
  ) as UnknownConfigShape;

  return parseGenerable<
    UnknownConfigShape,
    CircleCI.Config,
    ConfigDependencies
  >(
    CircleCI.mapping.GenerableType.CONFIG,
    configProps,
    (
      config,
      {
        jobList,
        workflows,
        executorList,
        commandList,
        parameterList,
        orbImportList,
      },
    ) => {
      return new CircleCI.Config(
        config.setup,
        jobList,
        workflows,
        executorList as CircleCI.reusable.ReusableExecutor[] | undefined,
        commandList as CircleCI.reusable.ReusableCommand[] | undefined,
        parameterList as CircleCI.parameters.CustomParametersList<CircleCI.types.parameter.literals.PipelineParameterLiteral>,
        orbImportList,
      );
    },
    (config) => {
      const orbImportList =
        config.orbs && parseOrbImports(config.orbs, orbImportManifests);
      const executorList =
        config.executors && parseReusableExecutors(config.executors);
      const commandList =
        config.commands &&
        parseReusableCommands(config.commands, orbImportList);
      const parameterList =
        config.parameters && parseParameterList(config.parameters);
      const jobList = parseJobList(
        config.jobs,
        commandList,
        executorList,
        orbImportList,
      );
      const workflows = parseWorkflowList(
        config.workflows,
        jobList,
        orbImportList,
      );

      return {
        jobList,
        workflows,
        executorList,
        commandList,
        parameterList,
        orbImportList,
      };
    },
  );
}

// Parser exports
export * from '../Components/Commands';
export * from '../Components/Executors';
export * from '../Components/Job';
export * from '../Components/Parameters';
export * from '../Components/Workflow';
export * from '../Orb';
