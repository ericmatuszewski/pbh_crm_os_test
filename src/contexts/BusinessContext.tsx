"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from "react";
import { toast } from "sonner";

export interface Business {
  id: string;
  name: string;
  slug: string;
  parentId: string | null;
  legalName: string | null;
  companyNumber: string | null;
  vatNumber: string | null;
  tradingAddress: string | null;
  city: string | null;
  postcode: string | null;
  country: string;
  phone: string | null;
  email: string | null;
  salesEmail: string | null;
  website: string | null;
  logoUrl: string | null;
  primaryColor: string;
  secondaryColor: string | null;
  quotePrefix: string;
  invoicePrefix: string;
  defaultCurrency: string;
  defaultTaxRate: number | null;
  defaultPaymentTerms: string | null;
  termsConditions: string | null;
  timezone: string;
  isActive: boolean;
  userRole?: string;
  isDefault?: boolean;
}

interface BusinessContextType {
  currentBusiness: Business | null;
  businesses: Business[];
  isLoading: boolean;
  switchBusiness: (businessId: string) => Promise<void>;
  refreshBusinesses: () => Promise<void>;
}

const BusinessContext = createContext<BusinessContextType | undefined>(
  undefined
);

// Temporary user ID - in real app, get from auth session
const CURRENT_USER_ID = "allison";

interface BusinessProviderProps {
  children: ReactNode;
}

export function BusinessProvider({ children }: BusinessProviderProps) {
  const [currentBusiness, setCurrentBusiness] = useState<Business | null>(null);
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchBusinesses = useCallback(async () => {
    try {
      const response = await fetch(
        `/api/businesses?userId=${CURRENT_USER_ID}`
      );
      const data = await response.json();

      if (data.success && data.data) {
        setBusinesses(data.data);

        // Set current business from localStorage or default
        const savedBusinessId = localStorage.getItem("currentBusinessId");
        const defaultBusiness = data.data.find(
          (b: Business) => b.isDefault
        ) || data.data[0];

        if (savedBusinessId) {
          const savedBusiness = data.data.find(
            (b: Business) => b.id === savedBusinessId
          );
          if (savedBusiness) {
            setCurrentBusiness(savedBusiness);
          } else if (defaultBusiness) {
            setCurrentBusiness(defaultBusiness);
            localStorage.setItem("currentBusinessId", defaultBusiness.id);
          }
        } else if (defaultBusiness) {
          setCurrentBusiness(defaultBusiness);
          localStorage.setItem("currentBusinessId", defaultBusiness.id);
        }
      }
    } catch (error) {
      console.error("Failed to fetch businesses:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const refreshBusinesses = useCallback(async () => {
    await fetchBusinesses();
  }, [fetchBusinesses]);

  const switchBusiness = useCallback(
    async (businessId: string) => {
      try {
        const response = await fetch("/api/businesses/switch", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: CURRENT_USER_ID,
            businessId,
          }),
        });

        const data = await response.json();

        if (data.success) {
          const newBusiness = businesses.find((b) => b.id === businessId);
          if (newBusiness) {
            setCurrentBusiness(newBusiness);
            localStorage.setItem("currentBusinessId", businessId);
            toast.success(`Switched to ${newBusiness.name}`);
          }
        } else {
          toast.error(data.error || "Failed to switch business");
        }
      } catch (error) {
        console.error("Failed to switch business:", error);
        toast.error("Failed to switch business");
      }
    },
    [businesses]
  );

  useEffect(() => {
    fetchBusinesses();
  }, [fetchBusinesses]);

  return (
    <BusinessContext.Provider
      value={{
        currentBusiness,
        businesses,
        isLoading,
        switchBusiness,
        refreshBusinesses,
      }}
    >
      {children}
    </BusinessContext.Provider>
  );
}

export function useBusiness() {
  const context = useContext(BusinessContext);
  if (context === undefined) {
    throw new Error("useBusiness must be used within a BusinessProvider");
  }
  return context;
}
