import { Badge, Group, Text } from '@mantine/core';
import { useLocation } from 'react-router-dom';
import { monsterEpithet, text, useDatabase } from '../data';
import { label } from '../labels';
import { MonsterEpithet } from './MonsterEpithet';

export function MobileHeaderContent() {
  const { pathname } = useLocation();
  const { monsterById, itemById, questById, skillById, armor, armorSeries, amulets, weapons, decorations } =
    useDatabase();
  const monsterMatch = pathname.match(/^\/monsters\/([^/]+)$/u);
  const itemMatch = pathname.match(/^\/items\/([^/]+)$/u);
  const questMatch = pathname.match(/^\/quests\/([^/]+)$/u);
  const skillMatch = pathname.match(/^\/skills\/([^/]+)$/u);
  const equipmentMatch = pathname.match(/^\/equipment\/([^/]+)\/([^/]+)$/u);

  if (pathname === '/')
    return (
      <Text size="md" fw={600}>
        Monster Hunter Wilds DB
      </Text>
    );
  if (pathname === '/monsters')
    return (
      <Text size="md" fw={600}>
        モンスター一覧
      </Text>
    );
  if (pathname === '/items')
    return (
      <Text size="md" fw={600}>
        アイテム一覧
      </Text>
    );
  if (pathname === '/quests')
    return (
      <Text size="md" fw={600}>
        クエスト一覧
      </Text>
    );
  if (pathname === '/equipment')
    return (
      <Text size="md" fw={600}>
        装備一覧
      </Text>
    );
  if (pathname === '/simulator')
    return (
      <Text size="md" fw={600}>
        装備検索ツール
      </Text>
    );

  if (monsterMatch) {
    const monster = monsterById.get(Number(monsterMatch[1]));
    if (monster) {
      const monsterName = text(monster.names);
      const epithet = monsterEpithet(monster);
      return (
        <Group w="100%" gap="xs" justify="space-between" wrap="nowrap">
          <Group gap="xs" wrap="nowrap" miw={0}>
            <Badge size="sm" variant="light">
              {label(monster.species)}
            </Badge>
            <Text size="md" fw={600} truncate>
              {monsterName}
            </Text>
          </Group>
          {epithet && (
            <Text size="md" fw={600} ta="right" truncate>
              <MonsterEpithet value={epithet} className="monster-epithet" />
            </Text>
          )}
        </Group>
      );
    }
  }

  if (itemMatch) {
    const item = itemById.get(Number(itemMatch[1]));
    if (item) {
      return (
        <Group w="100%" gap="xs" wrap="nowrap">
          <Badge size="sm" variant="light">
            RARE {item.rarity}
          </Badge>
          <Text size="md" fw={600} truncate>
            {text(item.names)}
          </Text>
          <Text size="sm" c="dimmed" truncate>
            {label(item.kind)}
          </Text>
        </Group>
      );
    }
  }

  if (questMatch) {
    const quest = questById.get(Number(questMatch[1]));
    if (quest) {
      return (
        <Group gap="xs" wrap="nowrap" miw={0}>
          <Badge size="sm" variant="light">
            {quest.category}
          </Badge>
          <Text size="md" fw={600} truncate>
            {text(quest.names)}
          </Text>
        </Group>
      );
    }
  }

  if (skillMatch) {
    const skill = skillById.get(Number(skillMatch[1]));
    if (skill) {
      return (
        <Group w="100%" gap="xs" wrap="nowrap">
          <Badge size="sm" variant="light">
            スキル
          </Badge>
          <Text size="md" fw={600} truncate>
            {text(skill.names)}
          </Text>
        </Group>
      );
    }
  }

  if (equipmentMatch) {
    const [, kind, encodedId] = equipmentMatch;
    const equipmentId = decodeURIComponent(encodedId);
    const equipment =
      kind === 'weapons'
        ? weapons.find((entry) => entry.game_id === equipmentId)
        : kind === 'armor'
          ? (armorSeries.find((entry) => entry.game_id === Number(equipmentId)) ??
            armorSeries.find(
              (entry) => entry.game_id === armor.find((item) => item.game_id === equipmentId)?.series_id,
            ))
          : kind === 'amulets'
            ? (amulets.find((entry) => entry.game_id === equipmentId) ??
              amulets.find((entry) => String(entry.amulet_type) === equipmentId))
            : decorations.find((entry) => String(entry.game_id) === equipmentId);
    if (equipment) {
      const category =
        kind === 'weapons'
          ? (equipment as (typeof weapons)[number]).category
          : kind === 'armor'
            ? '防具'
            : kind === 'amulets'
              ? '護石'
              : '装飾品';
      const equipmentName =
        kind === 'amulets' ? text(equipment.names).replace(/[ⅠⅡⅢⅣⅤⅥⅦⅧⅨⅩ]+$/u, '') : text(equipment.names);
      return (
        <Group w="100%" gap="xs" wrap="nowrap">
          <Badge size="sm" variant="light">
            {category}
          </Badge>
          <Text size="md" fw={600} truncate>
            {equipmentName}
          </Text>
        </Group>
      );
    }
  }

  return null;
}
