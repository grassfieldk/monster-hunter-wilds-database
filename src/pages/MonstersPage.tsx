import { Anchor, Stack, Table, Text, Title } from '@mantine/core';
import { Link } from 'react-router-dom';
import { text, useDatabase } from '../data';
import { label } from '../labels';
import { FormattedText } from '../components/FormattedText';

export function MonstersPage() {
  const { monsters } = useDatabase();

  return (
    <Stack className="page-stack" gap="md">
      <Title order={1} size="h3">モンスター</Title>
      <Text size="sm" c="dimmed">大型モンスター {monsters.length} 体</Text>
      <Table striped highlightOnHover withTableBorder>
        <Table.Thead>
          <Table.Tr><Table.Th>モンスター</Table.Th><Table.Th>種族</Table.Th><Table.Th visibleFrom="sm">説明</Table.Th></Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {[...monsters].sort((a, b) => text(a.names).localeCompare(text(b.names), 'ja')).map((monster) => (
            <Table.Tr key={monster.game_id}>
              <Table.Td><Anchor component={Link} to={`/monsters/${monster.game_id}`} fw={500}>{text(monster.names)}</Anchor></Table.Td>
              <Table.Td><Text size="sm">{label(monster.species)}</Text></Table.Td>
              <Table.Td visibleFrom="sm"><FormattedText className="long-description" size="sm" c="dimmed" lineClamp={1}>{text(monster.descriptions)}</FormattedText></Table.Td>
            </Table.Tr>
          ))}
        </Table.Tbody>
      </Table>
    </Stack>
  );
}
