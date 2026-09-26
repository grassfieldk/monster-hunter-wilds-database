import { ActionIcon, Box, Button, Group, Modal, ScrollArea, Stack, Text, UnstyledButton } from '@mantine/core';
import { IconArrowLeft, IconPlus, IconX } from '@tabler/icons-react';
import { type Dispatch, type SetStateAction, useState } from 'react';
import type { SkillTarget } from '../model';
import { SkillLevelMarks } from './SkillLevelMarks';

export type SkillOption = {
  id: number;
  name: string;
  description: string;
};

type Props = {
  title: string;
  options: SkillOption[];
  targets: SkillTarget[];
  setTargets: Dispatch<SetStateAction<SkillTarget[]>>;
  maxTargets?: number;
  availableLevels: Map<number, number[]>;
  unusableSkillIds: Set<number>;
  levelDescriptions: Map<string, string>;
};

export function SkillTargetList({
  title,
  options,
  targets,
  setTargets,
  maxTargets,
  availableLevels,
  unusableSkillIds,
  levelDescriptions,
}: Props) {
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [previewId, setPreviewId] = useState<number | null>(null);
  const preview = options.find((option) => option.id === previewId);
  const visibleOptions = options.filter(
    (option) =>
      !unusableSkillIds.has(option.id) &&
      !targets.some((target, index) => index !== editingIndex && target.id === option.id),
  );

  const open = (index: number, id: number | null) => {
    setEditingIndex(index);
    setPreviewId(id !== null && unusableSkillIds.has(id) ? null : id);
  };
  const close = () => {
    setEditingIndex(null);
    setPreviewId(null);
  };
  const chooseLevel = (level: number) => {
    if (editingIndex === null || previewId === null) return;
    const id = previewId;
    const index = editingIndex;
    setTargets((current) =>
      index === current.length
        ? [...current, { id, level }]
        : current.map((entry, at) => (at === index ? { id, level } : entry)),
    );
    close();
  };

  return (
    <Stack gap={4}>
      <Text fw={600} size="sm">
        {title}
      </Text>
      {targets.length === 0 && (
        <Text size="xs" c="dimmed">
          指定なし
        </Text>
      )}
      {targets.map((target, index) => (
        <Group key={`${target.id}:${index}`} gap={2} wrap="nowrap">
          <Button
            variant="default"
            fullWidth
            fw={400}
            justify="flex-start"
            styles={{ root: { paddingInline: 8 }, label: { width: '100%' } }}
            className={unusableSkillIds.has(target.id) ? 'simulator-skill-unusable' : undefined}
            aria-label={`${title} ${index + 1} を変更`}
            onClick={() => open(index, target.id)}
          >
            <Group justify="space-between" gap="xs" wrap="nowrap" w="100%">
              <Text
                size="sm"
                style={{
                  minWidth: 0,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {options.find((option) => option.id === target.id)?.name ?? `ID ${target.id}`}
              </Text>
              <Text size="xs" c="dimmed" style={{ flex: 'none', whiteSpace: 'nowrap' }}>
                Lv.{target.level}/{availableLevels.get(target.id)?.at(-1) ?? target.level}
              </Text>
            </Group>
          </Button>
          <ActionIcon
            variant="subtle"
            color="gray"
            size="xs"
            aria-label={`${title} ${index + 1} を削除`}
            onClick={() => setTargets((current) => current.filter((_, at) => at !== index))}
          >
            <IconX size={16} />
          </ActionIcon>
        </Group>
      ))}
      <Group justify="center">
        <Button
          size="xs"
          variant="subtle"
          leftSection={<IconPlus size={16} />}
          aria-label={`${title}を追加`}
          disabled={maxTargets !== undefined && targets.length >= maxTargets}
          onClick={() => open(targets.length, null)}
        >
          スキルを追加
        </Button>
      </Group>
      <Modal opened={editingIndex !== null} onClose={close} title={`${title}を選択`} centered size="lg">
        {preview ? (
          <Stack gap="sm">
            <Group>
              <Button
                variant="subtle"
                size="xs"
                leftSection={<IconArrowLeft size={16} />}
                onClick={() => setPreviewId(null)}
              >
                一覧に戻る
              </Button>
            </Group>
            <Text fw={600}>{preview.name}</Text>
            {preview.description && (
              <Text size="sm" c="dimmed">
                {preview.description}
              </Text>
            )}
            <ScrollArea.Autosize mah="min(55dvh, 480px)">
              <Stack gap="xs">
                {(availableLevels.get(preview.id) ?? []).map((level) => (
                  <Button
                    key={level}
                    variant="subtle"
                    color="gray"
                    fullWidth
                    fw={400}
                    justify="flex-start"
                    styles={{
                      root: { height: 'auto', minHeight: 0, padding: 0 },
                      label: {
                        alignItems: 'stretch',
                        height: 'auto',
                        overflow: 'visible',
                        whiteSpace: 'normal',
                        width: '100%',
                      },
                    }}
                    aria-label={`${preview.name} Lv ${level} を指定`}
                    onClick={() => chooseLevel(level)}
                  >
                    <Group align="stretch" gap={4} wrap="nowrap" w="100%">
                      <Box
                        style={{
                          alignItems: 'center',
                          display: 'flex',
                          flex: '0 0 3rem',
                          justifyContent: 'flex-start',
                          minHeight: 36,
                          paddingLeft: 4,
                        }}
                      >
                        <Text size="sm" style={{ whiteSpace: 'nowrap' }}>
                          Lv.{level}
                        </Text>
                      </Box>
                      <Box
                        style={{
                          alignItems: 'center',
                          display: 'flex',
                          flex: '1 1 auto',
                          minHeight: 36,
                          minWidth: 0,
                        }}
                      >
                        <Text
                          size="sm"
                          style={{
                            flex: '1 1 0%',
                            minWidth: 0,
                            overflowWrap: 'anywhere',
                            textAlign: 'left',
                            whiteSpace: 'normal',
                          }}
                        >
                          {levelDescriptions.get(`${preview.id}:${level}`) || '効果の説明なし'}
                        </Text>
                      </Box>
                    </Group>
                  </Button>
                ))}
              </Stack>
            </ScrollArea.Autosize>
          </Stack>
        ) : (
          <ScrollArea.Autosize mah="min(70dvh, 560px)">
            <Stack gap={4}>
              {visibleOptions.map((option) => {
                const maxLevel = availableLevels.get(option.id)?.at(-1) ?? 1;
                return (
                  <UnstyledButton
                    key={option.id}
                    className="simulator-skill-option"
                    onClick={() => setPreviewId(option.id)}
                  >
                    <Group justify="space-between" gap="xs" wrap="nowrap">
                      <Text fw={600} size="sm" style={{ flex: '1 1 auto', minWidth: 0, overflowWrap: 'anywhere' }}>
                        {option.name}
                      </Text>
                      <SkillLevelMarks level={maxLevel} maxLevel={maxLevel} slotCount={maxLevel} />
                    </Group>
                    {option.description && (
                      <Text size="xs" c="dimmed" lineClamp={2}>
                        {option.description}
                      </Text>
                    )}
                  </UnstyledButton>
                );
              })}
            </Stack>
          </ScrollArea.Autosize>
        )}
      </Modal>
    </Stack>
  );
}
