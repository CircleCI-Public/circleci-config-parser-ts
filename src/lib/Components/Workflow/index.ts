import * as CircleCI from '@circleci/circleci-config-sdk';
import { parseGenerable, errorParsing } from '../../Config/exports/Parsing';
import { parseOrbRef } from '../../Orb';
import { parseSteps } from '../Commands';

export type UnknownWorkflowShape = {
  jobs: {
    [key: string]: unknown;
  }[];
};

export type UnknownWorkflowJobShape = {
  requires?: string[];

  parameters?: {
    [key: string]: unknown;
  };
  matrix?: { parameters: Record<string, string[]> };
  'pre-steps'?: unknown[];
  'post-steps'?: unknown[];
  name?: string;
  type?: 'approval';
};

/**
 * Parse a workflow's job reference.
 * Each job referenced by a workflow job must exist in the jobs list.
 * @param name - name of the workflow job.
 * @param workflowJobIn - the workflow job object to be parsed.
 * @param jobs - a list of reference jobs to be used when parsing steps.
 * @returns A workflow job.
 * @throws Error if the workflow job's reference is not in the job list.
 */
export function parseWorkflowJob(
  name: string,
  workflowJobIn: unknown,
  jobs: CircleCI.Job[],
  orbs?: CircleCI.orb.OrbImport[],
): CircleCI.workflow.WorkflowJobAbstract {
  return parseGenerable<
    UnknownWorkflowJobShape,
    CircleCI.workflow.WorkflowJobAbstract
  >(
    CircleCI.mapping.GenerableType.WORKFLOW_JOB,
    workflowJobIn,
    (workflowJobArgs) => {
      let args = workflowJobArgs;
      let parsedPresteps, parsedPoststeps, matrix;

      if (args) {
        if ('pre-steps' in args) {
          const { 'pre-steps': steps, ...argsRestTemp } = args;
          parsedPresteps = steps
            ? parseSteps(steps, undefined, orbs)
            : undefined;
          args = argsRestTemp;
        }

        if ('post-steps' in args) {
          const { 'post-steps': steps, ...argsRestTemp } = args;
          parsedPoststeps = steps
            ? parseSteps(steps, undefined, orbs)
            : undefined;
          args = argsRestTemp;
        }

        // we reduce matrix to be without the parameters key.
        if ('matrix' in args) {
          const { matrix: tempMatrix, ...argsRestTemp } = args;
          matrix = tempMatrix?.parameters;

          args = argsRestTemp;
        }
      }

      const parameters = (matrix ? { ...args, matrix } : args) as
        | CircleCI.types.workflow.WorkflowJobParameters
        | undefined;

      if (workflowJobArgs?.type === 'approval') {
        return new CircleCI.workflow.WorkflowJobApproval(name, parameters);
      }

      const job =
        parseOrbRef(name, 'jobs', orbs) || jobs.find((c) => c.name === name);

      if (job) {
        return new CircleCI.workflow.WorkflowJob(
          job,
          parameters,
          parsedPresteps,
          parsedPoststeps,
        );
      }

      throw errorParsing(`Job ${name} not found in config`);
    },
    undefined,
    name,
  );
}

/**
 * Parse a single workflow.
 * @param name - name of the workflow.
 * @param workflowIn - the workflow to be parsed.
 * @param jobs - a list of reference jobs to be used when parsing workflow jobs.
 * @returns A workflow.
 * @throws Error if the workflow is not valid.
 */
export function parseWorkflow(
  name: string,
  workflowIn: unknown,
  jobs: CircleCI.Job[],
  orbs?: CircleCI.orb.OrbImport[],
): CircleCI.Workflow {
  return parseGenerable<
    UnknownWorkflowShape,
    CircleCI.Workflow,
    CircleCI.types.workflow.WorkflowDependencies
  >(
    CircleCI.mapping.GenerableType.WORKFLOW,
    workflowIn,
    (_, { jobList }) => new CircleCI.Workflow(name, jobList),
    (workflowArgs) => {
      const jobList = workflowArgs.jobs.map((job) => {
        if (typeof job === 'string') {
          return parseWorkflowJob(job, undefined, jobs, orbs);
        }

        const [name, args] = Object.entries(job)[0];

        return parseWorkflowJob(name, args, jobs, orbs);
      });

      return { jobList };
    },
    name,
  );
}

/**
 * Parse a config's list of workflows.
 * @param workflowIn - the workflow to be parsed.
 * @param jobs - a list of reference jobs to be used when parsing workflow jobs.
 * @returns A list of workflow.
 * @throws Error if any workflow fails to parse.
 */
export function parseWorkflowList(
  workflowsIn: unknown,
  jobs: CircleCI.Job[],
  orbs?: CircleCI.orb.OrbImport[],
): CircleCI.Workflow[] {
  const workflowList = Object.entries(
    workflowsIn as {
      [name: string]: UnknownWorkflowShape;
    },
  ).map(([name, workflow]) => parseWorkflow(name, workflow, jobs, orbs));

  return workflowList;
}
