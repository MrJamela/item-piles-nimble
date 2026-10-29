// Item Piles: Nimble. Tells Item Piles how the Nimble system keeps its loot and coins, through Item Piles' own
// addSystemIntegration (fired after "item-piles-ready"). To be built: item type "object", coins at system.currency.{gp,sp,cp}.
Hooks.once('item-piles-ready', () => {
  console.log('item-piles-nimble | Item Piles is ready; the Nimble integration is not built yet.');
});
