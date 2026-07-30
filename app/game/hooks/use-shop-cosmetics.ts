"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import {
  DEFAULT_COSMETIC_LOADOUT,
  isCosmeticId,
  normalizeCosmeticLoadout,
  type CosmeticId,
  type CosmeticSlot,
  type ShopState,
} from "../shop-catalog";
import { CHROMA_BALANCE_UPDATED_EVENT } from "../chroma";

const GUEST_SHOP_STATE: ShopState = {
  balance: 0,
  equipped: { ...DEFAULT_COSMETIC_LOADOUT },
  ownedItemIds: [],
};

function normalizeShopState(value: unknown): ShopState {
  if (!value || typeof value !== "object") {
    return GUEST_SHOP_STATE;
  }

  const state = value as Partial<ShopState>;
  const balance = Number(state.balance);

  return {
    balance: Number.isInteger(balance) && balance >= 0 ? balance : 0,
    equipped: normalizeCosmeticLoadout(state.equipped),
    ownedItemIds: Array.isArray(state.ownedItemIds)
      ? state.ownedItemIds.filter(isCosmeticId)
      : [],
  };
}

async function readResponse(response: Response) {
  const result = await response.json().catch(() => null);
  if (!response.ok) {
    const message =
      result &&
      typeof result === "object" &&
      "error" in result &&
      typeof result.error === "string"
        ? result.error
        : "The shop is temporarily unavailable.";
    throw new Error(message);
  }

  return normalizeShopState(result);
}

export function useShopCosmetics(userId: string | null) {
  const [shopState, setShopState] = useState<ShopState>(GUEST_SHOP_STATE);
  const [isLoading, setIsLoading] = useState(false);
  const [busyItemId, setBusyItemId] = useState<CosmeticId | null>(null);
  const [error, setError] = useState<string | null>(null);
  const activeUserIdRef = useRef(userId);
  activeUserIdRef.current = userId;

  const loadShopState = useCallback(async () => {
    if (!userId) {
      setShopState(GUEST_SHOP_STATE);
      setError(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const nextState = await readResponse(await fetch("/api/account/shop"));
      if (activeUserIdRef.current === userId) {
        setShopState(nextState);
      }
    } catch (loadError) {
      if (activeUserIdRef.current === userId) {
        setError(
          loadError instanceof Error
            ? loadError.message
            : "The shop is temporarily unavailable.",
        );
      }
    } finally {
      if (activeUserIdRef.current === userId) {
        setIsLoading(false);
      }
    }
  }, [userId]);

  useEffect(() => {
    setShopState(GUEST_SHOP_STATE);
    setBusyItemId(null);
    void loadShopState();
  }, [loadShopState]);

  const updateItem = useCallback(async (
    itemId: CosmeticId,
    request: () => Promise<Response>,
  ) => {
    if (!userId) {
      return;
    }

    setBusyItemId(itemId);
    setError(null);

    try {
      const nextState = await readResponse(await request());
      if (activeUserIdRef.current !== userId) {
        return;
      }

      setShopState(nextState);
      window.dispatchEvent(new Event(CHROMA_BALANCE_UPDATED_EVENT));
    } catch (updateError) {
      if (activeUserIdRef.current === userId) {
        setError(
          updateError instanceof Error
            ? updateError.message
            : "The shop could not be updated.",
        );
      }
    } finally {
      if (activeUserIdRef.current === userId) {
        setBusyItemId(null);
      }
    }
  }, [userId]);

  const purchase = useCallback((itemId: CosmeticId) => updateItem(
    itemId,
    () => fetch("/api/account/shop/purchase", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ itemId }),
    }),
  ), [updateItem]);

  const equip = useCallback((
    slot: CosmeticSlot,
    itemId: CosmeticId,
  ) => updateItem(
    itemId,
    () => fetch("/api/account/shop/equipment", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ itemId, slot }),
    }),
  ), [updateItem]);

  return {
    busyItemId,
    equip,
    error,
    isLoading,
    purchase,
    retry: loadShopState,
    shopState,
  };
}
