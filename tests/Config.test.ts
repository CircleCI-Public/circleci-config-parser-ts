import { parse } from 'yaml';
import * as CircleCI from '@circleci/circleci-config-sdk';
import * as ConfigParser from '../src/index';
import {
  parseGenerable,
  setLogParsing,
} from '../src/lib/Config/exports/Parsing';

describe('Parse a CircleCI Config', () => {
  const myConfig = new CircleCI.Config(true);

  myConfig.defineParameter('greeting', 'string', 'hello world');

  const configResult = myConfig.generate();
  it('Should produce a blank config with parameters', () => {
    expect(ConfigParser.parsers.parseConfig(configResult)).toEqual(myConfig);
  });

  it('Should be fully circular', () => {
    setLogParsing(true);
    expect(
      ConfigParser.parsers.parseConfig(parse(myConfig.stringify())),
    ).toEqual(myConfig);
    setLogParsing(false);
  });

  it('Should be fully circular and parsable as string', () => {
    expect(ConfigParser.parsers.parseConfig(myConfig.generate())).toEqual(
      myConfig,
    );
  });

  it('Should throw error when parsing returns undefined', () => {
    expect(() => {
      parseGenerable(
        CircleCI.mapping.GenerableType.CONFIG,
        configResult,
        () => undefined,
      );
    }).toThrowError();
  });
});
