import { IDeBounceVariables, KeyValue } from "./types";

export const apiVersion = "/v1";

export const appTitle = "E➠Store";

export const darkOpacityText = "text-opacity-75 text-dark";

export const statusStyle =
  "css-content-center rounded-3 w-100 py-3 mb-2 bg-white text-secondary text-center";

// 👇 unique identifier for debounce methods
export const debounceId: KeyValue<IDeBounceVariables> = {};

export const rowStyle = {
  borderRadius: "15px",
  maxHeight: "200px",
};

export const rowClass =
  "g-0 text-center py-2 align-items-center text-secondary";

export const slotCount = [1, 2, 3];
