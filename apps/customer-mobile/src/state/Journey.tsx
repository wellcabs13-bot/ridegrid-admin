import React, { createContext, useContext, useState } from "react";
import type { Listing, Quote, Search } from "../types";
type Journey = {
  search: Search;
  listing: Listing;
  quote?: Quote;
  pickupAddress?: string;
  dropAddress?: string;
};
const Context = createContext<{
  journey: Journey | null;
  setJourney: (value: Journey | null) => void;
}>({ journey: null, setJourney: () => {} });
export const useJourney = () => useContext(Context);
export function JourneyProvider({ children }: React.PropsWithChildren) {
  const [journey, setJourney] = useState<Journey | null>(null);
  const { session } = useApp();
  React.useEffect(() => setJourney(null), [session?.user.id]);
  return (
    <Context.Provider value={{ journey, setJourney }}>
      {children}
    </Context.Provider>
  );
}
import { useApp } from "./Providers";
