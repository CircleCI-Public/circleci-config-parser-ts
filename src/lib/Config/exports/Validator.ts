import Ajv, { ErrorObject, SchemaObject } from 'ajv';
import { ValidationMap, ValidationResult } from '../types/Validator.types';

import { schemas } from '../../..';
import { mapping, types } from '@circleci/circleci-config-sdk';

const schemaRegistry: ValidationMap = {
  [mapping.GenerableType.ORB]: {},
  [mapping.GenerableType.ORB_IMPORT]: {},
  [mapping.GenerableType.ORB_REF]: {},

  [mapping.GenerableType.CONFIG]: schemas.ConfigSchema,
  [mapping.GenerableType.REUSABLE_COMMAND]:
    schemas.command.reusable.ReusableCommandSchema,
  [mapping.GenerableType.REUSED_COMMAND]:
    schemas.command.reusable.ReusedCommandSchema,
  [mapping.GenerableType.RESTORE]: schemas.command.cache.RestoreSchema,
  [mapping.GenerableType.SAVE]: schemas.command.cache.SaveSchema,
  [mapping.GenerableType.ATTACH]:
    schemas.command.workspace.AttachWorkspaceSchema,
  [mapping.GenerableType.PERSIST]: schemas.command.workspace.PersistSchema,
  [mapping.GenerableType.ADD_SSH_KEYS]: schemas.command.AddSSHKeysSchema,
  [mapping.GenerableType.CHECKOUT]: schemas.command.CheckoutSchema,
  [mapping.GenerableType.RUN]: schemas.command.RunSchema,
  [mapping.GenerableType.SETUP_REMOTE_DOCKER]:
    schemas.command.SetupRemoteDockerSchema,
  [mapping.GenerableType.STORE_ARTIFACTS]: schemas.command.StoreArtifactsSchema,
  [mapping.GenerableType.STORE_TEST_RESULTS]:
    schemas.command.StoreTestResultsSchema,

  [mapping.GenerableType.ANY_EXECUTOR]: schemas.executor.ExecutorSchema,
  [mapping.GenerableType.DOCKER_EXECUTOR]:
    schemas.executor.DockerExecutableSchema,
  [mapping.GenerableType.MACHINE_EXECUTOR]:
    schemas.executor.MachineExecutableSchema,
  [mapping.GenerableType.MACOS_EXECUTOR]:
    schemas.executor.MacOSExecutableSchema,
  [mapping.GenerableType.WINDOWS_EXECUTOR]:
    schemas.executor.WindowsExecutableSchema,
  [mapping.GenerableType.REUSABLE_EXECUTOR]:
    schemas.executor.reusable.ReusableExecutorSchema,
  [mapping.GenerableType.REUSABLE_EXECUTOR_LIST]:
    schemas.executor.reusable.ReusableExecutorsListSchema,
  [mapping.GenerableType.REUSED_EXECUTOR]:
    schemas.executor.reusable.ReusableExecutorUsageSchema,

  [mapping.GenerableType.STEP]: schemas.command.steps.StepSchema,
  [mapping.GenerableType.STEP_LIST]: schemas.command.steps.StepsSchema,
  [mapping.GenerableType.JOB]: schemas.JobSchema,
  [mapping.GenerableType.WORKFLOW_JOB]: schemas.workflow.WorkflowJobSchema,
  [mapping.GenerableType.WORKFLOW]: schemas.workflow.WorkflowSchema,

  [mapping.GenerableType.CUSTOM_PARAMETER]: {
    /* Custom Parameter Config Components */
    [mapping.ParameterizedComponent.JOB]: schemas.parameter.JobParametersSchema,
    [mapping.ParameterizedComponent.COMMAND]:
      schemas.parameter.CommandParametersSchema,
    [mapping.ParameterizedComponent.EXECUTOR]:
      schemas.parameter.ExecutorParametersSchema,
    [mapping.ParameterizedComponent.PIPELINE]:
      schemas.parameter.PipelineParametersSchema,
    /** Custom Parameter Generics */
    [mapping.ParameterSubtype.STRING]:
      schemas.parameter.types.StringParameterSchema,
    [mapping.ParameterSubtype.BOOLEAN]:
      schemas.parameter.types.BooleanParameterSchema,
    [mapping.ParameterSubtype.INTEGER]:
      schemas.parameter.types.IntegerParameterSchema,
    [mapping.ParameterSubtype.EXECUTOR]:
      schemas.parameter.types.ExecutorParameterSchema,
    [mapping.ParameterSubtype.STEPS]:
      schemas.parameter.types.StepsParameterSchema,
    [mapping.ParameterSubtype.ENV_VAR_NAME]:
      schemas.parameter.types.EnvVarNameParameterSchema,
  },
  [mapping.GenerableType.CUSTOM_ENUM_PARAMETER]:
    schemas.parameter.types.EnumParameterSchema,
  [mapping.GenerableType.CUSTOM_PARAMETERS_LIST]: {
    [mapping.ParameterizedComponent.JOB]:
      schemas.parameter.lists.JobParameterListSchema,
    [mapping.ParameterizedComponent.COMMAND]:
      schemas.parameter.lists.CommandParameterListSchema,
    [mapping.ParameterizedComponent.EXECUTOR]:
      schemas.parameter.lists.ExecutorParameterListSchema,
    [mapping.ParameterizedComponent.PIPELINE]:
      schemas.parameter.lists.PipelineParameterListSchema,
  },

  [mapping.GenerableType.WHEN]: schemas.logic.ConditionsSchema,
  [mapping.GenerableType.AND]: schemas.logic.AndConditionSchema,
  [mapping.GenerableType.NOT]: schemas.logic.NotConditionSchema,
  [mapping.GenerableType.OR]: schemas.logic.OrConditionSchema,
  [mapping.GenerableType.EQUAL]: schemas.logic.EqualConditionSchema,
  [mapping.GenerableType.TRUTHY]: schemas.logic.TruthyConditionSchema,
};

