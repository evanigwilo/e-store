import { ReactNode } from "react";

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
