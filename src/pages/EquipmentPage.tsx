import { Anchor, Badge, Box, Group, NativeSelect, SimpleGrid, Stack, Table, Text } from '@mantine/core';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { text, useDatabase } from '../data';
import type { Amulet, Armor, Decoration, Weapon } from '../types';
import { NotFoundPage } from './NotFoundPage';

const categories = [
  { key: 'weapons', label: '武器' },
  { key: 'armor', label: '防具' },
  { key: 'amulets', label: '護石' },
  { key: 'decorations', label: '装飾品' },
] as const;

const armorParts = ['頭', '胴', '腕', '腰', '脚'];

function EquipmentList() {
  const { search } = useLocation();
  const navigate = useNavigate();
  const { armor, amulets, weapons, decorations } = useDatabase();
  const params = new URLSearchParams(search);
  const kind = params.get('kind') ?? 'weapons';
  const active = categories.some((category) => category.key === kind) ? kind : 'weapons';
  const weaponCategories = [...new Set(weapons.map((weapon) => weapon.category))];
  const requestedWeaponCategory = params.get('weapon');
  const activeWeaponCategory = weaponCategories.includes(requestedWeaponCategory ?? '')
    ? requestedWeaponCategory!
    : weaponCategories[0];

  const rows = active === 'weapons' ? weapons.filter((weapon) => weapon.category === activeWeaponCategory).sort((a, b) => text(a.names).localeCompare(text(b.names), 'ja'))
    : active === 'armor' ? [...armor].sort((a, b) => text(a.names).localeCompare(text(b.names), 'ja'))
      : active === 'amulets' ? [...amulets].sort((a, b) => text(a.names).localeCompare(text(b.names), 'ja'))
        : [...decorations].sort((a, b) => text(a.names).localeCompare(text(b.names), 'ja'));

  return (
    <Stack className={active === 'weapons' ? 'page-stack with-rank-tabs' : 'page-stack'} gap="md">
      {active === 'weapons' && <Box className="section-tabs rank-tabs">
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
      </Box>}
      <Box className="responsive-table-container">
        <Table className="responsive-table" striped highlightOnHover withTableBorder>
          <Table.Thead>
            {active === 'weapons' && <Table.Tr><Table.Th>武器</Table.Th><Table.Th className="numeric-cell">攻撃</Table.Th><Table.Th className="numeric-cell">会心</Table.Th></Table.Tr>}
            {active === 'armor' && <Table.Tr><Table.Th>部位</Table.Th><Table.Th>防具</Table.Th><Table.Th className="numeric-cell">防御</Table.Th></Table.Tr>}
            {active === 'amulets' && <Table.Tr><Table.Th>護石</Table.Th></Table.Tr>}
            {active === 'decorations' && <Table.Tr><Table.Th>装飾品</Table.Th><Table.Th className="numeric-cell">必要スロット</Table.Th></Table.Tr>}
          </Table.Thead>
          <Table.Tbody>
            {rows.map((entry) => {
              if (active === 'weapons') {
                const weapon = entry as Weapon;
                return <Table.Tr key={weapon.game_id}><Table.Td><Anchor component={Link} to={`/equipment/weapons/${encodeURIComponent(weapon.game_id)}`} fw={500}>{text(weapon.names)}</Anchor></Table.Td><Table.Td className="numeric-cell">{weapon.attack.toLocaleString('ja-JP')}</Table.Td><Table.Td className="numeric-cell">{weapon.affinity}%</Table.Td></Table.Tr>;
              }
              if (active === 'armor') {
                const item = entry as Armor;
                return <Table.Tr key={item.game_id}><Table.Td>{armorParts[item.part] ?? `部位 ${item.part}`}</Table.Td><Table.Td><Anchor component={Link} to={`/equipment/armor/${encodeURIComponent(item.game_id)}`} fw={500}>{text(item.names)}</Anchor></Table.Td><Table.Td className="numeric-cell">{item.defense.toLocaleString('ja-JP')}</Table.Td></Table.Tr>;
              }
              if (active === 'amulets') {
                const item = entry as Amulet;
                return <Table.Tr key={item.game_id}><Table.Td><Anchor component={Link} to={`/equipment/amulets/${encodeURIComponent(item.game_id)}`} fw={500}>{text(item.names)}</Anchor></Table.Td></Table.Tr>;
              }
              const item = entry as Decoration;
              return <Table.Tr key={item.game_id}><Table.Td><Anchor component={Link} to={`/equipment/decorations/${encodeURIComponent(String(item.game_id))}`} fw={500}>{text(item.names)}</Anchor></Table.Td><Table.Td className="numeric-cell">{item.required_slot}</Table.Td></Table.Tr>;
            })}
          </Table.Tbody>
        </Table>
      </Box>
    </Stack>
  );
}

