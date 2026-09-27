import { ActionIcon, Button, Group, Modal, Stack, Text, TextInput } from '@mantine/core';
import { IconDeviceFloppy, IconTrash } from '@tabler/icons-react';
import { useState } from 'react';
import { OptionPicker } from '../../components/OptionPicker';
import {
  deleteSearchPreset,
  maxSearchPresets,
  readSearchPresets,
  type SearchCriteria,
  saveSearchPreset,
} from '../searchPresets';

type Props = {
  criteria: SearchCriteria;
  onLoad: (criteria: SearchCriteria) => void;
};

export function SavedSearchPresets({ criteria, onLoad }: Props) {
  const [presets, setPresets] = useState(readSearchPresets);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [modalOpened, setModalOpened] = useState(false);
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const selectedPreset = presets.find((preset) => preset.id === selectedId);
  const currentPreset =
    selectedPreset && JSON.stringify(selectedPreset.criteria) === JSON.stringify(criteria) ? selectedPreset : null;
  const save = () => {
    const result = saveSearchPreset(name, criteria);
    if ('error' in result) {
      setError(
        result.error === 'duplicate'
          ? '同じ名前の条件が保存されています'
          : result.error === 'limit'
            ? `保存できる検索条件は ${maxSearchPresets} 件までです`
            : result.error === 'storage'
              ? '保存できませんでした'
              : '名前を入力してください',
      );
      return;
    }
    setPresets((current) => [...current, result.preset]);
    setSelectedId(result.preset.id);
    setName('');
    setError('');
    setModalOpened(false);
  };
  const load = (id: string | null) => {
    if (!id) return;
    const preset = presets.find((item) => item.id === id);
    if (!preset) return;
    setSelectedId(id);
    onLoad(preset.criteria);
  };
  const remove = () => {
    if (!currentPreset) return;
    const next = deleteSearchPreset(currentPreset.id);
    if (!next) {
      setError('削除できませんでした');
      return;
    }
    setPresets(next);
    setSelectedId(null);
    setError('');
  };
  const openSave = () => {
    setName('');
    setError('');
    setModalOpened(true);
  };

  return (
    <>
      <Group className="simulator-saved-search-controls" gap="xs" wrap="nowrap">
        <OptionPicker
          ariaLabel="保存した検索条件"
          placeholder="保存した条件を選択"
          data={presets.map((preset): SearchPresetOption => ({ value: preset.id, label: preset.name }))}
          value={currentPreset?.id ?? null}
          onChange={load}
          disabled={presets.length === 0}
          style={{ flex: '1 1 0%', minWidth: 0 }}
        />
        <Button
          size="sm"
          variant="default"
          leftSection={<IconDeviceFloppy size={16} />}
          aria-label="検索条件に名前を付けて保存"
          disabled={presets.length >= maxSearchPresets}
          onClick={openSave}
        >
          保存
        </Button>
        <ActionIcon
          variant="subtle"
          color="gray"
          size="sm"
          aria-label="選択した保存条件を削除"
          disabled={!currentPreset}
          onClick={remove}
        >
          <IconTrash size={16} />
        </ActionIcon>
      </Group>
      {presets.length >= maxSearchPresets && (
        <Text size="xs" c="dimmed">
          保存できる検索条件は最大 {maxSearchPresets} 件です
        </Text>
      )}
      <Modal opened={modalOpened} onClose={() => setModalOpened(false)} title="検索条件を保存" centered size="sm">
        <form
          onSubmit={(event) => {
            event.preventDefault();
            save();
          }}
        >
          <Stack gap="sm">
            <TextInput
              label="名前"
              value={name}
              onChange={(event) => {
                setName(event.currentTarget.value);
                setError('');
              }}
              autoFocus
            />
            {error && (
              <Text size="sm" c="red">
                {error}
              </Text>
            )}
            <Group justify="flex-end">
              <Button type="button" variant="subtle" color="gray" onClick={() => setModalOpened(false)}>
                キャンセル
              </Button>
              <Button type="submit" disabled={!name.trim()}>
                保存
              </Button>
            </Group>
          </Stack>
        </form>
      </Modal>
    </>
  );
}

type SearchPresetOption = { value: string; label: string };
