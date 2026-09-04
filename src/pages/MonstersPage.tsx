import { Anchor, Badge, Group, Paper, SimpleGrid, Stack, Text, Title } from '@mantine/core';
import { Link } from 'react-router-dom';
import { text, useDatabase } from '../data';
import { label } from '../labels';
import { FormattedText } from '../components/FormattedText';

export function MonstersPage() {
  const { monsters } = useDatabase();

  return (
    <Stack className="page-stack" gap="md">
      <Title order={1} size="h2">モンスター</Title>
      <Text c="dimmed">大型モンスター {monsters.length} 体</Text>
      <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }}>
        {[...monsters].sort((a, b) => text(a.names).localeCompare(text(b.names), 'ja')).map((monster) => (
          <Paper key={monster.game_id} withBorder p={{ base: 'sm', sm: 'md' }}>
            <Group justify="space-between" wrap="nowrap">
              <Anchor component={Link} to={`/monsters/${monster.game_id}`} fw={500}>{text(monster.names)}</Anchor>
              <Badge variant="light">{label(monster.species)}</Badge>
            </Group>
            <FormattedText size="sm" c="dimmed" mt="xs" lineClamp={2}>{text(monster.descriptions)}</FormattedText>
          </Paper>
        ))}
      </SimpleGrid>
    </Stack>
  );
}
