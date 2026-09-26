import { Button, Group, Modal, ScrollArea, Stack, Text, UnstyledButton } from '@mantine/core';
import { IconArrowLeft, IconChevronRight } from '@tabler/icons-react';
import { type CSSProperties, useState } from 'react';

export type PickerOption = {
  value: string;
  label: string;
  group?: string;
  description?: string;
};

type Props = {
  label?: string;
  ariaLabel?: string;
  placeholder?: string;
  data: PickerOption[];
  value: string | null;
  onChange: (value: string | null) => void;
  clearable?: boolean;
  groups?: { value: string; label: string }[];
  size?: 'xs' | 'sm' | 'md';
  className?: string;
  buttonClassName?: string;
  style?: CSSProperties;
};

export function OptionPicker({
  label,
  ariaLabel,
  placeholder = '選択してください',
  data,
  value,
  onChange,
  clearable = false,
  groups,
  size = 'sm',
  className,
  buttonClassName,
  style,
}: Props) {
  const [opened, setOpened] = useState(false);
  const [group, setGroup] = useState<string | null>(null);
  const selected = data.find((option) => option.value === value);
  const title = ariaLabel ?? label ?? '項目';
  const options = group === null ? data : data.filter((option) => option.group === group);
  const close = () => {
    setOpened(false);
    setGroup(null);
  };
  const choose = (next: string | null) => {
    onChange(next);
    close();
  };

  return (
    <div className={['option-picker', className].filter(Boolean).join(' ')} style={style}>
      {label && (
        <Text size="sm" fw={500} mb={4}>
          {label}
        </Text>
      )}
      <Button
        type="button"
        variant="default"
        size={size}
        fw={400}
        fullWidth
        justify="space-between"
        className={buttonClassName}
        aria-label={title}
        rightSection={<IconChevronRight size={16} />}
        onClick={() => setOpened(true)}
      >
        <Text truncate c={selected ? undefined : 'dimmed'} inherit>
          {selected?.label ?? placeholder}
        </Text>
      </Button>
      <Modal opened={opened} onClose={close} title={`${title}を選択`} centered size="lg">
        <Stack gap="sm">
          {group !== null && (
            <Group>
              <Button
                variant="subtle"
                size="xs"
                leftSection={<IconArrowLeft size={16} />}
                onClick={() => setGroup(null)}
              >
                種別に戻る
              </Button>
            </Group>
          )}
          {clearable && value !== null && (
            <Group>
              <Button variant="subtle" size="xs" color="gray" onClick={() => choose(null)}>
                選択解除
              </Button>
            </Group>
          )}
          <ScrollArea.Autosize mah="min(70dvh, 560px)">
            <Stack gap={2}>
              {groups && group === null
                ? groups.map((entry) => (
                    <UnstyledButton
                      key={entry.value}
                      className="option-picker-option"
                      onClick={() => setGroup(entry.value)}
                    >
                      <Text size="sm" fw={600}>
                        {entry.label}
                      </Text>
                    </UnstyledButton>
                  ))
                : options.map((option) => (
                    <UnstyledButton
                      key={option.value}
                      className="option-picker-option"
                      aria-label={option.label}
                      onClick={() => choose(option.value)}
                    >
                      <Text size="sm" fw={value === option.value ? 700 : 500}>
                        {option.label}
                      </Text>
                      {option.description && (
                        <Text size="xs" c="dimmed" lineClamp={2}>
                          {option.description}
                        </Text>
                      )}
                    </UnstyledButton>
                  ))}
            </Stack>
          </ScrollArea.Autosize>
        </Stack>
      </Modal>
    </div>
  );
}
