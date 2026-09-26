import { Alert, Badge, Button, Group, Paper, Select, SimpleGrid, Stack, Table, Text, Title } from '@mantine/core';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { text, useDatabase } from '../data';
import {
  armorSlots,
  type Build,
  decorationTypeForSlot,
  type EquipmentSlot,
  emptyBuild,
  equipmentSlots,
  isVirtualAmulet,
  isVirtualWeapon,
  type SkillTarget,
  type SortMode,
  selectedGear,
  summarizeBuild,
  validBuild,
} from '../simulator/model';
import type { SearchResult } from '../simulator/search';

const slotLabels: Record<EquipmentSlot, string> = {
  weapon: '武器',
  head: '頭',
  chest: '胴',
  arms: '腕',
  waist: '腰',
  legs: '脚',
  amulet: '護石',
};

function readSharedBuild(value: string | null): Build {
  if (!value) return emptyBuild();
  try {
    const parsed: unknown = JSON.parse(value);
    return validBuild(parsed)
      ? (Object.fromEntries([
          ...equipmentSlots.map((slot) => [slot, parsed[slot]]),
          ['decorations', parsed.decorations],
          ['weaponBonuses', parsed.weaponBonuses ?? []],
        ]) as Build)
      : emptyBuild();
  } catch {
    return emptyBuild();
  }
}

