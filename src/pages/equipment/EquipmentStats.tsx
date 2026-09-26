import { SimpleGrid, Text } from '@mantine/core';
import type { ReactNode } from 'react';

export function EquipmentStats({ stats }: { stats: { label: string; value: ReactNode }[] }) {
  return (
    <SimpleGrid cols={{ base: 2, sm: 4 }} spacing="sm">
      {stats.map((stat) => (
        <div key={stat.label}>
          <Text size="sm" c="dimmed">
            {stat.label}
          </Text>
          <Text size="sm" fw={500}>
            {stat.value}
          </Text>
        </div>
      ))}
    </SimpleGrid>
  );
}
