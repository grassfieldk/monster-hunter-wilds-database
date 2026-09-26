import { Box, Button, Group, Modal, Stack, Table, Text } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { IconHelpCircle } from '@tabler/icons-react';
import { label } from '../../labels';
import type { Monster } from '../../types';

const hitzoneKinds = ['slash', 'blunt', 'pierce', 'fire', 'water', 'thunder', 'ice', 'dragon'] as const;
type Props = { monster: Monster; partName: (part: string) => string };

export function MonsterHitzonesSection({ monster, partName }: Props) {
  const [helpOpened, { open: openHelp, close: closeHelp }] = useDisclosure(false);
  return (
    <>
      <Modal opened={helpOpened} onClose={closeHelp} title="表の見方">
        <Stack gap="xs">
          <Text size="sm">
            <Text component="span" fw={500}>
              耐久値
            </Text>
            : 数値が大きいほど、その部位をひるませるために必要なダメージが多くなります
          </Text>
          <Text size="sm">
            <Text component="span" fw={500}>
              斬・打・弾
            </Text>
            : 斬撃・打撃・弾による物理ダメージの通りやすさです
          </Text>
          <Text size="sm">
            <Text component="span" fw={500}>
              火・水・雷・氷・龍
            </Text>
            : 各属性ダメージの通りやすさです
          </Text>
          <Text size="sm" c="dimmed">
            肉質の数値は大きいほどダメージが通り、0 はその種類のダメージが通りません
          </Text>
        </Stack>
      </Modal>
      <section id="monster-hitzones">
        <Group justify="flex-end">
          <Button
            variant="subtle"
            size="sm"
            leftSection={<IconHelpCircle size={16} />}
            aria-label="表の見方"
            title="表の見方"
            onClick={openHelp}
          >
            表の見方
          </Button>
        </Group>
        <Box className="responsive-table-container">
          <Table className="responsive-table responsive-table--intrinsic hitzone-table">
            <Table.Thead>
              <Table.Tr>
                <Table.Th>部位</Table.Th>
                <Table.Th className="numeric-cell">耐久値</Table.Th>
                {hitzoneKinds.map((kind) => (
                  <Table.Th key={kind} className="numeric-cell">
                    {label(kind)}
                  </Table.Th>
                ))}
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {monster.parts.map((part, index) => (
                <Table.Tr key={`${part.part}-${index}`}>
                  <Table.Td>
                    <Text size="sm" fw={500}>
                      {partName(part.part)}
                    </Text>
                  </Table.Td>
                  <Table.Td className="numeric-cell">{part.base_health ?? '不明'}</Table.Td>
                  {hitzoneKinds.map((kind) => (
                    <Table.Td key={kind} className="numeric-cell">
                      {Math.round((part.multipliers[kind] ?? 0) * 100)}
                    </Table.Td>
                  ))}
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </Box>
      </section>
    </>
  );
}
