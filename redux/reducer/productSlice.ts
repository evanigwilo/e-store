import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { AxiosError } from "axios";

import { RootState } from "../store";
import { categoryType } from "utils/constants";
import { authenticationError, rejectError } from "../../utils/helpers";
import { KeyValue, Product, QueryProduct } from "../../utils/types";
import axios from "../../services/axios";

interface ProductStateDefault {
  pending: boolean;
  error: KeyValue;
  result: Partial<Product>;
}
interface ProductState {
  createUpdateGet: ProductStateDefault;
  delete: ProductStateDefault;
  query: {
    pending: boolean;
    error: KeyValue;
    result: Product[];
  };
  image: {
    pending: KeyValue<Boolean>;
    result: KeyValue;
    error: KeyValue;
  };
  category: {
    fetched: boolean;
    result: (keyof typeof categoryType)[];
  };
}
const initialStateResult = {
  pending: false,
  result: {},
  error: {},
};

const initialState: ProductState = {
  createUpdateGet: {
    ...initialStateResult,
  },
  delete: {
    ...initialStateResult,
  },
  query: {
    ...initialStateResult,
    result: [],
  },
  image: {
    ...initialStateResult,
    pending: {},
  },
  category: {
    fetched: false,
    result: [],
  },
};

const productSlice = createSlice({
  name: "product",
  initialState,
  reducers: {
    clearCreateUpdateGetResult: (state) => {
      state.createUpdateGet.result = initialState.createUpdateGet.result;
    },
    clearCreateUpdateGetError: (state) => {
      state.createUpdateGet.error = initialState.createUpdateGet.error;
    },
    clearDeleteError: (state) => {
      state.delete.error = initialState.delete.error;
    },
    setCreateUpdateGetError: (state, action) => {
      const error = action.payload as KeyValue;
      state.createUpdateGet.error = {
        ...state.createUpdateGet.error,
        ...error,
      };
    },
    clearImageError: (state, action) => {
      const slots = action.payload as number[];
      slots.forEach((slot) => {
        delete state.image.error[slot];
      });
    },
  },
  extraReducers: (builder) => {
    builder
      //
      .addCase(categoryAsync.fulfilled, (state, action) => {
        state.category.fetched = true;
        state.category.result = action.payload!;
      })
      //
      .addCase(createUpdateProductAsync.pending, (state) => {
        state.createUpdateGet.pending = true;
      })
      .addCase(createUpdateProductAsync.rejected, (state, action) => {
        const error = action.payload as KeyValue;
        const notKnown = error?.message || error?.name || error?.code;
        const value: KeyValue = {};
        if (error?.name === "InvalidNameException")
          value.product = "Product name is not valid.";
        else if (error?.name === "InvalidCategoryException")
          value.category = "Category is not valid.";
        else if (error?.name === "InvalidPriceException")
          value.price = "Price is not valid.";
        else value.unknown = notKnown;
        authenticationError(value, error);

        state.createUpdateGet.error = value;
        state.createUpdateGet.pending = false;
      })
      .addCase(createUpdateProductAsync.fulfilled, (state, action) => {
        state.createUpdateGet = {
          pending: false,
          result: action.payload,
          error: initialState.createUpdateGet.error,
        };
      })
      //
      .addCase(getProductAsync.pending, (state) => {
        state.createUpdateGet.pending = true;
      })
      .addCase(getProductAsync.rejected, (state, action) => {
        const error = action.payload as KeyValue;
        const notKnown = error?.message || error?.name || error?.code;
        state.createUpdateGet.error =
          error?.name === "InvalidProductIdException"
            ? { product: "Product id is not valid." }
            : { unknown: notKnown };
        state.createUpdateGet.pending = false;
      })
      .addCase(getProductAsync.fulfilled, (state, action) => {
        state.createUpdateGet = {
          pending: false,
          result: action.payload,
          error: initialState.createUpdateGet.error,
        };
      })
      //
      .addCase(deleteProductAsync.pending, (state) => {
        state.delete.pending = true;
      })
      .addCase(deleteProductAsync.rejected, (state, action) => {
        const error = action.payload as KeyValue;
        const notKnown = error?.message || error?.name || error?.code;
        const value: KeyValue = { unknown: notKnown };
        authenticationError(value, error);
        state.delete.error = value;
        state.delete.pending = false;
      })
      .addCase(deleteProductAsync.fulfilled, (state, action) => {
        state.delete = {
          pending: false,
          result: action.payload,
          error: initialState.delete.error,
        };
      })
      //
      .addCase(searchProductAsync.pending, (state) => {
        state.query.error = initialState.query.error;
        state.query.result = [];
        state.query.pending = true;
      })
      .addCase(searchProductAsync.rejected, (state, action) => {
        const error = action.payload as KeyValue;
        const notKnown = error?.message || error?.name || error?.code;
        state.query.error = { unknown: notKnown };
        state.query.pending = false;
      })
      .addCase(searchProductAsync.fulfilled, (state, { meta, payload }) => {
        state.query = {
          result: payload.queryResult,
          error: initialState.query.error,
          pending: false,
        };
      })
      //
      .addCase(uploadProductImageAsync.pending, (state, { meta }) => {
        const slot = meta.arg.slot;
        state.image.pending[slot] = true;
      })
      .addCase(uploadProductImageAsync.rejected, (state, action) => {
        const error = action.payload as KeyValue;
        const slot = error.slot;
        const notKnown = error?.message || error?.name || error?.code;

        if (
          error?.code === "NotAuthorizedException" ||
          error?.message === "Forbidden"
        ) {
          state.image.error[slot] =
            "You are not authorized to perform this action.";
        } else if (error?.name === "InvalidProductIdException") {
          state.image.error[slot] = "Product id is not valid.";
        } else if (error?.name === "NoProductWithIdException") {
          state.image.error[slot] = "Product with id not found.";
        } else if (error?.name === "InvalidSlotException") {
          state.image.error[slot] = "Image slot is not valid.";
        } else if (error?.name === "InvalidFileTypeException") {
          state.image.error[slot] = "File type is not valid.";
        } else if (notKnown) {
          state.image.error[slot] = notKnown;
        }

        state.image.pending[slot] = false;
      })
      .addCase(
        uploadProductImageAsync.fulfilled,
        (state, { meta, payload }) => {
          const { slot } = meta.arg;

          state.image = {
            pending: {
              ...state.image.pending,
              [slot]: false,
            },
            result: payload,
            error: initialState.image.error,
          };
        }
      )
      //
      .addCase(deleteProductImageAsync.pending, (state, { meta }) => {
        const { slot } = meta.arg;
        state.image.pending[slot] = true;
      })
      .addCase(deleteProductImageAsync.rejected, (state, action) => {
        const error = action.payload as KeyValue;
        const slot = error.slot;
        const notKnown = error?.message || error?.name || error?.code;
        if (
          error?.code === "NotAuthorizedException" ||
          error?.message === "Forbidden"
        ) {
          state.image.error[slot] =
            "You are not authorized to perform this action.";
        } else if (notKnown) {
          state.image.error[slot] = notKnown;
        }

        state.image.pending[slot] = false;
      })
      .addCase(
        deleteProductImageAsync.fulfilled,
        (state, { meta, payload }) => {
          const { slot } = meta.arg;
          state.image = {
            pending: {
              ...state.image.pending,
              [slot]: false,
            },
            result: payload.deleteResult,
            error: initialState.image.error,
          };
        }
      );
  },
});

