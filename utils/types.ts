import { ReactNode } from "react";
import { RootState } from "@/redux/store";

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
