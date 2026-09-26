import { Badge, Divider, Group, SimpleGrid, Stack, Text } from '@mantine/core';
import { text } from '../../data';
import { label } from '../../labels';
import type { Monster } from '../../types';
import { FormattedText } from '../FormattedText';

type Props = { monster: Monster; stageName: (id: number) => string };

export function MonsterBasicSection({ monster, stageName }: Props) {
  return (
    <section id="monster-basic">
      <Stack>
        <Stack gap="xs">
          <Group gap="xs" align="flex-start" wrap="nowrap">
            <Text size="sm" fw={500} w={64} flex="0 0 auto">
              出現場所
            </Text>
            <Text size="sm">{monster.locations.map(stageName).join('、') || '不明'}</Text>
          </Group>
          <Group gap="xs" align="flex-start" wrap="nowrap">
            <Text size="sm" fw={500} w={64} flex="0 0 auto">
              弱点
            </Text>
            <Group gap={4}>
              {monster.weaknesses.length ? (
                monster.weaknesses.map((weakness, index) => {
                  const name = weakness.element ?? weakness.status ?? weakness.effect;
                  return (
                    <Badge key={`${name}-${index}`} size="sm" variant="light">
                      {label(name)} {weakness.level ? '★'.repeat(weakness.level) : ''}
                    </Badge>
                  );
                })
              ) : (
                <Text size="sm">不明</Text>
              )}
            </Group>
          </Group>
          <Group gap="xs" align="flex-start" wrap="nowrap">
            <Text size="sm" fw={500} w={64} flex="0 0 auto">
              耐性
            </Text>
            <Group gap={4}>
              {monster.resistances.length ? (
                monster.resistances.map((resistance, index) => {
                  const name = resistance.element ?? resistance.status ?? resistance.effect;
                  return (
                    <Badge key={`${name}-${index}`} size="sm" color="gray" variant="light">
                      {label(name)}
                    </Badge>
                  );
                })
              ) : (
                <Text size="sm">不明</Text>
              )}
            </Group>
          </Group>
        </Stack>
        <Divider />
        <SimpleGrid cols={{ base: 2, sm: 4 }} spacing={{ base: 'xs', sm: 'sm' }}>
          <div>
            <Text size="sm" c="dimmed">
              基礎体力
            </Text>
            <Text size="sm" fw={500}>
              {monster.base_health?.toLocaleString('ja-JP') ?? '不明'}
            </Text>
          </div>
          <div>
            <Text size="sm" c="dimmed">
              基準サイズ
            </Text>
            <Text size="sm" fw={500}>
              {monster.size.base?.toFixed(2) ?? '不明'}
            </Text>
          </div>
          <div>
            <Text size="sm" c="dimmed">
              最小金冠
            </Text>
            <Text size="sm" fw={500}>
              {monster.size.mini?.toFixed(2) ?? '不明'}
            </Text>
          </div>
          <div>
            <Text size="sm" c="dimmed">
              最大金冠
            </Text>
            <Text size="sm" fw={500}>
              {monster.size.gold?.toFixed(2) ?? '不明'}
            </Text>
          </div>
        </SimpleGrid>
        <Divider />
        <Stack gap="sm">
          <div>
            <Text size="sm" fw={500} c="dimmed" mb={4}>
              説明
            </Text>
            <FormattedText className="long-description" size="sm" style={{ whiteSpace: 'pre-line' }}>
              {text(monster.descriptions)}
            </FormattedText>
          </div>
          <div>
            <Text size="sm" fw={500} c="dimmed" mb={4}>
              特徴
            </Text>
            <FormattedText className="long-description" size="sm" style={{ whiteSpace: 'pre-line' }}>
              {text(monster.features)}
            </FormattedText>
          </div>
          <div>
            <Text size="sm" fw={500} c="dimmed" mb={4}>
              攻略の要点
            </Text>
            <FormattedText className="long-description" size="sm" style={{ whiteSpace: 'pre-line' }}>
              {text(monster.tips)}
            </FormattedText>
          </div>
        </Stack>
      </Stack>
    </section>
  );
}