export default productSlice.reducer;
export const productActions = productSlice.actions;
export const selectProduct = (state: RootState) => state.product;

/* 
  Category methods
*/
// 👇 Category async action for getting product categories
export const categoryAsync = createAsyncThunk(
  "product/category",
  async (_, { rejectWithValue, getState }) => {
    const { product } = getState() as RootState;

    if (product.category.fetched) {
      return product.category.result;
    }

    try {
      const { data } = await axios.get<typeof product.category.result>(
        "/category"
      );
      return data;
    } catch (error) {
      return rejectWithValue(rejectError(error));
    }
  }
);
/* 
  Product methods
*/
// 👇 Product get and delete function
const getDeleteCreator = async (
  props: { productId: string },
  method: "GET" | "DELETE",
  rejectWithValue: (value: unknown) => unknown
): Promise<Product | KeyValue> => {
  try {
    const { productId } = props;
    const { data, status } =
      method === "GET"
        ? await axios.get<Product>(`/product/${productId}`)
        : await axios.delete<KeyValue>(`/product/${productId}`);
    if (status === 204) {
      return rejectWithValue({
        message: "Product not found.",
      }) as KeyValue;
    }
    return data;
  } catch (error) {
    return rejectWithValue(rejectError(error)) as KeyValue;
  }
};
// 👇 Product create and update function
const createUpdateCreator = async (
  props: Partial<Product>,
  method: "PUT" | "POST",
  rejectWithValue: (value: unknown) => unknown
): Promise<Product | KeyValue> => {
  try {
    const { id } = props;
    const propsUpdate = { ...props };
    delete propsUpdate.id;

    const { data } =
      method === "POST"
        ? await axios.post<Product>("/product", propsUpdate)
        : await axios.put<Product>("/product" + "/" + id, propsUpdate);
    return data;
  } catch (error) {
    return rejectWithValue(rejectError(error)) as KeyValue;
  }
};
// 👇 GetProduct async action for getting products
export const getProductAsync = createAsyncThunk(
  "product/get",
  async (props: { productId: string }, { rejectWithValue }) =>
    getDeleteCreator(props, "GET", rejectWithValue)
);
// 👇 DeleteProduct async action for deleting products
export const deleteProductAsync = createAsyncThunk(
  "product/delete",
  async (props: { productId: string }, { rejectWithValue }) =>
    getDeleteCreator(props, "DELETE", rejectWithValue)
);
// 👇 CreateUpdateProduct async action for creating and updating products
export const createUpdateProductAsync = createAsyncThunk(
  "product/create",
  async (props: Partial<Product>, { rejectWithValue }) =>
    createUpdateCreator(props, props.id ? "PUT" : "POST", rejectWithValue)
);
// 👇 UploadProductImage async action for uploading product images
export const uploadProductImageAsync = createAsyncThunk(
  "product/uploadImage",
  async (
    props: { productId: string; file: File; slot: string },
    { rejectWithValue }
  ) => {
    const { productId, file, slot } = props;

    try {
      const {
        data: { url, fields },
      } = await axios.post<{
        url: string;
        fields: KeyValue;
      }>(
        `/product/${productId}/image`,
        {
          fileType: file.type,
        },
        {
          params: {
            slot,
          },
        }
      );

      const formData = new FormData();
      Object.entries(fields).forEach(([k, v]) => formData.append(k, v));
      formData.append("file", file); // The file has be the last element

      const { status, statusText } = await axios.post(url, formData);
      return { [status]: statusText };
    } catch (error) {
      const response = (error as AxiosError).response;
      if (
        response?.data?.error?.code === "NotAuthorizedException" ||
        (response?.status === 403 && response.data.message === "Forbidden")
      ) {
        return rejectWithValue({ slot, code: "NotAuthorizedException" });
      } else if (response?.headers["content-type"] === "application/xml") {
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(response.data || "", "text/xml");
        const code = xmlDoc.querySelector("Code")?.textContent;
        const message = xmlDoc.querySelector("Message")?.textContent;
        return rejectWithValue({ slot, code, message });
      } else return rejectWithValue({ slot, ...rejectError(error) });
    }
  }
);
// 👇 DeleteProductImage async action for deleting product images
export const deleteProductImageAsync = createAsyncThunk(
  "product/deleteImage",
  async (props: { productId: string; slot: string }, { rejectWithValue }) => {
    const { productId, slot } = props;
    try {
      const { data } = await axios.delete<{
        updateResult: KeyValue;
        deleteResult: KeyValue;
      }>(`/product/${productId}/image`, {
        params: {
          slot,
        },
      });

      return data;
    } catch (error) {
      return rejectWithValue({ slot, ...rejectError(error) });
    }
  }
);
// 👇 SearchProduct async action for searching for products
export const searchProductAsync = createAsyncThunk(
  "product/search",
  async (props: { category?: string; search: string }, { rejectWithValue }) => {
    const { category, search } = props;

    try {
      if (!search)
        return {
          lastKey: {},
          queryResult: [],
        } as QueryProduct;

      const { data } = await axios.post<QueryProduct>("/products", undefined, {
        params: { search, category, limit: 5 },
      });
      return data;
    } catch (error) {
      return rejectWithValue(rejectError(error));
    }
  }
);
