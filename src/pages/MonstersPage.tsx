import { Anchor, Stack, Table, Text } from '@mantine/core';
import { Link } from 'react-router-dom';
import { monsterEpithet, text, useDatabase } from '../data';
import { label } from '../labels';

export function MonstersPage() {
  const { monsters } = useDatabase();

  return (
    <Stack className="page-stack" gap="md">
      <Table striped highlightOnHover withTableBorder>
        <Table.Thead>
          <Table.Tr><Table.Th>種族</Table.Th><Table.Th>モンスター</Table.Th><Table.Th /></Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {[...monsters].sort((a, b) => text(a.names).localeCompare(text(b.names), 'ja')).map((monster) => {
            const epithet = monsterEpithet(monster);
            const epithetReading = epithet?.match(/^(.+?)（(.+?)）$/u);

            return (
              <Table.Tr key={monster.game_id}>
                <Table.Td><Text size="sm">{label(monster.species)}</Text></Table.Td>
                <Table.Td><Anchor component={Link} to={`/monsters/${monster.game_id}`} fw={500}>{text(monster.names)}</Anchor></Table.Td>
                <Table.Td>
                  {epithet && (epithetReading ? <ruby>{epithetReading[1]}<rt>{epithetReading[2]}</rt></ruby> : <span>{epithet}</span>)}
                </Table.Td>
              </Table.Tr>
            );
          })}
        </Table.Tbody>
      </Table>
    </Stack>
  );
}
