// Shapes shared between the server loader (`predictive-search.ts`, which is
// `server-only`) and the client autocomplete UI, so the client never pulls in
// the Storefront client module.

export type PredictiveSearchSuggestion = { text: string };

export type PredictiveSearchProduct = {
  id: string;
  handle: string;
  title: string;
  image: { url: string; altText: string | null } | null;
  price: { amount: string; currencyCode: string };
};

export type PredictiveSearchCollection = {
  id: string;
  handle: string;
  title: string;
};

export type PredictiveSearchResults = {
  queries: PredictiveSearchSuggestion[];
  products: PredictiveSearchProduct[];
  collections: PredictiveSearchCollection[];
};

export const EMPTY_PREDICTIVE_RESULTS: PredictiveSearchResults = {
  queries: [],
  products: [],
  collections: [],
};
