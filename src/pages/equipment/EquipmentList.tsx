import { Anchor, Box, NativeSelect, Stack, Table } from '@mantine/core';
import { useMemo } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { text, useDatabase } from '../../data';
import type { ArmorSeries, Decoration, Weapon } from '../../types';
import { type AmuletGroup, AmuletLevelMarks, amuletName, formatAmuletSkills, groupAmulets } from './amulets';
import { categories, compareIds } from './equipmentConstants';

export function EquipmentList() {
  const { search } = useLocation();
  const navigate = useNavigate();
  const { armor, armorSeries, amulets, weapons, decorations, skillById } = useDatabase();
  const params = useMemo(() => new URLSearchParams(search), [search]);
  const kind = params.get('kind') ?? 'weapons';
  const active = categories.some((category) => category.key === kind) ? kind : 'weapons';
  const weaponCategories = useMemo(() => [...new Set(weapons.map((weapon) => weapon.category))], [weapons]);
  const requestedWeaponCategory = params.get('weapon');
  const activeWeaponCategory =
    requestedWeaponCategory !== null && weaponCategories.includes(requestedWeaponCategory)
      ? requestedWeaponCategory
      : weaponCategories[0];

  const rows = useMemo(() => {
    if (active === 'weapons')
      return weapons
        .filter((weapon) => weapon.category === activeWeaponCategory)
        .sort((a, b) => compareIds(a.game_id, b.game_id));
    if (active === 'armor') {
      const armorSeriesIds = new Set(armor.map((item) => item.series_id));
      return armorSeries
        .filter((series) => armorSeriesIds.has(series.game_id))
        .sort((a, b) => compareIds(a.game_id, b.game_id));
    }
    if (active === 'amulets') return groupAmulets(amulets);
    return [...decorations].sort((a, b) => compareIds(a.game_id, b.game_id));
  }, [active, activeWeaponCategory, armor, armorSeries, amulets, decorations, weapons]);

  return (
    <Stack className={active === 'weapons' ? 'page-stack with-rank-tabs' : 'page-stack'} gap="md">
      {active === 'weapons' && (
        <Box className="section-tabs rank-tabs">
          <NativeSelect
            aria-label="武器種"
            data={weaponCategories}
            value={activeWeaponCategory ?? null}
            size="sm"
            classNames={{ root: 'weapon-type-select-root', input: 'weapon-type-select' }}
            onChange={(value) => {
              navigate(`/equipment?kind=weapons&weapon=${encodeURIComponent(value.currentTarget.value)}`);
            }}
          />
        </Box>
      )}
      <Box className="responsive-table-container">
        <Table className="responsive-table" striped highlightOnHover withTableBorder>
          <Table.Thead>
            {active === 'weapons' && (
              <Table.Tr>
                <Table.Th>武器</Table.Th>
                <Table.Th className="numeric-cell">攻撃</Table.Th>
                <Table.Th className="numeric-cell">会心</Table.Th>
              </Table.Tr>
            )}
            {active === 'armor' && (
              <Table.Tr>
                <Table.Th>シリーズ</Table.Th>
                <Table.Th className="numeric-cell">レア度</Table.Th>
              </Table.Tr>
            )}
            {active === 'amulets' && (
              <Table.Tr>
                <Table.Th>護石</Table.Th>
                <Table.Th>レベル</Table.Th>
                <Table.Th>スキル</Table.Th>
              </Table.Tr>
            )}
            {active === 'decorations' && (
              <Table.Tr>
                <Table.Th>装飾品</Table.Th>
                <Table.Th className="numeric-cell">必要スロット</Table.Th>
              </Table.Tr>
            )}
          </Table.Thead>
          <Table.Tbody>
            {rows.map((entry) => {
              if (active === 'weapons') {
                const weapon = entry as Weapon;
                return (
                  <Table.Tr key={weapon.game_id}>
                    <Table.Td>
                      <Anchor component={Link} to={`/equipment/weapons/${encodeURIComponent(weapon.game_id)}`} fw={500}>
                        {text(weapon.names)}
                      </Anchor>
                    </Table.Td>
                    <Table.Td className="numeric-cell">{weapon.attack.toLocaleString('ja-JP')}</Table.Td>
                    <Table.Td className="numeric-cell">{weapon.affinity}%</Table.Td>
                  </Table.Tr>
                );
              }
              if (active === 'armor') {
                const series = entry as ArmorSeries;
                return (
                  <Table.Tr key={series.game_id}>
                    <Table.Td>
                      <Anchor
                        component={Link}
                        to={`/equipment/armor/${encodeURIComponent(String(series.game_id))}`}
                        fw={500}
                      >
                        {text(series.names)}
                      </Anchor>
                    </Table.Td>
                    <Table.Td className="numeric-cell">{series.rarity}</Table.Td>
                  </Table.Tr>
                );
              }
              if (active === 'amulets') {
                const group = entry as AmuletGroup;
                const item = group.items[0];
                return (
                  <Table.Tr key={group.amulet_type}>
                    <Table.Td>
                      <Anchor
                        component={Link}
                        to={`/equipment/amulets/${encodeURIComponent(String(group.amulet_type))}`}
                        fw={500}
                      >
                        {amuletName(item)}
                      </Anchor>
                    </Table.Td>
                    <Table.Td className="centered-cell">
                      <AmuletLevelMarks items={group.items} />
                    </Table.Td>
                    <Table.Td>{formatAmuletSkills(group.items, skillById)}</Table.Td>
                  </Table.Tr>
                );
              }
              const item = entry as Decoration;
              return (
                <Table.Tr key={item.game_id}>
                  <Table.Td>
                    <Anchor
                      component={Link}
                      to={`/equipment/decorations/${encodeURIComponent(String(item.game_id))}`}
                      fw={500}
                    >
                      {text(item.names)}
                    </Anchor>
                  </Table.Td>
                  <Table.Td className="numeric-cell">{item.required_slot}</Table.Td>
                </Table.Tr>
              );
            })}
          </Table.Tbody>
        </Table>
      </Box>
    </Stack>
  );
}