/**
 * An Ajv object that can validate a config and it's components
 * Does not handle validation of parameter usage.
 */
export class Validator extends Ajv {
  private static instance: Validator;

  public static validateOnParse: boolean;

  private constructor() {
    super({ allowUnionTypes: true, strict: false });

    Object.values(schemaRegistry).forEach((source) => {
      if ('$id' in source) {
        const schema = source as SchemaObject;
        this.addSchema(schema, schema.$id);
      } else {
        Object.values(source).forEach((schema) => {
          this.addSchema(schema, schema.$id);
        });
      }
    });
  }

  /**
   * Access a generic singleton instance of the ConfigValidator
   * Useful if validating components without a Config object
   * Use the config's validator if Config has parameterized components.
   * @returns generic instance of ConfigValidator
   */

  static getInstance(): Validator {
    if (!Validator.instance) {
      Validator.instance = new Validator();
    }

    return Validator.instance;
  }

  /**
   * Validate an unknown generable config object
   * @param generable - The class name of a generable config component
   * @param subtype - The subtype of the config component - Required for CustomParameter
   * @returns
   */
  static validateGenerable(
    generable: mapping.GenerableType,
    input: unknown,
    subtype?: types.config.mapping.GenerableSubtypes,
  ): ValidationResult {
    const schemaSource = schemaRegistry[generable];

    if ('$id' in schemaSource) {
      const schema = schemaSource as SchemaObject;

      return Validator.getInstance().validateComponent(schema, input || null);
    } else if (subtype !== undefined && subtype in schemaSource) {
      const schema = schemaSource[subtype] as ValidationMap;

      return Validator.getInstance().validateComponent(schema, input || null);
    } else {
      throw new Error(`No validator found for ${generable}:${subtype}`);
    }
  }

  validateComponent(schema: SchemaObject, data: unknown): ValidationResult {
    const valid = super.validate(schema, data);

    if (!valid && Array.isArray(this.errors) && data) {
      return { schema, data, errors: this.errors as ErrorObject[] };
    }

    return valid;
  }
}
