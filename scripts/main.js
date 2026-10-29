// Item Piles: Nimble. Tells Item Piles how the Nimble system keeps its loot and coins, through Item Piles' own
// addSystemIntegration, once Item Piles says it is ready.

const BAG_TAG = 'flags.item-piles-nimble.bag';

// Gold is the main coin; the others are worth a tenth and a hundredth of it.
const COIN_RATES = { gp: 1, sp: 0.1, cp: 0.01 };

const coin = (key, primary) => ({
  type: 'attribute',
  name: `NIMBLE.currency.${key}`, // Nimble's own names: Gold, Silver, Copper
  img: {
    gp: 'icons/commodities/currency/coin-embossed-crown-gold.webp',
    sp: 'icons/commodities/currency/coin-engraved-moon-silver.webp',
    cp: 'icons/commodities/currency/coin-engraved-waves-copper.webp',
  }[key],
  abbreviation: `{#} ${key}`,
  data: { path: `system.currency.${key}.value` },
  primary,
  exchangeRate: COIN_RATES[key],
});

// Item Piles works out which item types stack once per page load. The first time it stores Nimble's quantity
// field (first run, or after this integration's VERSION goes up), that list was made without it, so a single
// object stopped stacking: buying 3 Soap onto 1 Soap gave 2. When the field lands, ask Item Piles to rebuild the
// list through its own refresh (the one it runs when its unstackable-types setting changes).
function refreshStackableTypes(setting) {
  if (setting?.key !== 'item-piles.itemQuantityAttribute') return;
  game.settings.settings.get('item-piles.unstackableItemTypes')?.onChange?.();
}
Hooks.on('createSetting', refreshStackableTypes);
Hooks.on('updateSetting', refreshStackableTypes);

Hooks.once('item-piles-ready', async () => {
  if (game.system.id !== 'nimble') return;

  await game.itempiles.API.addSystemIntegration({
    VERSION: '1.1.0',

    // Nimble has no loot or container actor. Characters are the only actors that carry coins, so piles and
    // merchants are characters (Item Piles unlinks their tokens itself, so each pile keeps its own contents).
    ACTOR_CLASS_TYPE: 'character',

    // Everything you can carry in Nimble is an "object" item.
    ITEM_CLASS_LOOT_TYPE: 'object',
    ITEM_CLASS_WEAPON_TYPE: 'object',
    ITEM_CLASS_EQUIPMENT_TYPE: 'object',

    ITEM_QUANTITY_ATTRIBUTE: 'system.quantity',
    ITEM_PRICE_ATTRIBUTE: 'system.price.value',

    // Hide the parts of a character that aren't things: class, ancestry, spells, features and so on.
    ITEM_FILTERS: [
      {
        path: 'type',
        filters: 'ancestry,ancestryBonus,background,boon,class,feature,monsterFeature,spell,subclass',
      },
    ],

    // Stacking the D&D 5e way (the user's ruling, 2026-10-29): same-named objects stack (two Glaives make
    // "Glaive ×2"), but only with copies in the same bag, and bags never stack. Each bag that changes hands gets
    // a one-off tag (BAG_TAG), so it never matches another bag.
    ITEM_SIMILARITIES: ['name', 'type', 'system.containerId', BAG_TAG],
    UNSTACKABLE_ITEM_TYPES: [],

    // An object that changes hands arrives unequipped and loose (not inside a bag the new owner doesn't have).
    ITEM_TRANSFORMER: async (itemData) => {
      if (itemData?.system?.equipped !== undefined) itemData.system.equipped = false;
      if (itemData?.system?.containerId !== undefined) itemData.system.containerId = '';
      if (itemData?.system?.container?.enabled) foundry.utils.setProperty(itemData, BAG_TAG, foundry.utils.randomID());
      return itemData;
    },

    // Nimble prices are a number plus a coin (5 sp); Item Piles wants one number in gold.
    ITEM_COST_TRANSFORMER: (item) => {
      const value = Number(foundry.utils.getProperty(item, 'system.price.value')) || 0;
      const denomination = foundry.utils.getProperty(item, 'system.price.denomination') ?? 'gp';
      return value * (COIN_RATES[denomination] ?? 1);
    },

    CURRENCIES: [coin('gp', true), coin('sp', false), coin('cp', false)],
    CURRENCY_DECIMAL_DIGITS: 0.01,

    // Nimble gives new characters a friendly token with sight; a loot pile is neither.
    TOKEN_FLAG_DEFAULTS: {
      disposition: CONST.TOKEN_DISPOSITIONS.NEUTRAL,
      sight: { enabled: false },
    },
  });
});
