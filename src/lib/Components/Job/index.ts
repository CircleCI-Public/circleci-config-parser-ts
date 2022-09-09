import {
  Job,
  mapping,
  orb,
  parameters,
  reusable,
  types,
} from '@circleci/circleci-config-sdk';
import { parseGenerable } from '../../Config/exports/Parsing';
import { parseSteps } from '../Commands';
import {
  extractExecutableProps,
  parseExecutor,
  UnknownExecutableShape,
} from '../Executors';
import { parseParameterList } from '../Parameters';

/**
 * Parse a config's list of jobs into a list of Job instances.
 *
 * @param jobListIn - The high level list of jobs to be parsed
 * @param ReusableCommands - The reference list of custom commands to be used when parsing reusable command steps
 * @param reusableExecutors - The reference list of reusable executors to be used
 * @returns A list of jobs
 * @throws Error if a job is not valid
 */
export function parseJobList(
  jobListIn: { [key: string]: unknown },
  ReusableCommands?: reusable.ReusableCommand[],
  reusableExecutors?: reusable.ReusableExecutor[],
  orbs?: orb.OrbImport[],
): Job[] {
  return Object.entries(jobListIn).map(([name, args]) =>
    parseJob(name, args, ReusableCommands, reusableExecutors, orbs),
  );
}

/**
 * Parse a single job into a Job instance.
 * ParameterizedJobs are assumed if `jobIn` contains the parameter key.
 *
 * @param name - The name of the job.
 * @param jobIn - The job to be parsed.
 * @param ReusableCommands - The reference list of custom commands to be used for parsing reusable command steps.
 * @param reusableExecutors - The reference list of reusable executors to be used.
 * @returns A generic or parameterized job.
 * @throws Error if the job is not valid.
 */
export function parseJob(
  name: string,
  jobIn: unknown,
  ReusableCommands?: reusable.ReusableCommand[],
  reusableExecutors?: reusable.ReusableExecutor[],
  orbs?: orb.OrbImport[],
): Job {
  return parseGenerable<UnknownJobShape, Job, types.job.JobDependencies>(
    mapping.GenerableType.JOB,
    jobIn,
    (jobIn, { executor, steps, parametersList }) => {
      const optionalProps = {
        ...extractExecutableProps(jobIn as UnknownExecutableShape),
        parallelism: jobIn.parallelism,
      };

      if (parametersList) {
        return new reusable.ParameterizedJob(
          name,
          executor,
          parametersList,
          steps,
        );
      }

      return new Job(name, executor, steps, optionalProps);
    },
    (jobArgs) => {
      let parametersList;

      const executor = parseExecutor(jobArgs, reusableExecutors, orbs);
      const steps = parseSteps(jobArgs.steps, ReusableCommands, orbs);

      if (jobArgs.parameters) {
        parametersList = parseParameterList(
          jobArgs.parameters,
          mapping.ParameterizedComponent.JOB,
        ) as parameters.CustomParametersList<types.parameter.literals.JobParameterLiteral>;
      }

      return { executor, steps, parametersList };
    },
    name,
  );
}

export type UnknownJobShape = {
  [key: string]: unknown;
  steps: {
    [key: string]: unknown;
  }[];
  resource_class: string;
  parameters?: {
    [key: string]: unknown;
  };
  environment?: {
    [key: string]: string;
  };
  shell: string;
  working_directory: string;
  parallelism: number;
};