function EquipmentDetail() {
  const { kind, id } = useParams();
  const { armor, amulets, weapons, decorations, skills } = useDatabase();
  const decodedId = id ? decodeURIComponent(id) : '';
  const equipment = kind === 'weapons' ? weapons.find((entry) => entry.game_id === decodedId)
    : kind === 'armor' ? armor.find((entry) => entry.game_id === decodedId)
      : kind === 'amulets' ? amulets.find((entry) => entry.game_id === decodedId)
        : kind === 'decorations' ? decorations.find((entry) => String(entry.game_id) === decodedId) : undefined;
  if (!equipment) return <NotFoundPage />;

  const skillNames = (refs: { skill_id: number; level: number }[]) => refs.map((ref) => {
    const skill = skills.find((entry) => entry.game_id === ref.skill_id);
    return `${skill ? text(skill.names) : `ID ${ref.skill_id}`} Lv ${ref.level}`;
  }).join('、') || 'なし';

  return <Stack className="page-stack" gap="lg">
    <Stack gap="xs">
      <Group gap="xs"><Badge variant="light">{kind === 'weapons' ? (equipment as Weapon).category : kind === 'armor' ? '防具' : kind === 'amulets' ? '護石' : '装飾品'}</Badge><Text size="lg" fw={600}>{text(equipment.names)}</Text></Group>
      <Text size="sm" c="dimmed" style={{ whiteSpace: 'pre-line' }}>{text(equipment.descriptions)}</Text>
    </Stack>
    {kind === 'weapons' && (() => { const item = equipment as Weapon; return <SimpleGrid cols={{ base: 2, sm: 4 }} spacing="sm"><div><Text size="sm" c="dimmed">レア度</Text><Text size="sm" fw={500}>{item.rarity}</Text></div><div><Text size="sm" c="dimmed">攻撃力</Text><Text size="sm" fw={500}>{item.attack}</Text></div><div><Text size="sm" c="dimmed">会心率</Text><Text size="sm" fw={500}>{item.affinity}%</Text></div><div><Text size="sm" c="dimmed">価格</Text><Text size="sm" fw={500}>{item.price.toLocaleString('ja-JP')} z</Text></div><div><Text size="sm" c="dimmed">属性</Text><Text size="sm" fw={500}>{item.attribute_value || 'なし'}</Text></div><div><Text size="sm" c="dimmed">スロット</Text><Text size="sm" fw={500}>{item.slots.join('・') || 'なし'}</Text></div><div><Text size="sm" c="dimmed">スキル</Text><Text size="sm" fw={500}>{skillNames(item.skills)}</Text></div></SimpleGrid>; })()}
    {kind === 'armor' && (() => { const item = equipment as Armor; return <SimpleGrid cols={{ base: 2, sm: 4 }} spacing="sm"><div><Text size="sm" c="dimmed">部位</Text><Text size="sm" fw={500}>{armorParts[item.part] ?? `部位 ${item.part}`}</Text></div><div><Text size="sm" c="dimmed">レア度</Text><Text size="sm" fw={500}>{item.rarity ?? '不明'}</Text></div><div><Text size="sm" c="dimmed">防御力</Text><Text size="sm" fw={500}>{item.defense}</Text></div><div><Text size="sm" c="dimmed">スロット</Text><Text size="sm" fw={500}>{item.slots.join('・') || 'なし'}</Text></div><div><Text size="sm" c="dimmed">属性耐性</Text><Text size="sm" fw={500}>{item.resistances.join('・')}</Text></div><div><Text size="sm" c="dimmed">スキル</Text><Text size="sm" fw={500}>{skillNames(item.skills)}</Text></div></SimpleGrid>; })()}
    {kind === 'amulets' && (() => { const item = equipment as Amulet; return <SimpleGrid cols={{ base: 2, sm: 4 }} spacing="sm"><div><Text size="sm" c="dimmed">レア度</Text><Text size="sm" fw={500}>{item.rarity}</Text></div><div><Text size="sm" c="dimmed">レベル</Text><Text size="sm" fw={500}>{item.level}</Text></div><div><Text size="sm" c="dimmed">価格</Text><Text size="sm" fw={500}>{item.price.toLocaleString('ja-JP')} z</Text></div><div><Text size="sm" c="dimmed">スキル</Text><Text size="sm" fw={500}>{skillNames(item.skills)}</Text></div></SimpleGrid>; })()}
    {kind === 'decorations' && (() => { const item = equipment as Decoration; return <SimpleGrid cols={{ base: 2, sm: 4 }} spacing="sm"><div><Text size="sm" c="dimmed">レア度</Text><Text size="sm" fw={500}>{item.rarity}</Text></div><div><Text size="sm" c="dimmed">必要スロット</Text><Text size="sm" fw={500}>{item.required_slot}</Text></div><div><Text size="sm" c="dimmed">価格</Text><Text size="sm" fw={500}>{item.price.toLocaleString('ja-JP')} z</Text></div><div><Text size="sm" c="dimmed">スキル</Text><Text size="sm" fw={500}>{skillNames(item.skills)}</Text></div></SimpleGrid>; })()}
  </Stack>;
}

export function EquipmentPage() {
  const { kind, id } = useParams();
  return id ? <EquipmentDetail /> : <EquipmentList />;
}
