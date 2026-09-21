import { Anchor, Box, Stack, Table, Text } from '@mantine/core';
import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { monsterEpithet, text, useDatabase } from '../data';
import { label } from '../labels';

export function MonstersPage() {
  const { monsters } = useDatabase();
  const sortedMonsters = useMemo(() => [...monsters].sort((a, b) => label(a.species).localeCompare(label(b.species), 'ja') || a.game_id - b.game_id), [monsters]);

  return (
    <Stack className="page-stack" gap="md">
      <Box className="responsive-table-container">
        <Table className="responsive-table" striped highlightOnHover withTableBorder>
          <Table.Thead>
            <Table.Tr><Table.Th>種族</Table.Th><Table.Th>モンスター</Table.Th><Table.Th>二つ名</Table.Th></Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {sortedMonsters.map((monster) => {
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
      </Box>
    </Stack>
  );
}
