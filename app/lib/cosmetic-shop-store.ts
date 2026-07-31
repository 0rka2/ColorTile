import "server-only";

import {
  COSMETIC_SLOTS,
  DEFAULT_COSMETIC_LOADOUT,
  getCosmeticDefinition,
  isCosmeticId,
  normalizeCosmeticLoadout,
  type CosmeticDefinition,
  type CosmeticId,
  type CosmeticLoadout,
  type CosmeticSlot,
  type ShopState,
} from "@/app/game/shop-catalog";

import { getSql } from "./db";

type LoadoutRow = {
  item_id: unknown;
  slot: unknown;
};

type OwnershipRow = {
  item_id: unknown;
};

type PurchaseRow = {
  already_owned: unknown;
  balance: unknown;
  purchased: unknown;
};

export type PurchaseFailure = "already-owned" | "insufficient-chroma";

export class CosmeticPurchaseError extends Error {
  constructor(public readonly reason: PurchaseFailure) {
    super(reason);
    this.name = "CosmeticPurchaseError";
  }
}

function readBalance(value: unknown) {
  const balance = Number(value);
  return Number.isInteger(balance) && balance >= 0 ? balance : 0;
}

function readOwnedItemIds(rows: OwnershipRow[]) {
  return rows.flatMap((row) => isCosmeticId(row.item_id) ? [row.item_id] : []);
}

function readLoadout(rows: LoadoutRow[]): CosmeticLoadout {
  const storedLoadout: Partial<Record<CosmeticSlot, CosmeticId>> = {};

  for (const row of rows) {
    const item = getCosmeticDefinition(row.item_id);
    if (item && item.slot === row.slot) {
      storedLoadout[item.slot] = item.id;
    }
  }

  return normalizeCosmeticLoadout(storedLoadout);
}

export async function getCosmeticShopState(userId: string): Promise<ShopState> {
  const sql = getSql();
  const [walletRows, ownershipRows, loadoutRows] = await Promise.all([
    sql`
      select balance
      from player_chroma_wallet
      where user_id = ${userId}
      limit 1
    `,
    sql`
      select item_id
      from player_cosmetic_ownership
      where user_id = ${userId}
      order by purchased_at, item_id
    `,
    sql`
      select slot, item_id
      from player_cosmetic_loadout
      where user_id = ${userId}
    `,
  ]);

  return {
    balance: readBalance(
      (walletRows as unknown as Array<Record<string, unknown>>)[0]?.balance,
    ),
    equipped: readLoadout(loadoutRows as unknown as LoadoutRow[]),
    ownedItemIds: readOwnedItemIds(
      ownershipRows as unknown as OwnershipRow[],
    ),
  };
}

export async function purchaseAndEquipCosmetic(
  userId: string,
  item: CosmeticDefinition,
) {
  const sql = getSql();

  let rows;
  try {
    rows = await sql`
      with purchase as (
        insert into player_cosmetic_ownership (
          user_id,
          item_id,
          purchase_price
        )
        select ${userId}, ${item.id}, ${item.price}
        where exists (
          select 1
          from player_chroma_wallet
          where user_id = ${userId}
            and balance >= ${item.price}
        )
        on conflict (user_id, item_id) do nothing
        returning item_id
      ),
      debit as (
        update player_chroma_wallet
        set
          balance = player_chroma_wallet.balance - ${item.price},
          updated_at = now()
        where user_id = ${userId}
          and exists (select 1 from purchase)
        returning balance
      ),
      equip as (
        insert into player_cosmetic_loadout (user_id, slot, item_id, updated_at)
        select ${userId}, ${item.slot}, ${item.id}, now()
        from debit
        on conflict (user_id, slot) do update
        set
          item_id = excluded.item_id,
          updated_at = excluded.updated_at
        returning item_id
      )
      select
        exists (select 1 from purchase) as purchased,
        exists (
          select 1
          from player_cosmetic_ownership
          where user_id = ${userId}
            and item_id = ${item.id}
        ) as already_owned,
        coalesce(
          (select balance from debit),
          (
            select balance
            from player_chroma_wallet
            where user_id = ${userId}
          ),
          0
        ) as balance
    `;
  } catch (error) {
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === "23514"
    ) {
      throw new CosmeticPurchaseError("insufficient-chroma");
    }
    throw error;
  }

  const result = (rows as unknown as PurchaseRow[])[0];
  if (result?.purchased === true) {
    return getCosmeticShopState(userId);
  }

  throw new CosmeticPurchaseError(
    result?.already_owned === true
      ? "already-owned"
      : "insufficient-chroma",
  );
}

export async function devUnlockAndEquipCosmetic(
  userId: string,
  item: CosmeticDefinition,
) {
  const sql = getSql();

  await sql`
    with grant_ownership as (
      insert into player_cosmetic_ownership (
        user_id,
        item_id,
        purchase_price
      )
      values (${userId}, ${item.id}, 0)
      on conflict (user_id, item_id) do nothing
    )
    insert into player_cosmetic_loadout (user_id, slot, item_id, updated_at)
    values (${userId}, ${item.slot}, ${item.id}, now())
    on conflict (user_id, slot) do update
    set
      item_id = excluded.item_id,
      updated_at = excluded.updated_at
  `;

  return getCosmeticShopState(userId);
}

export async function equipCosmetic(
  userId: string,
  slot: CosmeticSlot,
  itemId: CosmeticId,
) {
  const item = getCosmeticDefinition(itemId);
  if (!item || item.slot !== slot) {
    return false;
  }

  const sql = getSql();
  const rows = await sql`
    insert into player_cosmetic_loadout (user_id, slot, item_id, updated_at)
    select ${userId}, ${slot}, ${itemId}, now()
    where
      ${item.price} = 0
      or exists (
        select 1
        from player_cosmetic_ownership
        where user_id = ${userId}
          and item_id = ${itemId}
      )
    on conflict (user_id, slot) do update
    set
      item_id = excluded.item_id,
      updated_at = excluded.updated_at
    returning item_id
  `;

  return (rows as unknown as Array<Record<string, unknown>>).length > 0;
}

export function getGuestShopState(): ShopState {
  return {
    balance: 0,
    equipped: { ...DEFAULT_COSMETIC_LOADOUT },
    ownedItemIds: [],
  };
}

export function isKnownCosmeticSlot(value: unknown): value is CosmeticSlot {
  return (
    typeof value === "string" &&
    (COSMETIC_SLOTS as readonly string[]).includes(value)
  );
}