export function SimulatorPage() {
  const { weapons, armor, amulets, decorations, skills, skillLevels, randomAmulets, artianSkills, skillById } =
    useDatabase();
  const maxSkillLevels = useMemo(
    () =>
      Object.fromEntries(
        skillLevels.reduce(
          (map, row) => map.set(row.skill_id, Math.max(map.get(row.skill_id) ?? 0, row.level)),
          new Map<number, number>(),
        ),
      ),
    [skillLevels],
  );
  const availableLevels = useMemo(() => {
    const map = new Map<number, number[]>();
    for (const row of skillLevels) map.set(row.skill_id, [...(map.get(row.skill_id) ?? []), row.level]);
    for (const levels of map.values()) levels.sort((a, b) => a - b);
    return map;
  }, [skillLevels]);
  const skillNames = useMemo(
    () => Object.fromEntries(skills.map((skill) => [skill.game_id, text(skill.names)])),
    [skills],
  );
  const data = useMemo(
    () => ({ weapons, armor, amulets, decorations, maxSkillLevels, skillNames, randomAmulets, artianSkills }),
    [weapons, armor, amulets, decorations, maxSkillLevels, skillNames, randomAmulets, artianSkills],
  );
  const [params, setParams] = useSearchParams();
  const sharedBuild = params.get('build');
  const [build, setBuild] = useState<Build>(() => readSharedBuild(sharedBuild));
  const [targets, setTargets] = useState<SkillTarget[]>([]);
  const [sort, setSort] = useState<SortMode>('slots');
  const [weaponType, setWeaponType] = useState<string | null>(null);
  const [skillCategory, setSkillCategory] = useState<'weapon' | 'armor'>('armor');
  const [progress, setProgress] = useState<{ stage: 'preparing' | 'searching'; visited: number; found: number } | null>(
    null,
  );
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [message, setMessage] = useState('');
  const worker = useRef<Worker | null>(null);
  useEffect(() => () => worker.current?.terminate(), []);
  useEffect(() => setBuild(readSharedBuild(sharedBuild)), [sharedBuild]);
  const summary = useMemo(() => summarizeBuild(build, data), [build, data]);
  const equipped = useMemo(() => selectedGear(build, data), [build, data]);
  const randomParts = build.amulet?.startsWith('random-amulet:') ? build.amulet.split(':') : null;
  const randomComboIndex = randomParts ? Number(randomParts[1]) : null;
  const randomCombo = randomComboIndex === null ? null : randomAmulets.combos[randomComboIndex];
  const selectedArtianId = isVirtualWeapon(equipped.weapon) ? equipped.weapon.sourceWeaponId : equipped.weapon?.game_id;
  const defaultAmuletId = (index: number) => {
    const combo = randomAmulets.combos[index];
    const used = new Set<number>();
    const picks = combo.groups.map((group) => {
      const choice =
        randomAmulets.groups[group].find((skill) => !used.has(skill.skill_id)) ?? randomAmulets.groups[group][0];
      used.add(choice.skill_id);
      return `${choice.skill_id}.${choice.level}`;
    });
    return `random-amulet:${index}:${picks.join(':')}`;
  };
  const gearOptions = useMemo(
    () => ({
      weapon: [
        ...weapons.map((item) => ({ value: item.game_id, label: `${item.category}　${text(item.names)}` })),
        ...(isVirtualWeapon(equipped.weapon)
          ? [{ value: equipped.weapon.game_id, label: `${equipped.weapon.category}　${text(equipped.weapon.names)}` }]
          : []),
      ],
      head: armor.filter((item) => item.part === 0).map((item) => ({ value: item.game_id, label: text(item.names) })),
      chest: armor.filter((item) => item.part === 1).map((item) => ({ value: item.game_id, label: text(item.names) })),
      arms: armor.filter((item) => item.part === 2).map((item) => ({ value: item.game_id, label: text(item.names) })),
      waist: armor.filter((item) => item.part === 3).map((item) => ({ value: item.game_id, label: text(item.names) })),
      legs: armor.filter((item) => item.part === 4).map((item) => ({ value: item.game_id, label: text(item.names) })),
      amulet: [
        ...amulets.map((item) => ({ value: item.game_id, label: text(item.names) })),
        ...(isVirtualAmulet(equipped.amulet)
          ? [{ value: equipped.amulet.game_id, label: text(equipped.amulet.names) }]
          : []),
      ],
    }),
    [weapons, armor, amulets, equipped],
  );
  const skillOptions = useMemo(
    () =>
      skills
        .filter((item) => maxSkillLevels[item.game_id] > 0 && !text(item.names).startsWith('#Rejected#'))
        .map((item) => ({ value: String(item.game_id), label: text(item.names) }))
        .sort((a, b) => a.label.localeCompare(b.label, 'ja')),
    [skills, maxSkillLevels],
  );
  const weaponSkillIds = useMemo(
    () =>
      new Set([
        ...weapons.flatMap((item) => item.skills.map((skill) => skill.skill_id)),
        ...decorations
          .filter((item) => item.type === decorationTypeForSlot('weapon'))
          .flatMap((item) => item.skills.map((skill) => skill.skill_id)),
      ]),
    [weapons, decorations],
  );
  const armorSkillIds = useMemo(
    () =>
      new Set([
        ...armor.flatMap((item) => item.skills.map((skill) => skill.skill_id)),
        ...amulets.flatMap((item) => item.skills.map((skill) => skill.skill_id)),
        ...decorations
          .filter((item) => item.type === decorationTypeForSlot('head'))
          .flatMap((item) => item.skills.map((skill) => skill.skill_id)),
        ...artianSkills.skillPairs.flatMap((pair) => [pair.groupSkillId, pair.seriesSkillId]),
      ]),
    [armor, amulets, decorations, artianSkills],
  );
  const categorizedSkillOptions = skillOptions.filter((item) =>
    (skillCategory === 'weapon' ? weaponSkillIds : armorSkillIds).has(Number(item.value)),
  );
  const weaponTypeOptions = useMemo(
    () =>
      [...new Map(weapons.map((item) => [item.weapon_type, item.category])).entries()].map(([value, label]) => ({
        value,
        label,
      })),
    [weapons],
  );
  const decorationOptions = useMemo(
    () =>
      new Map(
        [...new Set(decorations.map((item) => item.type))].map((type) => [
          type,
          decorations.filter((item) => item.type === type),
        ]),
      ),
    [decorations],
  );
  const decorationById = useMemo(() => new Map(decorations.map((item) => [item.game_id, item])), [decorations]);
  const skillEffects = useMemo(
    () => new Map(skillLevels.map((level) => [`${level.skill_id}:${level.level}`, text(level.descriptions)])),
    [skillLevels],
  );
  const activeLevel = (id: number, level: number) =>
    availableLevels
      .get(id)
      ?.filter((value) => value <= level)
      .at(-1) ?? null;

  const updateGear = (slot: EquipmentSlot, id: string | null) => {
    setBuild((current) => ({
      ...current,
      [slot]: id,
      weaponBonuses: slot === 'weapon' ? [] : current.weaponBonuses,
      decorations: { ...current.decorations, [slot]: [] },
    }));
  };

  const startSearch = () => {
    const selected = [
      ...targets
        .filter((target) => Number.isSafeInteger(target.id) && target.level > 0)
        .reduce(
          (map, target) =>
            map.set(target.id, { id: target.id, level: Math.max(target.level, map.get(target.id)?.level ?? 0) }),
          new Map<number, SkillTarget>(),
        )
        .values(),
    ];
    if (!selected.length) {
      setMessage('検索するスキルを指定してください');
      return;
    }
    if (selected.some((target) => target.level > (maxSkillLevels[target.id] ?? 0))) {
      setMessage('指定されたスキルの最大 Lv を超えています');
      return;
    }
    worker.current?.terminate();
    setSearching(true);
    setProgress(null);
    setResults([]);
    setMessage('');
    const next = new Worker(new URL('../simulator/search.worker.ts', import.meta.url), { type: 'module' });
    worker.current = next;
    next.onmessage = (
      event: MessageEvent<{
        results?: SearchResult[];
        error?: string;
        progress?: { stage: 'preparing' | 'searching'; visited: number; found: number };
      }>,
    ) => {
      if (event.data.progress) {
        setProgress(event.data.progress);
        return;
      }
      setSearching(false);
      if (event.data.error) setMessage(event.data.error);
      else {
        setResults(event.data.results ?? []);
        if (!event.data.results?.length) setMessage('探索した候補には、条件を満たす装備がありませんでした');
      }
      next.terminate();
      if (worker.current === next) worker.current = null;
    };
    next.onerror = () => {
      setSearching(false);
      setMessage('検索に失敗しました');
      next.terminate();
      if (worker.current === next) worker.current = null;
    };
    next.postMessage({ data, targets: selected, sort, weaponType });
  };
  const cancelSearch = () => {
    worker.current?.terminate();
    worker.current = null;
    setSearching(false);
    setMessage('検索を中断しました');
  };

  const share = async () => {
    const next = new URLSearchParams(params);
    next.set('build', JSON.stringify(build));
    setParams(next);
    const url = new URL(window.location.href);
    url.search = next.toString();
    try {
      await navigator.clipboard.writeText(url.toString());
      setMessage('装備の URL をコピーしました');
    } catch {
      setMessage('URL をコピーできませんでした');
    }
  };

  return (
    <Stack className="page-stack" gap="lg">
      <Title order={1} size="h3">
        装備シミュレータ
      </Title>
      <Paper withBorder p="md">
        <Stack gap="sm">
          <Text fw={600}>スキル条件から検索</Text>
          <Group gap="xs">
            <Button
              size="xs"
              variant={skillCategory === 'armor' ? 'filled' : 'light'}
              onClick={() => setSkillCategory('armor')}
            >
              防具系スキル
            </Button>
            <Button
              size="xs"
              variant={skillCategory === 'weapon' ? 'filled' : 'light'}
              onClick={() => setSkillCategory('weapon')}
            >
              武器系スキル
            </Button>
          </Group>
          {targets.map((target, index) => (
            <Group key={index} gap="xs" align="end" wrap="nowrap">
              <Select
                label={index === 0 ? 'スキル' : undefined}
                placeholder="スキルを選択"
                searchable
                clearable
                data={
                  target.id && !categorizedSkillOptions.some((option) => option.value === String(target.id))
                    ? [
                        ...categorizedSkillOptions,
                        ...skillOptions.filter((option) => option.value === String(target.id)),
                      ]
                    : categorizedSkillOptions
                }
                value={target.id ? String(target.id) : null}
                onChange={(value) =>
                  setTargets((current) =>
                    current.map((entry, at) =>
                      at === index ? { id: Number(value), level: availableLevels.get(Number(value))?.[0] ?? 1 } : entry,
                    ),
                  )
                }
                style={{ flex: 1 }}
              />
              <Select
                label={index === 0 ? '必要 Lv' : undefined}
                data={(availableLevels.get(target.id) ?? [1]).map((level) => ({
                  value: String(level),
                  label: String(level),
                }))}
                value={String(target.level)}
                onChange={(value) =>
                  setTargets((current) =>
                    current.map((entry, at) => (at === index ? { ...entry, level: Number(value) || 1 } : entry)),
                  )
                }
                w={92}
              />
              <Button
                variant="subtle"
                color="gray"
                onClick={() => setTargets((current) => current.filter((_, at) => at !== index))}
              >
                削除
              </Button>
            </Group>
          ))}
          <Group gap="sm">
            <Button variant="light" onClick={() => setTargets((current) => [...current, { id: 0, level: 1 }])}>
              スキルを追加
            </Button>
            <Select
              aria-label="武器種"
              placeholder="全武器種"
              clearable
              searchable
              data={weaponTypeOptions}
              value={weaponType}
              onChange={setWeaponType}
              w={180}
            />
            <Select
              aria-label="候補の優先順位"
              data={[
                { value: 'slots', label: '空きスロット優先' },
                { value: 'defense', label: '防御・耐性優先' },
              ]}
              value={sort}
              onChange={(value) => setSort(value === 'defense' ? 'defense' : 'slots')}
              w={180}
            />
            <Button onClick={startSearch} loading={searching}>
              検索
            </Button>
            {searching && (
              <Button variant="light" color="gray" onClick={cancelSearch}>
                中断
              </Button>
            )}
          </Group>
          {searching && (
            <Text size="sm">
              {progress?.stage === 'preparing' ? '候補を準備中' : '検索中'}　確認した件数{' '}
              {progress?.visited.toLocaleString() ?? 0} 件
            </Text>
          )}
          <Text size="xs" c="dimmed">
            条件を満たす装備の上位 30 件を表示します。空き枠・防御力が同じ候補では、指定外スキルの有用性も比較します
          </Text>
        </Stack>
      </Paper>
      {message && <Alert>{message}</Alert>}
      {results.length > 0 && (
        <Paper withBorder p="md">
          <Stack gap="sm">
            <Text fw={600}>検索結果</Text>
            <Stack gap="xs">
              {results.map((result, index) => {
                const gear = selectedGear(result.build, data);
                return (
                  <Paper key={index} withBorder p="sm">
                    <Group justify="space-between" align="start">
                      <Stack gap={2} style={{ flex: 1 }}>
                        <Group gap="xs">
                          <Badge variant="light">{index + 1}</Badge>
                          <Text size="sm">
                            防御力 {result.defense}　耐性 {result.resistances.join('/')}　空きスロット{' '}
                            {result.freeSlots.join('・') || 'なし'}　指定外スキル評価 {result.utility}
                          </Text>
                        </Group>
                        <Text size="sm">
                          {[gear.weapon, ...gear.armor, gear.amulet]
                            .map((item) => (item ? text(item.names) : 'なし'))
                            .join(' / ')}
                        </Text>
                        <Text size="xs">
                          装飾品:{' '}
                          {equipmentSlots
                            .flatMap((slot) => result.build.decorations[slot] ?? [])
                            .filter((id): id is number => id !== null)
                            .map((id) => text(decorationById.get(id)?.names))
                            .join('・') || 'なし'}
                        </Text>
                        <Text size="xs">
                          発動スキル:{' '}
                          {result.skills
                            .flatMap(([id, level]) => {
                              const active = activeLevel(id, level);
                              return active ? [`${text(skillById.get(id)?.names)} Lv ${active}`] : [];
                            })
                            .join('・') || 'なし'}
                        </Text>
                      </Stack>
                      <Button size="xs" variant="light" onClick={() => setBuild(result.build)}>
                        編集する
                      </Button>
                    </Group>
                  </Paper>
                );
              })}
            </Stack>
          </Stack>
        </Paper>
      )}
      <Paper withBorder p="md">
        <Stack gap="md">
          <Group justify="space-between">
            <Text fw={600}>装備を組む</Text>
            <Button size="xs" variant="light" onClick={share}>
              URL をコピー
            </Button>
          </Group>
          <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm">
            {equipmentSlots.map((slot) => {
              const item =
                slot === 'weapon'
                  ? equipped.weapon
                  : slot === 'amulet'
                    ? equipped.amulet
                    : equipped.armor[armorSlots.indexOf(slot)];
              const levels = item && 'slots' in item ? item.slots.filter((level) => level > 0) : [];
              return (
                <Stack key={slot} gap="xs">
                  <Select
                    label={slotLabels[slot]}
                    searchable
                    clearable
                    data={gearOptions[slot]}
                    value={build[slot]}
                    onChange={(value) => updateGear(slot, value)}
                  />
                  {levels.map((level, index) => (
                    <Select
                      key={index}
                      size="xs"
                      label={`装飾品 ${index + 1}（スロット ${level}）`}
                      searchable
                      clearable
                      data={(
                        decorationOptions.get(
                          slot === 'amulet' && isVirtualAmulet(item)
                            ? item.slotTypes[index]
                            : decorationTypeForSlot(slot),
                        ) ?? []
                      )
                        .filter((deco) => deco.required_slot <= level)
                        .map((deco) => ({ value: String(deco.game_id), label: text(deco.names) }))}
                      value={build.decorations[slot]?.[index] == null ? null : String(build.decorations[slot]?.[index])}
                      onChange={(value) =>
                        setBuild((current) => {
                          const ids = [...(current.decorations[slot] ?? [])];
                          ids[index] = value === null ? null : Number(value);
                          return { ...current, decorations: { ...current.decorations, [slot]: ids } };
                        })
                      }
                    />
                  ))}
                </Stack>
              );
            })}
          </SimpleGrid>
          {selectedArtianId && artianSkills.weaponIds.includes(selectedArtianId) && (
            <Stack gap="xs">
              <Text size="sm" fw={600}>
                アーティアスキル
              </Text>
              <Select
                searchable
                placeholder="スキルの組み合わせを選択"
                data={artianSkills.skillPairs.map((pair) => ({
                  value: `${pair.groupSkillId}.${pair.seriesSkillId}`,
                  label: `${skillNames[pair.groupSkillId]}・${skillNames[pair.seriesSkillId]}`,
                }))}
                value={isVirtualWeapon(equipped.weapon) ? build.weapon?.slice(build.weapon.lastIndexOf(':') + 1) : null}
                onChange={(value) =>
                  setBuild((current) => ({
                    ...current,
                    weapon: value ? `artian:${selectedArtianId}:${value}` : selectedArtianId,
                    weaponBonuses: [],
                    decorations: { ...current.decorations, weapon: [] },
                  }))
                }
              />
            </Stack>
          )}
          <Stack gap="xs">
            <Text size="sm" fw={600}>
              鑑定護石
            </Text>
            <Group gap="xs">
              <Button
                size="xs"
                variant="light"
                onClick={() =>
                  setBuild((current) => ({
                    ...current,
                    amulet: defaultAmuletId(0),
                    decorations: { ...current.decorations, amulet: [] },
                  }))
                }
              >
                鑑定護石を設定
              </Button>
            </Group>
            {randomCombo && randomParts && (
              <>
                <Select
                  label="レア度・スロット"
                  searchable
                  data={randomAmulets.combos.map((combo, index) => ({
                    value: String(index),
                    label: `レア ${combo.rarity}　${combo.slots.map((slot) => `${slot.type === -1638455296 ? '武器' : '防具'}${slot.level}`).join('・') || 'スロットなし'}　組 ${combo.groups.join('-')}`,
                  }))}
                  value={String(randomComboIndex)}
                  onChange={(value) => {
                    if (value !== null)
                      setBuild((current) => ({
                        ...current,
                        amulet: defaultAmuletId(Number(value)),
                        decorations: { ...current.decorations, amulet: [] },
                      }));
                  }}
                />
                <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="xs">
                  {randomCombo.groups.map((group, index) => (
                    <Select
                      key={index}
                      label={`スキル ${index + 1}`}
                      searchable
                      data={randomAmulets.groups[group]
                        .filter(
                          (skill) =>
                            !randomParts
                              .slice(2)
                              .some((entry, at) => at !== index && Number(entry.split('.')[0]) === skill.skill_id),
                        )
                        .map((skill) => ({
                          value: `${skill.skill_id}.${skill.level}`,
                          label: `${skillNames[skill.skill_id]} Lv ${skill.level}`,
                        }))}
                      value={randomParts[index + 2]}
                      onChange={(value) => {
                        if (value)
                          setBuild((current) => {
                            const parts = current.amulet?.split(':') ?? [];
                            parts[index + 2] = value;
                            return { ...current, amulet: parts.join(':') };
                          });
                      }}
                    />
                  ))}
                </SimpleGrid>
              </>
            )}
          </Stack>
          {isVirtualWeapon(equipped.weapon) && (
            <Stack gap="xs">
              <Text size="sm" fw={600}>
                アーティア武器の復元強化
              </Text>
              {(build.weaponBonuses ?? []).map((id, index) => (
                <Group key={index} gap="xs" wrap="nowrap">
                  <Select
                    aria-label={`復元強化 ${index + 1}`}
                    value={String(id)}
                    data={artianSkills.bonuses
                      .filter(
                        (bonus) =>
                          bonus.gogmaMax > 0 &&
                          (bonus.id === id ||
                            (build.weaponBonuses ?? []).filter((value) => value === bonus.id).length < bonus.gogmaMax),
                      )
                      .map((bonus) => ({ value: String(bonus.id), label: bonus.name }))}
                    onChange={(value) =>
                      setBuild((current) => ({
                        ...current,
                        weaponBonuses: (current.weaponBonuses ?? []).map((entry, at) =>
                          at === index ? Number(value) : entry,
                        ),
                      }))
                    }
                    style={{ flex: 1 }}
                  />
                  <Button
                    size="xs"
                    variant="subtle"
                    color="gray"
                    onClick={() =>
                      setBuild((current) => ({
                        ...current,
                        weaponBonuses: (current.weaponBonuses ?? []).filter((_, at) => at !== index),
                      }))
                    }
                  >
                    削除
                  </Button>
                </Group>
              ))}
              {(build.weaponBonuses?.length ?? 0) < 5 && (
                <Button
                  size="xs"
                  variant="light"
                  onClick={() =>
                    setBuild((current) => ({
                      ...current,
                      weaponBonuses: [
                        ...(current.weaponBonuses ?? []),
                        artianSkills.bonuses.find(
                          (bonus) =>
                            bonus.gogmaMax > (current.weaponBonuses ?? []).filter((id) => id === bonus.id).length,
                        )?.id ?? 9,
                      ],
                    }))
                  }
                >
                  強化を追加
                </Button>
              )}
            </Stack>
          )}
          <Group gap="lg">
            <Text size="sm">防御力 {summary.defense}</Text>
            <Text size="sm">耐性 {summary.resistances.join(' / ')}</Text>
            <Text size="sm">空きスロット {summary.freeSlots.join('・') || 'なし'}</Text>
          </Group>
          <Text size="xs" c="dimmed">
            防御力は防具の強化前の値です
          </Text>
          {equipped.weapon && (
            <Group gap="lg">
              <Text size="sm">攻撃力 {summary.attack}</Text>
              <Text size="sm">会心率 {summary.affinity}%</Text>
              <Text size="sm">属性値 {summary.attributeValue}</Text>
              {summary.sharpnessBonus > 0 && <Text size="sm">斬れ味強化 +{summary.sharpnessBonus}</Text>}
            </Group>
          )}
          <Table withTableBorder withColumnBorders>
            <Table.Tbody>
              {[...summary.skills]
                .sort((a, b) => text(skillById.get(a[0])?.names).localeCompare(text(skillById.get(b[0])?.names), 'ja'))
                .map(([id, level]) => (
                  <Table.Tr key={id}>
                    <Table.Td>{text(skillById.get(id)?.names) || `ID ${id}`}</Table.Td>
                    <Table.Td>Lv {level}</Table.Td>
                    <Table.Td>
                      {activeLevel(id, level) === null
                        ? '未発動'
                        : (skillEffects.get(`${id}:${activeLevel(id, level)}`) ?? '')}
                    </Table.Td>
                  </Table.Tr>
                ))}
            </Table.Tbody>
          </Table>
        </Stack>
      </Paper>
    </Stack>
  );
}
