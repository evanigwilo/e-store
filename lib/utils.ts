/*
Types
*/
export interface KeyValue<T = string> {
  [key: string]: T;
}
/*
Method
*/
/*
Constants
*/
export const origins = [
  'http://localhost:3000',
  'https://editor.swagger.io', // Allow testing api from swagger.io origin
  'https://petstore.swagger.io',
  'https://app.e-store.gq',
  'https://en.e-store.gq:3000',
];
export const constants = {
  readsPerQuery: 10,
  orderTable: 'orderTable',
  productTable: 'productTable',
  cartIntent: 'cart',
  cartStatus: 'IN CART',
  orderLogs: '-',
  categoryIndex: 'category-index',
  groups: {
    admin: 'admin_group',
    product: 'manage_product_group',
  },
};
export const S3Constants = {
  productImages: 'bucket-product-images',
};
