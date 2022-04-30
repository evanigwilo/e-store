import {category} from '../../../src/category';
import {supportedCategories} from '../../../lib/utils';

describe('Category Service', () => {
  it('should return supported countries for delivery', async () => {
    const response = await category();
    const body = JSON.parse(response.body);
    expect(body).toEqual(supportedCategories);
    expect(response.statusCode).toEqual(200);
  });
});
