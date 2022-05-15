// 👇 Import the RTK Query methods from the React-specific entry point
import {
  createEntityAdapter,
  // createSelector,
  // EntityState,
} from "@reduxjs/toolkit";
import {
  createApi,
  fetchBaseQuery,
  FetchBaseQueryError,
} from "@reduxjs/toolkit/query/react";
import { apiVersion } from "../../utils/constants";
import { editImage } from "../../utils/helpers";
import {
  KeyValue,
  Product,
  QueryParams,
  QueryProduct,
  ToastStatusUpdate,
  Order,
  QueryOrder,
} from "../../utils/types";
import { RootState, store } from "../store";

const productsAdapterSort = createEntityAdapter<Partial<Product>>({
  selectId: (product) => product.id!,
});
// 👇 adapter to fake popularity sorting based on product ids
const productsAdapterPopularity = createEntityAdapter<Partial<Product>>({
  selectId: (product) => product.id!,
  sortComparer: (a, b) =>
    a.id!.localeCompare(b.id!, undefined, { numeric: true }),
});
const ordersAdapter = createEntityAdapter<Order>({
  selectId: (order) => order.intent,
});

type LastKey = {
  lastKey?: KeyValue<KeyValue>;
};
const initialStateProductPopularity =
  productsAdapterPopularity.getInitialState<LastKey>({});
const initialStateProductSort = productsAdapterSort.getInitialState<LastKey>(
  {}
);
const initialStateOrder = ordersAdapter.getInitialState<LastKey>({});

type initialStateProductType = typeof initialStateProductPopularity;
type initialStateOrderType = typeof initialStateOrder;

const headers = new Headers();
headers.append("Content-Type", "application/json");
headers.append("Accept", "application/json");

const fetchError = (fetchError: FetchBaseQueryError) => {
  const error = fetchError.data as KeyValue;
  const notKnown = error?.message || error?.name || error?.code;

  return {
    error: {
      status: fetchError.status,
      unknown:
        notKnown === "Forbidden" || notKnown === "NotAuthorizedException"
          ? "You are not authorized to perform this action."
          : notKnown || fetchError.status,
    } as unknown as FetchBaseQueryError,
  };
};

export const querySlice = createApi({
  reducerPath: "query",
  baseQuery: fetchBaseQuery({
    baseUrl: process.env.NEXT_PUBLIC_SERVER_BASE_URL + apiVersion,
  }),
  serializeQueryArgs: ({ queryArgs }) => {
    const { key, sort, category, limit, page } =
      queryArgs as unknown as QueryParams;
    // 👇 custom cache key
    return key + (category || "") + (limit || 0) + (sort || "") + page;
  },
  endpoints: (builder) => ({
    /*
      query: ({ category, limit, body }) => ({
        url: "/products",
        method: "POST",
        body,
        params: { category, limit },
      }),
      */

    /*
      transformResponse: (
        response: { QueryProduct },
        meta,
        { category }
      ) => {
        const {
          result: { lastKey, queryResult },
        } = response;

        const transformData = {
          ...productsAdapter.upsertMany(
            initialState,queryResult
          ),
          lastKey,
        };
        console.log({ meta });

        // console.log({ productsAdapter, value, initialState });
        return transformData;
      },
      */

    products: builder.query<initialStateProductType, QueryParams>({
      queryFn: async (
        { key, sort, category, body, limit, page, productId },
        { getState },
        _,
        fetchWithBQ
      ) => {
        const fetchData = await fetchWithBQ({
          headers,
          url: productId ? "/product/" + productId : "/products",
          method: productId ? "GET" : "POST",
          body,
          params: productId ? undefined : { sort, category, limit },
        });

        // console.log({ fetchData });

        if (fetchData.error) {
          return fetchError(fetchData.error);
        }
        if (productId) {
          const product = fetchData.data;
          return {
            data: product
              ? {
                  entities: {
                    [productId]: product as Product,
                  },
                  ids: [productId],
                }
              : {
                  ids: [],
                  entities: {},
                },
          };
        }
        const { lastKey, queryResult } = fetchData.data as QueryProduct;

        const state = getState() as RootState;

        const prevData = querySlice.endpoints.products.select({
          key,
          category: category || "",
          limit: limit || 0,
          sort: sort || "",
          page: page - 1,
        })(state).data as initialStateProductType;

        const currentData = sort
          ? productsAdapterSort.setAll(
              initialStateProductPopularity,
              queryResult
            )
          : productsAdapterPopularity.setAll(
              initialStateProductSort,
              queryResult
            );
        return {
          data: {
            entities: {
              ...(prevData && prevData.entities),
              ...currentData.entities,
            },
            ids: prevData
              ? [...prevData.ids, ...currentData.ids]
              : currentData.ids,
            lastKey,
          },
        };
      },
      // 👇 how long RTK Query will keep your data cached is seconds
      keepUnusedDataFor: 60 * 3, // 3 mins
    }),
    orders: builder.query<initialStateOrderType, QueryParams>({
      queryFn: async (
        { key, category, body, limit, page },
        { getState },
        _,
        fetchWithBQ
      ) => {
        const fetchData = await fetchWithBQ({
          headers,
          mode: "cors",
          credentials: "include",
          url: "/order",
          method: "POST",
          body,
          params: { category, limit },
        });

        if (fetchData.error) {
          return fetchError(fetchData.error);
        }

        const { lastKey, queryResult } = fetchData.data as QueryOrder;

        const state = getState() as RootState;

        const prevData = querySlice.endpoints.orders.select({
          key,
          category: category || "",
          limit: limit || 0,
          page: page - 1,
        })(state).data as initialStateOrderType;

        const currentData = ordersAdapter.setAll(
          initialStateOrder,
          queryResult
        );

        return {
          data: {
            entities: {
              ...(prevData && prevData.entities),
              ...currentData.entities,
            },
            ids: prevData
              ? [...prevData.ids, ...currentData.ids]
              : currentData.ids,
            lastKey,
          },
        };
      },
      // 👇 how long RTK Query will keep your data cached is seconds
      keepUnusedDataFor: 60 * 5, // 5 mins
    }),
  }),
});

// Export the auto-generated hook for the `getQuery` query endpoint
export const { useProductsQuery, useOrdersQuery } = querySlice;

/*
export const selectProducts = querySlice.endpoints.products.select({});

const selectProductData = createSelector(selectProducts, (usersResult) => {
  console.log({ usersResult, querySlice });
  return usersResult.data;
});

export const selectProduct = productsAdapter.getSelectors<RootState>(
  (state) => selectProductData(state) || initialState
);
*/

// 👇 remove product from cache
export const removeProduct = (id: string, params: QueryParams) => {
  const { dispatch } = store;
  dispatch(
    querySlice.util.updateQueryData("products", params, (draft) => {
      productsAdapterPopularity.removeOne(draft, id);
    })
  );
};
// 👇 update product in cache
export const updateProduct = (
  update: ToastStatusUpdate,
  params: QueryParams
) => {
  const { product, image } = update;
  const { id } = product;

  if (!id) {
    return;
  }

  const { dispatch } = store;
  dispatch(
    querySlice.util.updateQueryData("products", params, (draft) => {
      Object.entries(image).forEach(([key, slot]) =>
        editImage(product, key, slot)
      );
      if (draft.entities[id]) {
        productsAdapterPopularity.updateOne(draft, {
          id,
          changes: product,
        });
      } else {
        productsAdapterPopularity.addOne(draft, product);
      }
    })
  );
};
