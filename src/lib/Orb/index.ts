import { mapping, orb, parameters, types } from '@circleci/circleci-config-sdk';
import { parseParameterList } from '../Components/Parameters';

export const orbImportPattern = /^(.*)\/(.*)@(([0-5])(\.[0-5])?(\.[0-5])?)$/;
export const UNDEFINED_ORB = new orb.OrbImport('', '', '', '');

/**
 * Parses high level orb import definition
 */
export function parseOrbImport(
  unknownImport: unknown,
  manifest?: types.orb.OrbImportManifest,
): orb.OrbImport | undefined {
  const [alias, orbImport] = Object.entries(
    unknownImport as Record<string, string>,
  )[0];
  const match = orbImport.match(orbImportPattern);

  if (!match) {
    return;
  }

  const [, namespace, orbName, version] = match;

  return new orb.OrbImport(
    alias,
    namespace,
    orbName,
    version,
    undefined,
    manifest,
  );
}

export function parseOrbImports(
  unknownOrbs: Record<string, unknown>,
  manifests?: Record<string, types.orb.OrbImportManifest>,
): orb.OrbImport[] | undefined {
  let orbImports: orb.OrbImport[] | undefined = undefined;

  Object.entries(unknownOrbs).forEach(([alias, orbImport]) => {
    const parsedImport = parseOrbImport(
      { [alias]: orbImport },
      manifests ? manifests[alias] : undefined,
    );

    if (parsedImport) {
      if (orbImports) {
        orbImports.push(parsedImport);
      } else {
        orbImports = [parsedImport];
      }
    }
  });

  return orbImports;
}

export function parseOrbRef<
  Literal extends types.parameter.literals.AnyParameterLiteral,
>(
  orbRefInput: Record<string, unknown> | string,
  refType: keyof types.orb.OrbImportManifest,
  orbs?: orb.OrbImport[],
): orb.OrbRef<Literal> | undefined {
  const isFlat = typeof orbRefInput === 'string';
  const orbRef = isFlat ? orbRefInput : Object.keys(orbRefInput)[0];

  if (!orbRef.includes('/')) {
    return undefined;
  }

  const [orbAlias, name] = orbRef.split('/');
  const orbImport = orbs?.find((orb) => orb.alias === orbAlias);

  if (orbImport && orbImport[refType]) {
    return orbImport[refType][name] as orb.OrbRef<Literal>;
  }
}

export type UnknownImportManifest = {
  executors?: Record<string, unknown>;
  jobs?: Record<string, unknown>;
  commands?: Record<string, unknown>;
};

export function parseManifestParameters<
  Type extends types.parameter.literals.AnyParameterLiteral,
>(
  input?: Record<string, unknown>,
  subtype?: mapping.ParameterizedComponent,
): Record<string, parameters.CustomParametersList<Type>> {
  if (!input) {
    return {};
  }

  return Object.assign(
    {},
    ...Object.entries(input).map(([key, value]) => {
      return {
        [key]: parseParameterList(value, subtype),
      };
    }),
  );
}

export function parseOrbManifest(
  input: UnknownImportManifest,
): types.orb.OrbImportManifest {
  const test = {
    executors:
      parseManifestParameters<types.parameter.literals.ExecutorParameterLiteral>(
        input.executors,
        mapping.ParameterizedComponent.EXECUTOR,
      ),
    jobs: parseManifestParameters<types.parameter.literals.JobParameterLiteral>(
      input.jobs,
      mapping.ParameterizedComponent.JOB,
    ),
    commands:
      parseManifestParameters<types.parameter.literals.CommandParameterLiteral>(
        input.commands,
        mapping.ParameterizedComponent.COMMAND,
      ),
  };

  return test;
}
