import { logic } from '@circleci/circleci-config-sdk';
import { parseCondition } from '../src/lib/Components/Logic';

describe('Should parse conditions', () => {
  it('Parse And condition', () => {
    expect(parseCondition({ and: [{ equal: 'value' }] })).toEqual(
      logic.and(logic.equal('value')),
    );
  });
});
