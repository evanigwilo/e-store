import { Dispatch, ReactNode, SetStateAction } from "react";
import { NextRouter } from "next/router";
import { RootState } from "@/redux/store";
import { Color } from "react-bootstrap/esm/types";
import { ImageSlotActionType, userGroups } from "./constants";

export interface KeyValue<T = string> {
  [key: string | number]: T;
}

export interface Props {
  children: ReactNode;
}

export interface AuthenticatedResult {
  tokens?: KeyValue;
  username: string;
  admin: boolean;
  manageProducts: boolean;
  emailVerified: boolean;
}

export type CountryType = {
  code: string;
  name: string;
  emoji: string;
  unicode: string;
  image: string;
};

export interface CountryResult {
  countries: CountryType[];
  country: string;
}

export interface AppTitleProps {
  hoverEffect?: boolean;
  className?: string;
}

export interface Orders {
  productId: string;
  count: number;
}

export interface OrderOrders {
  productId: string;
  name: string;
  category: string;
  price: number;
  count: number;
  slot: number;
}

export interface OrderLocation {
  country: string;
  //city: string,
  address: string;
}

export interface Order {
  user: string;
  orders: OrderOrders[];
  amount: number;
  status: string;
  location: OrderLocation;
  logs: string;
  intent: string;
  createdAt: number;
}

export type ImageSlot = {
  [key in "image_1" | "image_2" | "image_3"]?: boolean;
};

export type Product = ImageSlot & {
  id: string;
  name: string;
  category: string;
  price: number;
  createdAt: number;
  // images: number[];
  // image_1: boolean;
  // image_2: boolean;
  // image_3: boolean;
};

export type Selector<S> = (state: RootState) => S;

export interface ToastProp {
  message: string;
  delay?: number;
  onClose?: () => void;
}

export interface ToastMessages {
  messages: ToastProp[];
}

export interface IDeBounceVariables {
  timeout?: NodeJS.Timeout; // reference for timeout
  delay: number; // delay timer
}

export interface DeleteModalProps {
  onClickDelete?: () => void;
  onExit?: () => void;
  loading: boolean;
  message: string;
  error?: string;
  show: boolean;
  setShow: Dispatch<SetStateAction<boolean>>;
}

export interface ImagePreviewProps {
  src: string;
  show: number;
  setShow: Dispatch<SetStateAction<number>>;
  closeButton?: boolean;
  htmlFor?: string;
  htmlForProgress?: boolean;
}

export interface QueryProduct {
  lastKey: KeyValue<KeyValue>;
  queryResult: Product[];
}

export interface ToastStatusUpdate {
  product: Partial<Product>;
  image: KeyValue<"ADD" | "REMOVE">;
}

export interface ToastController {
  uploading: number;
  update: ToastStatusUpdate;
}

export interface QueryOrder {
  lastKey: KeyValue<KeyValue>;
  queryResult: Order[];
}

export interface QueryParams {
  productId?: string;
  sort?: string;
  category?: string;
  limit?: number;
  body?: KeyValue<KeyValue>;
  key: number;
  page: number;
}

export interface QueryParams {
  productId?: string;
  sort?: string;
  category?: string;
  limit?: number;
  body?: KeyValue<KeyValue>;
  key: number;
  page: number;
}

export interface ImageSlotState {
  url: KeyValue;
  error: KeyValue;
  file: KeyValue<File | undefined>;
}

export interface ImageSlotActionPayload {
  // images?: number[];
  product?: Partial<Product>;
  slot?: number;
  files?: FileList | undefined | null;
}

export interface ImageSlotAction {
  type: ImageSlotActionType;
  payload: ImageSlotActionPayload;
}

export interface ManageProductProps {
  filter: string;
  router: NextRouter;
  productId: string;
  updateProduct: (update: ToastStatusUpdate) => void;
  removeProduct: (id: string) => void;
}

export type OrderGroup = "all" | "succeeded" | "canceled" | "requested";

export type OrderGroupState = {
  [key in OrderGroup]: {
    active: boolean;
    background: Color;
  };
};

export interface User {
  username: string;
  group: keyof typeof userGroups;
  status: "CONFIRMED";
  gender: "female" | "male";
}
