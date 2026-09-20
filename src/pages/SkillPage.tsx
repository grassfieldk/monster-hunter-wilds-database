import { Badge, Group, Stack, Text, Title } from '@mantine/core';
import { useParams } from 'react-router-dom';
import { text, useDatabase } from '../data';
import { FormattedText } from '../components/FormattedText';
import { NotFoundPage } from './NotFoundPage';

export function SkillPage() {
  const { id } = useParams();
  const { skillById } = useDatabase();
  const skill = skillById.get(Number(id));
  if (!skill) return <NotFoundPage />;

  return (
    <Stack className="page-stack" gap="lg">
      <Group gap="sm">
        <Badge variant="light">スキル</Badge>
        <Title order={1} size="h3">{text(skill.names)}</Title>
      </Group>
      <FormattedText size="sm" style={{ whiteSpace: 'pre-line' }}>
        {text(skill.descriptions) || '説明はありません'}
      </FormattedText>
    </Stack>
  );
}
