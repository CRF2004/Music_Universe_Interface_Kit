// Only assets already accepted by the repository asset pipeline belong here.
export const worldAssetCatalog = [
  { id: 'garden-arbor', type: 'portal', label: '花园归途拱门', author: 'Music Universe', licenseRef: 'MIT', materialStyle: 'natural' },
  { id: 'garden-keeper', type: 'npc', label: '花园守园人', author: 'Music Universe', licenseRef: 'MIT' },
  { id: 'garden-listening-cabinet', type: 'phone-booth', label: '花园留声柜', author: 'Music Universe', licenseRef: 'MIT' },
  { id: 'guide-astronaut', type: 'npc', label: '宇航员引导员', author: 'Kenney', licenseRef: 'CC0-1.0' },
  { id: 'support-terminal', type: 'phone-booth', label: '回声终端', author: 'Kenney', licenseRef: 'CC0-1.0' },
  { id: 'product-tower-hangar', type: 'building', label: '记忆档案馆', author: 'Kenney', licenseRef: 'CC0-1.0' },
  { id: 'memory-atelier', type: 'building', label: '记忆工坊', author: 'Music Universe', licenseRef: 'MIT' },
  { id: 'docs-portal-gate', type: 'portal', label: '空间站离场门', author: 'Kenney', licenseRef: 'CC0-1.0' },
  { id: 'departure-portal', type: 'portal', label: '环形离场门', author: 'Music Universe project team', licenseRef: 'MIT' },
] as const;

export function findWorldAsset(id: string, type: string) {
  return worldAssetCatalog.find(asset => asset.id === id && asset.type === type);
}

export const worldAssetSlots = [
  { id: 'npc-guide', type: 'npc', label: '引导员', assetId: 'guide-astronaut' },
  { id: 'echo-terminal', type: 'phone-booth', label: '回声终端', assetId: 'support-terminal' },
  { id: 'memory-archive', type: 'building', label: '记忆档案馆', assetId: 'product-tower-hangar' },
  { id: 'departure-gate', type: 'portal', label: '离场门', assetId: 'docs-portal-gate' },
] as const;
