import {country} from '../../../src/country';
import {supportedCountries} from '../../../lib/utils';

describe('Country Service', () => {
  it('should return supported countries for delivery', async () => {
    const response = await country();
    const body = JSON.parse(response.body);
    expect(body).toEqual(supportedCountries);
    expect(response.statusCode).toEqual(200);
  });
});
