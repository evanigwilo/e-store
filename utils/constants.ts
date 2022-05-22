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

// 👇 Each category with icons
export const categoryType = {
  Grocery: {
    icon: "bi-egg",
    description:
      "Save time and money by shopping local and online for your groceries with Grocery Advantage",
  },
  Electronics: {
    icon: "bi-tv",
    description:
      "Shop for the best selection of electronics at Every Day Low Prices.",
  },
  "Health & Beauty": {
    icon: "bi-heart-pulse",
    description:
      "Health and beauty tips and essentials, from the best skin care products for oily skin and men's hair styling products to the best body lotion",
  },
  Automobile: {
    icon: "bi-truck",
    description:
      "Shop new & used cars, research & compare models, find local dealers/sellers,calculate payments, value your car, sell/trade in your car & more",
  },
  "Home & Kitchen": {
    icon: "bi-lamp",
    description:
      "This kitchen essentials list has everything you need. Check out 71 of the best quality cookware, utensils and equipment in this kitchen essentials list",
  },
  "Phones & Tablets": {
    icon: "bi-phone",
    description:
      "Save money on tablets we currently have deals on and compare pricing, features, and more. Get FREE SHIPPING on devices with new activations!",
  },
  Books: {
    icon: "bi-book",
    description:
      "Here you'll find current best sellers in books, new releases in books, deals in books, Kindle eBooks, Audible audiobooks, and so much more.",
  },
  Gaming: {
    icon: "bi-controller",
    description:
      "All your favorite games for Steam, Origin, Battle.net, Uplay and Indie games up to 70% off! Digital games, Instant delivery 24/7!",
  },
  Fashion: {
    icon: "bi-handbag",
    description:
      "From the world's best designer fashion to emerging brands, open doors to 100.000+ styles",
  },
  "Sports & Outdoors": {
    icon: "bi-dribbble",
    description:
      "Shop Academy Sports + Outdoors for sporting goods, hunting, fishing and camping equipment. Find recreation and leisure products, footwear, apparel and more!",
  },
};

export enum ImageSlotActionType {
  LOADIMAGE = "CLEAR_ERROR->LOAD_URL",
  FILECHANGE = "REVOKE_URL->REMOVE_FILE->UPDATE_URL->UPDATE_ERROR",
  CLEARIMAGE = "REVOKE_URL->CLEAR_IMAGE->HIDE_ERROR",
}

export const mimeTypes =
  "image/png, image/gif, image/jpeg, image/bmp, image/svg+xml";

export const sortBy = {
  Popularity: undefined,
  "Price: Low to High": "low",
  "Price: High to Low": "high",
};

export const userGroups = {
  "": "None",
  manage_product_group: "Manage Products",
  admin_group: "Admin",
};
